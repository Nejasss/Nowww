// ==UserScript==
// @name         Userscript Loader
// @namespace    https://nowww-nine.vercel.app
// @version      2.0.0
// @match        *://tarviral.com/*
// @match        *://rodaemotor.com/*
// @match        *://aincradmods.com/getkey*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @connect      nowww-nine.vercel.app
// @run-at       document-start
// ==/UserScript==

(function () {
  const BASE = "https://nowww-nine.vercel.app";
  const K_TOKEN = "lt_token";
  const K_PAUSED = "lt_paused";
  const K_POS = "lt_pos";

  // ── XOR decode ──────────────────────────────────────
  function xorDecode(b64, tok) {
    const key = tok.split('').map(c => c.charCodeAt(0));
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    let out = '';
    for (let i = 0; i < buf.length; i++) out += String.fromCharCode(buf[i] ^ key[i % key.length]);
    return decodeURIComponent(escape(out));
  }

  // ── State ────────────────────────────────────────────
  let token = GM_getValue(K_TOKEN, '');
  let paused = GM_getValue(K_PAUSED, false);
  let scriptLoaded = false;

  // ── UI ──────────────────────────────────────────────
  function buildUI() {
    // Remove existing
    const old = document.getElementById('__loader_ui');
    if (old) old.remove();

    const pos = GM_getValue(K_POS, { x: 16, y: 16 });

    const ui = document.createElement('div');
    ui.id = '__loader_ui';
    ui.style.cssText = `
      position:fixed; left:${pos.x}px; top:${pos.y}px; z-index:2147483647;
      background:#0f0f13; border:1px solid #2a2a3a; border-radius:10px;
      font-family:monospace; font-size:12px; color:#e2e8f0;
      box-shadow:0 4px 24px rgba(0,0,0,.6); min-width:220px;
      user-select:none;
    `;

    // Header (drag handle)
    const header = document.createElement('div');
    header.style.cssText = `
      background:#1a1a2e; padding:8px 12px; border-radius:10px 10px 0 0;
      cursor:move; display:flex; align-items:center; justify-content:space-between;
      border-bottom:1px solid #2a2a3a;
    `;
    header.innerHTML = `
      <span style="color:#7c3aed;font-weight:bold;font-size:11px;letter-spacing:1px">⬡ LOADER</span>
      <span id="__loader_status" style="font-size:10px;color:#64748b">—</span>
    `;

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'padding:10px 12px; display:flex; flex-direction:column; gap:8px;';

    // Token input row
    const tokRow = document.createElement('div');
    tokRow.style.cssText = 'display:flex;gap:6px;align-items:center;';
    tokRow.innerHTML = `
      <input id="__loader_tok" type="password" placeholder="Token..." value="${token}"
        style="flex:1;background:#070710;border:1px solid #2a2a3a;border-radius:5px;
        color:#e2e8f0;font-family:monospace;font-size:11px;padding:5px 8px;outline:none;" />
      <button id="__loader_save"
        style="background:#7c3aed;border:none;border-radius:5px;color:#fff;
        font-size:10px;padding:5px 8px;cursor:pointer;font-weight:bold;">SET</button>
    `;

    // Stats row
    const statsRow = document.createElement('div');
    statsRow.style.cssText = 'display:flex;gap:6px;justify-content:space-between;font-size:10px;color:#64748b;';
    statsRow.innerHTML = `
      <span>Usage: <b id="__loader_usage" style="color:#06b6d4">—</b></span>
      <span>Limit: <b id="__loader_limit" style="color:#f59e0b">—</b></span>
      <span>Status: <b id="__loader_active" style="color:#22c55e">—</b></span>
    `;

    // Controls row
    const ctrlRow = document.createElement('div');
    ctrlRow.style.cssText = 'display:flex;gap:6px;';
    ctrlRow.innerHTML = `
      <button id="__loader_toggle"
        style="flex:1;border:none;border-radius:5px;font-size:11px;padding:6px;
        cursor:pointer;font-weight:bold;background:${paused?'#16a34a':'#dc2626'};color:#fff;">
        ${paused ? '▶ Lanjut' : '⏸ Jeda'}
      </button>
      <button id="__loader_run"
        style="flex:1;background:#1e293b;border:1px solid #2a2a3a;border-radius:5px;
        color:#94a3b8;font-size:11px;padding:6px;cursor:pointer;font-weight:bold;">
        ↺ Jalankan
      </button>
    `;

    body.appendChild(tokRow);
    body.appendChild(statsRow);
    body.appendChild(ctrlRow);
    ui.appendChild(header);
    ui.appendChild(body);
    document.documentElement.appendChild(ui);

    // ── Events ──
    document.getElementById('__loader_save').onclick = () => {
      const val = document.getElementById('__loader_tok').value.trim();
      if (!val) return;
      token = val;
      GM_setValue(K_TOKEN, token);
      scriptLoaded = false;
      setStatus('Token saved', '#22c55e');
      fetchStats();
      runScript();
    };

    document.getElementById('__loader_toggle').onclick = () => {
      paused = !paused;
      GM_setValue(K_PAUSED, paused);
      const btn = document.getElementById('__loader_toggle');
      btn.textContent = paused ? '▶ Lanjut' : '⏸ Jeda';
      btn.style.background = paused ? '#16a34a' : '#dc2626';
      setStatus(paused ? 'Dijeda' : 'Berjalan', paused ? '#f59e0b' : '#22c55e');
      if (!paused && !scriptLoaded) runScript();
    };

    document.getElementById('__loader_run').onclick = () => {
      scriptLoaded = false;
      runScript();
    };

    // ── Drag ──
    let dx = 0, dy = 0, dragging = false;
    header.addEventListener('mousedown', e => {
      dragging = true;
      dx = e.clientX - ui.getBoundingClientRect().left;
      dy = e.clientY - ui.getBoundingClientRect().top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - ui.offsetWidth, e.clientX - dx));
      const y = Math.max(0, Math.min(window.innerHeight - ui.offsetHeight, e.clientY - dy));
      ui.style.left = x + 'px';
      ui.style.top = y + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      GM_setValue(K_POS, {
        x: parseInt(ui.style.left),
        y: parseInt(ui.style.top)
      });
    });

    // Touch drag (mobile)
    header.addEventListener('touchstart', e => {
      dragging = true;
      dx = e.touches[0].clientX - ui.getBoundingClientRect().left;
      dy = e.touches[0].clientY - ui.getBoundingClientRect().top;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - ui.offsetWidth, e.touches[0].clientX - dx));
      const y = Math.max(0, Math.min(window.innerHeight - ui.offsetHeight, e.touches[0].clientY - dy));
      ui.style.left = x + 'px';
      ui.style.top = y + 'px';
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      GM_setValue(K_POS, {
        x: parseInt(ui.style.left),
        y: parseInt(ui.style.top)
      });
    });
  }

  function setStatus(msg, color = '#64748b') {
    const el = document.getElementById('__loader_status');
    if (el) { el.textContent = msg; el.style.color = color; }
  }

  function setStats(usage, maxUsage, active) {
    const u = document.getElementById('__loader_usage');
    const l = document.getElementById('__loader_limit');
    const a = document.getElementById('__loader_active');
    if (u) u.textContent = usage;
    if (l) l.textContent = maxUsage === 0 ? '∞' : maxUsage;
    if (a) { a.textContent = active ? 'ON' : 'OFF'; a.style.color = active ? '#22c55e' : '#ef4444'; }
  }

  // ── Fetch token stats from admin API ────────────────
  function fetchStats() {
    if (!token) return;
    GM_xmlhttpRequest({
      method: 'GET',
      url: BASE + '/api/stats?token=' + encodeURIComponent(token),
      onload(res) {
        if (res.status === 200) {
          try {
            const d = JSON.parse(res.responseText);
            setStats(d.usageCount, d.maxUsage, d.active);
          } catch {}
        }
      }
    });
  }

  // ── Run script ──────────────────────────────────────
  function runScript() {
    if (!token) { setStatus('No token', '#ef4444'); return; }
    if (paused) { setStatus('Dijeda', '#f59e0b'); return; }
    if (scriptLoaded) return;

    setStatus('Loading...', '#06b6d4');

    GM_xmlhttpRequest({
      method: 'GET',
      url: BASE + '/api/serve?token=' + encodeURIComponent(token),
      onload(res) {
        if (res.status === 200) {
          try {
            const code = xorDecode(res.responseText.trim(), token);
            const fn = new Function(
              'GM_setValue', 'GM_getValue', 'GM_xmlhttpRequest', 'GM_setClipboard', 'GM_registerMenuCommand',
              code
            );
            fn(GM_setValue, GM_getValue, GM_xmlhttpRequest, GM_setClipboard, GM_registerMenuCommand);
            scriptLoaded = true;
            setStatus('Aktif ✓', '#22c55e');
            fetchStats();
            GM_xmlhttpRequest({
              method: 'POST', url: BASE + '/api/done',
              headers: { 'Content-Type': 'application/json' },
              data: JSON.stringify({ token })
            });
          } catch (e) {
            setStatus('Error', '#ef4444');
            console.error('[L]', e);
          }
        } else {
          let msg = res.status;
          try { msg = JSON.parse(res.responseText).error; } catch {}
          setStatus(msg, '#ef4444');
          if (res.status === 403) { GM_setValue(K_TOKEN, ''); token = ''; }
        }
      },
      onerror() { setStatus('Network error', '#ef4444'); }
    });
  }

  // ── Init ────────────────────────────────────────────
  function init() {
    buildUI();
    if (token) {
      fetchStats();
      if (!paused) runScript();
      else setStatus('Dijeda', '#f59e0b');
    } else {
      setStatus('Set token', '#f59e0b');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
