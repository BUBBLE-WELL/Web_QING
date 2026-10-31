// TODAY.EXE: a session review built only from feature frames the Desk actually rendered,
// plus one explicitly confirmed, bounded preference applied on the next visit.
(function (root) {
  'use strict';

  const MEMORY_KEY = 'agent-companion-memory';
  const MAX_STEP_S = 0.5;
  const BUSY_WINDOW_S = 10;
  // Bounded effect of the one remembered preference: the starting DRUM MIX value.
  const DRUM_MIX_BY_CHOICE = {too_much: 0.3, just_right: 0.45, too_little: 0.55};

  function summarize(frames) {
    const s = {played_s: 0, active_s: 0, follow_s: 0, rest_s: 0, onsets: 0, busiest: null};
    if (!frames.length) return s;
    s.played_s = Math.max(0, frames[frames.length - 1].time_s - frames[0].time_s);
    for (let i = 1; i < frames.length; i++) {
      const dt = Math.max(0, Math.min(MAX_STEP_S, frames[i].time_s - frames[i - 1].time_s));
      if (!frames[i].silence) s.active_s += dt;
      if (frames[i].state === 'FOLLOW') s.follow_s += dt;
      if (frames[i].state === 'REST') s.rest_s += dt;
    }
    const onsetTimes = frames.filter(f => f.onset).map(f => f.time_s);
    s.onsets = onsetTimes.length;
    let start = 0;
    for (let end = 0; end < onsetTimes.length; end++) {
      while (onsetTimes[end] - onsetTimes[start] > BUSY_WINDOW_S) start++;
      const count = end - start + 1;
      if (!s.busiest || count > s.busiest.onsets) s.busiest = {from_s: onsetTimes[start], to_s: onsetTimes[end], onsets: count};
    }
    return s;
  }

  function greeting(memory, language = 'en') {
    if (!memory || !(memory.choice in DRUM_MIX_BY_CHOICE)) return null;
    const value = DRUM_MIX_BY_CHOICE[memory.choice];
    const zh = {
      too_much: `上次你说我跟得太多。这次我把鼓的音量起点降到 ${value.toFixed(2)}，少跟一点。`,
      just_right: `上次你说我跟得刚好。这次保持一样，鼓的音量起点 ${value.toFixed(2)}。`,
      too_little: `上次你说我跟得太少。这次鼓的音量起点提到 ${value.toFixed(2)}，多陪你一点。`,
    }[memory.choice];
    const en = {
      too_much: `Last time the companion was too much. The starting drum volume is reduced to ${value.toFixed(2)}.`,
      just_right: `Last time the companion felt right. The starting drum volume stays at ${value.toFixed(2)}.`,
      too_little: `Last time the companion was too quiet. The starting drum volume is raised to ${value.toFixed(2)}.`,
    }[memory.choice];
    return {text: language === 'en' ? en : zh, drumMix: value};
  }

  const core = {summarize, greeting, DRUM_MIX_BY_CHOICE, MEMORY_KEY};
  if (typeof module === 'object' && module.exports) { module.exports = core; return; }

  const doc = root.document;
  const $ = s => doc.querySelector(s);
  const tool = $('[data-tool-window="today"]');
  if (!tool) return;
  let frames = [], remembered = false, saveFailed = false;
  const language = () => root.BandLanguage?.current() || 'en';
  const localize = text => root.BandLanguage?.phrase(text) ?? text;
  const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const minutes = s => language() === 'zh'
    ? (s < 60 ? `${Math.round(s)} 秒` : `${(s / 60).toFixed(1)} 分钟`)
    : (s < 60 ? `${Math.round(s)} s` : `${(s / 60).toFixed(1)} min`);
  function render() {
    const s = summarize(frames), en = language() === 'en';
    $('[data-today-time]').textContent = frames.length
      ? (en ? `${minutes(s.played_s)} total · ${minutes(s.active_s)} active` : `一共 ${minutes(s.played_s)}，实际在弹 ${minutes(s.active_s)}`)
      : localize('No performance data yet. Play the demo or start playing.');
    $('[data-today-states]').textContent = frames.length
      ? (en ? `${minutes(s.follow_s)} following · ${minutes(s.rest_s)} waiting` : `跟随 ${minutes(s.follow_s)} · 安静等你 ${minutes(s.rest_s)}`) : '';
    $('[data-today-busy]').textContent = s.busiest
      ? (en ? `Most onset activity: ${clock(s.busiest.from_s)}–${clock(s.busiest.to_s)} · ${s.busiest.onsets} onsets (${s.onsets} total)` : `最密集的一段：${clock(s.busiest.from_s)}–${clock(s.busiest.to_s)}，起音 ${s.busiest.onsets} 次（全程 ${s.onsets} 次）`)
      : localize('No onsets detected yet.');
    if (remembered) $('[data-today-saved]').textContent = localize('Saved. One starting choice will follow this next time.');
    if (saveFailed) $('[data-today-saved]').textContent = en ? 'Could not save this preference. Try again.' : '偏好未能保存，请重试。';
  }
  function remember(choice) {
    const s = summarize(frames);
    const memory = {schema: 'band-with.preference.v1', choice, at: new Date().toISOString(),
      evidence: {played_s: Math.round(s.played_s), active_s: Math.round(s.active_s), onsets: s.onsets}};
    try { root.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); remembered = true; saveFailed = false; }
    catch { remembered = false; saveFailed = true; }
    render();
  }

  function applyRemembered() {
    let memory = null;
    try { memory = JSON.parse(root.localStorage.getItem(MEMORY_KEY) || 'null'); } catch { memory = null; }
    const next = greeting(memory, language());
    if (!next) return;
    if (typeof root.addChat === 'function') root.addChat('agent', next.text);
    if (typeof root.syncControl === 'function') root.syncControl('drum_mix', next.drumMix);
    const runtime = doc.querySelector('.console-shell')?.dataset.runtimeMode;
    if (typeof root.postControl === 'function') root.postControl('set_drum_mix', {value: next.drumMix});
  }

  doc.addEventListener('agent:feature', event => {
    const f = event.detail;
    if (!f || !Number.isFinite(f.time_s)) return;
    if (frames.length && f.time_s < frames[frames.length - 1].time_s) frames = [];
    frames.push({time_s: f.time_s, state: f.state, onset: Boolean(f.onset), silence: Boolean(f.silence)});
    if (!tool.hidden && frames.length % 10 === 0) render();
  });
  tool.querySelectorAll('[data-today-choice]').forEach(button => button.addEventListener('click', () => remember(button.dataset.todayChoice)));
  doc.querySelector('[data-open-tool="today"]')?.addEventListener('click', render);

  const runtime = root.BandRuntime;
  if (runtime) runtime.subscribeMode(mode => { if (mode === 'live') applyRemembered(); });
  if (runtime) {
    runtime.bus.subscribe(type => {
      if (type === 'restart') { frames = []; render(); }
      if (type === 'ended') { tool.hidden = false; render(); doc.querySelector('[data-open-tool="today"]')?.click(); }
    });
  }
  // Speak right after the companion's welcome line, so the remembered change follows the greeting.
  const log = doc.querySelector('[data-chat-log]');
  let spoken = false;
  const speak = () => { if (spoken) return; spoken = true; applyRemembered(); };
  if (log) {
    const observer = new MutationObserver(() => { if (log.children.length) { observer.disconnect(); root.setTimeout(speak, 300); } });
    observer.observe(log, {childList: true});
  }
  root.setTimeout(speak, 8000);
  root.BandLanguage?.subscribe(render);
  render();
})(typeof window !== 'undefined' ? window : globalThis);
