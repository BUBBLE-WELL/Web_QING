// DRUMS.EXE is the single browser owner of drum and tempo controls.
// Local: actions go to the local service and its selected output.
// Web: the server decides bars and band-drums-web.js plays them in this browser.
(() => {
  const root = document.querySelector('[data-drums]');
  if (!root) return;
  const shell = document.querySelector('[data-api-base]');
  const webMode = shell?.dataset.runtimeMode === 'web';
  const base = (shell && shell.dataset.apiBase) || window.location.origin;
  const status = root.querySelector('[data-drums-status]');
  const autoRest = root.querySelector('[data-drums-auto]');
  const autoStart = root.querySelector('[data-drums-auto-start]');
  const buttons = [...root.querySelectorAll('[data-drums-action]')];
  const transport = root.querySelector('[data-drums-transport]');
  const responses = [...root.querySelectorAll('.drums-response [data-drums-action]')];
  const responseStatus = root.querySelector('[data-drums-response-status]');
  const keepButton = responses.find(button => button.dataset.drumsAction === 'KEEP');
  let pendingResponses = [];
  let responseError = '';
  let responseSending = '';
  let resting = false;
  let starting = false;
  let requestPending = false;
  let playing = false, lastDrumState = null;
  const localize = text => window.BandLanguage?.phrase(text) ?? text;
  const pads = [...root.querySelectorAll('[data-pad]')];
  const bpmInput = root.querySelector('[data-metro-bpm]');
  const tempoSet = root.querySelector('[data-tempo-set]');
  const metroToggle = root.querySelector('[data-metro-toggle]');
  const presetSelect = root.querySelector('[data-drums-preset]');
  let metroOn = false;
  // AUTO follows how hard you play; choosing a name pins it until you pick AUTO again.
  let presetOptions = '';
  // The box shows the live transport tempo until the player edits it; typing is never overwritten.
  let bpmEdited = false;
  const presetLabels = {
    BODYS_DRIVE: 'BODYS',
    WEIRD_FISHES_FLOW: 'FISH',
  };

  function presetLabel(name) {
    return presetLabels[name] || String(name).replaceAll('_', ' ');
  }

  function disableControls(disabled) {
    [transport, ...buttons, ...pads, bpmInput, tempoSet, metroToggle,
      autoRest, autoStart, presetSelect].forEach(control => {
      if (control) control.disabled = disabled;
    });
  }

  function show(d) {
    lastDrumState = d;
    if (!d || d.available === false) {
      responseStatus.textContent = localize('Musical response unavailable.');
      status.textContent = `${localize('unavailable')}${d && d.reason ? ` · ${d.reason}` : ''}`;
      disableControls(true);
      return;
    }
    playing = Boolean(d.playing);
    if (playing) { starting = false; resting = false; }
    transport.disabled = requestPending;
    transport.textContent = playing || starting ? localize('STOP') : localize('START');
    buttons.forEach(b => { b.disabled = requestPending; });
    const musicalPlaying = playing && d.mode !== 'click';
    responses.forEach(b => { b.disabled = !musicalPlaying || requestPending; });
    keepButton.setAttribute('aria-pressed', String(Boolean(d.frozen)));
    if (!playing) pendingResponses = [];
    else pendingResponses = pendingResponses.filter(item => Number(d.position?.bar || 0) < item.bar);
    responses.forEach(button => {
      button.setAttribute('data-pending', String(pendingResponses.some(item => item.action === button.dataset.drumsAction)));
    });
    const density = `${localize('Density')} ${Math.round(Number(d.density || 0) * 100)}%`;
    const pending = pendingResponses.map(item => `${localize(item.action)} ${localize('queued for bar')} ${item.bar + 1}`).join(' · ');
    responseStatus.textContent = responseError || (responseSending ? `${localize('Sending')} ${localize(responseSending)}…` :
      !playing ? localize('Start drums to use musical response.') :
      !musicalPlaying ? localize('Metronome running — start drums to use musical response.') :
      `${density}${d.frozen ? ' · '+localize('KEEP active') : ''}${pending ? ` · ${pending}` : ''}`);
    pads.forEach(button => { button.disabled = Boolean(d.playing || d.queued_bars); });
    tempoSet.disabled = false;
    metroToggle.disabled = false;
    autoRest.disabled = false;
    autoRest.checked = Boolean(d.auto_rest);
    autoStart.disabled = false;
    autoStart.checked = Boolean(d.auto_start);
    if (presetSelect) {
      const names = Array.isArray(d.presets) ? d.presets : [];
      const signature = names.join(',');
      if (signature !== presetOptions) {
        presetOptions = signature;
        presetSelect.innerHTML = ['<option value="AUTO">AUTO / FOLLOW ME</option>']
          .concat(names.map(name => `<option value="${name}">${presetLabel(name)}</option>`)).join('');
      }
      presetSelect.disabled = false;
      const mode = d.preset_mode || 'AUTO';
      if (document.activeElement !== presetSelect) presetSelect.value = mode;
    }
    const automatic = presetSelect?.querySelector?.('option[value="AUTO"]');if(automatic)automatic.textContent=localize('AUTO / FOLLOW ME');
    const estimate = d.tempo_estimate;
    const confidence = estimate ? ` · ${localize('CONF')} ${Math.round(Number(estimate.confidence || 0) * 100)}%` : '';
    root.classList.toggle('is-playing', Boolean(d.playing));
    metroOn = d.playing && d.mode === 'click';
    const metroLabel = metroOn ? localize('Stop Metronome') : localize('Start Metronome');
    metroToggle.setAttribute('aria-label', metroLabel);
    metroToggle.setAttribute('title', metroLabel);
    metroToggle.setAttribute('aria-pressed', String(Boolean(metroOn)));
    const liveBpm = Math.round(Number(d.bpm || d.tempo_bpm || 0));
    if (!bpmEdited && liveBpm >= 40 && liveBpm <= 240) bpmInput.value = String(liveBpm);
    const groove = d.preset ? ` · ${presetLabel(d.preset)}${d.preset_mode === 'AUTO' ? ' (AUTO)' : ''}` : '';
    status.textContent = `${localize(metroOn ? 'METRONOME' : d.playing ? 'PLAYING' : starting ? 'STARTING' : resting ? 'REST' : 'STOPPED')} · ${localize('BAR')} ${Number(d.position?.bar || 0) + 1} · ${Math.round(Number(d.bpm || d.tempo_bpm || 0))} BPM · ${String(d.tempo_source || 'estimate').toUpperCase()}${confidence}${groove}${d.frozen ? ' · KEEP' : ''}`;
  }

  async function refresh() {
    try {
      const res = await fetch(`${base}/api/v1/drums`, {cache: 'no-store'});
      show(await res.json());
    } catch (error) {
      status.textContent = webMode
        ? localize('drums offline · reconnecting to the Web service')
        : localize('service offline · start the local audio service to use drums');
      responseStatus.textContent = localize('Musical response unavailable.');
      disableControls(true);
    }
  }

  async function control(payload) {
    try {
      const res = await fetch(`${base}/api/v1/control`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...payload, source: 'browser'}),
      });
      const data = await res.json();
      const musicalAction = responses.some(button => button.dataset.drumsAction === payload.action);
      responseSending = '';
      if (!res.ok) {
        status.textContent = `${localize('rejected')} · ${data.reason || data.error || res.status}`;
        if (musicalAction) { responseError = status.textContent; responseStatus.textContent = responseError; }
      }
      else if (data.drums) {
        if (payload.command === 'drums') {
          if (payload.action === 'REST') resting = true;
          if (payload.action === 'START') { starting = true; resting = false; }
          if (payload.action === 'PANIC') { starting = false; resting = false; }
        }
        if (musicalAction && data.scheduled && !data.scheduled.immediate) {
          const item = {action: payload.action, bar: data.scheduled.apply_bar};
          if (!pendingResponses.some(p => p.action === item.action && p.bar === item.bar)) pendingResponses.push(item);
        }
        if (musicalAction) responseError = '';
        show(data.drums);
      }
    } catch (error) {
      responseSending = '';
      status.textContent = `${localize('not sent')} · ${error.message}`;
      if (responses.some(button => button.dataset.drumsAction === payload.action)) { responseError = status.textContent; responseStatus.textContent = responseError; }
    }
  }

  root.querySelectorAll('button').forEach(button => {
    let release;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      clearTimeout(release);
      button.classList.toggle('is-pressed', true);
      release = setTimeout(() => button.classList.toggle('is-pressed', false), 180);
    });
  });

  transport.addEventListener('click', async () => {
    if (requestPending) return;
    requestPending = true;
    transport.disabled = true;
    responses.forEach(button => { button.disabled = true; });
    // Drum-scoped PANIC is the existing immediate stop; REST stays a musical command.
    await control({command: 'drums', action: playing || starting ? 'PANIC' : 'START'});
    requestPending = false;
    await refresh();
  });
  buttons.forEach(button => button.addEventListener('click', () => {
    if (responses.includes(button)) {
      responseError = '';
      responseSending = button.dataset.drumsAction;
      responseStatus.textContent = `${localize('Sending')} ${localize(responseSending)}…`;
    }
    return control({command: 'drums', action: button.dataset.drumsAction});
  }));
  pads.forEach(button => button.addEventListener('click', () => control({command: 'drum_preview', voice: button.dataset.pad})));
  bpmInput.addEventListener('input', () => { bpmEdited = true; });
  tempoSet.addEventListener('click', () => { bpmEdited = false; control({command: 'set_tempo', bpm: Number(bpmInput.value)}); });
  autoRest.addEventListener('change', () => control({command: 'set_drums_auto_rest', enabled: autoRest.checked}));
  metroToggle.addEventListener('click', () => { bpmEdited = false; control({command: 'metronome', bpm: metroOn ? null : Number(bpmInput.value)}); });
  autoStart.addEventListener('change', () => control({command: 'set_drums_auto_start', enabled: autoStart.checked}));
  if (presetSelect) presetSelect.addEventListener('change', () => control({command: 'set_drum_preset', preset: presetSelect.value}));
  window.BandLanguage?.subscribe(()=>{if(lastDrumState)show(lastDrumState);});
  refresh();
  setInterval(refresh, 1000);
})();
