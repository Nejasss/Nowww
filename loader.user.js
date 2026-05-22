// ==UserScript==
// @name         Userscript Loader
// @namespace    https://nowww-nine.vercel.app
// @version      1.4.0
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

(function(){
  const _b=GM_getValue,_s=GM_setValue,_r=GM_xmlhttpRequest,_m=GM_registerMenuCommand;
  const _u="https://nowww-nine.vercel.app",_k="lt";

  function _d(b64, tok) {
    const key = tok.split('').map(c => c.charCodeAt(0));
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    let out = '';
    for (let i = 0; i < buf.length; i++) out += String.fromCharCode(buf[i] ^ key[i % key.length]);
    return decodeURIComponent(escape(out));
  }

  function _l(tok){
    _r({method:"GET",url:_u+"/api/serve?token="+encodeURIComponent(tok),
      onload(res){
        if(res.status===200){
          try {
            const code = _d(res.responseText.trim(), tok);
            const fn = new Function(
              'GM_setValue','GM_getValue','GM_xmlhttpRequest','GM_setClipboard','GM_registerMenuCommand',
              code
            );
            fn(_s,_b,_r,GM_setClipboard,_m);
            _r({method:"POST",url:_u+"/api/done",
              headers:{"Content-Type":"application/json"},
              data:JSON.stringify({token:tok})});
          } catch(e){ console.error("[L]",e); }
        } else {
          try{alert("[L] "+JSON.parse(res.responseText).error);}catch{}
          if(res.status===403)_s(_k,null);
        }
      },onerror(){}
    });
  }

  function _p(){const t=prompt("Token:");if(t?.trim()){_s(_k,t.trim());_l(t.trim());}}
  _m("Set Token",_p);
  const t=_b(_k,null);t?_l(t):_p();
})();
