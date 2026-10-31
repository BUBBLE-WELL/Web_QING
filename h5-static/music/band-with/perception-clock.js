// Capture-time metadata only; failure never gates audio or camera transport.
(function () {
  'use strict';
  const epoch = globalThis.crypto?.randomUUID?.() || `page-${Date.now()}-${Math.random()}`;
  let serverClock = null;
  let clock = null, synchronizedAt = 0, pending = null, sequence = 0;
  async function synchronize(base) {
    if (pending) return pending;
    if (clock && performance.now() - synchronizedAt < 15000) return;
    pending = (async () => {
      const start = performance.now();
      try {
        const response = await fetch(`${base}/api/v1/perception/clock`, {signal: AbortSignal.timeout(2000)});
        if (!response.ok) return;
        const sample = await response.json(), end = performance.now();
        clock = {token: sample.token, midpoint_ms: (start + end)/2, rtt_ms: end-start};
        serverClock = Number.isFinite(sample.server_ns) ? {serverMs:sample.server_ns/1e6,midpointMs:(start+end)/2,rttMs:end-start,session:sample.session_id} : null;
        synchronizedAt = end;
      } catch { clock = null; serverClock = null; }
      finally { pending = null; }
    })();
    return pending;
  }
  window.BandPerception = {
    synchronize,
    captureAge(envelope) {
      if (!serverClock || !Number.isFinite(envelope?.captured_ns) || performance.now()-synchronizedAt >= 30000 || (serverClock.session && envelope.session_id !== serverClock.session)) return null;
      return serverClock.serverMs + performance.now()-serverClock.midpointMs - envelope.captured_ns/1e6 + serverClock.rttMs/2;
    },
    metadata(captureMs, producerEpoch = '') {
      return {owner: epoch, epoch: `${epoch}${producerEpoch}`, event_id: String(++sequence), capture_ms: captureMs,
              clock: clock && performance.now()-synchronizedAt < 30000 ? clock : null};
    },
    audioMetadata(context, producerEpoch) {
      // Sample an AudioContext/performance pair on every read. A suspended or
      // replaced context cannot reuse a previous offset. Output-device timestamps
      // describe rendered sound, not this microphone analyser window.
      const performanceMs = performance.now(), contextS = context.currentTime;
      if (context.state !== 'running' || !Number.isFinite(contextS))
        return {owner: epoch, epoch: `${epoch}${producerEpoch}`, event_id: String(++sequence)};
      const centerS = contextS - 512/context.sampleRate;
      return this.metadata(performanceMs + (centerS-contextS)*1000, producerEpoch);
    }
  };
})();
