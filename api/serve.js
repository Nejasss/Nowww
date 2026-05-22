import { readDB } from "./_github.js";

const USERSCRIPT_CONTENT = `
// ==UserScript==
// @name         Tarviral + Aincrad otomatis
// @namespace    http://tampermonkey.net/
// @version      15.2
// @match        *://tarviral.com/*
// @match        *://rodaemotor.com/*
// @match        *://aincradmods.com/getkey*
// @grant        GM_setClipboard
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  function clearSiteData() {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname;
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
    });
    localStorage.clear();
    sessionStorage.clear();
    console.log('[auto] Cleared');
  }

  if (location.hostname === 'aincradmods.com') {
    window.addEventListener('load', () => {
      function checkKey() {
        const bodyText = document.body.innerText;
        const done = bodyText.includes('Step completed') || bodyText.includes('key has been generated');
        if (!done) { setTimeout(checkKey, 800); return; }
        const keyMatch = bodyText.match(/[A-Z0-9]{4,}-[A-Z0-9]{4,}-[A-Z0-9]{4,}/);
        if (keyMatch) {
          const key = keyMatch[0];
          console.log('[Aincrad] Key:', key);
          try {
            GM_setClipboard(key);
          } catch {
            navigator.clipboard.writeText(key).catch(() => {
              const ta = document.createElement('textarea');
              ta.value = key;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              ta.remove();
            });
          }
          const toast = document.createElement('div');
          toast.textContent = 'Key copied: ' + key;
          toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
          setTimeout(clearSiteData, 1000);
        }
      }
      setTimeout(checkKey, 2000);
    });
    return;
  }

  const LEET_NO_NUM = { '@':'a','!':'i','&':'e' };
  function normalize(str) {
    return str.normalize('NFKD')
      .replace(/[^\\x00-\\x7F]/g, '')
      .replace(/[@!&]/g, m => LEET_NO_NUM[m] || m)
      .replace(/(?<!\\d)0(?!\\d)/g, 'o')
      .replace(/(?<!\\d)1(?!\\d)/g, 'i')
      .replace(/(?<!\\d)3(?!\\d)/g, 'e')
      .replace(/(?<!\\d)4(?!\\d)/g, 'a')
      .replace(/(?<!\\d)5(?!\\d)/g, 's')
      .toLowerCase().replace(/\\s+/g, ' ').trim();
  }

  function extractDelay(rawTxt) {
    const m = rawTxt.match(/\\b([6-9]|1[0-5])\\b/);
    return m ? parseInt(m[1]) * 1000 : 10000;
  }

  const S1_REQUIRED = ['anuncio','anúncio','bloqueado'];
  const S2 = ['continuar','avancar','avançar','seguir avante','proxima etapa','proximo passo','prosseguir','finalizar','clique aqui'];
  const S2_EXCLUDE = ['anuncio','anúncio','aguarde','segundos','espere','aperte','toque','publicidade'];
  const DELAY_KEY = 'tv_delay';
  let busy = false;

  function isVisible(el) {
    return !!(el.offsetParent) && el.offsetWidth > 0 && el.offsetHeight > 0;
  }

  function findBtn(keywords, exclude, strictTag = false) {
    const passes = strictTag ? ['button, a, [role=button]'] : ['button, a, [role=button]', 'div, span, p'];
    for (const sel of passes) {
      for (const el of document.querySelectorAll(sel)) {
        if (!isVisible(el)) continue;
        if (el.children.length > 2) continue;
        const n = normalize(el.textContent);
        if (n.length > 50) continue;
        if (keywords.some(k => n.includes(k)) && !exclude.some(k => n.includes(k))) return el;
      }
    }
    return null;
  }

  function findS1() {
    for (const el of document.querySelectorAll('button, a, [role=button], div, span, p')) {
      if (!isVisible(el)) continue;
      if (el.children.length > 2) continue;
      const n = normalize(el.textContent);
      if (n.length > 80) continue;
      if (S1_REQUIRED.some(k => n.includes(k))) return el;
    }
    return null;
  }

  function checkFinished() {
    const m = document.body.innerText.match(/(\\d+)\\/(\\d+)/);
    if (m && m[1] === m[2]) { console.log('[TV15] ' + m[1] + '/' + m[2] + ' selesai'); clearSiteData(); }
  }

  function waitAndClickS2(maxWait) {
    const start = Date.now();
    function attempt() {
      const btn = findBtn(S2, S2_EXCLUDE, true);
      if (btn) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        setTimeout(() => { checkFinished(); busy = false; doStep(); }, 2000);
        return;
      }
      Date.now() - start < maxWait ? setTimeout(attempt, 300) : (busy = false, doStep());
    }
    attempt();
  }

  function doStep() {
    if (busy) return;
    const savedDelay = sessionStorage.getItem(DELAY_KEY);
    if (savedDelay) {
      sessionStorage.removeItem(DELAY_KEY);
      busy = true;
      waitAndClickS2(parseInt(savedDelay));
      return;
    }
    const btn2 = findBtn(S2, S2_EXCLUDE, true);
    if (btn2) {
      busy = true;
      btn2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      setTimeout(() => { checkFinished(); busy = false; doStep(); }, 2000);
      return;
    }
    const btn1 = findS1();
    if (btn1) {
      busy = true;
      const delay = extractDelay(btn1.textContent);
      sessionStorage.setItem(DELAY_KEY, delay.toString());
      btn1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      setTimeout(() => location.reload(), 300);
    }
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(doStep, 1000));
  window.addEventListener('load', () => setTimeout(doStep, 1500));
  new MutationObserver(() => {
    if (!busy && !sessionStorage.getItem(DELAY_KEY)) doStep();
  }).observe(document.documentElement, { childList: true, subtree: true });

})();
`;

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token required" });

  let db;
  try {
    ({ db } = await readDB());
  } catch {
    return res.status(500).json({ error: "Storage error" });
  }

  const entry = db.tokens.find((t) => t.token === token);
  if (!entry) return res.status(403).json({ error: "Invalid token" });
  if (!entry.active) return res.status(403).json({ error: "Token disabled" });
  if (entry.maxUsage > 0 && entry.usageCount >= entry.maxUsage)
    return res.status(403).json({ error: "Usage limit reached" });

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(USERSCRIPT_CONTENT);
}
