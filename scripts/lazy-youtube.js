// Centralized lazy YouTube loader for placeholders with class `.yt-placeholder`
(function(){
  'use strict';

  function loadVideo(placeholder){
    if(!placeholder || !placeholder.dataset || !placeholder.dataset.videoId) return;
    var id = placeholder.dataset.videoId;
    var iframe = document.createElement('iframe');
    iframe.setAttribute('src','https://www.youtube.com/embed/'+id+'?rel=0&controls=1&autoplay=1');
    iframe.setAttribute('title', placeholder.getAttribute('aria-label') || 'Vídeo');
    iframe.setAttribute('frameborder','0');
    iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen','');
    iframe.style.width='100%';
    iframe.style.height='100%';
    iframe.style.display='block';
    iframe.loading = 'lazy';
    try{ placeholder.parentNode.replaceChild(iframe, placeholder); }catch(e){ console.error('lazy-youtube: erro ao inserir iframe', e); }
  }

  document.addEventListener('click', function(e){
    var ph = e.target.closest && e.target.closest('.yt-placeholder');
    if(ph){ loadVideo(ph); }
  });

  document.addEventListener('keydown', function(e){
    if((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('yt-placeholder')){
      e.preventDefault();
      loadVideo(document.activeElement);
    }
  });

  // Expose for manual use
  window.lazyYouTube = { loadVideo: loadVideo };

})();
