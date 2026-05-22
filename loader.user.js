
// ==UserScript==
// @name         Userscript Loader
// @namespace    https://nowww-nine.vercel.app
// @version      1.0.0
// @description  Token-based remote script loader
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
  "use strict";

  const BASE_URL = "https://nowww-nine.vercel.app";
  const TOKEN_KEY = "loader_token";

  function getToken() { return GM_getValue(TOKEN_KEY, null); }
  function setToken(t) { GM_setValue(TOKEN_KEY, t); }

  function promptToken() {
    const t = prompt("Enter your access token:");
    if (t?.trim()) { setToken(t.trim()); loadScript(t.trim()); }
  }

  function loadScript(token) {
    GM_xmlhttpRequest({
      method: "GET",
      url: BASE_URL + "/api/serve?token=" + encodeURIComponent(token),
      onload(res) {
        if (res.status === 200) {
          // Inject as <script> so GM_* APIs are accessible in scope
          const blob = new Blob([res.responseText], { type: "application/javascript" });
          const url = URL.createObjectURL(blob);
          const s = document.createElement("script");
          s.src = url;
          s.onload = () => {
            URL.revokeObjectURL(url);
            // Report usage
            GM_xmlhttpRequest({
              method: "POST",
              url: BASE_URL + "/api/done",
              headers: { "Content-Type": "application/json" },
              data: JSON.stringify({ token }),
            });
          };
          (document.head || document.documentElement).appendChild(s);
        } else {
          let msg;
          try { msg = JSON.parse(res.responseText).error; } catch { msg = res.status; }
          alert("[Loader] Error: " + msg);
          if (res.status === 403) setToken(null);
        }
      },
      onerror() { console.error("[Loader] Network error"); },
    });
  }

  GM_registerMenuCommand("Set / Change Token", promptToken);

  const token = getToken();
  if (token) { loadScript(token); } else { promptToken(); }
})();
