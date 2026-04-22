'use strict';

/* ════════════════════════════════════════════════════════════
   CONFIG.JS — Configuration centrale de Terminal Veille
   Modifiez ce fichier pour ajouter/supprimer des sources
   et ajuster les comportements de l'application.
   ════════════════════════════════════════════════════════════ */

const CONFIG = {

  /* ── Proxy CORS ─────────────────────────────────────────
     Les navigateurs bloquent les requêtes cross-origin vers
     les flux RSS. On passe par un proxy public gratuit.
     Alternatives : https://corsproxy.io/?  ou auto-hébergé.
  ─────────────────────────────────────────────────────────── */
  CORS_PROXY: 'https://api.allorigins.win/get?url=',

  /* ── NVD API v2.0 (National Vulnerability Database) ─────
     Pas de clé API requise pour un usage basique.
     Limite : 5 requêtes / 30 s sans clé, 50 / 30 s avec clé.
     Pour ajouter une clé : ajouter le header 'apiKey' dans cve.js
  ─────────────────────────────────────────────────────────── */
  NVD_BASE_URL: 'https://services.nvd.nist.gov/rest/json/cves/2.0',

  /* ── Paramètres généraux ─────────────────────────────── */
  REFRESH_INTERVAL:   5 * 60 * 1000,  // Auto-refresh toutes les 5 min
  MAX_ITEMS_PER_FEED: 15,             // Articles max par source RSS
  MAX_TOTAL_ITEMS:    120,            // Articles max dans la liste finale
  CVE_DAYS_BACK:      1,             // CVEs publiés dans les X derniers jours
  CVE_SEVERITIES:     ['CRITICAL', 'HIGH'], // Sévérités CVE à récupérer

  /* ── Sources RSS ─────────────────────────────────────────
     category : 'cyber' | 'tech'
     enabled  : true | false (pour désactiver sans supprimer)
  ─────────────────────────────────────────────────────────── */
  FEEDS: [
    /* ── CYBERSÉCURITÉ ── */
    {
      id:       'thehackernews',
      name:     'The Hacker News',
      url:      'https://feeds.feedburner.com/TheHackersNews',
      category: 'cyber',
      enabled:  true
    },
    {
      id:       'krebsonsecurity',
      name:     'Krebs on Security',
      url:      'https://krebsonsecurity.com/feed/',
      category: 'cyber',
      enabled:  true
    },
    {
      id:       'bleepingcomputer',
      name:     'Bleeping Computer',
      url:      'https://www.bleepingcomputer.com/feed/',
      category: 'cyber',
      enabled:  true
    },
    {
      id:       'certfr',
      name:     'CERT-FR',
      url:      'https://www.cert.ssi.gouv.fr/feed/',
      category: 'cyber',
      enabled:  true
    },
    {
      id:       'darkreading',
      name:     'Dark Reading',
      url:      'https://www.darkreading.com/rss.xml',
      category: 'cyber',
      enabled:  true
    },
    {
      id:       'schneier',
      name:     'Schneier on Security',
      url:      'https://www.schneier.com/feed/atom/',
      category: 'cyber',
      enabled:  true
    },
    {
      id:       'wired-security',
      name:     'Wired Security',
      url:      'https://www.wired.com/feed/category/security/latest/rss',
      category: 'cyber',
      enabled:  true
    },
    {
      id:       'troyhunt',
      name:     'Troy Hunt',
      url:      'https://feeds.feedburner.com/TroyHunt',
      category: 'cyber',
      enabled:  true
    },
    /* ── TECHNOLOGIE ── */
    {
      id:       'hackernews',
      name:     'Hacker News',
      url:      'https://hnrss.org/frontpage',
      category: 'tech',
      enabled:  true
    },
    {
      id:       'arstechnica',
      name:     'Ars Technica',
      url:      'https://feeds.arstechnica.com/arstechnica/technology-lab',
      category: 'tech',
      enabled:  true
    },
    {
      id:       'techcrunch',
      name:     'TechCrunch',
      url:      'https://techcrunch.com/feed/',
      category: 'tech',
      enabled:  true
    },
  ],

  /* ── Mots-clés de détection de sévérité ────────────────
     Analysés dans le titre + description de chaque article.
     L'ordre est important : CRITICAL testé en premier.
  ─────────────────────────────────────────────────────────── */
  SEVERITY_KEYWORDS: {
    critical: [
      'critical', 'critique', '0-day', 'zero-day', 'zero day',
      'actively exploited', 'in the wild', 'wormable',
      'emergency patch', 'emergency update', 'rce unauthenticated',
      'unauthenticated rce', 'ransomware attack', 'data breach',
      'mass exploitation', 'patch now', 'cisa kev',
    ],
    high: [
      'high severity', 'high-severity', 'rce', 'remote code execution',
      'privilege escalation', 'authentication bypass', 'auth bypass',
      'sql injection', 'sqli', 'xxe', 'deserialization',
      'path traversal', 'arbitrary code', 'important', 'élevé',
      'ransomware', 'backdoor', 'rootkit', 'apt', 'nation-state',
    ],
    medium: [
      'medium', 'moderate', 'modéré', 'xss', 'csrf',
      'cross-site', 'injection', 'vulnerability', 'vulnérabilité',
      'flaw', 'weakness', 'misconfiguration', 'exposure',
    ],
  },

};
