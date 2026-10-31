// Web Mode drums: the server decides each bar (src/runtime/web_drums.py); this file
// synthesizes it in the visitor's browser. Voices follow src/renderer/drum_audio.py.
(function (root) {
  'use strict';

  const NOISE_DECAY = {snare: 32, brush: 38, hat: 55};
  const LATE_TOLERANCE_S = 0.02;

  // Deterministic noise so tests and repeated hits are stable.
  function rng(seed) {
    let state = seed >>> 0 || 1;
    return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return ((state >>> 0) / 4294967296) * 2 - 1; };
  }

  // One hit before velocity/gain; per-sample formulas match drum_audio.py.
  function voiceSamples(voice, seconds, sampleRate, velocity = 100, seed = 1) {
    const length = Math.max(1, Math.round(seconds * sampleRate));
    const out = new Float32Array(length);
    const noise = rng(seed);
    const TAU = 2 * Math.PI;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let value;
      if (voice === 'kick') value = Math.sin(TAU * (110 - 55 * Math.min(1, t * 12)) * t) * Math.exp(-t * 18) * 0.45;
      else if (voice === 'stick') value = (Math.sin(TAU * 2200 * t) * 0.55 + noise() * 0.45) * Math.exp(-t * 110) * 0.45;
      else if (voice === 'click') value = Math.sin(TAU * (velocity >= 85 ? 1760 : 1320) * t) * Math.exp(-t * 90) * 0.45;
      else if (voice === 'tom') value = (Math.sin(TAU * (210 - 55 * Math.min(1, t * 9)) * t) * 0.75 + noise() * 0.25) * Math.exp(-t * 26) * 0.45;
      else if (voice === 'rim') value = (Math.sin(TAU * 1400 * t) * 0.5 + noise() * 0.5) * Math.exp(-t * 85) * 0.45;
      else if (voice === 'ride') value = (Math.sin(TAU * 2100 * t) * 0.42 + Math.sin(TAU * 3150 * t) * 0.24 + noise() * 0.32) * Math.exp(-t * 22) * 0.35;
      else if (voice === 'crash') value = (Math.sin(TAU * 1250 * t) * 0.32 + Math.sin(TAU * 2300 * t) * 0.24 + Math.sin(TAU * 3700 * t) * 0.18 + noise() * 0.48) * Math.exp(-t * 9) * 0.32;
      else value = noise() * Math.exp(-t * (NOISE_DECAY[voice] || 55)) * 0.45;
      out[i] = value;
    }
    return out;
  }

  // Bar message -> hits on the AudioContext clock. `mapped` says the server's
  // client_start_s is on this same clock; otherwise fall back to starts_in_ms.
  function scheduleHits(message, now, mapped) {
    const barS = Number(message.bar_ms) / 1000;
    const steps = Number(message.steps_per_bar) || 16;
    if (!(barS > 0) || !Array.isArray(message.events)) return [];
    const start = mapped && Number.isFinite(message.client_start_s)
      ? message.client_start_s
      : now + Math.max(0, Number(message.starts_in_ms) || 0) / 1000;
    const stepS = barS / steps;
    return message.events.map(([step, voice, velocity]) => {
      const offset = step * stepS;
      return {time: start + offset, voice, velocity, seconds: Math.max(0.01, Math.min(stepS * 2, barS - offset))};
    }).filter(hit => hit.time >= now - LATE_TOLERANCE_S);
  }

  const core = {voiceSamples, scheduleHits};
  if (typeof module === 'object' && module.exports) { module.exports = core; return; }

  const doc = root.document;
  const shell = doc.querySelector('.console-shell');
  if (!shell || shell.dataset.runtimeMode !== 'web') return;

  let ownContext = null;
  const scheduled = new Set();
  const levels = new Map();
  let drumMix = 1;
  function setMix(value) {
    if (!Number.isFinite(Number(value))) return;
    drumMix = Math.max(0, Math.min(1, Number(value)));
    for (const {level, base} of levels.values()) level.gain.value = base * drumMix;
  }
  const seenBars = new Set();
  const buffers = new Map();
  let socket = null, reconnect = 0;

  function context() {
    const observed = root.BandObservation && root.BandObservation.context && root.BandObservation.context();
    if (observed && observed.state !== 'closed') return {ctx: observed, mapped: true};
    if (root.BandCapture) return {ctx: root.BandCapture.context(), mapped: false};
    if (!ownContext || ownContext.state === 'closed') {
      const Ctor = root.AudioContext || root.webkitAudioContext;
      if (!Ctor) return null;
      ownContext = new Ctor();
    }
    return {ctx: ownContext, mapped: false};
  }

  function buffer(ctx, voice, seconds, velocity) {
    const key = `${voice}:${velocity >= 85 ? 'hi' : 'lo'}:${Math.round(seconds * 1000)}:${ctx.sampleRate}`;
    if (!buffers.has(key)) {
      const samples = voiceSamples(voice, seconds, ctx.sampleRate, velocity, buffers.size + 1);
      const audio = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      audio.copyToChannel(samples, 0);
      buffers.set(key, audio);
      if (buffers.size > 96) buffers.delete(buffers.keys().next().value);
    }
    return buffers.get(key);
  }

  function play(ctx, hit, gain) {
    const source = ctx.createBufferSource();
    source.buffer = buffer(ctx, hit.voice, hit.seconds, hit.velocity);
    const level = ctx.createGain();
    const base = Math.min(0.8, Math.max(0, hit.velocity / 127)) * gain;
    level.gain.value = base * drumMix;
    levels.set(source, {level, base});
    source.connect(level).connect(ctx.destination);
    const detachCapture = root.BandCapture ? root.BandCapture.attach(level, 'companion') : null;
    source.start(Math.max(ctx.currentTime, hit.time));
    scheduled.add(source);
    source.onended = () => { if (detachCapture) detachCapture(); scheduled.delete(source); levels.delete(source); };
  }

  function cut() {
    for (const source of scheduled) { try { source.stop(); } catch { /* already stopped */ } }
    scheduled.clear();
    levels.clear();
    seenBars.clear();
  }

  function handle(message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'transport_action' && (message.action === 'REST' || message.action === 'PANIC') && message.immediate) { cut(); return; }
    if (message.type === 'drum_mix') { setMix(message.value); return; }
    if (!['drum_bar', 'drum_preview'].includes(message.type)) return;
    if (Number.isFinite(message.drum_mix)) setMix(message.drum_mix);
    const audio = context();
    if (!audio) return;
    const {ctx, mapped} = audio;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (message.type === 'drum_bar') {
      if (seenBars.has(message.bar)) return;  // the same bar may arrive on several sockets
      seenBars.add(message.bar);
      if (seenBars.size > 64) seenBars.delete(seenBars.values().next().value);
      const gain = Number.isFinite(message.base_gain) ? message.base_gain : (Number.isFinite(message.gain) ? message.gain : 1);
      scheduleHits(message, ctx.currentTime, mapped).forEach(hit => play(ctx, hit, gain));
    } else if (message.type === 'drum_preview') {
      play(ctx, {time: ctx.currentTime, voice: message.voice, velocity: 100, seconds: 0.35}, Number.isFinite(message.base_gain) ? message.base_gain : (Number.isFinite(message.gain) ? message.gain : 1));
    }
  }

  function connect() {
    const base = (shell.dataset.apiBase || root.location.origin).replace(/^http/, 'ws');
    try { socket = new root.WebSocket(`${base}/api/v1/stream`); } catch { reconnect = root.setTimeout(connect, 2500); return; }
    socket.addEventListener('message', event => { try { handle(JSON.parse(event.data)); } catch { /* ignore malformed */ } });
    socket.addEventListener('close', () => { cut(); root.clearTimeout(reconnect); reconnect = root.setTimeout(connect, 2500); });
  }

  // Browsers start audio only after a user gesture; resume on the first one.
  doc.addEventListener('pointerdown', () => { const audio = context(); if (audio && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {}); }, {once: true, capture: true});
  root.BandDrums = {handle, cut, setMix, scheduledCount: () => scheduled.size, core};
  connect();
})(typeof window !== 'undefined' ? window : globalThis);
