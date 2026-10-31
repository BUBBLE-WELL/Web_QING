// Sample-accurate PCM WAV selection; no live audio callback ownership.
(function (root) {
  'use strict';
  function selection(buffer, start, end) {
    const rate = buffer.sampleRate, channels = buffer.numberOfChannels;
    if (!(rate > 0) || !Number.isInteger(channels) || channels < 1 || channels > 2 ||
        !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > buffer.duration + Number.EPSILON * Math.max(1, buffer.duration)) {
      throw Error('Invalid audio selection');
    }
    const first = Math.max(0, Math.floor(start * rate));
    const last = Math.min(buffer.length, Math.ceil(end * rate));
    if (last <= first) throw Error('The selection contains no audio samples');
    return {first, last, frames: last - first, rate, channels};
  }
  async function wav(buffer, start, end, yieldTask = () => new Promise(resolve => setTimeout(resolve, 0))) {
    const range = selection(buffer, start, end);
    const bytes = range.frames * range.channels * 2;
    const array = new ArrayBuffer(44 + bytes), view = new DataView(array);
    const text = (at, value) => [...value].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, range.channels, true);
    view.setUint32(24, range.rate, true); view.setUint32(28, range.rate * range.channels * 2, true);
    view.setUint16(32, range.channels * 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, bytes, true);
    const data = Array.from({length: range.channels}, (_, channel) => buffer.getChannelData(channel));
    for (let frame = 0; frame < range.frames; frame++) {
      if (frame && frame % 65536 === 0) await yieldTask();
      for (let channel = 0; channel < range.channels; channel++) {
        const sample = data[channel][range.first + frame];
        const bounded = Number.isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0;
        view.setInt16(44 + (frame * range.channels + channel) * 2,
          Math.round(bounded * (bounded < 0 ? 32768 : 32767)), true);
      }
    }
    return {bytes: array, ...range, durationSeconds: range.frames / range.rate};
  }
  const api = {selection, wav};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BandAudioExport = api;
})(typeof window !== 'undefined' ? window : globalThis);
