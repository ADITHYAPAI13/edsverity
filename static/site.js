const toggle=document.querySelector('.menu-toggle');
const mobile=document.getElementById('mobile-menu');
toggle?.addEventListener('click',()=>{
  const expanded=toggle.getAttribute('aria-expanded')==='true';
  toggle.setAttribute('aria-expanded',String(!expanded));
  mobile.hidden=expanded;
  toggle.setAttribute('aria-label',expanded?'Open navigation':'Close navigation');
});
document.addEventListener('click',event=>{
  for(const d of document.querySelectorAll('.nav-disclosure[open],.account-dropdown[open]')){
    if(!d.contains(event.target))d.removeAttribute('open');
  }
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    document.querySelectorAll('details[open]').forEach(d=>d.removeAttribute('open'));
    if(mobile&&!mobile.hidden){mobile.hidden=true;toggle?.setAttribute('aria-expanded','false')}
  }
});
