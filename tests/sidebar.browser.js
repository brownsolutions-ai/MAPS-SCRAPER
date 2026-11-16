// Run this function in the CRM page with a mobile viewport (up to 760px).
async function checkMobileSidebar(){
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const tick=()=>new Promise(resolve=>setTimeout(resolve,250));
  const open=()=>document.querySelector('[data-action="menu"]');
  const sidebar=()=>document.querySelector('.sidebar');
  assert(matchMedia('(max-width:760px)').matches,'Use a mobile viewport');
  if(sidebar().classList.contains('open')){sidebar().querySelector('[data-action="close-menu"]').click();await tick();}
  open().click();await tick();
  const close=sidebar().querySelector('[data-action="close-menu"]');
  assert(close,'The sidebar needs its own close button');
  assert(close.getBoundingClientRect().height>=44,'The close target must be at least 44px');
  assert(open().getAttribute('aria-expanded')==='true','The opener must report the open state');
  assert(document.activeElement===close,'Opening must focus the close button');
  assert(document.querySelector('.main').inert,'Background controls must be inactive');
  close.click();await tick();
  assert(!sidebar().classList.contains('open'),'The top button must close the sidebar');
  assert(document.activeElement===open(),'Closing must restore focus to the opener');
  assert(sidebar().inert&&!document.querySelector('.main').inert,'Closed menu must release background controls');
  open().click();await tick();
  const outside=document.elementFromPoint(innerWidth-5,Math.round(innerHeight/2));
  assert(outside?.matches('.sidebar-backdrop'),'The outside area must intercept taps');
  outside.click();await tick();
  assert(!sidebar().classList.contains('open'),'Tapping outside must close the sidebar');
  open().click();await tick();
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert(!sidebar().classList.contains('open'),'Escape must close the sidebar');
  open().click();await tick();
  sidebar().querySelector('[data-nav="whatsapp"]').click();await tick();
  assert(!sidebar().classList.contains('open'),'Navigation must close the sidebar');
  assert(!document.querySelector('.main').inert&&!document.body.classList.contains('menu-open'),'Navigation must release background and scroll');
  return {passed:true,width:innerWidth,checks:['top button','outside tap','Escape','focus','background','navigation']};
}
