'use strict';

/* ════════════════════════════════════════════════════════════
   APP.JS — Logique principale de Terminal Veille
   Orchestration · Filtres · Recherche · Clavier · Auto-refresh
   ════════════════════════════════════════════════════════════ */

const App = {

  /* ── État global ─────────────────────────────────────── */
  allItems:      [],      // Tous les articles chargés
  activeFilter:  'all',  // Filtre actif
  searchQuery:   '',      // Requête de recherche en cours
  readIds:       new Set(),
  bookmarkIds:   new Set(),
  refreshTimer:  null,
  isLoading:     false,

  /* ═══════════════════════════════════════════════════════
     INITIALISATION
  ═══════════════════════════════════════════════════════ */
  async init() {
    this._loadState();
    Terminal.applyTheme();

    // Boot animé
    await Terminal.boot();

    // Setup UI
    this._setupFilters();
    this._setupSearch();
    this._setupKeyboard();

    // Premier chargement
    await this.refresh();

    // Auto-refresh
    this._startAutoRefresh();
    Terminal.startCountdown(CONFIG.REFRESH_INTERVAL);
  },

  /* ═══════════════════════════════════════════════════════
     REFRESH — Charge tous les feeds et CVEs
  ═══════════════════════════════════════════════════════ */
  async refresh() {
    if (this.isLoading) return;
    this.isLoading = true;

    Terminal.showLoading('FETCHING RSS FEEDS & CVEs...');
    Terminal.setStatus('LOADING...', 'loading');

    try {
      // Chargement parallèle des RSS et des CVE
      const [rssItems, cveItems] = await Promise.all([
        RSS.loadAll(),
        CVE.loadAll(),
      ]);

      // Fusion + application de l'état persisté
      this.allItems = [...rssItems, ...cveItems].map(item => ({
        ...item,
        read:       this.readIds.has(item.id),
        bookmarked: this.bookmarkIds.has(item.id),
      }));

      // Tri : d'abord par sévérité si dans la même heure, sinon par date
      const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      this.allItems.sort((a, b) => {
        const dateDiff = b.date - a.date;
        if (Math.abs(dateDiff) < 3_600_000) {
          return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
        }
        return dateDiff;
      });

      this._updateStats();
      this._updateLastUpdate();

      const unread = this.allItems.filter(i => !i.read).length;
      Terminal.setStatus(`LOADED ${this.allItems.length} ITEMS (${unread} UNREAD)`, 'success');
      Terminal.toast(`${this.allItems.length} items chargés — ${unread} non lus`, 'ok');

    } catch (err) {
      Terminal.setStatus(`ERROR: ${err.message}`, 'error');
      Terminal.toast(`Erreur de chargement : ${err.message}`, 'err');
      console.error('[App] refresh failed', err);
    } finally {
      this.isLoading = false;
      Terminal.hideLoading();
      this._applyFilters();
    }
  },

  /* ═══════════════════════════════════════════════════════
     FILTRAGE + RENDU
  ═══════════════════════════════════════════════════════ */
  _applyFilters() {
    let items = [...this.allItems];

    // Filtre catégorie / sévérité
    switch (this.activeFilter) {
      case 'critical':  items = items.filter(i => i.severity === 'CRITICAL');           break;
      case 'high':      items = items.filter(i => ['CRITICAL','HIGH'].includes(i.severity)); break;
      case 'cve':       items = items.filter(i => i.type === 'cve');                    break;
      case 'cyber':     items = items.filter(i => i.category === 'cyber');              break;
      case 'tech':      items = items.filter(i => i.category === 'tech');               break;
      case 'unread':    items = items.filter(i => !i.read);                             break;
      case 'bookmarks': items = items.filter(i => i.bookmarked);                        break;
    }

    // Recherche texte
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.source.toLowerCase().includes(q) ||
        (i.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (i.cveId && i.cveId.toLowerCase().includes(q))
      );
    }

    this._render(items.slice(0, CONFIG.MAX_TOTAL_ITEMS));
  },

  _render(items) {
    const list  = document.getElementById('feed-list');
    const empty = document.getElementById('empty-state');

    if (items.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';
    list.innerHTML = items.map((item, idx) => this._renderItem(item)).join('');

    // Délégation d'événements sur la liste
    list.querySelectorAll('.feed-item').forEach((el, idx) => {
      // Clic principal → ouvrir le lien
      el.addEventListener('click', e => {
        if (e.target.closest('.btn-bm')) return;
        this._openItem(items[idx]);
      });
      // Entrée clavier
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (e.target.closest('.btn-bm')) return;
          this._openItem(items[idx]);
        }
      });
      // Bookmark
      el.querySelector('.btn-bm')?.addEventListener('click', e => {
        e.stopPropagation();
        this._toggleBookmark(items[idx]);
      });
    });
  },

  _renderItem(item) {
    const sev  = item.severity.toLowerCase();
    const isNew = (Date.now() - item.date) < 3_600_000; // < 1 h

    // Badge NEW
    const newBadge = isNew ? '<span class="badge-new">NEW</span>' : '';

    // Badge CVSS pour les CVE
    const cvssBadge = item.cvssScore != null
      ? `<span class="cvss-score" style="color:${CVE.scoreColor(item.cvssScore)}">CVSS&nbsp;${item.cvssScore}</span>`
      : '';

    // Ligne des produits affectés
    const affectedLine = item.affectedProducts?.length
      ? `<div class="item-affected">Affected: ${item.affectedProducts.join(', ')}</div>`
      : '';

    // Référence CVE-ID sous le titre (type CVE uniquement)
    const cveRef = item.type === 'cve'
      ? `<div class="item-cve-ref">&gt; ${item.cveId}</div>`
      : '';

    // Tags
    const tags = (item.tags || []).slice(0, 3)
      .map(t => `<span class="item-tag">${t}</span>`).join('');

    const readClass = item.read       ? 'is-read'       : '';
    const bmClass   = item.bookmarked ? 'is-bookmarked' : '';

    return `
<div class="feed-item sev-${sev} ${readClass} ${bmClass}"
     data-id="${item.id}"
     role="listitem"
     tabindex="0"
     aria-label="${item.title}">

  <div class="item-line1">
    <span class="sev-badge b-${sev}">${item.severity}</span>
    ${newBadge}
    ${cvssBadge}
    <span class="item-source">[${item.source}]</span>
    <span class="item-time">${Terminal.timeAgo(item.date)}</span>
    <button class="btn-bm" title="${item.bookmarked ? 'Retirer le bookmark' : 'Bookmarker'}"
            aria-label="bookmark">${item.bookmarked ? '★' : '☆'}</button>
  </div>

  <div class="item-title">${this._escape(item.title)}</div>
  ${cveRef}
  ${affectedLine}

  <div class="item-meta">
    <span class="cat-badge cat-${item.category}">${item.category.toUpperCase()}</span>
    ${tags}
  </div>
</div>`;
  },

  /* ── Escape HTML de base pour les titres ─────────────── */
  _escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /* ── Ouvre un article + marque comme lu ──────────────── */
  _openItem(item) {
    this._markRead(item);
    window.open(item.link, '_blank', 'noopener,noreferrer');
  },

  _markRead(item) {
    if (item.read) return;
    item.read = true;
    this.readIds.add(item.id);
    this._saveState();
    document.querySelector(`[data-id="${item.id}"]`)?.classList.add('is-read');
    this._updateStats();
  },

  markAllRead() {
    this.allItems.forEach(i => {
      i.read = true;
      this.readIds.add(i.id);
    });
    this._saveState();
    document.querySelectorAll('.feed-item').forEach(el => el.classList.add('is-read'));
    this._updateStats();
    Terminal.toast('Tous les articles marqués comme lus', 'ok', 2500);
  },

  /* ── Toggle bookmark ─────────────────────────────────── */
  _toggleBookmark(item) {
    item.bookmarked = !item.bookmarked;
    if (item.bookmarked) {
      this.bookmarkIds.add(item.id);
      Terminal.toast('Bookmark ajouté ★', 'ok', 2000);
    } else {
      this.bookmarkIds.delete(item.id);
      Terminal.toast('Bookmark retiré', 'info', 2000);
    }
    this._saveState();

    const el  = document.querySelector(`[data-id="${item.id}"]`);
    const btn = el?.querySelector('.btn-bm');
    el?.classList.toggle('is-bookmarked', item.bookmarked);
    if (btn) btn.textContent = item.bookmarked ? '★' : '☆';
  },

  /* ── Statistiques header ─────────────────────────────── */
  _updateStats() {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    this.allItems.forEach(i => { if (c[i.severity] !== undefined) c[i.severity]++; });

    document.getElementById('count-crit') .textContent = c.CRITICAL;
    document.getElementById('count-high') .textContent = c.HIGH;
    document.getElementById('count-med')  .textContent = c.MEDIUM;
    document.getElementById('count-low')  .textContent = c.LOW;
    document.getElementById('count-total').textContent = this.allItems.length;
    document.getElementById('feed-count') .textContent = CONFIG.FEEDS.filter(f => f.enabled).length + 1; // +1 NVD
  },

  _updateLastUpdate() {
    const el = document.getElementById('last-update');
    if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', { hour12: false });
  },

  /* ═══════════════════════════════════════════════════════
     FILTRES UI
  ═══════════════════════════════════════════════════════ */
  _setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => this._setFilter(btn.dataset.filter));
    });
  },

  _setFilter(filter) {
    this.activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === filter)
    );
    this._applyFilters();
  },

  /* ═══════════════════════════════════════════════════════
     RECHERCHE
  ═══════════════════════════════════════════════════════ */
  _setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;

    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.searchQuery = input.value.trim();
        this._applyFilters();
      }, 280);
    });
  },

  /* ═══════════════════════════════════════════════════════
     RACCOURCIS CLAVIER
  ═══════════════════════════════════════════════════════ */
  _setupKeyboard() {
    document.addEventListener('keydown', e => {
      const inInput = e.target.tagName === 'INPUT';

      if (inInput) {
        if (e.key === 'Escape') {
          e.target.value = '';
          this.searchQuery = '';
          this._applyFilters();
          e.target.blur();
        }
        return;
      }

      const map = {
        'r': () => this.refresh(),
        '/': () => { e.preventDefault(); document.getElementById('search-input')?.focus(); },
        't': () => Terminal.toggleTheme(),
        'm': () => this.markAllRead(),
        'b': () => this._setFilter('bookmarks'),
        'Escape': () => { this._setFilter('all'); },
        '1': () => this._setFilter('all'),
        '2': () => this._setFilter('critical'),
        '3': () => this._setFilter('high'),
        '4': () => this._setFilter('cve'),
        '5': () => this._setFilter('cyber'),
        '6': () => this._setFilter('tech'),
        '7': () => this._setFilter('unread'),
        '8': () => this._setFilter('bookmarks'),
      };

      const action = map[e.key] || map[e.key.toLowerCase()];
      if (action) action();
    });
  },

  /* ═══════════════════════════════════════════════════════
     AUTO-REFRESH
  ═══════════════════════════════════════════════════════ */
  _startAutoRefresh() {
    clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      this.refresh();
      Terminal.startCountdown(CONFIG.REFRESH_INTERVAL);
    }, CONFIG.REFRESH_INTERVAL);
  },

  /* ═══════════════════════════════════════════════════════
     PERSISTANCE (localStorage)
  ═══════════════════════════════════════════════════════ */
  _saveState() {
    try {
      localStorage.setItem('tv-read',      JSON.stringify([...this.readIds]));
      localStorage.setItem('tv-bookmarks', JSON.stringify([...this.bookmarkIds]));
    } catch (_) { /* quota dépassé ou mode privé */ }
  },

  _loadState() {
    try {
      const r = localStorage.getItem('tv-read');
      const b = localStorage.getItem('tv-bookmarks');
      if (r) this.readIds      = new Set(JSON.parse(r));
      if (b) this.bookmarkIds  = new Set(JSON.parse(b));
    } catch (_) {}
  },
};

/* ─── Lancement ─── */
document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(err => {
    console.error('[App] Fatal init error:', err);
    Terminal.setStatus(`FATAL: ${err.message}`, 'error');
    Terminal.hideLoading();
  });
});
