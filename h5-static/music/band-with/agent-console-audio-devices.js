// SETTINGS → AUDIO: server-owned input/output/monitor selection.
// Lists come from GET /api/v1/devices; APPLY posts set_devices and shows the
// real result. Separate from SAVE, which only stores browser preferences.
(() => {
  const root = document.querySelector('[data-audio-devices]');
  if (!root || document.querySelector('.console-shell')?.dataset.runtimeMode === 'web') return;
  const shell = document.querySelector('[data-api-base]');
  const base = (shell && shell.dataset.apiBase) || window.location.origin;
  const input = root.querySelector('[data-audio-input]');
  const output = root.querySelector('[data-audio-output]');
  const monitor = root.querySelector('[data-audio-monitor]');
  const apply = root.querySelector('[data-audio-apply]');
  const note = root.querySelector('[data-audio-note]');
  const monitorButton = document.querySelector('[data-monitor-toggle]');

  function fill(select, names, selected) {
    select.replaceChildren(...names.map(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      option.selected = name.toLowerCase().includes(String(selected).toLowerCase());
      return option;
    }));
  }

  function showMonitor(on) {
    if (!monitorButton) return;
    monitorButton.setAttribute('aria-pressed', String(on));
    monitorButton.textContent = on ? 'MONITOR ON' : 'MONITOR OFF';
  }

  async function load() {
    note.textContent = 'Loading devices…';
    try {
      const res = await fetch(`${base}/api/v1/devices`, {cache: 'no-store'});
      if (!res.ok) throw new Error(`service ${res.status}`);
      const data = await res.json();
      fill(input, data.inputs, data.selected.input);
      fill(output, data.outputs, data.selected.output);
      monitor.checked = Boolean(data.selected.monitor);
      note.textContent = `Current: ${data.selected.input} → ${data.selected.output}`;
      apply.disabled = false;
    } catch (error) {
      note.textContent = `Audio service offline (${error.message}). Start tools/local_audio_service.py.`;
      apply.disabled = true;
    }
  }

  async function submit() {
    apply.disabled = true;
    note.textContent = 'Applying… capture restarts (about half a second).';
    try {
      const res = await fetch(`${base}/api/v1/control`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({command: 'set_devices', input: input.value, output: output.value, monitor: monitor.checked}),
      });
      const data = await res.json();
      if (typeof data.monitor === 'boolean') showMonitor(data.monitor);
      note.textContent = data.ok
        ? `Applied: ${data.selected.input} → ${data.selected.output}${data.monitor ? ' · monitor ON' : ''}`
        : `Not applied: ${(data.errors || ['unknown error']).join('; ')}`;
    } catch (error) {
      note.textContent = `Not applied: ${error.message}`;
    } finally {
      apply.disabled = false;
    }
  }

  // The ROUTING button posts set_monitor elsewhere; resync it from the running state.
  async function syncMonitor() {
    try {
      const res = await fetch(`${base}/api/v1/status`, {cache: 'no-store'});
      if (res.ok) showMonitor(Boolean((await res.json()).monitor));
    } catch { /* offline: leave as is */ }
  }

  apply.addEventListener('click', submit);
  const opener = document.querySelector('[data-settings]');
  if (opener) opener.addEventListener('click', () => {
    if (!document.querySelector('[data-settings-panel]').hidden) load();
  });
  if (monitorButton) monitorButton.addEventListener('click', () => setTimeout(syncMonitor, 1200));
  syncMonitor();
})();
