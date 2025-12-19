(function(){
  function parseIsoDuration(iso){
    var h=0,m=0,s=0; var mH=iso.match(/(\d+)H/), mM=iso.match(/(\d+)M/), mS=iso.match(/(\d+)S/);
    if(mH) h=parseInt(mH[1],10); if(mM) m=parseInt(mM[1],10); if(mS) s=parseInt(mS[1],10);
    var total=h*3600+m*60+s; var hh=Math.floor(total/3600), mm=Math.floor((total%3600)/60), ss=total%60;
    function pad(n){return (n<10?'0':'')+n}
    return hh>0? (hh+':'+pad(mm)+':'+pad(ss)) : (mm+':'+pad(ss));
  }
  function setDuration(el, text){
    var badge=document.createElement('div');
    badge.className='suggestion-duration';
    badge.textContent=text;
    var thumb=el.querySelector('.suggestion-thumb');
    if(thumb) thumb.appendChild(badge);
  }
  function fetchDurations(ids){
    var key=window.YT_API_KEY; if(!key) return Promise.resolve({});
    var url='https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id='+ids.join(',')+'&key='+key;
    return fetch(url).then(function(r){return r.json()}).then(function(json){
      var map={};
      if(json && Array.isArray(json.items)){
        json.items.forEach(function(it){
          var id=it.id; var iso=it.contentDetails && it.contentDetails.duration; if(id && iso){ map[id]=parseIsoDuration(iso); }
        });
      }
      return map;
    }).catch(function(){ return {}; });
  }
  function init(){
    var items=[].slice.call(document.querySelectorAll('.suggestion-item[data-video-id]'));
    var main=document.querySelector('.video-area .yt-placeholder[data-video-id]') || document.querySelector('.video-container .yt-placeholder[data-video-id]');
    if(items.length===0 && !main) return;
    var ids=items.map(function(el){return el.getAttribute('data-video-id')}).filter(Boolean);
    if(main){ var mainId=main.getAttribute('data-video-id'); if(mainId) ids.push(mainId); }
    // Remove duplicates
    ids=[].filter.call(ids, function(v,i,a){ return a.indexOf(v)===i; });
    fetchDurations(ids).then(function(map){
      // Set durations on suggestion thumbnails
      items.forEach(function(el){
        var id=el.getAttribute('data-video-id'); var dur=map[id];
        if(dur) setDuration(el, dur);
      });
      // Add duration chip to meta row for main video
      if(main){
        var mId=main.getAttribute('data-video-id'); var mDur=map[mId];
        var metaRow=document.querySelector('.meta-row');
        if(mDur && metaRow){
          var chip=document.createElement('span');
          chip.className='meta-chip';
          chip.textContent=mDur;
          metaRow.appendChild(chip);
        }
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();