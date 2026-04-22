# 🖥️ Terminal Veille — Feed RSS / CVE

> Ton point de chute du matin pour la veille cybersécurité.
> Design minimaliste style terminal CLI, zéro dépendance.

![Version](https://img.shields.io/badge/version-1.0.0-00ff41?style=flat-square&labelColor=000000)
![License](https://img.shields.io/badge/license-MIT-00ff41?style=flat-square&labelColor=000000)
![Stack](https://img.shields.io/badge/HTML%20·%20CSS%20·%20JS-vanilla-00ff41?style=flat-square&labelColor=000000)

---

## Présentation

**Terminal Veille** est un tableau de bord à design _phosphore vert_ inspiré des terminaux CLI, conçu pour centraliser votre veille en cybersécurité et technologie. Il agrège en temps réel :

- Des **flux RSS** provenant de sources reconnues (The Hacker News, Krebs on Security, CERT-FR, Bleeping Computer…)
- Les **CVE critiques et élevées** du jour publiées sur le NVD via l'API v2.0

---

## Fonctionnalités

| Feature | Détail |
|---|---|
| **Agrégation RSS multi-sources** | 11 sources cyber & tech configurables |
| **CVE en temps réel** | NVD API v2.0 — CRITICAL & HIGH du jour |
| **Détection de sévérité** | Analyse titre + description par mots-clés |
| **Score CVSS v3** | Affiché et coloré pour chaque CVE |
| **Filtres** | ALL · CRITICAL · HIGH · CVE · CYBER · TECH · UNREAD · ★ |
| **Recherche live** | grep sur titre, description, source, tags, CVE-ID |
| **Bookmarks** | Persistés en localStorage |
| **Statut de lecture** | Articles lus mémorisés entre sessions |
| **Thèmes** | Phosphore vert (classic) / Ambre (rétro) |
| **Auto-refresh** | Toutes les 5 min avec compte à rebours |
| **Toast notifications** | Alertes visuelles non-bloquantes |
| **Raccourcis clavier** | Navigation 100% clavier |
| **Boot sequence** | Animation terminal au démarrage |
| **Effets CRT** | Scanlines + vignette phosphore |

---

## Raccourcis clavier

| Touche | Action |
|---|---|
| `R` | Rafraîchir tous les feeds |
| `/` | Focus sur la barre de recherche |
| `Esc` | Vider la recherche / retour filtre ALL |
| `1` | Filtre ALL |
| `2` | Filtre CRITICAL |
| `3` | Filtre HIGH |
| `4` | Filtre CVE uniquement |
| `5` | Filtre CYBER |
| `6` | Filtre TECH |
| `7` | Filtre UNREAD |
| `8` | Filtre BOOKMARKS |
| `B` | Basculer vers BOOKMARKS |
| `M` | Marquer tous les articles comme lus |
| `T` | Basculer le thème (vert / ambre) |

---

## Sources par défaut

### 🔴 Cybersécurité
- [The Hacker News](https://thehackernews.com)
- [Krebs on Security](https://krebsonsecurity.com)
- [Bleeping Computer](https://bleepingcomputer.com)
- [CERT-FR](https://www.cert.ssi.gouv.fr)
- [Dark Reading](https://www.darkreading.com)
- [Schneier on Security](https://www.schneier.com)
- [Wired Security](https://www.wired.com/category/security/)
- [Troy Hunt](https://www.troyhunt.com)

### 🔵 Technologie
- [Hacker News](https://news.ycombinator.com)
- [Ars Technica](https://arstechnica.com)
- [TechCrunch](https://techcrunch.com)

### 🟠 CVE / Vulnérabilités
- [NVD — National Vulnerability Database](https://nvd.nist.gov) (API v2.0)

---

## Installation

Aucune dépendance, aucune compilation requise.

```bash
git clone https://github.com/mtbeard/terminal-veille.git
cd terminal-veille

# Ouvrir directement dans le navigateur
open index.html

# Ou lancer un serveur local (recommandé pour contourner les restrictions CORS)
npx serve .
# → http://localhost:3000
```

> **Note :** L'application effectue des requêtes vers des APIs externes (proxy CORS allorigins.win, NVD API). Une connexion internet est requise.

---

## Configuration

Tout se passe dans `js/config.js` :

```js
// Intervalle de rafraîchissement (ms)
REFRESH_INTERVAL: 5 * 60 * 1000,

// Nombre de jours pour les CVEs
CVE_DAYS_BACK: 1,

// Sévérités CVE à récupérer
CVE_SEVERITIES: ['CRITICAL', 'HIGH'],

// Ajouter une source RSS
FEEDS: [
  {
    id:       'mon-feed',
    name:     'Mon Blog Sécu',
    url:      'https://monblog.fr/feed.xml',
    category: 'cyber', // ou 'tech'
    enabled:  true,
  },
  // ...
],
```

### Ajouter une clé API NVD (recommandé)

Sans clé : 5 requêtes / 30 s. Avec clé : 50 requêtes / 30 s.
Obtenez une clé gratuite sur [nvd.nist.gov/developers/request-an-api-key](https://nvd.nist.gov/developers/request-an-api-key)
puis ajoutez-la dans `js/cve.js` :

```js
headers: { 'apiKey': 'VOTRE-CLE-ICI' }
```

---

## Stack technique

- **HTML5** — Structure sémantique, accessible
- **CSS3** — Variables custom, animations, effets CRT, thèmes
- **JavaScript ES2022** — Fetch API, DOMParser, localStorage, AbortSignal
- **NVD API v2.0** — CVE temps réel, sans dépendance
- **allorigins.win** — Proxy CORS open-source pour les flux RSS

---

## Déploiement

Étant 100% statique, le projet se déploie sur n'importe quel hébergeur :

```bash
# GitHub Pages
git push origin main
# → Activer GitHub Pages sur /root dans Settings

# Netlify (drag & drop)
# Glisser le dossier terminal-veille/ sur app.netlify.com

# Vercel
npx vercel --prod
```

---

## Structure du projet

```
terminal-veille/
├── index.html          ← Structure HTML principale
├── css/
│   └── style.css       ← Thème terminal, CRT, animations
├── js/
│   ├── config.js       ← Configuration (feeds, settings)
│   ├── rss.js          ← Fetch & parse RSS (via proxy CORS)
│   ├── cve.js          ← NVD API v2.0
│   ├── terminal.js     ← Boot, horloge, toasts, thème
│   └── app.js          ← Logique principale
├── .gitignore
└── README.md
```

---

## Licence

MIT — Libre d'utilisation, de modification et de distribution.

---

*"Stay paranoid, stay patched."*
