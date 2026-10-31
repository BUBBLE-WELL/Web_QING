(() => {
  const cursor = document.querySelector('[data-face-cursor]');
  const faces = globalThis.AgentFaceStates;
  // VIBRATO shows the Band-with pixel face (face.svg) instead of a text face.
  const pixelFaces = Object.freeze({ VIBRATO: 'face.svg' });
  const finePointer = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)');
  if (!cursor || !faces || !finePointer?.matches) return;

  const hideCursor = () => cursor.classList.remove('is-visible');
  const moveCursor = (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  };

  document.querySelectorAll('.points [data-face]').forEach((point) => {
    const pixel = pixelFaces[point.dataset.face];
    const face = faces[point.dataset.face] || faces.LISTEN;
    const showFace = () => {
      if (!pixel) {
        cursor.textContent = face;
        return;
      }
      const img = document.createElement('img');
      img.src = pixel;
      img.alt = '';
      cursor.replaceChildren(img);
    };

    point.addEventListener('pointerenter', (event) => {
        showFace();
        moveCursor(event);
        cursor.classList.add('is-visible');
      });
    point.addEventListener('pointermove', moveCursor);
    point.addEventListener('pointerleave', hideCursor);
  });

  globalThis.addEventListener('blur', hideCursor);
  document.documentElement.addEventListener('pointerleave', hideCursor);
})();

(() => {
  const dialog = document.querySelector('[data-video-dialog]');
  const player = dialog?.querySelector('[data-video-dialog-player]');
  const title = dialog?.querySelector('[data-video-dialog-title]');
  const badge = document.querySelector('[data-video-badge]');
  const slogan = document.querySelector('[data-video-hover]');
  if (!dialog || !player || typeof dialog.showModal !== 'function') return;

  // Plays the section video `id` (videos[].id in content.yaml) in the dialog.
  // Without an uploaded file the link falls back to scrolling to its section.
  const open = (id, event) => {
    const source = document.querySelector(`video[data-video-id="${id}"]`);
    if (!source) return;
    event?.preventDefault();
    badge?.classList.remove('is-visible');
    document.querySelectorAll('video[data-video-id]').forEach((video) => video.pause());
    const heading = source.closest('section')?.querySelector('h2');
    title.textContent = heading ? [...heading.childNodes].map((n) => n.textContent.trim()).filter(Boolean).join(' · ') : '';
    player.poster = source.getAttribute('poster') || '';
    if (player.getAttribute('src') !== source.getAttribute('src')) player.src = source.getAttribute('src');
    if (!dialog.open) dialog.showModal();
    player.play().catch(() => {});
  };
  dialog.addEventListener('close', () => {
    player.pause();
    player.currentTime = 0;
  });
  dialog.querySelector('[data-video-close]')?.addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the dialog element itself.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll('[data-video-open]').forEach((link) => {
    link.addEventListener('click', (event) => open(link.dataset.videoOpen, event));
  });
  if (!slogan || !badge) return;
  const target = slogan.dataset.videoHover;
  slogan.addEventListener('click', (event) => open(target, event));

  const finePointer = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)');
  if (!finePointer?.matches) {
    // No hover on touch screens: show the badge under the slogan as a tap target.
    badge.classList.add('is-static');
    slogan.after(badge);
    badge.addEventListener('click', (event) => open(target, event));
    return;
  }
  const move = (event) => {
    badge.style.left = `${event.clientX}px`;
    badge.style.top = `${event.clientY}px`;
  };
  slogan.addEventListener('pointerenter', (event) => { move(event); badge.classList.add('is-visible'); });
  slogan.addEventListener('pointermove', move);
  slogan.addEventListener('pointerleave', () => badge.classList.remove('is-visible'));
  globalThis.addEventListener('blur', () => badge.classList.remove('is-visible'));
})();

// Analytics (PostHog via /webqing/posthog-analytics.js): demo links and video plays,
// which the shared script does not track. No-op when the script is absent or blocked.
(() => {
  const track = (name, props) => globalThis.QingAnalytics?.capture(name, props);
  document.querySelectorAll('a[href="band-with/"]').forEach((link) => {
    const placement = link.closest('#share') ? 'share' : link.classList.contains('topbar-link') ? 'topbar' : link.classList.contains('point-link') ? 'point' : 'hero';
    link.addEventListener('click', () => track('demo_link_clicked', { placement }));
  });
  // First play of each video per player; the dialog player is matched back to its section video by src.
  const played = new Set();
  const report = (id, player) => {
    if (!id || played.has(`${player}:${id}`)) return;
    played.add(`${player}:${id}`);
    track('video_played', { video_id: id, player });
  };
  document.querySelectorAll('video[data-video-id]').forEach((video) => {
    video.addEventListener('play', () => report(video.dataset.videoId, 'section'));
  });
  const dialogPlayer = document.querySelector('[data-video-dialog-player]');
  dialogPlayer?.addEventListener('play', () => {
    const src = dialogPlayer.getAttribute('src');
    const source = [...document.querySelectorAll('video[data-video-id]')].find((video) => video.getAttribute('src') === src);
    report(source?.dataset.videoId, 'dialog');
  });
})();
