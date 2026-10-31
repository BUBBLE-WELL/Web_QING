// Browser-local recording of authorized input and actual rendered companion audio.
// No microphone request, network upload or recording occurs on module load.
(function (root) {
  'use strict';
  function createCapture(host) {
    let audio = null, destination = null, master = null;
    let take = null, starting = false, epoch = 0, lastResult = null, lastError = '';
    const taps = new Map(), listeners = new Set();
    const notify = () => listeners.forEach(fn => { try { fn(snapshot()); } catch {} });
    function context() {
      if (!audio || audio.state === 'closed') {
        if (take) stop('context_closed').catch(() => {});
        taps.clear();
        audio = new (host.AudioContext || host.webkitAudioContext)();
        destination = audio.createMediaStreamDestination();
        master = audio.createGain();
        // Fixed -6 dB capture headroom; monitoring/output gains remain independent.
        master.gain.value = 0.5;
        master.connect(destination);
      }
      return audio;
    }
    function snapshot() {
      return {state: take ? 'recording' : starting ? 'starting' : 'idle',
        playerConnected: [...taps.values()].includes('player'),
        companionConnected: [...taps.values()].includes('companion'),
        lastError, hasRecording: Boolean(lastResult), captureGain: 0.5};
    }
    function attach(node, role) {
      if (!['player', 'companion'].includes(role)) throw Error('Unknown recording source');
      const ctx = context();
      if (node.context && node.context !== ctx) throw Error('Recording sources must share the AudioContext');
      if (taps.has(node)) throw Error('Recording source already attached');
      node.connect(master);
      taps.set(node, role);
      if (take) take.sources.add(role);
      notify();
      return () => {
        if (!taps.has(node)) return;
        try { node.disconnect(master); } catch {}
        taps.delete(node);
        if (role === 'player' && ![...taps.values()].includes('player')) stop('input_ended').catch(() => {});
        notify();
      };
    }
    async function start({consent = false} = {}) {
      if (!consent) throw Error('Explicit recording consent is required');
      if (take || starting) throw Error('A recording is already active');
      if (![...taps.values()].includes('player')) throw Error('No authorized player input connected');
      if (!host.MediaRecorder) throw Error('Audio recording is unavailable in this browser');
      const token = ++epoch;
      starting = true; lastError = ''; notify();
      try {
        const ctx = context();
        await ctx.resume();
        if (token !== epoch || ![...taps.values()].includes('player')) throw Error('Recording start cancelled');
        const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm']
          .find(type => host.MediaRecorder.isTypeSupported?.(type));
        const recorder = new host.MediaRecorder(destination.stream, mimeType ? {mimeType} : {});
        const current = {recorder, chunks: [], bytes: 0, sources: new Set(taps.values()),
          started: ctx.currentTime, context: ctx, timer: null, reason: '', failure: null};
        current.done = new Promise((resolve, reject) => { current.resolve = resolve; current.reject = reject; });
        // Auto-stop and encoder errors are surfaced through snapshot/result, too.
        current.done.catch(() => {});
        recorder.ondataavailable = event => {
          if (!event.data?.size) return;
          current.bytes += event.data.size;
          if (current.bytes > 64 * 1024 * 1024) {
            current.failure = Error('Recording exceeded the 64 MiB memory limit');
            stop('size_limit').catch(() => {});
          } else current.chunks.push(event.data);
        };
        recorder.onerror = event => {
          current.failure = event.error || Error('Audio encoder failed');
          stop('encoder_error').catch(() => {});
        };
        recorder.onstop = () => {
          host.clearTimeout(current.timer);
          if (take === current) take = null;
          const blob = new host.Blob(current.chunks, {type: recorder.mimeType || mimeType || 'application/octet-stream'});
          if (current.failure || !blob.size) {
            const error = current.failure || Error('No audio data was recorded');
            lastError = error.message; current.reject(error);
          } else {
            lastResult = {blob, mimeType: blob.type,
              durationSeconds: Math.max(0, current.ended - current.started),
              routedSources: [...current.sources], stopReason: current.reason,
              captureGain: 0.5, playerPath: 'authorized input before monitor/boost',
              companionPath: 'browser synthesis after drum volume',
              note: 'Routed sources describe wiring, not proof of audible activity or hardware loopback.'};
            current.resolve(lastResult);
          }
          notify();
        };
        recorder.start(1000);
        take = current;
        current.timer = host.setTimeout(() => stop('duration_limit').catch(() => {}), 5 * 60 * 1000);
        return snapshot();
      } catch (error) { lastError = error.message; throw error; }
      finally { starting = false; notify(); }
    }
    function stop(reason = 'user') {
      epoch++;
      if (!take) return Promise.resolve(null);
      const current = take;
      if (!current.reason) {
        current.reason = reason;
        current.ended = current.context.currentTime;
        host.clearTimeout(current.timer);
        try { current.recorder.stop(); }
        catch (error) {
          take = null; lastError = error.message; current.reject(error); notify();
        }
      }
      return current.done;
    }
    return {context, attach, start, stop, snapshot,
      result: () => lastResult,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }};
  }
  if (typeof module === 'object' && module.exports) module.exports = {createCapture};
  else root.BandCapture = createCapture(root);
})(typeof window !== 'undefined' ? window : globalThis);
