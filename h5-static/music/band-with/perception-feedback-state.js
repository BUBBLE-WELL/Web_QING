// Pure display reducer. No calibration, audio policy, persistence or controls.
(function(root) {
  const SCHEMA = 'agent-companion.perception-ack.v1', TTL = 500, ACK_MS = 900;
  const initialState = (selectedInstrument = null) => ({selectedInstrument, session: null, allowSessionChange: false, resetAfterNs: 0, activeSources: {}, epochs: {}, retired: [], seen: [], lastCapture: {}, possession: 'UNKNOWN', possessionUntil: 0, motionCandidate: null, pitchEstimate: null, executedActions: [], actionCandidates: [], actionReceipts: [], receipts: [], acknowledgement: null, panic: false, blocked: false});
  const identity = e => e && ['session_id','source_id','epoch','event_id'].every(k => typeof e[k] === 'string' && e[k].length > 0 && e[k].length <= 128);
  const key = e => JSON.stringify([e.session_id,e.source_id,e.epoch,e.event_id]);
  function clear(s) { return {...s, possession: 'UNKNOWN', possessionUntil: 0, motionCandidate: null, acknowledgement: null}; }
  function reduce(previous, event, now = 0) {
    let s = {...previous, activeSources: {...previous.activeSources}, epochs: {...previous.epochs}, lastCapture: {...previous.lastCapture}};
    if (now >= s.possessionUntil) s.possession = 'UNKNOWN';
    if (s.acknowledgement && now >= s.acknowledgement.until) s.acknowledgement = null;
    if (s.motionCandidate && now >= s.motionCandidate.until) s.motionCandidate = null;
    if (!event || event.type === 'tick') return s;
    if (event.type === 'select') return {...clear(s), selectedInstrument: event.instrument};
    if (['camera_off','tracking_loss','disconnect','panic'].includes(event.type)) return {...clear(s), blocked: event.type !== 'tracking_loss', panic: event.type === 'panic' || s.panic};
    if (event.type === 'resume') return {...clear(s), blocked: false, panic: false, allowSessionChange: true};
    if (event.type === 'local_candidate') return s.blocked || s.panic ? s : {...s, motionCandidate: {status: 'CANDIDATE', until: now + TTL}};
    const m = event.message || event;
    if (m.type === 'gesture_candidate' && m.schema === 'agent-companion.gesture.v1') {
      if (s.blocked || s.panic || typeof m.candidate_id !== 'string' || !m.candidate_id || m.candidate_id.length > 128) return s;
      if (s.actionCandidates.some(c=>c.id===m.candidate_id)) return s;
      return {...s,actionCandidates:[...s.actionCandidates,{id:m.candidate_id,status:'CANDIDATE'}].slice(-12)};
    }
    if (m.type === 'action_receipt') {
      if (m.schema !== 'agent-companion.action-receipt.v1' || !s.actionCandidates.some(c=>c.id===m.candidate_id) || !Number.isFinite(m.time_s) || m.time_s < 0) return s;
      const status = m.acknowledgement === 'ACCEPTED' ? 'ACKNOWLEDGED' : m.acknowledgement === 'REJECTED' ? 'REJECTED' : null;
      if (!status || m.action_status !== status) return s;
      const receiptId=JSON.stringify([m.candidate_id,m.acknowledgement,m.time_s]);
      if (s.actionReceipts.some(r=>r.id===receiptId)) return s;
      return {...s,actionReceipts:[...s.actionReceipts,{id:receiptId,status,linked:true,audible:false}].slice(-12)};
    }
    if (m.type === 'perception_reset') {
      const age = event.captureAgeMs;
      if (m.schema !== 'agent-companion.perception-reset.v1' || !Number.isFinite(age) || age < 0 || age >= TTL || !Number.isFinite(m.captured_ns) || (s.session && s.session !== m.session_id)) return s;
      if (m.captured_ns <= s.resetAfterNs) return s;
      const activeVision=s.activeSources.vision;
      const next=activeVision && s.lastCapture[activeVision] > m.captured_ns ? s : clear(s);
      return {...next,session:m.session_id,resetAfterNs:m.captured_ns};
    }
    const ack = m.type === 'perception_ack';
    const evidence = m.perception_evidence || m.payload?.perception_evidence;
    const e = ack ? m.envelope : evidence?.envelope;
    if ((ack && m.schema !== SCHEMA) || !identity(e)) return s;
    if (ack && ['session_id','source_id','epoch','event_id'].some(k => m[k] !== e[k])) return s;
    if (s.blocked || s.panic || m.replay || m.synthetic && !event.allowSynthetic) return s;
    if (s.session && s.session !== e.session_id && !s.allowSessionChange) return s;
    const id = (ack ? 'ack:' : 'obs:') + key(e);
    if (s.seen.includes(id)) return s;
    s.seen = [...s.seen,id].slice(-512);
    const captured = e.captured_ns;
    if (s.session === e.session_id && captured - (e.uncertainty_ns || 0) <= s.resetAfterNs) return s;
    const age = Object.prototype.hasOwnProperty.call(event,'captureAgeMs') ? event.captureAgeMs : (ack ? m.capture_age_ms : (e.received_ns - captured)/1e6);
    const fresh = Number.isFinite(captured) && Number.isFinite(age) && age >= 0 && Number.isFinite(e.uncertainty_ns) && e.uncertainty_ns >= 0 && e.uncertainty_ns <= 50e6 && age + e.uncertainty_ns/1e6 < TTL;
    if (ack) {
      const receipt = {status: m.status, reason: String(m.reason || 'unknown').slice(0,128), captureAgeMs: age, uncertaintyMs: e.uncertainty_ns == null ? null : e.uncertainty_ns/1e6, actionStatus: 'OBSERVED'};
      s.receipts = [...s.receipts,receipt].slice(-12);
      // v1 has no executed action receipt contract: do not invent audible feedback.
      if (!fresh || m.status !== 'confirmed') return s;
    } else if (!fresh) return s;
    if (s.session !== e.session_id) s = {...clear(s),epochs:{},activeSources:{},retired:[],lastCapture:{},resetAfterNs:0};
    s.session = e.session_id; s.allowSessionChange = false;
    const sourceEpoch = JSON.stringify([e.source_id,e.epoch]);
    if (s.retired.includes(sourceEpoch)) return s;
    const modality = /audio$/.test(e.source_id) ? 'audio' : 'vision';
    if (s.activeSources[modality] && s.activeSources[modality] !== e.source_id) {
      const old = s.activeSources[modality];
      s.retired = [...s.retired, JSON.stringify([old,s.epochs[old]])].slice(-128);
      s = clear(s);
    }

    if (s.epochs[e.source_id] && s.epochs[e.source_id] !== e.epoch) {
      s.retired = [...s.retired, JSON.stringify([e.source_id,s.epochs[e.source_id]])].slice(-128);
      s = clear(s); delete s.lastCapture[e.source_id];
    }
    if (!(e.source_id in s.epochs) && Object.keys(s.epochs).length >= 64) return clear(s);
    s.epochs[e.source_id] = e.epoch; s.activeSources[modality] = e.source_id;
    if (s.lastCapture[e.source_id] != null && captured < s.lastCapture[e.source_id]) return s;
    s.lastCapture[e.source_id] = captured;
    if (!ack) {
      if (evidence.possession === 'UNKNOWN' || evidence.person_present !== true) return clear(s);
      if (m.human_state === 'READY_WITH_INSTRUMENT') s.possession = 'PRESENT';
      if (s.possession === 'PRESENT') s.possessionUntil = now + TTL - age - e.uncertainty_ns/1e6;
      return s;
    }
    if (m.reason === 'stable_possession_transition' && m.possession === 'PRESENT') {
      s.possession = 'PRESENT'; s.possessionUntil = now + TTL - age - e.uncertainty_ns/1e6;
    }
    if (m.reason === 'stable_possession_transition' || m.physical_event?.event === 'PHYSICAL_PLAY_EVENT') s.acknowledgement = {id, kind: m.physical_event ? 'physical_play' : 'possession', until: now + ACK_MS};
    return s;
  }
  const api = {initialState, reduce, SCHEMA, TTL, ACK_MS};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PerceptionFeedbackState = api;
})(globalThis);
