'use strict';

/* ════════════════════════════════════════════════════════════
   TERMINAL.JS — Effets UI style terminal CLI
   Boot sequence · Horloge · Toast · Countdown · Thème
   ════════════════════════════════════════════════════════════ */

const Terminal = {

  _clockTimer:     null,
  _countdownTimer: null,
  _countdownSecs:  0,

  /* ── Séquence de boot ─────────────────────────────────── */
  BOOT_SEQUENCE: [
    { text: 'BIOS v2.0 ─ TERMINAL VEILLE SYSTEMS',            delay: 80  },
    { text: 'POST CHECK........................................', delay: 250 },
    { text: '', delay: 0 },
    { text: '> THREAT INTELLIGENCE ENGINE ...... [<ok>OK</ok>]',  delay: 300 },
    { text: '> RSS AGGREGATION MODULE .......... [<ok>OK</ok>]',  delay: 280 },
    { text: '> CVE CRAWLER v2.0 ................ [<ok>OK</ok>]',  delay: 280 },
    { text: '> NVD API CONNECTION .............. [<ok>OK</ok>]',  delay: 280 },
    { text: '> FEED NORMALIZER ................. [<ok>OK</ok>]',  delay: 260 },
    { text: '> SEVERITY CLASSIFIER ............. [<ok>OK</ok>]',  delay: 260 },
    { text: '> LOCAL STORAGE LAYER ............. [<ok>OK</ok>]',  delay: 260 },
    { text: '> KEYBOARD HANDLER ................ [<ok>OK</ok>]',  delay: 260 },
    { text: '', delay: 0 },
    { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', delay: 200 },
    { text: '  SYSTEM READY ─ FETCHING THREAT INTELLIGENCE…',    delay: 100 },
    { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', delay: 0   },
  ],

  async boot() {
    const log = document.getElementById('boot-log');
    const bootCursor = document.querySelector('.boot-cursor');

    for (const step of this.BOOT_SEQUENCE) {
      await this._sleep(step.delay);

      if (step.text === '') {
        log.appendChild(document.createElement('br'));
        continue;
      }

      const line = document.createElement('div');
      line.className = 'boot-line';
      // Remplace <ok>...</ok> par du HTML coloré
      line.innerHTML = step.text
        .replace(/<ok>(.*?)<\/ok>/g, '<span class="ok">$1</span>')
        .replace(/<fail>(.*?)<\/fail>/g, '<span class="fail">$1</span>');

      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }

    await this._sleep(600);

    // Fade out boot screen
    const bootScreen = document.getElementById('boot-screen');
    bootScreen.style.transition = 'opacity 0.45s ease';
    bootScreen.style.opacity    = '0';
    await this._sleep(450);
    bootScreen.style.display = 'none';

    // Affiche le terminal principal
    const term = document.getElementById('terminal');
    term.style.display  = 'flex';
    term.style.opacity  = '0';
    term.style.transition = 'opacity 0.35s ease';
    await this._sleep(20);
    term.style.opacity  = '1';

    this.startClock();
  },

  /* ── Horloge en temps réel ────────────────────────────── */
  startClock() {
    const update = () => {
      const el = document.getElementById('clock');
      if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    };
    update();
    this._clockTimer = setInterval(update, 1000);
  },

  /* ── Compte à rebours avant prochain refresh ─────────── */
  startCountdown(ms) {
    clearInterval(this._countdownTimer);
    this._countdownSecs = Math.floor(ms / 1000);

    const el = document.getElementById('refresh-countdown');
    const update = () => {
      if (!el) return;
      const m = Math.floor(this._countdownSecs / 60);
      const s = this._countdownSecs % 60;
      el.textContent = `REFRESH IN ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      this._countdownSecs--;
      if (this._countdownSecs < 0) this._countdownSecs = Math.floor(ms / 1000);
    };
    update();
    this._countdownTimer = setInterval(update, 1000);
  },

  /* ── Mise à jour du bandeau de statut ─────────────────── */
  setStatus(msg, type = 'info') {
    const el = document.getElementById('status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className   = `status-${type}`;
  },

  /* ── Loading overlay ─────────────────────────────────── */
  showLoading(msg = 'FETCHING FEEDS...') {
    const overlay = document.getElementById('loading-overlay');
    const msgEl   = document.getElementById('loading-msg');
    if (overlay) overlay.classList.add('visible');
    if (msgEl)   msgEl.textContent = msg;
  },

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('visible');
  },

  /* ── Notifications Toast ─────────────────────────────── */
  toast(msg, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { info:'●', ok:'✔', warn:'▲', err:'✘' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type] || '●'}</span><span>${msg}</span>`;
    container.appendChild(t);

    requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('show')); });

    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, duration);
  },

  /* ── Bascule thème vert / ambre ──────────────────────── */
  toggleTheme() {
    const isAmber = document.body.classList.toggle('theme-amber');
    localStorage.setItem('tv-theme', isAmber ? 'amber' : 'green');
    this.toast(`THEME : ${isAmber ? 'AMBER' : 'GREEN'} PHOSPHOR`, 'info', 2500);
  },

  applyTheme() {
    if (localStorage.getItem('tv-theme') === 'amber') {
      document.body.classList.add('theme-amber');
    }
  },

  /* ── Formatage relatif de date ───────────────────────── */
  timeAgo(date) {
    const sec = Math.floor((Date.now() - date) / 1000);
    if (sec < 60)   return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400)return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  },

  /* ── Utilitaire sleep ─────────────────────────────────── */
  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
};
