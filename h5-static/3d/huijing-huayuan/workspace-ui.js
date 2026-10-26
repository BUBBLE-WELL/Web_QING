// Panel visibility is presentation state; collapsing never clears or cancels a task.
const tools=document.querySelector('#map-tools'),chat=document.querySelector('#spatial-agent');
const toolsToggle=document.querySelector('[data-tools-toggle]'),chatToggle=document.querySelector('[data-chat-toggle]');
if(tools&&chat&&toolsToggle&&chatToggle){
  chatToggle.disabled=true;
  chatToggle.title='空间助手尚未连接';
  addEventListener('huijing-spatial-available',()=>{chatToggle.disabled=false;chatToggle.removeAttribute('title');});
  let queued=false;
  const layout=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;window.dispatchEvent(new Event('huijing-layout-change'));});};
  const reflect=()=>{toolsToggle.setAttribute('aria-expanded',String(!tools.hidden));chatToggle.setAttribute('aria-expanded',String(!chat.hidden));layout();};
  tools.hidden=innerWidth<1100;
  let wideToolsOpen=true;
  toolsToggle.addEventListener('click',()=>{
    tools.hidden=!tools.hidden;
    if(innerWidth>=1100)wideToolsOpen=!tools.hidden;
    if(innerWidth<1100&&!tools.hidden){chat.hidden=true;chat.dataset.collapsed='true';}
    reflect();
  });
  chatToggle.addEventListener('click',()=>{
    if(chat.hidden){chat.dataset.collapsed='false';chat.hidden=false;if(innerWidth<1100)tools.hidden=true;document.querySelector('#spatial-input')?.focus({preventScroll:true});}
    else{chat.hidden=true;chat.dataset.collapsed='true';}
    reflect();
  });
  document.querySelector('[data-chat-close]')?.addEventListener('click',()=>{chat.hidden=true;chat.dataset.collapsed='true';reflect();chatToggle.focus({preventScroll:true});});
  let compact=innerWidth<1100;
  addEventListener('resize',()=>{const next=innerWidth<1100;if(next!==compact){if(next){wideToolsOpen=!tools.hidden;if(!chat.hidden)tools.hidden=true;}else tools.hidden=!wideToolsOpen;compact=next;}reflect();});
  new MutationObserver(reflect).observe(document.body,{attributes:true,subtree:true,attributeFilter:['hidden','open']});
  if(typeof ResizeObserver!=='undefined'){
    const observer=new ResizeObserver(layout);[tools,chat,document.querySelector('.workspace-header')].forEach(n=>n&&observer.observe(n));
  }
  reflect();
}
