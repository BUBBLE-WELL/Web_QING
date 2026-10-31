const desk=$('.desktop-field');
const draggableNodes = new WeakSet();
function activateDeskWindow(node) {
  if (!node) return;
  if (window.innerWidth <= 650) {
    document.querySelectorAll('[data-tool-window], [data-settings-panel]').forEach(other => {
      if (other !== node) other.hidden = true;
    });
    if (!node.matches('.band-demo-window')) window.BandDemoWindow?.collapse();
  }
  document.querySelectorAll('.console-window,.floating-tool,[data-settings-panel]').forEach(other => {
    const z = window.innerWidth <= 650 && other.matches('.band-demo-window') ? 75 : (other === node ? 22 : 21);
    other.style.setProperty('z-index', String(z), 'important');
  });
}

function constrainWindow(node, left, top, {avoidDock = false} = {}) {
  const initial = node.getBoundingClientRect();
  left ??= initial.left; top ??= initial.top;
  node.style.setProperty('position', 'fixed', 'important');
  node.style.setProperty('transform', 'none', 'important');
  const gap = 8;
  const header = document.querySelector('.console-topbar');
  const footer = document.querySelector('.console-footer');
  const dock = document.querySelector('.desk-dock');
  const dockBottom = (avoidDock || window.innerWidth <= 650) && dock && !dock.hidden ? dock.getBoundingClientRect().bottom : 0;
  const minTop = Math.max(0, header?.getBoundingClientRect().bottom || 0, dockBottom) + gap;
  let bottom = Math.min(window.innerHeight, footer?.getBoundingClientRect().top ?? (window.innerHeight - (footer?.getBoundingClientRect().height || 0))) - gap;
  const demo = document.querySelector('.band-demo-window');
  if (window.innerWidth <= 650 && demo && demo !== node && demo.getClientRects().length) {
    bottom = Math.min(bottom, demo.getBoundingClientRect().top - gap);
  }
  node.style.maxHeight = `${Math.max(36, Math.min(bottom - minTop, window.innerHeight * 0.82))}px`;
  const rect = node.getBoundingClientRect();
  node.style.setProperty('left', `${Math.max(gap, Math.min(left ?? rect.left, window.innerWidth - rect.width - gap))}px`, 'important');
  node.style.setProperty('top', `${Math.max(minTop, Math.min(top ?? rect.top, bottom - rect.height))}px`, 'important');
  node.style.setProperty('right', 'auto', 'important');
  node.style.setProperty('transform', 'none', 'important');
}
function centerWelcome(node) {
  const gap = 8;
  const minTop = Math.max(0, document.querySelector('.console-topbar')?.getBoundingClientRect().bottom || 0) + gap;
  const bottom = window.innerHeight - (document.querySelector('.console-footer')?.getBoundingClientRect().height || 0) - gap;
  node.style.setProperty('position', 'fixed', 'important');
  node.style.maxHeight = `${Math.max(36, Math.min(bottom - minTop, window.innerHeight * 0.82))}px`;
  node.style.setProperty('left', '50%', 'important');
  node.style.setProperty('top', `${(minTop + bottom) / 2}px`, 'important');
  node.style.setProperty('right', 'auto', 'important');
  node.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
}
function makeDraggable(node) {
  if (!node || draggableNodes.has(node)) return;
  draggableNodes.add(node);
  const bar = node.querySelector('.window-bar');
  let moving = false, resizing = false, resizeEdge = '', moved = false, dx = 0, dy = 0, resizeStart = null;
  if (node.matches?.('.drum-tool') && document.createElement) {
    for (const edge of ['top', 'bottom']) {
      const handle = document.createElement('div');
      handle.dataset.resizeEdge = edge;
      handle.setAttribute('aria-hidden', 'true');
      node.append(handle);
    }
  }
  node.addEventListener('pointerdown', () => activateDeskWindow(node), {capture: true});
  node.addEventListener('focusin', () => activateDeskWindow(node));
  const down = e => {
    const edge = e.target.closest?.('[data-resize-edge]')?.dataset.resizeEdge;
    if (edge) {
      e.preventDefault();
      const r = node.getBoundingClientRect();
      resizing = true;
      resizeEdge = edge;
      resizeStart = {top: r.top, height: r.height, bottom: r.bottom};
      node.setPointerCapture?.(e.pointerId);
      node.classList.add('is-resizing');
      return;
    }
    // Let the browser own the native bottom-right resize grip. The generic
    // pointer handler must not capture it as a window-drag gesture.
    if (node.matches?.('.drum-tool')) {
      const r = node.getBoundingClientRect();
      if (e.clientX >= r.right - 18 && e.clientY >= r.bottom - 18) return;
    }
    if (e.target.closest('button,input,select')) return;
    e.preventDefault();
    moving = true;
    moved = true;
    const r = node.getBoundingClientRect();
    dx = e.clientX - r.left; dy = e.clientY - r.top;
    node.setPointerCapture?.(e.pointerId);
    node.classList.add('is-dragging');
    node.style.setProperty('right', 'auto', 'important');
  };
  const move = e => {
    if (resizing && resizeStart) {
      const delta = e.clientY - (resizeStart.top + (resizeEdge === 'bottom' ? resizeStart.height : 0));
      const sign = resizeEdge === 'bottom' ? 1 : -1;
      const styles = getComputedStyle(node);
      const min = parseFloat(styles.minHeight) || 220;
      const max = parseFloat(styles.maxHeight) || (window.innerHeight - 90);
      const height = Math.max(min, Math.min(max, resizeStart.height + sign * delta));
      node.style.height = `${height}px`;
      if (resizeEdge === 'top') node.style.setProperty('top', `${resizeStart.bottom - height}px`, 'important');
      constrainWindow(node);
      return;
    }
    if (!moving) return;
    constrainWindow(node, e.clientX - dx, e.clientY - dy);
  };
  const up = () => { moving = false; resizing = false; resizeEdge = ''; resizeStart = null; node.classList.remove('is-dragging', 'is-resizing'); };
  (bar || node).addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  node.addEventListener('lostpointercapture', up);
  const fit = () => {
    if (node.hidden || !node.getClientRects().length) return;
    if (node.matches?.('[data-entry]') && !moved) centerWelcome(node);
    else constrainWindow(node, undefined, undefined, {avoidDock: node.matches?.('[data-window]') && !moved});
  };
  window.addEventListener('resize', fit);
  window.addEventListener('scroll', fit, {passive: true});
  new MutationObserver(fit).observe(node, {attributes: true, attributeFilter: ['hidden', 'class']});
  fit();
}
function closeAllTools(){if(window.innerWidth<=650)document.querySelectorAll('[data-tool-window]').forEach(tool=>{tool.hidden=true})}
function installDockDrag() {
  const dock = document.querySelector('.desk-dock');
  const handle = dock?.querySelector('[data-dock-handle]');
  if (!dock || !handle) return;
  let moving = false, dx = 0, dy = 0;
  const pinWidth = () => {
    const width = Math.min(dock.getBoundingClientRect().width, Math.max(0, window.innerWidth - 16));
    dock.style.setProperty('width', `${width}px`, 'important');
  };
  const place = (left, top) => {
    const gap = 8;
    pinWidth();
    const headerBottom = document.querySelector('.console-topbar')?.getBoundingClientRect().bottom || 0;
    const footerTop = document.querySelector('.console-footer')?.getBoundingClientRect().top || window.innerHeight;
    dock.style.setProperty('position', 'fixed', 'important');
    dock.style.setProperty('left', `${Math.max(gap, Math.min(left, window.innerWidth - dock.offsetWidth - gap))}px`, 'important');
    dock.style.setProperty('top', `${Math.max(headerBottom + gap, Math.min(top, footerTop - dock.offsetHeight - gap))}px`, 'important');
    dock.style.setProperty('right', 'auto', 'important');
  };
  handle.addEventListener('pointerdown', e => {
    e.preventDefault();
    const rect = dock.getBoundingClientRect();
    pinWidth();
    dx = e.clientX - rect.left; dy = e.clientY - rect.top;
    moving = true;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', e => { if (moving) place(e.clientX - dx, e.clientY - dy); });
  handle.addEventListener('keydown', e => {
    const delta = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10]}[e.key];
    if (!delta) return;
    e.preventDefault();
    const r = dock.getBoundingClientRect();
    place(r.left + delta[0], r.top + delta[1]);
  });
  const stop = () => { moving = false; };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
  window.addEventListener('resize', () => { if (dock.style.position === 'fixed') { const r = dock.getBoundingClientRect(); place(r.left, r.top); } });
}
function openTool(name){const tool=$(`[data-tool-window="${name}"]`);if(!tool)return;tool.hidden=false;activateDeskWindow(tool);makeDraggable(tool);tool.classList.remove('is-beating');constrainWindow(tool);tool.querySelector('[data-close-tool]')?.focus({preventScroll:true})}
function pulseDesk(){desk.classList.remove('is-beating');void desk.offsetWidth;desk.classList.add('is-beating');const pixel=$('[data-pixel-canvas]');if(pixel){const c=pixel.getContext('2d');c.fillStyle='#f7f8ec';c.fillRect(0,0,pixel.width,pixel.height);c.fillStyle='#162e1b';const x=Math.floor(Math.random()*pixel.width/6)*6,y=Math.floor(Math.random()*pixel.height/6)*6;c.fillRect(x,y,18,18);c.fillRect((x+24)%pixel.width,(y+12)%pixel.height,6,6)}const px=$('[data-pixel-status]');if(px)px.textContent='new trace from the live stream'}
function installDesk(){installDockDrag();makeDraggable($('[data-window]'));makeDraggable($('[data-entry]'));makeDraggable($('[data-settings-panel]'));document.querySelectorAll('[data-open-tool]').forEach(b=>b.addEventListener('click',()=>openTool(b.dataset.openTool)));document.querySelectorAll('[data-close-tool]').forEach(b=>b.addEventListener('click',()=>{const tool=b.closest('[data-tool-window]');if(!tool)return;if(tool.dataset.toolWindow==='tuner'&&typeof stopTuner==='function')stopTuner();tool.hidden=true;document.querySelector(`[data-open-tool="${tool.dataset.toolWindow}"]`)?.focus({preventScroll:true})}));const closeSettings=$('[data-close-settings]');if(closeSettings)closeSettings.addEventListener('click',()=>{$('[data-settings-panel]').hidden=true});try{localStorage.removeItem('user_profile')}catch{}const saveSettings=$('[data-save-settings]');if(saveSettings)saveSettings.addEventListener('click',()=>{setTimeout(()=>{let ui={};try{ui=JSON.parse(localStorage.getItem('agent-companion-ui')||'{}')||{}}catch{}const label=$('[data-agent-label]');if(label)label.textContent=`${ui.agentName||'guitar-mate'} / ${window.BandLanguage?.phrase('CHATBOX')??'CHATBOX'}`},0)});document.addEventListener('click',e=>{if(e.target.closest('[data-settings]')){closeAllTools();window.BandDemoWindow?.collapse();setTimeout(()=>{const panel=$('[data-settings-panel]');if(panel&&!panel.hidden){activateDeskWindow(panel);constrainWindow(panel);panel.querySelector('[data-close-settings]')?.focus({preventScroll:true})}},0)}},{capture:true});const openPlay=$('[data-open-play]');const syncPlayHint=()=>{let ui={};try{ui=JSON.parse(localStorage.getItem('agent-companion-ui')||'{}')||{}}catch{}const hint=$('[data-play-hint]');if(hint)hint.hidden=!ui.initialized};syncPlayHint();document.addEventListener('submit',e=>{if(e.target.matches('[data-init-form]'))setTimeout(syncPlayHint,0)});document.addEventListener('submit',e=>{if(!e.target.matches('[data-chat-form]'))return;const value=$('[data-chat-input]').value.trim().toLowerCase();if(value.startsWith('/drum'))openTool('drums');if(value.startsWith('/pixel'))openTool('pixel');if(value.startsWith('/tune'))openTool('tuner')},{capture:true});const tuner=$('.tuner-panel');if(tuner){tuner.classList.add('floating-tool','tuner-tool');tuner.dataset.toolWindow='tuner';desk.append(tuner);makeDraggable(tuner)}const dot=$('[data-event-dot]');if(dot)new MutationObserver(()=>{if(dot.classList.contains('pulse-on'))pulseDesk()}).observe(dot,{attributes:true,attributeFilter:['class']});}
installDesk();
