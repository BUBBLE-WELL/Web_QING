// In-place PLAY surface: the HUD is a foreground layer inside the Desk.
(function () {
  const button = document.querySelector('[data-open-play]');
  const popup = document.querySelector('[data-play-popup]');
  const frame = document.querySelector('[data-play-frame]');
  const close = document.querySelector('[data-play-close]');
  if (!button || !popup || !frame || !close) return;
  let loaded = false;
  const background = [...document.querySelectorAll('.console-shell > :not(.desktop-field), .desktop-field > :not(.play-popup)')];
  const previousInert = new Map();
  const setOpen = open => {
    if (open === !popup.hidden) return;
    popup.hidden = !open;
    document.querySelector('.console-shell')?.classList.toggle('play-popup-open', open);
    button.setAttribute('aria-expanded', String(open));
    if (open) {
      background.forEach(node => { previousInert.set(node, node.inert); node.inert = true; });
    } else {
      background.forEach(node => { node.inert = previousInert.get(node) || false; });
      previousInert.clear();
      frame.src = 'about:blank';
      loaded = false;
    }
    if (open && !loaded) { frame.src = 'play-hud.html?embedded=1'; loaded = true; }
    if (open) close.focus(); else button.focus();
  };
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setOpen(true);
  }, true);
  close.addEventListener('click', () => setOpen(false));
  popup.addEventListener('click', event => { if (event.target === popup) setOpen(false); });
  window.addEventListener('message', event => {
    if (event.source === frame.contentWindow && event.data?.type === 'agent-companion-play-close') setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (!popup.hidden && event.key === 'Escape') { event.preventDefault(); setOpen(false); }
  });
})();
