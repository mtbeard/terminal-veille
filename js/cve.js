'use strict';

/* ════════════════════════════════════════════════════════════
   CVE.JS — Intégration NVD API v2.0
   National Vulnerability Database (nvd.nist.gov)
   ════════════════════════════════════════════════════════════ */

const CVE = {

  /* ── Fetch des CVE récents par sévérité ───────────────── */
  async fetchBySeverity(severity, startDate, endDate) {
    const params = new URLSearchParams({
      pubStartDate:   startDate,
      pubEndDate:     endDate,
      cvssV3Severity: severity,
      resultsPerPage: '20',
    });

    const url = `${CONFIG.NVD_BASE_URL}?${params}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'Accept': 'application/json' },
    });

    if (res.status === 429) throw new Error('NVD rate limited (429)');
    if (!res.ok)           throw new Error(`NVD HTTP ${res.status}`);

    const json = await res.json();
    return (json.vulnerabilities || []).map(v => this.normalize(v.cve, severity));
  },

  /* ── Chargement de toutes les sévérités configurées ───── */
  async loadAll() {
    const now   = new Date();
    const past  = new Date(now.getTime() - CONFIG.CVE_DAYS_BACK * 86400000);

    // Format ISO 8601 attendu par l'API NVD
    const fmt = d => d.toISOString().replace(/\.\d{3}Z$/, '.000');
    const start = fmt(past);
    const end   = fmt(now);

    const results = [];

    for (const sev of CONFIG.CVE_SEVERITIES) {
      try {
        const items = await this.fetchBySeverity(sev, start, end);
        results.push(...items);
        // Respect du rate-limit NVD : 5 req / 30 s sans clé API
        if (CONFIG.CVE_SEVERITIES.indexOf(sev) < CONFIG.CVE_SEVERITIES.length - 1) {
          await new Promise(r => setTimeout(r, 1200));
        }
      } catch (err) {
        console.warn(`[CVE] ${sev} — ${err.message}`);
      }
    }

    return results;
  },

  /* ── Normalisation d'un item NVD vers le format commun ── */
  normalize(cve, severity) {
    /* Description en anglais */
    const descriptions = cve.descriptions || [];
    const enDesc = (descriptions.find(d => d.lang === 'en') || descriptions[0] || {}).value
                 || 'No description available.';

    /* Score CVSS v3.1 → v3.0 → absent */
    const metrics  = cve.metrics || {};
    const cvssData = metrics.cvssMetricV31?.[0]?.cvssData
                  || metrics.cvssMetricV30?.[0]?.cvssData
                  || null;
    const score    = cvssData?.baseScore  ?? null;
    const vector   = cvssData?.vectorString ?? '';

    /* Produits affectés (CPE) */
    const products = new Set();
    for (const cfg of cve.configurations || []) {
      for (const node of cfg.nodes || []) {
        for (const match of node.cpeMatch || []) {
          const parts = (match.criteria || '').split(':');
          if (parts.length > 4 && parts[3] !== '*' && parts[4] !== '*') {
            products.add(`${parts[3]}/${parts[4]}`);
          }
        }
      }
    }
    const productList = [...products].slice(0, 5);

    /* Références */
    const refs = (cve.references || []).slice(0, 3).map(r => r.url);

    const pubDate = cve.published ? new Date(cve.published) : new Date();
    const cveId   = cve.id;

    return {
      id:              `cve-${cveId}`,
      type:            'cve',
      category:        'cve',
      source:          'NVD',
      sourceId:        'nvd',
      /* Titre = "CVE-XXXX-YYYY [CVSS: X.X]", description = détail */
      title:           enDesc.slice(0, 160) + (enDesc.length > 160 ? '…' : ''),
      cveId,
      description:     enDesc.slice(0, 320) + (enDesc.length > 320 ? '…' : ''),
      link:            `https://nvd.nist.gov/vuln/detail/${cveId}`,
      severity,
      cvssScore:       score,
      cvssVector:      vector,
      affectedProducts:productList,
      references:      refs,
      date:            pubDate,
      tags:            ['CVE', severity, ...productList.slice(0, 2).map(p => p.split('/')[1] || '')].filter(Boolean),
      read:            false,
      bookmarked:      false,
    };
  },

  /* ── Couleur selon score CVSS ─────────────────────────── */
  scoreColor(score) {
    if (score === null || score === undefined) return 'var(--text-dim)';
    if (score >= 9.0) return 'var(--critical)';
    if (score >= 7.0) return 'var(--high)';
    if (score >= 4.0) return 'var(--medium)';
    return 'var(--low)';
  },
};
