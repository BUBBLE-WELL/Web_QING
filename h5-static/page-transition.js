/* Shared page curtain. Animation is decorative; readiness comes from the page. */
(function () {
  'use strict';
  var gate = document.currentScript && document.currentScript.hasAttribute('data-scene-gate');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var active = false, epoch = 0, focusBefore = null, slowTimer = null;
  var locked = new Map();
  var root = document.createElement('section');
  root.id = 'page-transition';
  root.hidden = true;
  root.setAttribute('aria-label', '页面加载 / Loading page');
  root.tabIndex = -1;
  root.innerHTML = '<div class="page-transition-mask" aria-hidden="true"></div>' +
    '<div class="page-transition-rig" aria-hidden="true"><div class="page-transition-thread"></div><svg class="page-transition-icon" viewBox="92.415 16.813 115.862 62.992" aria-hidden="true">      <g fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round">        <rect x="129.032" y="47.044" width="41.823" height="28.761" rx="7"></rect>        <rect x="139.786" y="40.276" width="19.845" height="10.553" rx="34"></rect>        <path d="M168.425 47.088C182.059 38.587 184.117 36.784 184.117 36.784L188.233 20.813" fill="none"></path>        <path d="M168.425 55.091L186.059 48.334L196.135 34.571" fill="none"></path>        <path d="M168.425 63.297L186.961 58.042L204.277 40.275" fill="none"></path>        <path d="M168.424 71.81S189.068 67.806 187.107 67.556C185.147 67.306 201.639 55.295 201.639 55.295" fill="none"></path>        <path d="M132.267 47.088C118.634 38.587 116.576 36.784 116.576 36.784L112.46 20.813" fill="none"></path>        <path d="M132.267 55.091L114.634 48.334L104.558 34.571" fill="none"></path>        <path d="M132.267 63.297L113.732 58.042L96.416 40.275" fill="none"></path>        <path d="M132.268 71.811S111.625 67.807 113.585 67.557C115.546 67.307 99.054 55.295 99.054 55.295" fill="none"></path>      </g>      <g fill="#fafafa" stroke="currentColor" stroke-width="2">        <rect x="141.529" y="41.541" width="5.174" height="6.579" rx="2.6"></rect>        <rect x="151.944" y="41.542" width="5.174" height="6.579" rx="2.6"></rect>      </g>    </svg></div>' +
    '<div class="page-transition-copy"><p role="status" aria-live="polite" id="page-transition-status"></p>' +
    '<div class="page-transition-actions" hidden><button type="button" data-transition-dismiss>先查看页面 / View page</button>' +
    '<button type="button" data-transition-retry>重新加载 / Retry</button></div></div>';
  document.body.appendChild(root);
  var mask = root.querySelector('.page-transition-mask');
  var rig = root.querySelector('.page-transition-rig');
  var copy = root.querySelector('.page-transition-copy');
  var status = root.querySelector('[role="status"]');
  var actions = root.querySelector('.page-transition-actions');
  var animations = new Set();
  function message(zh, en) { status.textContent = document.documentElement.lang.indexOf('zh') === 0 ? zh : en; }
  function lock(node) {
    if (node === root || !(node instanceof HTMLElement) || /^(SCRIPT|STYLE|LINK)$/.test(node.tagName) || locked.has(node)) return;
    locked.set(node, node.inert); node.inert = true;
  }
  var observer = new MutationObserver(function (changes) {
    if (active) changes.forEach(function (c) { c.addedNodes.forEach(lock); });
  });
  observer.observe(document.body, { childList: true });
  function unlock() { locked.forEach(function (was, node) { node.inert = was; }); locked.clear(); }
  function play(node, frames, duration) {
    var finalFrame = frames[frames.length - 1];
    if (reduced.matches || !node.animate) { Object.assign(node.style, finalFrame); return Promise.resolve(); }
    var animation = node.animate(frames, { duration: duration, easing: 'cubic-bezier(.22,.75,.18,1)', fill: 'forwards' });
    animations.add(animation);
    return new Promise(function (resolve) {
      var settled = false; var timer = setTimeout(done, duration + 300);
      function done() { if (settled) return; settled = true; clearTimeout(timer); Object.assign(node.style, finalFrame); animations.delete(animation); animation.cancel(); resolve(); }
      animation.finished.then(done, done);
    });
  }
  function begin() {
    active = true; epoch += 1;
    focusBefore = document.activeElement;
    root.hidden = false;
    root.dataset.phase = 'dropping';
    root.setAttribute('aria-busy', 'true');
    actions.hidden = true;
    message('正在打开页面…', 'Opening page…');
    Array.from(document.body.children).forEach(lock);
    root.focus({ preventScroll: true });
    clearTimeout(slowTimer);
    slowTimer = setTimeout(function () {
      if (!active) return;
      message('加载时间较长，你可以继续等待，或先查看页面。', 'Taking longer than expected. Keep waiting, or view the page.');
      actions.hidden = false;
    }, 12000);
    return epoch;
  }
  function drop() {
    return Promise.all([
      play(mask, [{ transform: 'translateY(-112vh)' }, { transform: 'translateY(3vh)', offset: .82 }, { transform: 'translateY(0)' }], 620),
      play(rig, [{ transform: 'translateY(-68vh)' }, { transform: 'translateY(2vh)', offset: .78 }, { transform: 'translateY(0)' }], 580),
      play(copy, [{ opacity: '0' }, { opacity: '1' }], 620)
    ]).then(function () { if (active && root.dataset.phase === 'dropping') root.dataset.phase = 'waiting'; });
  }
  function reset(restoreFocus) {
    epoch += 1;
    animations.forEach(function (a) { a.cancel(); }); animations.clear();
    clearTimeout(slowTimer); active = false;
    root.hidden = true; root.dataset.phase = 'idle'; root.removeAttribute('aria-busy');
    unlock();
    if (restoreFocus && focusBefore && focusBefore.isConnected && !focusBefore.closest('[inert]') && focusBefore.getClientRects().length) focusBefore.focus({ preventScroll: true });
    focusBefore = null;
  }
  async function lift() {
    if (!active) return;
    var token = epoch;
    clearTimeout(slowTimer); root.dataset.phase = 'lifting'; root.setAttribute('aria-busy', 'false');
    await Promise.all([
      play(mask, [{ transform: 'translateY(0)' }, { transform: 'translateY(2vh)', offset: .12 }, { transform: 'translateY(-112vh)' }], 720),
      play(rig, [{ transform: 'translateY(0)' }, { transform: 'translateY(1vh)', offset: .1 }, { transform: 'translateY(-68vh)' }], 660),
      play(copy, [{ opacity: '1' }, { opacity: '0' }], 280)
    ]);
    if (token === epoch) reset(true);
  }
  async function run(action) {
    if (active) return false;
    var token = begin();
    try {
      await drop(); if (token !== epoch) return false;
      await action(); if (token === epoch) await lift();
      return true;
    } catch (error) { fail(); console.warn('Page transition action failed', error); return false; }
  }
  function fail() {
    if (!active) return;
    root.dataset.phase = 'error'; root.setAttribute('aria-busy', 'false');
    message('场景暂时未能加载。可以重试，或先查看页面。', 'The scene could not load. Retry, or view the page.');
    actions.hidden = false; clearTimeout(slowTimer);
  }
  var gateDrop = null, readySeen = false;
  function ready() {
    if (readySeen || !gate) return;
    readySeen = true;
    Promise.resolve(gateDrop).then(function () { if (active) lift(); });
  }
  async function navigate(url) {
    if (active) return;
    var token = begin();
    await drop(); if (token !== epoch) return;
    try { window.location.assign(url); }
    catch (_) { await lift(); return; }
    // Recovery for a browser-blocked navigation; pageshow handles back/forward cache.
    clearTimeout(slowTimer);
    slowTimer = setTimeout(function () { if (active) lift(); }, 6000);
  }
  document.addEventListener('click', function (event) {
    var back = event.target.closest && event.target.closest('a[data-portfolio-return]');
    if (back && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && new URLSearchParams(location.search).get('from') === 'portfolio') {
      event.preventDefault();
      window.close(); // this viewer was opened in a separate tab; the source tab retains its state
      setTimeout(function () {
        back.textContent = '请切回原作品集标签页 / Switch to the portfolio tab';
      }, 250); // browser may refuse close for a manually copied URL; never reset the source to landing
      return;
    }
    var link = event.target.closest && event.target.closest('a[data-page-transition]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download')) return;
    if (link.target && link.target !== '_self') return; // preserve explicit new-tab semantics
    var url = new URL(link.href, location.href);
    if (!/^https?:$/.test(url.protocol)) return;
    event.preventDefault(); navigate(url.href);
  });
  root.querySelector('[data-transition-dismiss]').addEventListener('click', function () { lift(); });
  root.querySelector('[data-transition-retry]').addEventListener('click', function () { location.reload(); });
  window.addEventListener('pageshow', function (event) { if (event.persisted) reset(false); });
  window.QingTransition = { run: run, ready: ready, fail: fail, get active() { return active; } };
  if (gate) {
    begin(); message('正在加载三维场景…', 'Loading the 3D scene…'); gateDrop = drop();
    window.addEventListener('error', function (event) { if (event.filename && /main\.js|maplibre|three/.test(event.filename)) fail(); });
  }
}());
