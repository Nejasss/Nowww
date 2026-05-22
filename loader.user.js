// ==UserScript==
// @name         Userscript Loader
// @namespace    https://nowww-nine.vercel.app
// @version      1.2.0
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
  const _b=GM_getValue,_s=GM_setValue,_r=GM_xmlhttpRequest,_c=GM_setClipboard,_m=GM_registerMenuCommand;
  const _u="https://nowww-nine.vercel.app",_k="lt";

  async function _d(b64,tok){
    // Key derived from: SHA-256(token + reversed_token)
    const raw=tok+tok.split('').reverse().join('');
    const kb=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
    const key=await crypto.subtle.importKey("raw",kb,"AES-GCM",false,["decrypt"]);
    const buf=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:buf.slice(0,12)},key,buf.slice(12));
    return new TextDecoder().decode(plain);
  }

  function _i(code){
    const u=URL.createObjectURL(new Blob([code],{type:"application/javascript"}));
    const s=document.createElement("script");
    s.src=u; s.onload=()=>URL.revokeObjectURL(u);
    (document.head||document.documentElement).appendChild(s);
  }

  function _l(tok){
    _r({method:"GET",url:_u+"/api/serve?token="+encodeURIComponent(tok),
      onload(res){
        if(res.status===200){
          _d(res.responseText.trim(),tok).then(code=>{
            _i(code);
            _r({method:"POST",url:_u+"/api/done",
              headers:{"Content-Type":"application/json"},
              data:JSON.stringify({token:tok})});
          }).catch(()=>{});
        } else {
          try{const e=JSON.parse(res.responseText).error;alert("[L] "+e);}catch{}
          if(res.status===403)_s(_k,null);
        }
      },onerror(){}
    });
  }

  function _p(){const t=prompt("Token:");if(t?.trim()){_s(_k,t.trim());_l(t.trim());}}
  _m("Set Token",_p);
  const t=_b(_k,null);t?_l(t):_p();
})();
