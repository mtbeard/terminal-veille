'use strict';

/* ════════════════════════════════════════════════════════════
   RSS.JS — Fetch & parse des flux RSS via proxy CORS
   ════════════════════════════════════════════════════════════ */

const RSS = {

  /* ── Fetch d'un flux RSS via proxy allorigins ─────────── */
  async fetchFeed(url) {
    const proxyUrl = `${CONFIG.CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} on proxy`);
    const json = await res.json();
    if (!json.contents) throw new Error('Empty proxy response');
    return json.contents; // Raw XML string
  },

  /* ── Parse RSS 2.0 ou Atom ────────────────────────────── */
  parseXML(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    if (doc.querySelector('parsererror')) throw new Error('XML parse error');

    // RSS 2.0
    const rssItems = doc.querySelectorAll('channel > item');
    if (rssItems.length > 0) {
      return Array.from(rssItems).map(el => ({
        title:      this.text(el, 'title'),
        link:       this.text(el, 'link') || this.text(el, 'guid'),
        description:this.text(el, 'description') || this.text(el, 'summary'),
        pubDate:    this.text(el, 'pubDate') || this.text(el, 'date'),
        categories: Array.from(el.querySelectorAll('category')).map(c => c.textContent.trim()),
      }));
    }

    // Atom
    const entries = doc.querySelectorAll('feed > entry, entry');
    if (entries.length > 0) {
      return Array.from(entries).map(el => ({
        title:      this.text(el, 'title'),
        link:       el.querySelector('link[rel="alternate"]')?.getAttribute('href')
                 || el.querySelector('link')?.getAttribute('href')
                 || this.text(el, 'link'),
        description:this.text(el, 'summary') || this.text(el, 'content'),
        pubDate:    this.text(el, 'published') || this.text(el, 'updated'),
        categories: Array.from(el.querySelectorAll('category')).map(c =>
          c.getAttribute('term') || c.textContent.trim()
        ),
      }));
    }

    return [];
  },

  /* ── Utilitaire querySelector + textContent ──────────── */
  text(el, selector) {
    return el.querySelector(selector)?.textContent?.trim() || '';
  },

  /* ── Nettoyage HTML / entités ─────────────────────────── */
  clean(str) {
    return (str || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g,  '&')
      .replace(/&lt;/g,   '<')
      .replace(/&gt;/g,   '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g,  "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g,    ' ')
      .trim();
  },

  /* ── Détection de sévérité par mots-clés ─────────────── */
  detectSeverity(title, desc = '') {
    const text = (title + ' ' + desc).toLowerCase();
    for (const kw of CONFIG.SEVERITY_KEYWORDS.critical) {
      if (text.includes(kw)) return 'CRITICAL';
    }
    for (const kw of CONFIG.SEVERITY_KEYWORDS.high) {
      if (text.includes(kw)) return 'HIGH';
    }
    for (const kw of CONFIG.SEVERITY_KEYWORDS.medium) {
      if (text.includes(kw)) return 'MEDIUM';
    }
    return 'LOW';
  },

  /* ── Normalisation d'un item RSS vers le format commun ── */
  normalize(raw, feed) {
    const title = this.clean(raw.title || 'Sans titre');
    const desc  = this.clean(raw.description || '');
    const severity = this.detectSeverity(title, desc);

    let date = new Date(raw.pubDate);
    if (isNaN(date)) date = new Date();

    // ID déterministe
    const key = (raw.link || title).slice(0, 80);
    const id  = `rss-${feed.id}-${btoa(encodeURIComponent(key)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;

    return {
      id,
      type:        'rss',
      category:    feed.category,
      source:      feed.name,
      sourceId:    feed.id,
      title,
      description: desc.slice(0, 220) + (desc.length > 220 ? '…' : ''),
      link:        raw.link || '#',
      severity,
      date,
      tags:        (raw.categories || []).slice(0, 4).map(t => t.toLowerCase()),
      read:        false,
      bookmarked:  false,
    };
  },

  /* ── Chargement d'un flux ─────────────────────────────── */
  async loadFeed(feed) {
    try {
      const xml   = await this.fetchFeed(feed.url);
      const items = this.parseXML(xml);
      return items.slice(0, CONFIG.MAX_ITEMS_PER_FEED).map(i => this.normalize(i, feed));
    } catch (err) {
      console.warn(`[RSS] ${feed.name} — ${err.message}`);
      return [];
    }
  },

  /* ── Chargement de tous les flux activés ─────────────── */
  async loadAll() {
    const enabled = CONFIG.FEEDS.filter(f => f.enabled);
    // Fetch en parallèle, on tolère les échecs individuels
    const results = await Promise.allSettled(enabled.map(f => this.loadFeed(f)));
    return results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);
  },
};
