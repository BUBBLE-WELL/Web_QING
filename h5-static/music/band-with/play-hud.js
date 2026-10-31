// Far-view PLAY HUD. Display client only: never sends controls, never in the audio path.
// Faces and words are indexed in A-Effet/agent_guitar_companion/docs/design_systems/FACE_VOCABULARY.md.
(() => {
  const params = new URLSearchParams(location.search);
  // Language: URL ?lang= overrides the shared setting in 'agent-companion-ui' (UI_SURFACES.md storage contract).
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem('agent-companion-ui') || '{}') || {}; } catch { /* no storage */ }
  const urlLang = params.get('lang');
  let lang = (urlLang || stored.lang) === 'en' ? 'en' : 'zh';
  let instrument = stored.instrument || 'electric_guitar';
  const demo = params.get('demo') === '1';
  const embedded = params.get('embedded') === '1';
  const base = params.get('api') || window.BandRuntime?.config.apiBase || location.origin;
  const STALE_MS = 2000;
  const reducer = globalThis.PerceptionFeedbackState;
  let perception = reducer.initialState(instrument);
  const acknowledgement = document.querySelector('[data-perception-ack]');
  function feedback(event) {
    perception = reducer.reduce(perception, event, performance.now());
    const visible = perception.acknowledgement && !panic && derived() !== 'OFFLINE';
    acknowledgement.hidden = !visible;
    acknowledgement.textContent = visible ? (lang === 'zh' ? '已确认' : 'CONFIRMED') : '';
  }
  // Ink-pixel face raster: Qing-tuned 2026-10-03 (FACE_VOCABULARY.md "Rasterized ink-pixel faces").
  const FACE_PX = 22, INK_ALPHA = 170;
  const FACE_FONT = '"MS Gothic","Noto Sans JP","Segoe UI Symbol",monospace';

  const FACES = globalThis.AgentFaceStates;
  const WORDS = {
    zh: {LISTEN: '欣赏中', FOLLOW: '我来啦', REST: '休息中', OFFLINE: '断线中', PANIC: '停停停'},
    en: {LISTEN: 'listening', FOLLOW: 'here I go', REST: 'resting', OFFLINE: 'lost you', PANIC: 'stop stop'},
  };
  const STATES = ['LISTEN', 'FOLLOW', 'REST', 'OFFLINE', 'PANIC'];
  const HINTS = {zh: '双击或按 F 全屏 · Esc 退出', en: 'double-click or F for fullscreen · Esc to exit'};

  // Selected-instrument pixel pictograms ('#' = ink). Precedent: Roland SC-8850 device drawing.
  const PICTOS = {
    electric_guitar: [
      '....######..........................',
      '..#########.........................',
      '.###########........................',
      '.###########.....................##.',
      '..##########.....................###',
      '..###.#####################.#.#.####',
      '..###.#####################.#.#.####',
      '..##########.....................###',
      '.###########.....................##.',
      '.###########........................',
      '..#########.........................',
      '....######..........................',
    ],
    bass_guitar: [
      '...#####...............................',
      '..#######..............................',
      '.########..............................',
      '.#########........................###..',
      '..#########.......................####.',
      '..##.######################.#.#.#.####.',
      '..##.######################.#.#.#.####.',
      '..#########.......................####.',
      '.#########........................###..',
      '.########..............................',
      '..#######..............................',
      '...#####...............................',
    ],
  };

  const hud = document.querySelector('[data-hud]');
  const face = document.querySelector('[data-face]');
  const word = document.querySelector('[data-word]');
  const output = document.querySelector('[data-output]');
  const picto = document.querySelector('[data-instrument]');
  const hint = document.querySelector('[data-hint]');
  document.documentElement.lang = lang;

  function drawInstrument() {
    const rows = PICTOS[instrument];
    picto.hidden = !rows;
    if (!rows) return;
    picto.width = rows[0].length;
    picto.height = rows.length;
    const ctx = picto.getContext('2d');
    ctx.clearRect(0, 0, picto.width, picto.height);
    ctx.fillStyle = getComputedStyle(picto).color; // body colour (state cue), not the frame
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') ctx.fillRect(x, y, 1, 1); }));
  }

  let serverState = 'LISTEN', panic = false, connected = false, lastFrameAt = 0, shown = '';

  // Draw the kaomoji small, keep only strong-ink pixels (1-bit), then scale by a whole number.
  function drawFace(text) {
    const m = document.createElement('canvas').getContext('2d');
    m.font = `${FACE_PX}px ${FACE_FONT}`;
    const w = Math.ceil(m.measureText(text).width) + 4, h = Math.ceil(FACE_PX * 1.3);
    m.canvas.width = w; m.canvas.height = h;
    m.font = `${FACE_PX}px ${FACE_FONT}`; m.textBaseline = 'middle'; m.fillText(text, 2, h / 2);
    const alpha = m.getImageData(0, 0, w, h).data;
    face.width = w; face.height = h;
    const ctx = face.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(face).color;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[(y * w + x) * 4 + 3] > INK_ALPHA) ctx.fillRect(x, y, 1, 1);
    sizeFace();
  }

  function sizeFace() {
    if (!face.width) return;
    const body = face.parentElement.getBoundingClientRect();
    const scale = Math.max(1, Math.floor(Math.min(body.width * 0.9 / face.width, Math.min(innerWidth * 0.24, innerHeight * 0.44) / face.height)));
    face.style.width = `${face.width * scale}px`;
    face.style.height = `${face.height * scale}px`;
  }
  window.addEventListener('resize', sizeFace);

  function render(state) {
    if (state === shown) return;
    shown = state;
    const hasFace = state in FACES;
    hud.dataset.state = state;
    hud.classList.toggle('is-placeholder', !hasFace);
    word.textContent = WORDS[lang][state];
    if (hasFace) drawFace(FACES[state]);
    drawInstrument();
  }

  function hit() {
    face.classList.add('is-hit');
    setTimeout(() => face.classList.remove('is-hit'), 140);
  }

  function setMuted(muted) { output.classList.toggle('is-muted', muted); }

  function derived() {
    if (panic) return 'PANIC';
    if (!connected || Date.now() - lastFrameAt > STALE_MS) return 'OFFLINE';
    return STATES.includes(serverState) ? serverState : 'LISTEN';
  }

  // Only live performance-state frames prove freshness; the status poll and
  // vision/drum events must not mask a stalled audio stream.
  function ingest(msg, fromStream) {
    if (!msg || typeof msg !== 'object') return;
    if (fromStream && msg.type === 'feature' && Number.isFinite(msg.time_s)) lastFrameAt = Date.now();
    if (typeof msg.state === 'string') serverState = msg.state;
    if (typeof msg.panic === 'boolean') { panic = msg.panic; if (panic) feedback({type:'panic'}); else if (perception.panic) feedback({type:'resume'}); }
    feedback({message:msg,captureAgeMs:window.BandPerception?.captureAge(msg.type==='perception_reset'?msg:(msg.envelope||msg.perception_evidence?.envelope))??null});
    if (typeof msg.agent_playing === 'boolean') setMuted(!msg.agent_playing);
    if (typeof msg.instrument === 'string' && msg.source === 'player' && msg.instrument !== instrument) { instrument = msg.instrument; drawInstrument(); }
    render(derived());
    if (msg.onset && shown === 'FOLLOW') hit();
  }

  async function pollStatus() {
    try {
      const res = await fetch(base + '/api/v1/status', {cache: 'no-store'});
      if (res.ok) ingest(await res.json(), false);
    } catch { /* offline is derived from staleness */ }
  }

  function connect() {
    let socket;
    try { socket = new WebSocket(base.replace(/^http/, 'ws') + '/api/v1/stream'); }
    catch { setTimeout(connect, 2000); return; }
    socket.addEventListener('open', () => { connected = true; feedback({type:'resume'}); });
    socket.addEventListener('message', e => { try { ingest(JSON.parse(e.data), true); } catch { /* ignore malformed frame */ } });
    socket.addEventListener('close', () => { connected = false; feedback({type:'disconnect'}); render(derived()); setTimeout(connect, 2000); });
  }

  function runDemo() {
    document.querySelector('[data-demo]').hidden = false;
    let i = 0;
    const step = () => { render(STATES[i % STATES.length]); setMuted(STATES[i % STATES.length] !== 'FOLLOW'); i += 1; };
    step();
    setInterval(step, 4000);
    setInterval(() => { if (shown === 'FOLLOW') hit(); }, 500);
  }

  // Fullscreen is entered before the take (F or double-click); Esc exits via the browser default.
  function enterFullscreen() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => { /* refused: stay windowed */ });
    }
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'f' || e.key === 'F') enterFullscreen();
    if (embedded && e.key === 'Escape' && !document.fullscreenElement) {
      e.preventDefault();
      window.parent.postMessage({type: 'agent-companion-play-close'}, '*');
    }
  });
  document.addEventListener('dblclick', enterFullscreen);

  // Desk changes reach this HUD through the shared setting, including inside the frame.
  window.addEventListener('storage', e => {
    if (e.key !== 'agent-companion-ui') return;
    let next = {};
    try { next = JSON.parse(e.newValue || '{}') || {}; } catch { return; }
    if (!urlLang && next.lang) { lang = next.lang === 'en' ? 'en' : 'zh'; document.documentElement.lang = lang; hint.textContent = HINTS[lang]; const s = shown; shown = ''; render(s); }
    if (next.instrument && next.instrument !== instrument) { instrument = next.instrument; feedback({type:'select',instrument}); drawInstrument(); }
  });

  hint.textContent = HINTS[lang];
  setTimeout(() => hint.classList.add('is-gone'), 3000);
  document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) hint.classList.add('is-gone'); });
  // × does exactly what Esc does: leave fullscreen. Hidden outside fullscreen.
  const exitButton = document.querySelector('[data-exit-fullscreen]');
  exitButton.addEventListener('click', e => { e.stopPropagation(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); });
  exitButton.addEventListener('dblclick', e => e.stopPropagation());
  document.addEventListener('fullscreenchange', () => { exitButton.hidden = !document.fullscreenElement; });

  render('OFFLINE');
  if (demo) { runDemo(); return; }
  window.BandPerception?.synchronize(base);
  setInterval(()=>window.BandPerception?.synchronize(base),15000);
  connect();
  pollStatus();
  setInterval(pollStatus, 3000);
  setInterval(() => {render(derived()); feedback({type:'tick'});}, 100);
})();
