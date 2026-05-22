// ==UserScript==
// @name         Userscript Loader
// @namespace    https://yourproject.vercel.app
// @version      1.0.0
// @description  Token-based remote script loader
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      yourproject.vercel.app
// ==/UserScript==

(function () {
  "use strict";

  const BASE_URL = "https://yourproject.vercel.app";
  const TOKEN_KEY = "loader_token";

  function getToken() {
    return GM_getValue(TOKEN_KEY, null);
  }

  function setToken(t) {
    GM_setValue(TOKEN_KEY, t);
  }

  function promptToken() {
    const t = prompt("Enter your access token:");
    if (t?.trim()) {
      setToken(t.trim());
      loadScript(t.trim());
    }
  }

  function loadScript(token) {
    GM_xmlhttpRequest({
      method: "GET",
      url: `${BASE_URL}/api/serve?token=${encodeURIComponent(token)}`,
      onload(res) {
        if (res.status === 200) {
          // Execute the script
          try {
            new Function(res.responseText)();
          } catch (e) {
            console.error("[Loader] Script exec error:", e);
          }
          // Report usage
          GM_xmlhttpRequest({
            method: "POST",
            url: `${BASE_URL}/api/done`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ token }),
          });
        } else {
          let msg;
          try { msg = JSON.parse(res.responseText).error; } catch { msg = res.status; }
          alert(`[Loader] Error: ${msg}`);
          // Clear invalid token so user can re-enter
          if (res.status === 403) setToken(null);
        }
      },
      onerror() {
        console.error("[Loader] Network error");
      },
    });
  }

  // Menu command to reset token
  GM_registerMenuCommand("Set / Change Token", promptToken);

  // Auto-load on page
  const token = getToken();
  if (token) {
    loadScript(token);
  } else {
    promptToken();
  }
})();
