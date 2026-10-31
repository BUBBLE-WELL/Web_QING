// Web adaptation of the existing Desk audio controls; Local does not load this file.
(function () {
  'use strict';
  const root = document.querySelector('.console-shell');
  const localize = text => window.BandLanguage?.phrase(text) ?? text;
  if (!root || root.dataset.runtimeMode !== 'web') return;
  root.dataset.apiBase = root.dataset.webApi || window.BandRuntime?.config.apiBase || root.dataset.apiBase || location.origin;
  const localAudio = document.querySelector('[data-audio-devices]');
  if (localAudio) localAudio.hidden = true;
  const monitorButton = document.querySelector('[data-monitor-toggle]');
  if (monitorButton) {
    monitorButton.disabled = false;
    monitorButton.removeAttribute('aria-hidden');
    monitorButton.title = localize('Use headphones for browser monitoring.');
    monitorButton.textContent = localize('MONITOR OFF');
    const controls = document.querySelector('.control-stack');
    if (controls) {
      controls.appendChild(monitorButton);
      const note = document.createElement('small');
      note.dataset.monitorNote = '';
      note.textContent = localize('Browser microphone monitor · headphones only.');
      controls.appendChild(note);
    }
  }
  const cleanSlider = document.querySelector('[data-control="clean_mix"]');
  if (cleanSlider) cleanSlider.title = localize('Browser microphone monitoring · use headphones.');
  let capabilityGeneration = 0;
  async function refreshVision() {
    const token = ++capabilityGeneration;
    const camera = document.querySelector('[data-camera-start]');
    if (!camera) return;
    const live = !window.BandRuntime || window.BandRuntime.mode() === 'live';
    camera.disabled = true;
    camera.title = live ? localize('Checking Vision availability…') : localize('Switch to Live to test Vision.');
    if (!live) return;
    try {
      const response = await fetch(`${root.dataset.apiBase}/api/v1/capabilities`);
      if (!response.ok) throw Error('Capabilities unavailable');
      const capabilities = await response.json();
      if (token !== capabilityGeneration) return;
      camera.disabled = !capabilities.vision_analysis?.available;
      camera.title = camera.disabled ? localize('Vision temporarily unavailable.') : localize('Camera frames are analysed on the demo server; raw images are not retained.');
    } catch { if (token === capabilityGeneration) camera.title = localize('Vision temporarily unavailable.'); }
  }
  const visionPanel = document.querySelector('[data-tool-window="vision"] .tool-body');
  if (visionPanel) {
    const note = document.createElement('div'); note.className = 'hint';
    note.dataset.webVisionNote = '';
    note.textContent = localize('Camera frames are processed on the demo server; raw images are not retained.');
    visionPanel.prepend(note);
  }
  window.BandRuntime?.subscribeMode(refreshVision);
  refreshVision();

  const boostPanel = document.querySelector('[data-input-boost-panel]');
  const boostSlider = document.querySelector('[data-input-boost]');
  const boostValue = document.querySelector('[data-input-boost-value]');
  const boostNote = document.querySelector('[data-input-boost-note]');
  let inputBoost = 1;
  try { const saved = Number(window.localStorage?.getItem('band-with-input-boost')); if (Number.isFinite(saved) && saved >= 1 && saved <= 10) inputBoost = saved; } catch {}
  function setInputBoost(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    inputBoost = Math.max(1, Math.min(10, next));
    if (boostSlider) boostSlider.value = String(inputBoost);
    if (boostValue) boostValue.textContent = `${inputBoost.toFixed(1)}×`;
    try { window.localStorage?.setItem('band-with-input-boost', String(inputBoost)); } catch {}
    setMonitor(monitoring);
  }
  if (boostPanel) boostPanel.hidden = false;
  boostSlider?.addEventListener('input', event => setInputBoost(event.target.value));
  const listeners = new Set();
  let audioContext = null, mediaStream = null, analyser = null, cleanGain = null, detachCapture = null, inputSource = null;
  let observationTimer = 0, observing = false, generation = 0, starting = null, inFlight = false;
  let cleanMix = 0, monitoring = false, monitorGeneration = 0;
  const notify = () => listeners.forEach(fn => { try { fn(observing); } catch { /* isolate listeners */ } });
  function setMonitor(enabled) {
    monitoring = Boolean(enabled && observing);
    if (cleanGain) cleanGain.gain.value = monitoring ? cleanMix * inputBoost : 0;
    if (monitorButton) {
      monitorButton.setAttribute('aria-pressed', String(monitoring));
      monitorButton.textContent = monitoring ? localize('MONITOR ON') : localize('MONITOR OFF');
    }
  }
  function stopObservation() {
    generation++;
    monitorGeneration++;
    observing = false;
    starting = null;
    clearInterval(observationTimer);
    setMonitor(false);
    if (window.BandDrums) window.BandDrums.cut();
    if (detachCapture) { detachCapture(); detachCapture = null; }
    if (inputSource) { try { inputSource.disconnect(); } catch {} inputSource = null; }
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    if (audioContext) audioContext.close().catch(() => {});
    audioContext = mediaStream = analyser = cleanGain = null;
    notify();
  }
  async function sendObservation() {
    if (!observing || !analyser || inFlight) return;
    window.BandPerception?.synchronize(root.dataset.apiBase || location.origin);
    const perception = window.BandPerception?.audioMetadata(audioContext, `:audio-${generation}`);
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    let boostedPeak = 0;
    for (let i = 0; i < samples.length; i++) {
      const amplified = samples[i] * inputBoost;
      boostedPeak = Math.max(boostedPeak, Math.abs(amplified));
      samples[i] = Math.max(-1, Math.min(1, amplified));
    }
    if (boostNote) boostNote.textContent = boostedPeak >= 1 ? localize('CLIPPING · Lower input boost') : localize('LIVE MIC · Input gain');
    let sum = 0, peak = 0;
    for (const sample of samples) { sum += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
    // Signed peak buckets preserve short transients while keeping the network payload bounded.
    const waveform = [];
    for (let offset = 0; offset < samples.length; offset += 8) {
      let value = 0;
      for (let i = offset; i < Math.min(offset + 8, samples.length); i++) {
        if (Math.abs(samples[i]) > Math.abs(value)) value = samples[i];
      }
      waveform.push(Math.round(Math.max(-1, Math.min(1, value)) * 10000) / 10000);
    }
    const token = generation;
    inFlight = true;
    try {
      const response = await fetch(`${root.dataset.apiBase || location.origin}/api/v1/observe/audio`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({perception, time_s: audioContext.currentTime, rms: Math.min(1, Math.sqrt(sum / samples.length)), peak, waveform})
      });
      if (!response.ok) throw new Error(`Observation failed (${response.status})`);
    } catch (error) {
      if (token === generation) {
        window.BandObservation.lastError = error.message;
        const status = document.querySelector('[data-status]');
        if (status) status.textContent = error.message;
      }
    } finally { inFlight = false; }
  }
  function startObservation() {
    if (observing) return Promise.resolve(true);
    if (starting) return starting;
    const token = ++generation;
    const context = window.BandCapture ? window.BandCapture.context() : new (window.AudioContext || window.webkitAudioContext)();
    audioContext = context;
    starting = (async () => {
      let stream;
      try {
        await context.resume();
        if (token !== generation) return false;
        stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}});
        if (token !== generation) { stream.getTracks().forEach(track => track.stop()); return false; }
        mediaStream = stream;
        analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        inputSource = source;
        if (window.BandCapture) detachCapture = window.BandCapture.attach(source, 'player');
        stream.getAudioTracks?.().forEach(track => track.addEventListener('ended', () => {
          if (token === generation) stopObservation();
        }, {once: true}));
        cleanGain = context.createGain();
        cleanGain.channelCount = 1;
        cleanGain.channelCountMode = 'explicit';
        cleanGain.gain.value = 0;
        source.connect(cleanGain).connect(context.destination);
        observing = true;
        window.BandObservation.lastError = '';
        observationTimer = setInterval(sendObservation, 50);
        notify();
        return true;
      } catch (error) {
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (token === generation) {
          stopObservation();
          window.BandObservation.lastError = error.name || 'permission denied';
        }
        return false;
      } finally { if (token === generation) starting = null; }
    })();
    return starting;
  }
  window.BandObservation = {
    start: startObservation, stop: stopObservation, active: () => observing, lastError: '',
    context: () => audioContext,
    setInputBoost, inputBoost: () => inputBoost,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  setInputBoost(inputBoost);
  async function recordFeedback(payload) {
    if (!['KEEP', 'REST', 'LESS', 'MORE', 'WRONG'].includes(payload.response)) throw new Error('Invalid player response.');
    const record = {...payload, schema: 'agent-companion.player-response.v1', retained: true, storage: 'browser', recorded_at: new Date().toISOString()};
    return persistRecord('band-with-feedback', 'responses', record);
  }
  async function persistRecord(name, store, record) {
    const database = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(store, {autoIncrement: true});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(store, 'readwrite');
        transaction.objectStore(store).add(record);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Feedback write aborted.'));
      });
      return record;
    } finally { database.close(); }
  }
  window.BandWebAudio = {
    recordFeedback,
    async recordReceipt(payload) {
      if (!['ACCEPTED', 'REJECTED'].includes(payload.acknowledgement) || typeof payload.candidate_id !== 'string' || !payload.candidate_id || !Number.isFinite(payload.time_s)) throw new Error('Invalid action receipt.');
      return persistRecord('band-with-action-receipts', 'receipts', {...payload,
        schema: 'agent-companion.action-receipt.v1', retained: true, storage: 'browser',
        action_status: payload.acknowledgement === 'ACCEPTED' ? 'ACKNOWLEDGED' : 'REJECTED',
        recorded_at: new Date().toISOString()});
    },
    snapshot: () => ({clean_mix: cleanMix, monitor: monitoring}),
    async control(command, payload, send) {
      const panic = command === 'panic';
      const monitorToken = command === 'set_monitor' || panic ? ++monitorGeneration : monitorGeneration;
      if (panic) { setMonitor(false); window.BandDrums?.cut(); }
      if (command === 'set_monitor' && payload.enabled) {
        if (window.BandRuntime && window.BandRuntime.mode() !== 'live') throw new Error('Switch to live microphone mode first.');
        if (!await startObservation()) throw new Error(window.BandObservation.lastError);
      }
      const data = await send();
      if (command === 'set_clean_mix') cleanMix = Math.max(0, Math.min(1, Number(payload.value)));
      if (command === 'set_monitor') setMonitor(payload.enabled && monitorToken === monitorGeneration);
      else setMonitor(monitoring);
      if (command === 'set_drum_mix') window.BandDrums?.setMix(data.drum_mix ?? payload.value);
      if (panic || command === 'set_clean_mix' || command === 'set_monitor') Object.assign(data, this.snapshot());
      return data;
    },
  };
  if (window.BandRuntime) window.BandRuntime.subscribeMode(() => {
    const live = window.BandRuntime.mode() === 'live';
    if (monitorButton) monitorButton.disabled = !live;
  });
  if (monitorButton && window.BandRuntime) monitorButton.disabled = window.BandRuntime.mode() !== 'live';
  window.BandLanguage?.subscribe(()=>{
    setMonitor(monitoring);
    const note=document.querySelector('[data-monitor-note]');if(note)note.textContent=localize('Browser microphone monitor · headphones only.');
    const visionNote=document.querySelector('[data-web-vision-note]');if(visionNote)visionNote.textContent=localize('Camera frames are processed on the demo server; raw images are not retained.');
    if(boostNote)boostNote.textContent=localize('LIVE MIC · Input gain');
    if(cleanSlider)cleanSlider.title=localize('Browser microphone monitoring · use headphones.');
    if(monitorButton)monitorButton.title=localize('Use headphones for browser monitoring.');
    refreshVision();
  });
  window.addEventListener('beforeunload', stopObservation);
})();
