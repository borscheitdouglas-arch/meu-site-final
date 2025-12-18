// Shared handlers for social share UI: copy link + analytics hooks
(function(){
  'use strict';

  function sendAnalytics(action, method){
    try{
      if(window.gtag){ window.gtag('event', action, { 'event_category':'share', 'method': method }); }
      if(window.dataLayer){ window.dataLayer.push({ 'event':'share_'+action, 'method': method }); }
    }catch(e){ /* ignore */ }
  }

  // Copy current page URL
  function handleCopyUrl(button){
    var url = window.location.href;
    navigator.clipboard.writeText(url).then(function(){
      var original = button.innerHTML;
      button.setAttribute('aria-pressed','true');
      button.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="margin-left:8px;font-size:0.9rem">Copiado</span>';
      sendAnalytics('copy', 'copy-button');
      setTimeout(function(){ button.removeAttribute('aria-pressed'); button.innerHTML = original; }, 1800);
    }).catch(function(err){ console.error('Erro ao copiar URL', err); });
  }

  // Track clicks on social anchors (data-share)
  function trackShareAnchor(anchor){
    var method = anchor.getAttribute('data-share') || anchor.hostname || anchor.href;
    sendAnalytics('click', method);
  }

  document.addEventListener('click', function(e){
    var copyBtn = e.target.closest && e.target.closest('[data-action="copy-url"]');
    if(copyBtn){ handleCopyUrl(copyBtn); return; }

    var shareAnchor = e.target.closest && e.target.closest('a[data-share]');
    if(shareAnchor){ trackShareAnchor(shareAnchor); /* allow default behavior (opening new tab) */ }
  });

  // If needed, expose helpers
  window.siteShare = { copyUrl: handleCopyUrl };

})();
