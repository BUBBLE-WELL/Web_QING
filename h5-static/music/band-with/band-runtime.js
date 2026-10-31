// Hosted-demo runtime: access key gate, recorded-session replay, and keyed live API.
// Inactive unless the deployment build embeds <script type="application/json" id="band-deploy">,
// so the Local and Web services keep their existing fetch/WebSocket behaviour.
(function (root) {
  'use strict';

  const KEY_STORAGE = 'band-with-access-key';
  const MODE_STORAGE = 'band-with-mode';
  const ENVELOPE_POINTS = 64;

  // ---- Pure helpers (also exercised by tests/test_band_runtime.cjs) ----
  function parseFixture(text) {
    const frames = [];
    let meta = null;
    for (const line of String(text).split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      if (row.type === 'demo_meta') meta = row;
      else if (row.type === 'feature' && Number.isFinite(row.time_s)) frames.push(row);
    }
    return {meta, frames, duration: frames.length ? frames[frames.length - 1].time_s : 0};
  }

  function framesUntil(frames, fromIndex, elapsed) {
    let index = fromIndex;
    const due = [];
    while (index < frames.length && frames[index].time_s <= elapsed) due.push(frames[index++]);
    return {due, next: index};
  }

  // A rolling RMS history drawn as the waveform strip; labelled as an envelope, not samples.
  function envelope(history) {
    const recent = history.slice(-ENVELOPE_POINTS);
    const top = Math.max(0.02, ...recent);
    return recent.map(v => Math.round((v / top) * 1000) / 1000);
  }

  function holdFrame(frame) {
    const base = frame || {type: 'feature', time_s: 0, state: 'LISTEN', rms: 0, peak: 0, silence: true};
    return {...base, onset: false, hold: true, source: 'demo-replay'};
  }

  function demoStatus(frame) {
    const state = frame ? frame.state : 'LISTEN';
    return {
      schema: 'agent-companion.status.v1', runtime_mode: 'demo', state,
      rms: frame ? frame.rms : 0, peak: frame ? frame.peak : 0,
      monitor: false, monitor_mode: 'DEMO REPLAY', latency_ms: null,
      agent_playing: state === 'FOLLOW', capabilities: {drum_mix: false},
    };
  }

  function demoResponse(path, method, frame) {
    if (path.endsWith('/api/v1/status')) return [200, demoStatus(frame)];
    if (path.endsWith('/api/v1/config')) return [200, {runtime_mode: 'demo', monitor: false, clean_mix: 0, drum_mix: 0}];
    if (path.endsWith('/api/v1/capabilities')) return [200, {schema: 'agent-companion.capabilities.v1', runtime_mode: 'demo', audio_analysis: {available: false}, vision_analysis: {available: false}, local_hardware: {available: false}}];
    if (path.endsWith('/api/v1/health')) return [200, {ok: true, runtime_mode: 'demo'}];
    if (path.endsWith('/api/v1/drums')) return [200, {available: false, reason: '演示回放中 · 切到 🎤 实时体验即可使用鼓 / switch to live to play drums'}];
    if (path.endsWith('/api/v1/devices')) return [503, {error: 'demo-replay'}];
    if (path.endsWith('/api/v1/vision/frame')) return [501, {error: 'vision-unavailable-in-demo'}];
    if (method === 'POST' && ['/api/v1/vision/stop', '/api/v1/session/teardown'].some(endpoint => path.endsWith(endpoint))) return [200, {ok: true, runtime_mode: 'demo', retained: false}];
    return [404, {error: 'not-found'}];
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await root.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const core = {parseFixture, framesUntil, envelope, holdFrame, demoStatus, demoResponse, sha256Hex};
  if (typeof module === 'object' && module.exports) { module.exports = core; return; }

  const configNode = root.document && root.document.getElementById('band-deploy');
  if (!configNode) return;
  const config = JSON.parse(configNode.textContent || '{}');
  const doc = root.document;
  const nativeFetch = root.fetch.bind(root);
  const NativeWebSocket = root.WebSocket;
  const parentRuntime = (() => { try { return root.parent !== root && root.parent.BandRuntime ? root.parent.BandRuntime : null; } catch { return null; } })();
  const storage = (area, key, value) => { try { if (value === undefined) return root[area].getItem(key); if (value === null) root[area].removeItem(key); else root[area].setItem(key, value); } catch { return null; } return null; };

  const uiText = (english, chinese) => {
    let language = 'en';
    try { language = root.BandLanguage?.current() || JSON.parse(storage('localStorage', 'agent-companion-ui') || '{}').lang || 'en'; } catch {}
    return language === 'zh' ? chinese : english;
  };

  // ---- Access gate ----
  doc.documentElement.classList.add('band-locked');
  const lockStyle = doc.createElement('style');
  lockStyle.textContent = '.band-locked .console-shell,.band-locked .hud-field{visibility:hidden}' +
    '.band-gate{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:#d9f6a2;font-family:var(--data);color:#162e1b}' +
    '.band-gate form{width:min(360px,calc(100vw - 32px));border:3px solid #162e1b;background:#f7f8ec;box-shadow:8px 8px 0 #162e1b}' +
    '.band-gate header{background:#162e1b;color:#f7f8ec;padding:6px 10px;font:20px var(--pixel)}' +
    '.band-gate .band-gate-body{display:grid;gap:10px;padding:16px}.band-gate label{font-size:12px;letter-spacing:.08em}' +
    '.band-gate input{font:16px var(--data);padding:8px;border:1px solid #162e1b;background:#fff}' +
    '.band-gate button{font:14px var(--data);padding:8px;border:1px solid #162e1b;border-right-width:3px;border-bottom-width:3px;background:#162e1b;color:#f7f8ec;cursor:pointer}' +
    '.band-gate p{margin:0;font-size:12px;color:#405447}.band-gate .band-gate-error{color:#8a1c1c}' +
    '.band-demo-bar{position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:60;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;max-width:calc(100vw - 32px);padding:6px 8px;border:2px solid #162e1b;background:#f7f8ec;box-shadow:4px 4px 0 #162e1b;font:12px var(--data);color:#162e1b}' +
    '.band-demo-bar button{font:12px var(--data);padding:5px 8px;border:1px solid #162e1b;border-right-width:3px;border-bottom-width:3px;background:#f7f8ec;color:#162e1b;cursor:pointer}' +
    '.band-demo-bar button.is-primary{background:#162e1b;color:#f7f8ec}.band-demo-bar [data-band-label]{padding:0 4px}' +
    '.band-demo-bar button:focus-visible,.band-gate button:focus-visible,.band-gate input:focus-visible{outline:3px solid #8fbf3a;outline-offset:2px}' +
    // DEMO.EXE: a movable Desk window, docked bottom-left above the footer by default.
    '.band-demo-window{width:auto!important;max-width:calc(100vw - 32px);z-index:6;min-height:0}' +
    '.band-demo-window .window-bar{cursor:grab;font-size:18px;min-height:30px}' +
    '.band-demo-window .band-demo-bar{position:static;transform:none;max-width:none;box-shadow:none;border:0;padding:8px 10px;justify-content:flex-start}' +
    '.band-demo-window.is-minimized .band-demo-bar{display:none}' +
    '.band-demo-window .band-demo-bar{min-height:0;overflow-y:auto}' +
    '@media(max-width:650px){.band-demo-window{max-width:calc(100vw - 16px);z-index:75!important}.band-demo-window .window-bar{min-height:40px}.band-demo-window .window-buttons button{width:36px;height:32px}.band-demo-window .band-demo-bar{font-size:11px}.band-demo-window .band-demo-bar button{min-height:40px}}' +
    '.band-locked .band-demo-bar{display:none}';
  doc.head.appendChild(lockStyle);

  let unlock;
  const ready = new Promise(resolve => { unlock = resolve; });
  let accessKey = '';

  async function tryKey(candidate) {
    if (!candidate || !config.accessKeySha256) return false;
    return [config.accessKeySha256,...(config.reviewKeySha256s || [])].includes(await sha256Hex(candidate));
  }

  function finishUnlock(key) {
    accessKey = key;
    storage('localStorage', KEY_STORAGE, key);
    doc.documentElement.classList.remove('band-locked');
    doc.querySelector('.band-gate')?.remove();
    unlock();
  }

  function showGate(failed) {
    if (doc.querySelector('.band-gate')) return;
    const gate = doc.createElement('div');
    gate.className = 'band-gate';
    gate.innerHTML = '<form><header>BAND-WITH / ACCESS</header><div class="band-gate-body">' +
      '<label for="band-gate-key">' + uiText('ACCESS KEY','访问口令') + '</label>' +
      '<input id="band-gate-key" type="password" autocomplete="off" required>' +
      '<button type="submit">' + uiText('ENTER','进入') + '</button>' +
      '<p>' + uiText('Open your invitation link or enter an access key.','请打开邀请链接，或输入访问口令。') + '</p>' +
      '<p class="band-gate-error" role="alert"' + (failed ? '' : ' hidden') + '>' + uiText('Incorrect key','口令不正确') + '</p></div></form>';
    gate.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const value = gate.querySelector('input').value.trim();
      if (await tryKey(value)) finishUnlock(value);
      else gate.querySelector('.band-gate-error').hidden = false;
    });
    const mount = () => { doc.body.appendChild(gate); gate.querySelector('input').focus(); };
    if (doc.body) mount(); else doc.addEventListener('DOMContentLoaded', mount, {once: true});
  }

  (async () => {
    if (parentRuntime) { await parentRuntime.ready; finishUnlock(parentRuntime.key()); return; }
    const url = new URL(root.location.href);
    const fromUrl = url.searchParams.get('key');
    if (fromUrl !== null) {
      url.searchParams.delete('key');
      root.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    for (const candidate of [fromUrl, storage('localStorage', KEY_STORAGE)]) {
      if (await tryKey(candidate)) { finishUnlock(candidate); return; }
    }
    if (fromUrl) storage('localStorage', KEY_STORAGE, null);
    showGate(Boolean(fromUrl));
  })();

  // ---- Mode and replay bus ----
  const apiPrefixes = [config.apiBase, root.location.origin].filter(Boolean).map(p => p.replace(/\/$/, '') + '/api/');
  const isApi = url => apiPrefixes.some(p => String(url).startsWith(p)) || String(url).startsWith('/api/');
  // Root-relative clients must use the same deployed API prefix as the Desk.
  function apiTarget(url) {
    const target = new URL(url, root.location.href);
    if (config.apiBase && target.origin === root.location.origin && target.pathname.startsWith('/api/')) {
      const deployed = new URL(config.apiBase, root.location.href);
      deployed.pathname = deployed.pathname.replace(/\/$/, '') + target.pathname;
      deployed.search = target.search;
      return deployed.toString();
    }
    return url;
  }
  let mode = parentRuntime ? null : (storage('sessionStorage', MODE_STORAGE) === 'live' && config.live ? 'live' : 'replay');
  const currentMode = () => parentRuntime ? parentRuntime.mode() : mode;

  function createBus() {
    const listeners = new Set();
    let fixture = {frames: [], duration: 0};
    let index = 0, startedAt = 0, offset = 0, playing = false, timer = 0, last = null;
    const history = [];
    const emit = (type, payload) => listeners.forEach(fn => { try { fn(type, payload); } catch { /* listener errors stay local */ } });
    const loaded = nativeFetch(config.fixture || 'demo/session.jsonl', {cache: 'no-store'})
      .then(r => r.text()).then(text => { fixture = parseFixture(text); emit('loaded', fixture); });
    function tick() {
      const elapsed = offset + (performance.now() - startedAt) / 1000;
      const {due, next} = framesUntil(fixture.frames, index, elapsed);
      index = next;
      for (const frame of due) {
        history.push(frame.rms);
        if (history.length > ENVELOPE_POINTS * 2) history.splice(0, history.length - ENVELOPE_POINTS);
        last = {...frame, waveform: envelope(history), schema: 'agent-companion.feature.v1', source: 'demo-replay'};
        emit('frame', last);
      }
      emit('progress', {elapsed: Math.min(elapsed, fixture.duration), duration: fixture.duration});
      if (index >= fixture.frames.length) { pause(); emit('ended', {}); }
    }
    function play() {
      if (playing) return;
      if (index >= fixture.frames.length) restart(false);
      playing = true; startedAt = performance.now();
      timer = root.setInterval(tick, 50);
      emit('playing', {});
    }
    function pause() {
      if (!playing) return;
      offset += (performance.now() - startedAt) / 1000;
      playing = false; root.clearInterval(timer);
      emit('paused', {});
    }
    function restart(autoplay = true) {
      pause(); index = 0; offset = 0; history.length = 0; last = null;
      emit('restart', {});
      if (autoplay) play();
    }
    return {
      loaded, play, pause, restart,
      isPlaying: () => playing, current: () => last, fixture: () => fixture,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
  }
  const bus = parentRuntime ? parentRuntime.bus : createBus();

  // ---- fetch / WebSocket adapters ----
  const json = (status, body) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
  root.fetch = async function (input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    if (!isApi(url)) return nativeFetch(input, init);
    await ready;
    const method = String(init.method || 'GET').toUpperCase();
    if (currentMode() === 'live') {
      const headers = new Headers(init.headers || {});
      headers.set('X-Band-Key', accessKey);
      const response = await nativeFetch(typeof input === 'string' ? apiTarget(input) : input, {...init, headers, credentials: 'same-origin'});
      if (response.ok && method === 'POST' && String(url).endsWith('/api/v1/control')) {
        const state = await response.clone().json();
        for (const name of ['clean_mix', 'drum_mix', 'instrument_state']) if (state[name] != null) replayControls[name] = state[name];
      }
      return response;
    }
    const path = new URL(url, root.location.href).pathname;
    if (path.endsWith('/api/v1/control') && method === 'POST') {
      const payload = JSON.parse(init.body || '{}');
      if (payload.command === 'panic') { bus.pause(); return json(200, {...demoStatus(bus.current()), ...replayControls}); }
      if (['set_clean_mix', 'set_drum_mix'].includes(payload.command)) {
        const value = Number(payload.value);
        if (!Number.isFinite(value)) return json(400, {error: 'invalid-mix'});
        replayControls[payload.command.slice(4)] = Math.max(0, Math.min(1, value));
        return json(200, {...demoStatus(bus.current()), ...replayControls});
      }
      if (payload.command === 'set_instrument_context') {
        replayControls.instrument_state = payload.instrument;
        return json(200, {...demoStatus(bus.current()), ...replayControls});
      }
      return json(409, {error: 'switch-to-live', reason: 'Switch to live microphone mode to use this control.'});
    }
    const [status, body] = demoResponse(path, method, bus.current());
    if (path.endsWith('/api/v1/status') || path.endsWith('/api/v1/config')) { Object.assign(body, replayControls); body.capabilities = {...body.capabilities, drum_mix: true}; }
    return json(status, body);
  };

  const replaySockets = new Set();
  const liveSockets = new Set();
  const replayControls = {clean_mix: 0, drum_mix: 1, monitor: false, instrument_state: "electric_guitar"};
  class ReplaySocket extends EventTarget {
    constructor(url) {
      super();
      this.url = url; this.readyState = 0;
      this.onopen = this.onmessage = this.onclose = this.onerror = null;
      replaySockets.add(this);
      ready.then(() => root.setTimeout(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        this.fire('open', new Event('open'));
        this.unsubscribe = bus.subscribe((type, frame) => {
          if (type === 'frame' && this.readyState === 1) this.fire('message', new MessageEvent('message', {data: JSON.stringify(frame)}));
        });
        // A paused replay is still a connected stream: hold the current state (no new onset)
        // so stale-stream watchdogs in the Desk and PLAY HUD do not report OFFLINE.
        this.heartbeat = root.setInterval(() => {
          if (this.readyState !== 1 || bus.isPlaying()) return;
          this.fire('message', new MessageEvent('message', {data: JSON.stringify(holdFrame(bus.current()))}));
        }, 1000);
      }, 0));
    }
    fire(type, event) { const handler = this['on' + type]; if (typeof handler === 'function') handler.call(this, event); this.dispatchEvent(event); }
    send() { /* the replay stream is receive-only */ }
    close() {
      if (this.readyState >= 2) return;
      this.readyState = 3;
      if (this.unsubscribe) this.unsubscribe();
      root.clearInterval(this.heartbeat);
      replaySockets.delete(this);
      this.fire('close', new CloseEvent('close', {code: 1000}));
    }
  }
  ReplaySocket.CONNECTING = 0; ReplaySocket.OPEN = 1; ReplaySocket.CLOSING = 2; ReplaySocket.CLOSED = 3;

  root.WebSocket = function (url, protocols) {
    if (!isApi(String(url).replace(/^ws/, 'http'))) return new NativeWebSocket(url, protocols);
    if (currentMode() !== 'live') return new ReplaySocket(url);
    const keyed = new URL(apiTarget(String(url).replace(/^ws/, 'http')), root.location.href);
    keyed.protocol = keyed.protocol === 'https:' ? 'wss:' : 'ws:';
    keyed.searchParams.set('key', accessKey);
    const socket = new NativeWebSocket(keyed.toString(), protocols);
    liveSockets.add(socket);
    socket.addEventListener('close', () => liveSockets.delete(socket));
    return socket;
  };
  Object.assign(root.WebSocket, {CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3, prototype: NativeWebSocket.prototype});

  // ---- Mode switching and the demo bar (top-level page only) ----
  async function setMode(next) {
    if (parentRuntime || next === mode) return;
    if (next === 'live') {
      const response = await nativeFetch(`${config.apiBase || ''}/api/v1/session`, {headers: {'X-Band-Key': accessKey}, credentials: 'same-origin'});
      if (!response.ok) throw new Error(`session ${response.status}`);
      for (const payload of [
        {command: 'set_drum_mix', value: replayControls.drum_mix},
        {command: 'set_clean_mix', value: replayControls.clean_mix},
        {command: 'set_instrument_context', instrument: replayControls.instrument_state},
      ]) {
        const control = await nativeFetch(`${config.apiBase || ''}/api/v1/control`, {method: 'POST', headers: {'X-Band-Key': accessKey, 'Content-Type': 'application/json'}, credentials: 'same-origin', body: JSON.stringify(payload)});
        if (!control.ok) throw new Error(`Live setup failed (${control.status})`);
      }
      bus.pause();
    }
    if (next === 'replay') {
      root.BandVision?.stop();
      root.BandDrums?.cut();
      root.BandObservation?.stop();
      try {
        await root.fetch(`${config.apiBase || ''}/api/v1/control`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({command: 'panic'})});
      } catch { /* returning to replay still closes the browser audio and sockets */ }
    }
    mode = next;
    storage('sessionStorage', MODE_STORAGE, next);
    // Existing clients reconnect on close, which re-enters the adapter in the new mode.
    [...replaySockets, ...liveSockets].forEach(socket => socket.close());
    emitMode();
  }
  const modeListeners = new Set();
  const emitMode = () => modeListeners.forEach(fn => fn(currentMode()));

  function installBar() {
    if (parentRuntime || !doc.querySelector('.console-shell')) return;
    const bar = doc.createElement('div');
    bar.className = 'band-demo-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Demo controls');
    bar.innerHTML = '<span data-band-label>DEMO</span>' +
      '<button type="button" class="is-primary" data-band-play>▶ Play demo</button>' +
      '<button type="button" data-band-restart>⟲ Restart</button>' +
      (config.live ? '<button type="button" data-band-live>🎤 Play live</button>' : '') +
      '<span data-band-progress aria-live="off">0:00 / 0:00</span>';
    const field = doc.querySelector('.desktop-field');
    if (field && typeof root.makeDraggable === 'function') {
      const win = doc.createElement('article');
      win.className = 'floating-tool band-demo-window';
      win.setAttribute('aria-label', 'DEMO.EXE');
      win.innerHTML = '<header class="window-bar"><span data-band-window-title>DEMO.EXE</span><div class="window-buttons"><button type="button" data-band-collapse aria-label="Collapse demo controls" aria-expanded="true">−</button></div></header>';
      const collapseButton = win.querySelector('[data-band-collapse]');
      const setCollapsed = collapsed => {
        win.classList.toggle('is-minimized', collapsed);
        collapseButton.textContent = collapsed ? '+' : '−';
        collapseButton.setAttribute('aria-expanded', String(!collapsed));
        collapseButton.setAttribute('aria-label', collapsed ? 'Expand live and demo controls' : 'Collapse live and demo controls');
        root.requestAnimationFrame(() => {
          place();
          if (root.innerWidth <= 650) doc.querySelectorAll('.console-window,[data-tool-window],[data-settings-panel]').forEach(node => {
            if (!node.hidden && node.getClientRects().length) root.constrainWindow?.(node);
          });
        });
      };
      root.BandDemoWindow = {collapse: () => setCollapsed(true)};
      collapseButton.addEventListener('click', () => setCollapsed(!win.classList.contains('is-minimized')));
      win.appendChild(bar);
      field.appendChild(win);
      root.makeDraggable(win);
      // Dock bottom-left after layout; constrainWindow keeps it above the footer
      // and on screen. A user drag sets the position; resizes only re-clamp it.
      let userMoved = false;
      win.querySelector('.window-bar').addEventListener('pointerdown', event => { if (!event.target.closest('button')) userMoved = true; });
      const place = () => {
        if (typeof root.constrainWindow !== 'function') return;
        if (userMoved) root.constrainWindow(win); else root.constrainWindow(win, 16, root.innerHeight);
      };
      // Timers as well as frames: hidden/background tabs do not run animation frames.
      root.requestAnimationFrame(() => root.requestAnimationFrame(place));
      root.setTimeout(place, 60);
      root.addEventListener('resize', place);
      // The welcome screen hides Desk windows (zero size); dock again once it is shown.
      new MutationObserver(place).observe(field, {attributes: true, attributeFilter: ['class']});
      if (typeof root.ResizeObserver === 'function') new root.ResizeObserver(place).observe(win);
    } else {
      doc.body.appendChild(bar);
    }
    const playButton = bar.querySelector('[data-band-play]');
    const liveButton = bar.querySelector('[data-band-live]');
    const label = bar.querySelector('[data-band-label]');
    const progress = bar.querySelector('[data-band-progress]');
    const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const render = () => {
      const live = mode === 'live';
      const title = field?.querySelector('[data-band-window-title]');
      if (title) title.textContent = live ? 'LIVE MIC.EXE' : 'DEMO.EXE';
      label.textContent = live ? uiText('LIVE · Play with your bandmate','LIVE · 和伙伴一起演奏') : uiText('DEMO · A recorded session','DEMO · 一段演奏回顾');
      playButton.hidden = live; bar.querySelector('[data-band-restart]').hidden = live; progress.hidden = live;
      playButton.textContent = bus.isPlaying() ? uiText('⏸ Pause','⏸ 暂停') : uiText('▶ Play demo','▶ 播放演示');
      bar.querySelector('[data-band-restart]').textContent = uiText('⟲ Restart','⟲ 重新开始');
      if (liveButton) liveButton.textContent = live ? uiText('■ Return to demo','■ 返回演示回放') : uiText('🎤 Play live','🎤 实时演奏');
    };
    playButton.addEventListener('click', () => { bus.isPlaying() ? bus.pause() : bus.play(); });
    bar.querySelector('[data-band-restart]').addEventListener('click', () => bus.restart());
    if (liveButton) liveButton.addEventListener('click', async () => {
      const observation = root.BandObservation;
      if (mode === 'live') {
        if (observation) observation.stop();
        await setMode('replay');
        return;
      }
      // Start the microphone inside this click so the browser keeps the user gesture.
      const micStarted = observation ? observation.start() : Promise.resolve(false);
      try {
        await setMode('live');
        if (!(await micStarted)) label.textContent = uiText('Microphone unavailable. Check permission and try again.','麦克风不可用，请检查权限后重试。');
      } catch {
        if (observation) observation.stop();
        label.textContent = uiText('Live is unavailable. You can still play the demo.','实时体验暂不可用，可以继续播放演示。');
      }
    });
    bus.subscribe((type, payload) => {
      if (type === 'progress' || type === 'loaded') progress.textContent = `${clock(payload.elapsed || 0)} / ${clock(payload.duration || 0)}`;
      if (type !== 'frame' && type !== 'progress') render();
    });
    modeListeners.add(render);
    root.BandLanguage?.subscribe(render);
    bus.loaded.then(() => { progress.textContent = `0:00 / ${clock(bus.fixture().duration)}`; });
    render();
  }

  root.BandRuntime = {ready, bus, mode: currentMode, key: () => accessKey, setMode, config, core, subscribeMode(fn) { modeListeners.add(fn); return () => modeListeners.delete(fn); }};
  if (parentRuntime) {
    const unsubscribe = parentRuntime.subscribeMode(() => {
      [...replaySockets, ...liveSockets].forEach(socket => socket.close());
      emitMode();
    });
    root.addEventListener?.('unload', unsubscribe, {once: true});
  }
  ready.then(() => {
    const start = () => { installBar(); };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, {once: true}); else start();
  });
})(typeof window !== 'undefined' ? window : globalThis);
