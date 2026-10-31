// Web Desk recording/review tool. Mount before the existing Desk binds its tools.
(function () {
  'use strict';
  const shell = document.querySelector('.console-shell'), dock = document.querySelector('.desk-dock');
  if (!shell || shell.dataset.runtimeMode !== 'web' || !dock || !window.BandCapture) return;
  const capture = window.BandCapture;
  const supported = Boolean(window.MediaRecorder && (window.AudioContext || window.webkitAudioContext) && navigator.mediaDevices?.getUserMedia);
  const copy = {
    en: {
      entry:'SHARE', windowTitle:'SHARE.EXE', section:'RECORD / REVIEW', close:'Close recording review', title:'Keep a take',
      intro:'Keep a take with your bandmate. Use headphones.',
      consent:'I agree to record this audio in this browser.', record:'Record', again:'Record again · replace take', stop:'Stop recording', cancel:'Cancel start', inputStop:'Stop input',
      prompt:'Allow recording, then press Record.', idle:'Ready to record', requesting:'Waiting for microphone permission…', recording:'Recording', finishing:'Finishing recording…', decoding:'Preparing playback…', exporting:'Preparing WAV…', cardExporting:'Preparing PNG…', saveCard:'Save session card · PNG', ready:'Ready to listen', cancelled:'Recording start cancelled.',
      userOnly:'User input only · no browser companion in this take.', mixed:'User input + browser companion routed. Listen to confirm which parts are audible.',
      liveSources:'Records authorized input plus browser companion when it plays.', replay:'Switch to Live to record. Replay contains no recordable session audio.',
      temporary:'Audio stays in this tab. Save it before leaving; closing this window keeps your take.',
      limits:'Recording details', limitText:'Up to 5 minutes / 64 MiB. Dry input before monitor/boost + browser companion after drum volume; fixed capture headroom. No hardware/system loopback or separate stems. Stopping recording keeps Live input running; Stop input releases it.',
      listen:'Full take', waveform:'Recorded waveform; use the start and end sliders to select a range.', start:'Start', end:'End', selection:'Selection', play:'Play selection', stopPlay:'Stop playback', saveFull:'Save full take · WAV', saveSource:'Save original source', sourceNote:'The original encoded file may not support seeking. Use WAV for playback.', saveSelection:'Save selection · WAV',
      failedPrevious:'Could not prepare the new take; previous take kept. ', failed:'Unable to complete this action: ', denied:'Microphone access was denied. Allow access in browser settings, then try Record again.',
      silent:'This take seems silent. Check your input and try recording again.', interrupted:'Recording ended because input stopped. Available audio is ready to review.', capped:'Recording reached its time limit. Available audio is ready to review.',
      download:'Download started. Check your browser downloads.', tooShort:'The take is too short to select. Record a longer take.', error:'Check recording', unsupported:'Recording is unavailable in this browser.', savedFormat:'Capture format', downloadFormat:'Download format', seconds:'s'
    },
    zh: {
      entry:'分享',windowTitle:'分享',section:'录音 / 回顾',close:'关闭录音回顾',title:'留下一段演奏',intro:'和伙伴一起，留下一段演奏。建议使用耳机。',
      consent:'我同意在此浏览器中录制这段音频。',record:'开始录音',again:'重新录制 · 替换当前录音',stop:'停止录音',cancel:'取消启动',inputStop:'停止输入',
      prompt:'勾选录音许可，再点击开始录音。',idle:'可以开始录音',requesting:'等待麦克风授权…',recording:'正在录音',finishing:'正在结束录音…',decoding:'正在准备回听…',exporting:'正在生成 WAV…',cardExporting:'正在生成 PNG…',saveCard:'保存结算卡 · PNG',ready:'可以回听',cancelled:'已取消启动录音。',
      userOnly:'仅用户输入 · 此次未接入浏览器伙伴。',mixed:'已接入用户输入与浏览器伙伴；请回听确认实际声部。',liveSources:'录制授权输入，以及实际发声的浏览器伙伴。',replay:'请切换到 Live 后录音。回放模式没有可录制的会话音频。',
      temporary:'音频仅保留在此标签页，离开前请保存；关闭此工具窗会保留录音。',limits:'录音说明',limitText:'最多 5 分钟 / 64 MiB。用户输入位于监听与增益前，浏览器伙伴位于鼓声音量后，带固定录音余量。不含硬件或系统内录，也不提供独立音轨。停止录音会保留 Live 输入；“停止输入”会释放麦克风。',
      listen:'完整录音',waveform:'真实录音波形；可通过起点和终点滑块选择范围。',start:'起点',end:'终点',selection:'选区',play:'播放选区',stopPlay:'停止回听',saveFull:'保存完整录音 · WAV',saveSource:'保存原始编码文件',sourceNote:'原始编码文件可能无法拖动进度；回听与分享请使用 WAV。',saveSelection:'保存选区 · WAV',
      failedPrevious:'新录音未能准备回听，已保留上一段录音。',failed:'操作未完成：',denied:'麦克风授权被拒绝。请在浏览器设置中允许访问，再重试录音。',silent:'这段好像没有声音，请检查输入后重试录音。',interrupted:'输入已停止；可用音频已保留，请回听确认。',capped:'录音已达到时长上限；可用音频已保留。',download:'已发起下载，请检查浏览器下载列表。',tooShort:'录音太短，无法选段。请录制更长的一段。',error:'请检查录音',unsupported:'此浏览器无法录音。',savedFormat:'录制编码',downloadFormat:'导出格式',seconds:'秒'
    }
  };
  let lang = window.BandLanguage?.current() || 'en';
  const t = key => copy[lang][key] || key;
  const entry = document.createElement('button');
  entry.type = 'button'; entry.dataset.openTool = 'replay'; entry.dataset.replayEntry = '';
  entry.setAttribute('aria-controls','replay-window');entry.setAttribute('aria-expanded','false');
  dock.append(entry);
  const panel = document.createElement('article');
  panel.id = 'replay-window';
  panel.className = 'floating-tool replay-tool'; panel.dataset.toolWindow = 'replay'; panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'replay-title');
  panel.innerHTML = `<header class="window-bar"><span id="replay-title" data-copy="windowTitle">SHARE.EXE</span><button type="button" class="tool-close" data-close-tool>×</button></header>
    <div class="tool-body"><span class="micro-label" data-copy="section"></span><h2 data-copy="title"></h2><p data-copy="intro"></p>
    <label class="record-consent"><input type="checkbox" data-record-consent><span data-copy="consent"></span></label>
    <div class="recording-actions"><button type="button" data-record-start></button><button type="button" data-record-stop></button><button type="button" data-record-input-stop data-copy="inputStop"></button></div>
    <div class="recording-state"><strong data-record-phase></strong><span data-record-time aria-hidden="true">0:00</span></div>
    <p data-record-status role="status" aria-live="polite"></p>
    <section class="record-review" data-record-review hidden><label><span data-copy="listen"></span><audio controls preload="metadata" data-record-audio></audio></label>
    <canvas data-record-wave width="840" height="160" role="img"></canvas>
    <label class="selection-control"><span data-copy="start"></span><output data-selection-start></output><input type="range" data-record-range="start" min="0" max="0" step="0.01" value="0"></label>
    <label class="selection-control"><span data-copy="end"></span><output data-selection-end></output><input type="range" data-record-range="end" min="0" max="0" step="0.01" value="0"></label>
    <p data-record-selection></p><div class="review-actions"><button type="button" data-record-play data-copy="play"></button><button type="button" data-record-play-stop data-copy="stopPlay"></button></div>
    <div class="review-actions"><button type="button" data-record-save data-copy="saveFull"></button><button type="button" data-record-export data-copy="saveSelection"></button></div><button type="button" data-record-card data-copy="saveCard"></button></section>
    <p data-copy="temporary"></p><details><summary data-copy="limits"></summary><p data-record-sources></p><p data-record-format></p><p data-copy="limitText"></p><p data-copy="sourceNote"></p><button type="button" data-record-save-source data-copy="saveSource"></button></details></div>`;
  document.querySelector('.desktop-field').append(panel);
  const $ = selector => panel.querySelector(selector);
  const consent = $('[data-record-consent]'), record = $('[data-record-start]'), stop = $('[data-record-stop]');
  const player = $('[data-record-audio]'), waveform = $('[data-record-wave]');
  const startRange = $('[data-record-range="start"]'), endRange = $('[data-record-range="end"]');
  let phase = 'idle', statusKey = 'prompt', errorText = '', pending = false, ownInput = false, operation = 0;
  let raw = null, handled = null, decoded = null, audioURL = '', reviewContext = null, playing = null;
  let from = 0, to = 0, recordingAt = 0, peaks = [], peak = 0, playbackEpoch = 0;
  let fitScheduled = false;
  function fitPanel() {
    if (fitScheduled) return; fitScheduled = true;
    requestAnimationFrame(() => { fitScheduled = false; if (!panel.hidden && window.constrainWindow) window.constrainWindow(panel, undefined, undefined, {avoidDock:true}); });
  }
  const busy = () => ['requesting','finishing','decoding','exporting','cardExporting'].includes(phase);
  const takeStates = new WeakMap();
  let tracking = false, observed = null;
  document.addEventListener('agent:feature',event=>{
    if(!tracking || capture.snapshot().state!=='recording' || event.detail?.source==='demo-replay')return;
    const state=event.detail?.state;if(!['LISTEN','FOLLOW','REST'].includes(state))return;
    if(state!==observed.last){if(state==='FOLLOW')observed.followEntries++;observed.last=state;}
    if(!observed.observedStates.includes(state))observed.observedStates.push(state);
  });
  const live = () => !window.BandRuntime || window.BandRuntime.mode() === 'live';
  const seconds = value => `${value.toFixed(2)} ${t('seconds')}`;
  function setStatus(key, reason = '') { statusKey = key; errorText = reason; render(); }
  function refreshLanguage() {
    try { lang = window.BandLanguage?.current() || (JSON.parse(localStorage.getItem('agent-companion-ui') || '{}').lang === 'zh' ? 'zh' : 'en'); } catch { lang = 'en'; }
    panel.querySelectorAll('[data-copy]').forEach(node => { node.textContent = t(node.dataset.copy); });
    entry.textContent = t('entry'); $('[data-close-tool]').setAttribute('aria-label',t('close'));
    player.setAttribute('aria-label',t('listen')); waveform.setAttribute('aria-label',t('waveform'));
    startRange.setAttribute('aria-label',t('start')); endRange.setAttribute('aria-label',t('end')); render();
  }
  function render() {
    const recording = capture.snapshot().state === 'recording';
    panel.dataset.recording = entry.dataset.recording = String(recording);
    entry.setAttribute('aria-label',`${t('entry')}${recording ? ' · '+t('recording') : ''}`);
    fitPanel();
    record.textContent = raw ? t('again') : t('record');
    record.disabled = !consent.checked || !live() || busy() || recording || !supported;
    stop.textContent = pending ? t('cancel') : t('stop'); stop.disabled = !pending && !recording;
    $('[data-record-input-stop]').disabled = !pending && !window.BandObservation?.active();
    $('[data-record-phase]').textContent = t(recording ? 'recording' : phase);
    $('[data-record-status]').textContent = t(statusKey) + errorText;
    $('[data-record-sources]').textContent = raw && !recording && !pending
      ? t(raw.routedSources.includes('companion') ? 'mixed' : 'userOnly') : t(live() ? 'liveSources' : 'replay');
    $('[data-record-review]').hidden = !raw;
    $('[data-record-sources]').hidden = !raw && !recording && !pending && live();
    player.hidden = !raw; player.inert = busy() || recording;
    $('[data-record-play]').disabled = !decoded || busy() || recording;
    $('[data-record-play-stop]').disabled = !playing;
    $('[data-record-save]').disabled = !decoded || busy() || recording;
    $('[data-record-save-source]').disabled = !raw || busy() || recording;
    $('[data-record-export]').disabled = !decoded || busy() || recording;
    $('[data-record-card]').disabled = !decoded || busy() || recording;
    startRange.disabled = endRange.disabled = !decoded || busy() || recording;
    $('[data-selection-start]').textContent = seconds(from); $('[data-selection-end]').textContent = seconds(to);
    $('[data-record-selection]').textContent = `${t('selection')}: ${seconds(Math.max(0,to-from))}`;
    $('[data-record-format]').textContent = raw ? `${t('savedFormat')}: ${raw.mimeType} · ${t('downloadFormat')}: WAV` : '';
  }
  function getReviewContext() {
    if (!reviewContext || reviewContext.state === 'closed') reviewContext = new (window.AudioContext || window.webkitAudioContext)();
    return reviewContext;
  }
  function stopPlayback() {
    playbackEpoch++;
    if (playing) { const source = playing; playing = null; source.onended = null; try { source.stop(); } catch {} }
    player.pause(); render();
  }
  function draw() {
    const ctx = waveform.getContext('2d'), w = waveform.width, h = waveform.height;
    const styles = getComputedStyle(panel), ink = styles.getPropertyValue('--ink').trim() || '#162e1b';
    ctx.clearRect(0,0,w,h);
    if (!decoded) return;
    ctx.fillStyle = styles.getPropertyValue('--apple-accent').trim() || '#58c72c';
    ctx.globalAlpha = 0.25; ctx.fillRect(w*from/decoded.duration,0,w*(to-from)/decoded.duration,h); ctx.globalAlpha = 1;
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath();
    peaks.forEach((value,index) => { const x=index*w/peaks.length; const half=Math.max(1,value*h*.45); ctx.moveTo(x,h/2-half);ctx.lineTo(x,h/2+half); });
    ctx.stroke();ctx.lineWidth=3;ctx.beginPath();
    for(const time of [from,to]){const x=Math.min(w-1,Math.max(1,time/decoded.duration*w));ctx.moveTo(x,0);ctx.lineTo(x,h);}ctx.stroke();
  }
  function changeRange(kind, value) {
    if (!decoded || busy() || capture.snapshot().state === 'recording') return;
    stopPlayback();
    const gap = Math.min(0.01,decoded.duration);
    value = Math.round(Number(value)*100)/100;
    if (kind === 'start') from = Math.max(0,Math.min(Number(value),to-gap));
    else to = Math.min(Number(endRange.max),Math.max(Number(value),from+gap));
    startRange.value = String(from); endRange.value = String(to); draw(); render();
  }
  async function review(result) {
    if (!result || result === handled) return;
    handled = result; pending = false; phase = 'decoding';
    stopPlayback(); setStatus('decoding');
    consent.checked = false;
    try {
      const next = await getReviewContext().decodeAudioData(await result.blob.arrayBuffer());
      if (next.duration < .02) throw Error(t('tooShort'));
      decoded = next; raw = result;
      if (audioURL) URL.revokeObjectURL(audioURL);
      audioURL = URL.createObjectURL(raw.blob); player.src = audioURL;
      from = 0; to = Math.floor(decoded.duration*100)/100;
      startRange.max = endRange.max = String(to); startRange.value = '0';endRange.value = String(to);
      peaks = Array(420).fill(0); peak = 0;
      const data = Array.from({length:decoded.numberOfChannels},(_,index)=>decoded.getChannelData(index));
      const stride = Math.max(1,Math.floor(decoded.length/peaks.length));
      for(let i=0;i<decoded.length;i++){
        if(i&&i%262144===0)await new Promise(resolve=>setTimeout(resolve,0));
        let value=0;for(const channel of data)value=Math.max(value,Math.abs(channel[i]));
        peak=Math.max(peak,value);const bucket=Math.min(peaks.length-1,Math.floor(i/stride));peaks[bucket]=Math.max(peaks[bucket],value);
      }
      phase = 'ready';
      setStatus(peak < .00001 ? 'silent' : raw.stopReason === 'input_ended' ? 'interrupted' : raw.stopReason === 'duration_limit' ? 'capped' : 'ready'); draw();
    } catch (error) {
      phase = 'error';
      if (raw) setStatus('failedPrevious',error.message);
      else {
        raw = result; decoded = null; from = to = 0;
        audioURL = URL.createObjectURL(raw.blob); player.src = audioURL; draw();
        setStatus('failed',error.message);
      }
    }
    render();
  }
  async function startRecording() {
    if (record.disabled) return;
    const token = ++operation; pending = true; ownInput = !window.BandObservation.active(); phase = 'requesting';
    stopPlayback(); setStatus('requesting');
    try {
      if (!await window.BandObservation.start()) throw Error(window.BandObservation.lastError || 'Input unavailable');
      if (token !== operation) return;
      await capture.start({consent:true});
      if (token !== operation) { await capture.stop('cancelled'); return; }
      pending = false; recordingAt = performance.now(); phase = 'recording'; setStatus('recording');
    } catch (error) {
      if (token !== operation) return;
      pending = false; phase = 'error';
      setStatus(/NotAllowed|denied|Permission/i.test(error.message) ? 'denied' : 'failed',/NotAllowed|denied|Permission/i.test(error.message) ? '' : error.message);
    }
    render();
  }
  async function stopRecording(reason = 'user') {
    operation++;
    const cancelling = pending; pending = false;
    if (cancelling && ownInput) window.BandObservation.stop();
    phase = 'finishing'; setStatus('finishing');
    try {
      const result = await capture.stop(reason);
      if (result) await review(result);
      else { phase = raw ? 'ready' : 'idle'; setStatus(cancelling ? 'cancelled' : phase); }
    } catch (error) { phase = 'error'; setStatus('failed',error.message); }
    render();
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = name; document.body.append(link); link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000); setStatus('download');
  }
  entry.addEventListener('click',fitPanel);
  panel.addEventListener('toggle',fitPanel,true);
  record.addEventListener('click', startRecording);
  stop.addEventListener('click', () => stopRecording());
  consent.addEventListener('change',render);
  $('[data-record-input-stop]').addEventListener('click', () => { window.BandObservation.stop(); render(); });
  startRange.addEventListener('input',e=>changeRange('start',e.target.value)); endRange.addEventListener('input',e=>changeRange('end',e.target.value));
  let dragged = '';
  const pointerTime = event => Math.max(0,Math.min(1,(event.clientX-waveform.getBoundingClientRect().left)/waveform.getBoundingClientRect().width))*decoded.duration;
  waveform.addEventListener('pointerdown',event=>{
    if(!decoded || busy() || capture.snapshot().state==='recording') return;
    event.preventDefault();const time=pointerTime(event);dragged=Math.abs(time-from)<=Math.abs(time-to)?'start':'end';waveform.setPointerCapture(event.pointerId);changeRange(dragged,time);
  });
  waveform.addEventListener('pointermove',event=>{if(dragged&&decoded)changeRange(dragged,pointerTime(event));});
  for(const event of ['pointerup','pointercancel','lostpointercapture']) waveform.addEventListener(event,()=>{dragged='';});
  $('[data-record-play]').addEventListener('click', async()=>{
    if(!decoded) return;stopPlayback();const token=playbackEpoch;
    try {const ctx=getReviewContext();await ctx.resume();if(token!==playbackEpoch)return;const range=window.BandAudioExport.selection(decoded,from,to);const source=ctx.createBufferSource();source.buffer=decoded;source.connect(ctx.destination);source.onended=()=>{if(playing===source){playing=null;render();}};playing=source;source.start(0,range.first/range.rate,range.frames/range.rate);render();}
    catch(error){setStatus('failed',error.message);}
  });
  $('[data-record-play-stop]').addEventListener('click',stopPlayback);
  player.addEventListener('play',()=>{if(busy()||capture.snapshot().state==='recording'){player.pause();return;}if(playing){const source=playing;playing=null;source.onended=null;try{source.stop();}catch{}render();}});
  async function exportAudio(fullTake) {
    if(!decoded || busy() || capture.snapshot().state==='recording')return;
    stopPlayback();phase='exporting';setStatus('exporting');
    try {
      const result=await window.BandAudioExport.wav(decoded,fullTake?0:from,fullTake?decoded.duration:to);
      phase='ready';download(new Blob([result.bytes],{type:'audio/wav'}),fullTake?'share-take.wav':'share-selection.wav');
    }catch(error){phase='error';setStatus('failed',error.message);}render();
  }
  $('[data-record-card]').addEventListener('click',async()=>{
    if(!decoded||busy()||capture.snapshot().state==='recording')return;
    stopPlayback();phase='cardExporting';setStatus('cardExporting');
    try{const stats=takeStates.get(raw)||{observedStates:[],followEntries:0};const blob=await window.BandSessionCard.png({durationSeconds:decoded.duration,startSeconds:from,endSeconds:to,routedSources:raw.routedSources,silent:peak<.00001,...stats},lang);phase='ready';download(blob,'share-session.png');}
    catch(error){phase='error';setStatus('failed',error.message);}render();
  });
  $('[data-record-save]').addEventListener('click',()=>exportAudio(true));
  $('[data-record-export]').addEventListener('click',()=>exportAudio(false));
  $('[data-record-save-source]').addEventListener('click',()=>{
    if(!raw)return;
    try{const extension=raw.mimeType.includes('ogg')?'ogg':raw.mimeType.includes('webm')?'webm':raw.mimeType.includes('mp4')?'m4a':'bin';download(raw.blob,`share-source.${extension}`);}
    catch(error){setStatus('failed',error.message);}
  });
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();stopPlayback();$('[data-close-tool]').click();}});
  $('[data-close-tool]').addEventListener('click',stopPlayback);
  capture.subscribe(snapshot=>{
    if(snapshot.state==='recording'&&!tracking){tracking=true;observed={observedStates:[],followEntries:0,last:null};}
    if(snapshot.state==='idle'&&tracking){tracking=false;const result=capture.result();if(result&&result!==handled)takeStates.set(result,observed);}
    if(snapshot.state==='idle'){
      const result=capture.result();
      if(result&&result!==handled)void review(result);
      else if(snapshot.lastError&&!pending){phase='error';setStatus('failed',snapshot.lastError);}
    }
    render();
  });
  window.BandObservation.subscribe(render);
  window.BandRuntime?.subscribeMode(()=>{if(!live()){stopPlayback();if(pending||capture.snapshot().state==='recording')void stopRecording('mode_changed');}render();});
  document.querySelector('[data-panic]')?.addEventListener('click',()=>{stopPlayback();if(pending||capture.snapshot().state==='recording')void stopRecording('panic');},{capture:true});
  for(const selector of ['[data-save-settings]','[data-enter]']) document.querySelector(selector)?.addEventListener('click',()=>queueMicrotask(refreshLanguage));
  document.querySelector('[data-init-form]')?.addEventListener('submit',()=>queueMicrotask(refreshLanguage));
  if(window.BandLanguage)window.BandLanguage.subscribe(refreshLanguage);
  else window.addEventListener('storage',refreshLanguage);
  window.addEventListener('resize',fitPanel);window.addEventListener('scroll',fitPanel,{passive:true});
  new MutationObserver(()=>{entry.setAttribute('aria-expanded',String(!panel.hidden));if(panel.hidden)stopPlayback();else fitPanel();}).observe(panel,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('beforeunload',()=>{player.pause();if(audioURL)URL.revokeObjectURL(audioURL);});
  setInterval(()=>{const elapsed=capture.snapshot().state==='recording'?(performance.now()-recordingAt)/1000:raw?.durationSeconds||0;$('[data-record-time]').textContent=`${Math.floor(elapsed/60)}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;},250);
  refreshLanguage();
  if(!supported)setStatus('unsupported');
})();
