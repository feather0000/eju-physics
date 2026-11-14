/* 首页：滚动时卡片渐显。头部内联脚本在支持 IntersectionObserver 且未要求减少动效时给 <html> 加 .ix-anim；
   这里给进入视口的 .rv 加 .in。若本文件未加载，头部脚本 3 秒后移除 .ix-anim，内容直接显示。 */
(function(){
  var d=document.documentElement;
  if(!d.classList.contains('ix-anim'))return;
  window.__ixReveal=1;
  var io=new IntersectionObserver(function(es){
    var k=0;
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      var el=e.target;
      el.style.transitionDelay=Math.min(k++,5)*60+'ms';
      el.classList.add('in');io.unobserve(el);
      setTimeout(function(){el.style.transitionDelay=''},1000);
    });
  },{rootMargin:'0px 0px 15% 0px',threshold:0});
  [].forEach.call(document.querySelectorAll('.rv'),function(el){
    io.observe(el);
    var r=el.getBoundingClientRect();
    if(r.top < window.innerHeight && r.bottom > 0){ el.classList.add('in'); io.unobserve(el); }
  });
})();
