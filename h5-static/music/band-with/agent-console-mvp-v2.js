const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=$('.console-shell'),base=root.dataset.apiBase||window.location.origin;
const consoleText=text=>window.BandLanguage?.phrase(text)??text;
const defaults={userName:'',agentName:'guitar-mate',slogan:"let's get rolling today!",lang:'en',instrument:'electric_guitar',preset:'guitar-standard',string:'auto',initialized:false};
const config={...defaults,...(JSON.parse(localStorage.getItem('agent-companion-ui')||'null')||{})};
const visionCopy={en:{title:'VISION.EXE',human:'HUMAN / VISION',instrument:'INSTRUMENT',gesture:'GESTURE',vision:'VISION',start:'START CAMERA',stop:'STOP CAMERA',roi:'OPTIONAL: SET ROI',capture:'CAPTURE GUITAR STILL (3S)',annotate:'ANNOTATE 4 POINTS',undo:'UNDO LAST',cancel:'CANCEL ANNOTATION',confirm:'CONFIRM CALIBRATION',retake:'RETAKE',resume:'RESUME LIVE TRACKING',idle:'Overlay idle. Start the camera, then capture a frozen guitar still.',hold:'Hold the guitar still while the countdown runs.',captured:'CAPTURED — YOU MAY PUT THE GUITAR DOWN',point:'POINT {n}/4 · {label}',confirming:'CONFIRMING — waiting for Vision acknowledgement',calibrated:'CALIBRATED — reference accepted',error:'VISION ERROR — {reason}',frozen:'Frozen reference image ready. Annotate only on this still.',sent:'Reference sent; waiting for tracker acknowledgement.',failed:'Reference failed. Retry or retake.',resumed:'Live tracking resumed.',cameraStopped:'Semantic visual stream offline.',cameraConnected:'Video connected; body and hand overlay starting.',cameraWaiting:'Waiting for body and hand landmarks.',cameraUnavailable:'Camera unavailable: {reason}',failure:'VISION FAILURE — no response from Vision: {reason}'},zh:{title:'视觉',human:'人类 / 视觉',instrument:'乐器',gesture:'手势',vision:'视觉',start:'启动摄像头',stop:'停止摄像头',roi:'可选：设置 ROI',capture:'拍摄吉他静帧（3 秒）',annotate:'标注 4 个点',undo:'撤销上一个点',cancel:'取消标注',confirm:'确认校准',retake:'重新拍摄',resume:'恢复实时跟踪',idle:'视觉层待机。启动摄像头后，拍摄一张冻结的吉他画面。',hold:'倒计时期间请保持吉他稳定。',captured:'已拍摄 — 现在可以放下吉他',point:'第 {n}/4 点 · {label}',confirming:'确认中 — 等待 Vision 确认',calibrated:'已校准 — 参考图已确认',error:'视觉错误 — {reason}',frozen:'冻结参考图已就绪。只在这张静帧上标注。',sent:'参考图已发送，等待跟踪确认。',failed:'参考图发送失败。可以重试或重新拍摄。',resumed:'已恢复实时跟踪。',cameraStopped:'视觉流已停止。',cameraConnected:'视频已连接，正在启动身体与手部叠加层。',cameraWaiting:'等待身体与手部关键点。',cameraUnavailable:'摄像头不可用：{reason}',failure:'视觉失败 — Vision 没有回传：{reason}'}};
const vt=(key,vars={})=>Object.entries(vars).reduce((text,[name,value])=>text.replace(`{${name}}`,String(value)),(visionCopy[config.lang]||visionCopy.en)[key]||visionCopy.en[key]||key);
visionCopy.en.multiview='CAPTURE MULTI-VIEW (3S)';visionCopy.zh.multiview='拍摄多视角（3 秒）';
const feedbackReducer=globalThis.PerceptionFeedbackState;
let perceptionFeedback=feedbackReducer.initialState(config.instrument);
function updatePerceptionFeedback(event){
  if(perceptionFeedback.selectedInstrument!==config.instrument)perceptionFeedback=feedbackReducer.reduce(perceptionFeedback,{type:'select',instrument:config.instrument},performance.now());
  perceptionFeedback=feedbackReducer.reduce(perceptionFeedback,event,performance.now());
  const summary=$('[data-perception-summary]'),receipts=$('[data-perception-receipts]');
  const displayReceipts=[...perceptionFeedback.receipts,...perceptionFeedback.actionReceipts.map(r=>({status:r.status,reason:'linked candidate; no execution receipt',captureAgeMs:null,uncertaintyMs:null,actionStatus:r.status}))];
  if(summary)summary.textContent=`SELECTED ${config.instrument} · POSSESSION ${perceptionFeedback.possession} · MOTION ${perceptionFeedback.motionCandidate?'CANDIDATE':'UNKNOWN'} · PITCH unavailable`;
  if(receipts&&receipts.dataset.signature!==JSON.stringify(displayReceipts)){receipts.dataset.signature=JSON.stringify(displayReceipts);receipts.replaceChildren(...displayReceipts.map(r=>{const li=document.createElement('li');li.textContent=`${r.status} · ${r.reason} · age ${r.captureAgeMs==null?'unknown':Math.round(r.captureAgeMs)+'ms'} · uncertainty ${r.uncertaintyMs==null?'unknown':Math.round(r.uncertaintyMs)+'ms'} · ${r.actionStatus}`;return li}));}
  document.dispatchEvent(new CustomEvent('agent:perception',{detail:perceptionFeedback}));
}
setInterval(()=>updatePerceptionFeedback({type:'tick'}),100);
const faces=globalThis.AgentFaceStates;
const instruments={electric_guitar:{label:'Guitar',presets:[
 {id:'guitar-standard',label:'E standard',strings:['E2','A2','D3','G3','B3','E4'],notes:[82.41,110,146.83,196,246.94,329.63]},
 {id:'guitar-eb',label:'E♭ standard',strings:['E♭2','A♭2','D♭3','G♭3','B♭3','E♭4'],notes:[77.78,103.83,138.59,185,233.08,311.13]},
 {id:'guitar-dropd',label:'Drop D',strings:['D2','A2','D3','G3','B3','E4'],notes:[73.42,110,146.83,196,246.94,329.63]}]},bass_guitar:{label:'Bass',presets:[
 {id:'bass-standard',label:'4-string E standard',strings:['E1','A1','D2','G2'],notes:[41.20,55,73.42,98]},
 {id:'bass-eb',label:'4-string E♭ standard',strings:['E♭1','A♭1','D♭2','G♭2'],notes:[38.89,51.91,69.30,92.50]},
 {id:'bass-5-standard',label:'5-string B standard',strings:['B0','E1','A1','D2','G2'],notes:[30.87,41.20,55,73.42,98]}]}};
let socket=null,reconnectTimer=0,streamWatchdogTimer=null,lastStreamMessageAt=0,audioContext,analyser,source,stream,raf,tunerRunning=false,lockedIndex=null,candidateIndex=null,candidateFrames=0,smoothedCents=null;
const VISION_FRAME_WIDTH=320,VISION_FRAME_HEIGHT=180,VISION_FRAME_INTERVAL_MS=125;
let cameraOpening=false;
let cameraStream=null,visionTimer=null,visionCanvas=null,visionInFlight=false,visionFrameSeq=0,visionObservationTimer=null,visionAwaitingObservation=false;
const VisionCapture=globalThis.VisionCaptureState;
let visionCaptureState=VisionCapture.initialState(),visionCountdownTimer=null,visionStillUrl=null,visionStillBlob=null;
let guitarCalibrationAcknowledged=false;
const visionClientId=globalThis.crypto?.randomUUID?.()||`vision-${Date.now()}-${Math.random()}`;
const save=()=>{localStorage.setItem('agent-companion-ui',JSON.stringify(config));window.BandLanguage?.refresh();};
const instrument=()=>instruments[config.instrument]||instruments.electric_guitar;
const preset=()=>instrument().presets.find(p=>p.id===config.preset)||instrument().presets[0];
function renderTunerChoices(){const i=$('[data-instrument]'),p=$('[data-tuning]'),s=$('[data-string]');i.value=config.instrument;p.replaceChildren(...instrument().presets.map(x=>new Option(x.label,x.id)));if(!instrument().presets.some(x=>x.id===config.preset))config.preset=instrument().presets[0].id;p.value=config.preset;const x=preset();s.replaceChildren(new Option(consoleText('Auto / nearest string'),'auto'),...x.strings.map((n,k)=>new Option(`${k+1}. ${n}`,String(k))));if(config.string!=='auto'&&!x.strings[Number(config.string)])config.string='auto';s.value=config.string;save()}
let welcomeTypingGeneration=0;
function typeWelcome(){const generation=++welcomeTypingGeneration,name=config.initialized?config.userName:'____',agent=config.initialized?config.agentName:defaults.agentName,text=config.lang==='zh'?`你好，${name}，\n我是 ${agent}。`:`hi ${name},\ni am ${agent}.`,el=$('[data-welcome-text]');el.classList.toggle('has-cjk',/[\u3400-\u9fff]/u.test(text));el.textContent='';$('[data-welcome-slogan]').textContent=!config.slogan||config.slogan===defaults.slogan?consoleText(defaults.slogan):config.slogan;let n=0;const tick=()=>{if(generation!==welcomeTypingGeneration)return;el.textContent=text.slice(0,n++);if(n<=text.length)setTimeout(tick,30)};tick();const entry=$('[data-entry]');entry.dataset.initialized=String(config.initialized);const button=$('[data-initialize]');button.textContent=consoleText(config.initialized?'EDIT SETUP':'INITIALIZE COMPANION');button.hidden=false;$('[data-enter]').hidden=!config.initialized;$('.entry-actions').hidden=false}
function openInitForm(){$('[data-user-name]').value=config.userName;$('[data-agent-name]').value=config.agentName;$('[data-lang]').value=config.lang==='en'?'en':'zh';$('[data-init-form]').hidden=false;$('[data-initialize]').hidden=true;$('.entry-actions').hidden=$('[data-enter]').hidden;$('[data-user-name]').focus()}
function setConnection(text,online=false){const el=$('[data-connection]');el.textContent=consoleText(text);el.classList.toggle('is-active',online);root.classList.toggle('offline',!online);if(!online){$('[data-routing]').textContent='--';$('[data-level]').textContent='RMS --';$('[data-waveform]').hidden=true;$('[data-waveform-empty]').hidden=false;$('[data-waveform-empty]').textContent=location.protocol==='file:'?consoleText('OPEN THROUGH LOCAL SERVICE FOR LIVE AUDIO'):consoleText('NO LIVE AUDIO')}}
function syncControl(name,value){const i=$(`[data-control="${name}"]`),o=$(`[data-output="${name}"]`);if(i)i.value=Number(value).toFixed(2);if(o)o.value=Number(value).toFixed(2)}
function renderMusicalState(state){const value=String(state||'LISTEN').toUpperCase(),face=$('[data-face]');$('[data-state]').textContent=value;face.textContent=faces[value]||faces.LISTEN;face.setAttribute('aria-label',`Agent face: ${value}`)}
function renderStatus(d){if(!d)return;renderMusicalState(d.state);$('[data-routing]').textContent=d.monitor_mode||'--';$('[data-latency]').textContent=`${consoleText('LATENCY')} ${d.latency_ms==null?'--':Number(d.latency_ms).toFixed(1)+'ms'}`;if(d.clean_mix!=null)syncControl('clean_mix',d.clean_mix);if(d.drum_mix!=null)syncControl('drum_mix',d.drum_mix);$('[data-status]').textContent=d.monitor?consoleText('Monitor armed.'):consoleText('Safe default / monitor off.');if(root.dataset.runtimeMode==='web'&&window.BandWebAudio){const m=window.BandWebAudio.snapshot();syncControl('clean_mix',m.clean_mix);$('[data-monitor-toggle]').setAttribute('aria-pressed',String(m.monitor));$('[data-monitor-toggle]').textContent=m.monitor?consoleText('MONITOR ON'):consoleText('MONITOR OFF');$('[data-status]').textContent=m.monitor?consoleText('Browser monitor on · use headphones.'):consoleText('Browser monitor off.')}if(cameraStream&&d.human_state)setHumanState(d.human_state);if(d.instrument_state)setInstrumentState(d.instrument_state)}
async function getJSON(path){const r=await fetch(`${base}${path}`,{headers:{Accept:'application/json'}});if(!r.ok)throw Error(`${r.status} ${path}`);return r.json()}
async function postControl(command,payload={}){try{const send=async()=>{const r=await fetch(`${base}/api/v1/control`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,...payload})});if(!r.ok)throw Error(`${r.status}`);return r.json()};const d=window.BandWebAudio?await window.BandWebAudio.control(command,payload,send):await send();if(d.state||Object.prototype.hasOwnProperty.call(d,'monitor'))renderStatus(d);setConnection('ONLINE',true)}catch{$('[data-status]').textContent=`${consoleText('Control unavailable')} / ${command}`;setConnection('OFFLINE',false)}}
function drawWaveform(f){const c=$('[data-waveform]'),empty=$('[data-waveform-empty]'),p=Array.isArray(f?.waveform)?f.waveform:[];if(!p.length){c.hidden=true;empty.hidden=false;empty.textContent=consoleText('WAVEFORM NOT PROVIDED / RMS LIVE');return}c.hidden=false;empty.hidden=true;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#d8dad0';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#162e1b';x.beginPath();for(let n=0;n<c.width;n++){const k=Math.min(p.length-1,Math.floor(n*p.length/c.width)),y=24-(Number(p[k]||0)*20);n?x.lineTo(n,y):x.moveTo(n,y)}x.stroke()}
function setHumanState(state,note){const value=String(state||'UNKNOWN').toUpperCase();$('[data-human-state]').textContent=value;$('[data-vision-note]').textContent=note||consoleText('Semantic visual stream active.')}
function setInstrumentState(state){const value=String(state||'UNKNOWN').toUpperCase();$('[data-instrument-state]').textContent=value}
function setVisionState(state,note){$('[data-vision-state]').textContent=String(state||'OFFLINE').toUpperCase();if(note)$('[data-vision-note]').textContent=note}
function handleVisionMessage(m){const p=m.payload||m.data||m;if(m.type==='body_observation'){setVisionState('STREAMING','Visual input received; waiting for semantic confirmation.');if(p.human_state)setHumanState(p.human_state);if(p.person_present===false)setHumanState('AWAY','Person not in view.');if(p.instrument_state)setInstrumentState(p.instrument_state);return}if(m.type==='instrument_context'){setVisionState('SEMANTIC','Instrument context reported by local vision.');setInstrumentState(p.instrument_state||p.instrument||p.state);return}if(m.type==='human_state'){setVisionState('SEMANTIC','Human readiness reported by local vision.');setHumanState(p.state||p.human_state);if(p.instrument_state)setInstrumentState(p.instrument_state);return}if(m.type==='gesture_candidate'){setVisionState('SEMANTIC','Gesture candidate reported; awaiting action confirmation.');$('[data-gesture-state]').textContent=String(p.gesture||p.name||'CANDIDATE').toUpperCase();return}if(m.type==='event'&&(p.domain==='body'||p.domain==='gesture'||p.gesture||p.human_state)){if(p.human_state)setHumanState(p.human_state);if(p.instrument_state)setInstrumentState(p.instrument_state);if(p.gesture)$('[data-gesture-state]').textContent=String(p.gesture).toUpperCase();if(p.action)$('[data-gesture-state]').textContent=String(p.action).toUpperCase()}}
function renderFrame(f){if(!Number.isFinite(f.time_s))return;lastStreamMessageAt=performance.now();setConnection(f.source==='demo-replay'?'DEMO REPLAY':'AUDIO LIVE',true);$('[data-level]').textContent=`RMS ${Number(f.rms||0).toFixed(4)}`;$('[data-event]').textContent=f.onset?consoleText('New attack detected.'):f.silence?consoleText('Space / silence.'):consoleText('Listening for signal.');$('[data-event-log]').textContent=f.onset?'onset':f.state||'feature';$('[data-stage]').textContent=f.state||'feature';$('[data-event-dot]').classList.toggle('pulse-on',Boolean(f.onset));drawWaveform(f);if(f.state)renderMusicalState(f.state);document.dispatchEvent(new CustomEvent('agent:feature',{detail:f}))}
function handleVisionMessage(m){const p=m.payload||m.data||m;if(m.type==='body_observation'){setVisionState('STREAMING',p.person_present?'Body detected by local PoseLandmarker.':'Body frame received; pose not yet confirmed.');if(p.human_state)setHumanState(p.human_state);if(p.instrument_state)setInstrumentState(p.instrument_state);return}if(m.type==='instrument_context'){setVisionState('SEMANTIC','Instrument context reported by local vision.');setInstrumentState(p.instrument_state||p.instrument||p.state);return}if(m.type==='human_state'){setVisionState('SEMANTIC','Human readiness reported by local vision.');setHumanState(p.state||p.human_state);if(p.instrument_state)setInstrumentState(p.instrument_state);return}if(m.type==='gesture_candidate'){$('[data-gesture-state]').textContent=String(p.gesture||p.name||'CANDIDATE').toUpperCase();setVisionState('SEMANTIC','Gesture candidate reported; awaiting action confirmation.');return}}
function connectStream(){if(!('WebSocket'in window))return;const wb=base.replace(/^http/,'ws');if(!streamWatchdogTimer)streamWatchdogTimer=setInterval(()=>{if(lastStreamMessageAt&&performance.now()-lastStreamMessageAt>4000){setConnection('OFFLINE',false);setVisionState('OFFLINE','No recent audio or Vision stream data.')}},1000);try{socket=new WebSocket(`${wb}/api/v1/stream`);socket.onopen=()=>{updatePerceptionFeedback({type:'resume'});lastStreamMessageAt=performance.now();setConnection('ONLINE',true)};socket.onmessage=e=>{lastStreamMessageAt=performance.now();try{const m=JSON.parse(e.data);if(cameraStream||['action_receipt','perception_reset'].includes(m.type)){const envelope=m.type==='perception_reset'?m:(m.envelope||m.perception_evidence?.envelope);updatePerceptionFeedback({message:m,captureAgeMs:window.BandPerception?.captureAge(envelope)??null});}if(m.type==='feature')renderFrame(m);if(m.type==='body_observation'||m.type==='instrument_context'||m.type==='human_state'||m.type==='gesture_candidate')handleVisionMessage(m);if(m.type==='event'){$('[data-event-log]').textContent=m.event||'event';$('[data-stage]').textContent=m.stage||m.state||'event';handleVisionMessage(m)}}catch{}};socket.onclose=()=>{updatePerceptionFeedback({type:'disconnect'});lastStreamMessageAt=0;setConnection('OFFLINE',false);setVisionState('OFFLINE','Semantic visual stream offline.');clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connectStream,2500)};socket.onerror=()=>socket.close()}catch{setConnection('OFFLINE',false)}}
function addChat(kind,text){const e=document.createElement('div');e.className=`chat-message chat-message--${kind}`;e.textContent=text;$('[data-chat-log]').append(e);$('[data-chat-log]').scrollTop=$('[data-chat-log]').scrollHeight}
function chatReply(text){const m=text.match(/^\/tune\s+(.+)/i);if(!m)return'I hear you. I will listen first, then leave space for your next phrase.';const v=m[1].toLowerCase();if(v.includes('bass'))config.instrument='bass_guitar';const x=instrument().presets.find(p=>v.includes(p.id.replace(`${config.instrument}-`,'')))||instrument().presets.find(p=>v.includes('eb')&&p.id.endsWith('eb'))||instrument().presets.find(p=>v.includes('drop d')&&p.id.endsWith('dropd'))||instrument().presets[0];config.preset=x.id;config.string='auto';renderTunerChoices();return`${instrument().label} / ${x.label} selected. Choose a string or play one clear string when you are ready.`}
function autoCorrelate(b,s){let power=0;for(const v of b)power+=v*v;const rms=Math.sqrt(power/b.length);if(rms<.012)return null;const minLag=Math.max(2,Math.floor(s/1000)),maxLag=Math.min(b.length-2,Math.floor(s/25)),errors=[];for(let lag=minLag;lag<=maxLag;lag++){let diff=0,energy=0;for(let i=0;i<b.length-lag;i++){const d=b[i]-b[i+lag];diff+=d*d;energy+=b[i]*b[i]+b[i+lag]*b[i+lag]}errors.push(energy?diff/energy:1)}let best=-1,bestError=Infinity;for(let i=1;i<errors.length-1;i++){const e=errors[i];if(e<=errors[i-1]&&e<=errors[i+1]&&e<.35){best=minLag+i;bestError=e;break}}if(best<0)for(let i=0;i<errors.length;i++)if(errors[i]<bestError){bestError=errors[i];best=minLag+i}return best>0?{frequency:s/best,confidence:Math.max(0,Math.min(1,1-bestError))}:null}
function tunerWindowSize(){return config.instrument==='bass_guitar'||preset().id.startsWith('bass-')?4096:2048}
function resetLock(){lockedIndex=null;candidateIndex=null;candidateFrames=0;smoothedCents=null}
function tuneFrame(){if(!tunerRunning)return;const b=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(b);const reading=autoCorrelate(b,audioContext.sampleRate),x=preset();if(reading){const next=config.string==='auto'?x.notes.reduce((a,n,k)=>Math.abs(12*Math.log2(reading.frequency/n))<Math.abs(12*Math.log2(reading.frequency/x.notes[a]))?k:a,0):Number(config.string);if(next===candidateIndex)candidateFrames++;else{candidateIndex=next;candidateFrames=1}if(candidateFrames>=4&&(lockedIndex===null||next!==lockedIndex)){lockedIndex=next;smoothedCents=null}if(lockedIndex!==null&&next===lockedIndex){const target=x.notes[lockedIndex],cents=1200*Math.log2(reading.frequency/target);smoothedCents=smoothedCents===null?cents:smoothedCents*.7+cents*.3;const clamped=Math.max(-50,Math.min(50,smoothedCents));$('[data-tuner-note]').textContent=x.strings[lockedIndex];$('[data-tuner-frequency]').textContent=`${reading.frequency.toFixed(1)} Hz / target ${target.toFixed(1)} Hz`;$('[data-tuner-cents]').textContent=`${smoothedCents>=0?'+':''}${smoothedCents.toFixed(1)} cents`;$('[data-tuner-meter]').style.left=`${50+clamped}%`;const good=Math.abs(smoothedCents)<=5&&reading.confidence>.25&&candidateFrames>=4;$('[data-tuner-face]').textContent=good?'( •‿• )':'(・_・)';$('[data-tuner-face]').classList.toggle('is-tuned',good)}else $('[data-tuner-frequency]').textContent='checking one stable string…'}else{$('[data-tuner-frequency]').textContent='listening for a clear single note…';$('[data-tuner-face]').textContent='(・_・)';$('[data-tuner-face]').classList.remove('is-tuned')}raf=requestAnimationFrame(tuneFrame)}
function stopTuner(){tunerRunning=false;cancelAnimationFrame(raf);if(source)source.disconnect();if(stream)stream.getTracks().forEach(t=>t.stop());source=null;stream=null;resetLock();$('[data-tuner-start]').textContent=consoleText('START TUNER');$('[data-tuner-frequency]').textContent='waiting for microphone';$('[data-tuner-cents]').textContent='— cents';$('[data-tuner-note]').textContent='—';$('[data-tuner-face]').textContent='(・_・)';$('[data-tuner-face]').classList.remove('is-tuned')}
async function toggleTuner(){if(tunerRunning){stopTuner();return}try{audioContext=new(window.AudioContext||window.webkitAudioContext)();stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});source=audioContext.createMediaStreamSource(stream);analyser=audioContext.createAnalyser();analyser.fftSize=tunerWindowSize();source.connect(analyser);resetLock();tunerRunning=true;$('[data-tuner-start]').textContent=consoleText('STOP TUNER');tuneFrame()}catch(e){$('[data-tuner-frequency]').textContent=`Microphone unavailable: ${e.name}`}}
function enterApp(){$('[data-entry]').hidden=true;$('[data-window]').hidden=false;$('[data-agent-label]').textContent=`${config.agentName} / ${consoleText('CHATBOX')}`;addChat('agent',consoleText('Welcome, {name}. Tell me the room you want to make.').replace('{name}',config.userName))}
function bind(){renderTunerChoices();typeWelcome();$('[data-initialize]').onclick=openInitForm;$('[data-init-form]').onsubmit=e=>{e.preventDefault();config.userName=$('[data-user-name]').value.trim();config.agentName=$('[data-agent-name]').value.trim()||defaults.agentName;config.lang=$('[data-lang]').value==='en'?'en':'zh';config.initialized=true;save();$('[data-init-form]').hidden=true;typeWelcome()};$('[data-enter]').onclick=enterApp;$('[data-chat-form]').onsubmit=e=>{e.preventDefault();const i=$('[data-chat-input]'),t=i.value.trim();if(!t)return;addChat('user',t);addChat('agent',chatReply(t));i.value=''};$('[data-tuner-start]').onclick=toggleTuner;$('[data-camera-start]').onclick=toggleCamera;$('[data-camera-stop]').onclick=toggleCamera;$('[data-instrument]').onchange=e=>{config.instrument=e.target.value;updatePerceptionFeedback({type:'select',instrument:config.instrument});config.preset=instrument().presets[0].id;config.string='auto';resetLock();renderTunerChoices()};$('[data-tuning]').onchange=e=>{config.preset=e.target.value;config.string='auto';resetLock();renderTunerChoices()};$('[data-string]').onchange=e=>{config.string=e.target.value;resetLock();save()};$('[data-settings]').onclick=()=>{const p=$('[data-settings-panel]');p.hidden=!p.hidden;if(!p.hidden){$('[data-setting-user]').value=config.userName;$('[data-setting-agent]').value=config.agentName;$('[data-setting-slogan]').value=config.slogan;$('[data-setting-lang]').value=config.lang==='en'?'en':'zh'}};$('[data-save-settings]').onclick=()=>{config.userName=$('[data-setting-user]').value.trim()||'user';config.agentName=$('[data-setting-agent]').value.trim()||defaults.agentName;config.slogan=$('[data-setting-slogan]').value.trim()||defaults.slogan;config.lang=$('[data-setting-lang]').value==='en'?'en':'zh';save();$('[data-settings-panel]').hidden=true;typeWelcome()};$('[data-minimize]').onclick=e=>{const collapsed=$('[data-window]').classList.toggle('is-minimized');e.currentTarget.setAttribute('aria-expanded',String(!collapsed));e.currentTarget.setAttribute('aria-label',consoleText(collapsed?'Expand feature monitor':'Collapse feature monitor'))};$('[data-monitor-toggle]').onclick=e=>{const on=e.currentTarget.getAttribute('aria-pressed')==='true';e.currentTarget.setAttribute('aria-pressed',String(!on));e.currentTarget.textContent=on?consoleText('MONITOR OFF'):consoleText('MONITOR ON');postControl('set_monitor',{enabled:!on})};$('[data-panic]').onclick=()=>{updatePerceptionFeedback({type:'panic'});if(cameraStream)toggleCamera();postControl('panic')};$$('[data-control]').forEach(i=>{const n=i.dataset.control;i.oninput=()=>{$(`[data-output="${n}"]`).value=Number(i.value).toFixed(2)};i.onchange=()=>postControl(`set_${n}`,{value:Number(i.value)})})}
let latestVision=null,instrumentRoi=null,roiMode=false,roiStart=null,roiDraft=null;
let guitarCalibration=null,guitarCalibrationMode=false,guitarCalibrationPoints=[],guitarCalibrationId=null,guitarTrackingMisses=0,guitarTrackingMethod='REFERENCE READY',guitarReferenceCaptureUntil=0,guitarReferenceCount=0,guitarActionState='TRACKING',guitarLastEventId=0;
const guitarActionTracker=new GuitarSpace.ActionTracker({crossingThreshold:.14,maxMotionMs:350,cooldownMs:700});
const guitarStats={candidates:0,captures:0,falsePositives:0,latencies:[]};
const guitarCalibrationLabels=['琴枕 × 低音 E（最粗弦）','琴枕 × 高音 E（最细弦）','琴桥 × 低音 E（最粗弦）','琴桥 × 高音 E（最细弦）'];
const guitarCalibrationStorageKey=()=>`agent-companion-guitar-calibration-v1:${config.instrument}`;
const bodyLinks=[['left_shoulder','right_shoulder'],['left_shoulder','left_elbow'],['left_elbow','left_wrist'],['right_shoulder','right_elbow'],['right_elbow','right_wrist'],['left_shoulder','left_hip'],['right_shoulder','right_hip'],['left_hip','right_hip']];
const handLinks=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function visionOverlayRegion(data,canvas){
  const tracking=data.guitar_tracking;
  if(guitarCalibrationId){
    if(tracking?.calibration_id!==guitarCalibrationId||!['initialized','flow_tracking','relocalized'].includes(tracking.status)||tracking.points?.length!==4)return null;
    const xs=tracking.points.map(point=>Number(point[0])),ys=tracking.points.map(point=>Number(point[1]));
    if(![...xs,...ys].every(Number.isFinite))return null;
    const x=Math.min(...xs),y=Math.min(...ys);
    return {box:[x*canvas.width,y*canvas.height,(Math.max(...xs)-x)*canvas.width,(Math.max(...ys)-y)*canvas.height],label:config.lang==='zh'?'弦区':'STRING REGION'};
  }
  const normalized=data.instrument_evidence?.bbox_normalized;
  if(!Array.isArray(normalized)||normalized.length!==4||!normalized.every(Number.isFinite))return null;
  return {box:normalized.map((value,index)=>value*(index%2?canvas.height:canvas.width)),label:config.lang==='zh'?'手动 ROI':'MANUAL ROI'};
}
function consistentBodyOverlay(data,canvas){
  const landmarks={};
  const visible=p=>p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y))&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&Number(p.visibility??1)>=.5;
  for(const [name,p] of Object.entries(data.landmarks||{}))if(visible(p))landmarks[name]=p;
  const hands=(data.hands||[]).map(hand=>hand.landmarks?.[0]).filter(visible);
  const candidates=[];
  for(const side of ['left','right']){
    const wrist=landmarks[`${side}_wrist`];
    if(!wrist)continue;
    hands.forEach((hand,index)=>{const distance=Math.hypot((wrist.x-hand.x)*canvas.width,(wrist.y-hand.y)*canvas.height)/Math.hypot(canvas.width,canvas.height);if(distance<=.08)candidates.push({side,index,distance,hand});});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const usedHands=new Set(),matched=new Map();
  for(const match of candidates)if(!usedHands.has(match.index)&&!matched.has(match.side)){usedHands.add(match.index);matched.set(match.side,match.hand);}
  if(hands.length)for(const side of ['left','right']){
    if(!matched.has(side)){delete landmarks[`${side}_elbow`];delete landmarks[`${side}_wrist`];}
    else landmarks[`${side}_wrist`]={...landmarks[`${side}_wrist`],x:matched.get(side).x,y:matched.get(side).y};
  }
  return landmarks;
}
function drawOverlay(data){const canvas=$('[data-vision-overlay]'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);if(!data)return;const point=(p)=>[Number(p.x)*canvas.width,Number(p.y)*canvas.height];ctx.lineWidth=3;ctx.strokeStyle='#5cff85';ctx.fillStyle='#5cff85';const body=consistentBodyOverlay(data,canvas);for(const [a,b] of bodyLinks){if(body[a]&&body[b]){const pa=point(body[a]),pb=point(body[b]);ctx.beginPath();ctx.moveTo(...pa);ctx.lineTo(...pb);ctx.stroke()}}for(const p of Object.values(body)){const [x,y]=point(p);ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill()}for(const hand of data.hands||[]){ctx.strokeStyle='#51d9ff';ctx.fillStyle='#51d9ff';for(const [a,b] of handLinks){if(hand.landmarks[a]&&hand.landmarks[b]){const pa=point(hand.landmarks[a]),pb=point(hand.landmarks[b]);ctx.beginPath();ctx.moveTo(...pa);ctx.lineTo(...pb);ctx.stroke()}}for(const p of hand.landmarks){const [x,y]=point(p);ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}const wrist=hand.landmarks[0];if(wrist){const [x,y]=point(wrist);ctx.font='12px monospace';ctx.fillText(hand.handedness||'HAND',x+8,y-8)}}const region=visionOverlayRegion(data,canvas);const box=region?.box;if(box){const [x,y,w,h]=box;ctx.strokeStyle='#ffb347';ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);ctx.fillStyle='#ffb347';ctx.font='12px monospace';ctx.fillText(region.label,x+4,Math.max(14,y-5))}const wave=data.gesture?.status==='confirmed';ctx.fillStyle=wave?'#58c72c':'#f7f8ec';ctx.font='12px monospace';ctx.fillText(`BODY ${data.person_present?'PRESENT':'SEARCHING'}  MOTION ${(Number(data.movement_energy||0)).toFixed(2)}${wave?'  WAVE CONFIRMED':''}`,8,18);$('[data-overlay-status]').textContent=`Body ${data.person_present?'detected':'not confirmed'} · hands ${(data.hands||[]).length} · motion ${(Number(data.movement_energy||0)).toFixed(2)}${box?` · ${region.label}`:''}${wave?' · WAVE confirmed':''}`;drawRoiDraft(ctx,canvas);drawGuitarSpace(ctx,canvas,data)}
function drawRoiDraft(ctx,canvas){if(!roiDraft)return;const [x,y,w,h]=roiDraft;ctx.save();ctx.setLineDash([8,5]);ctx.lineWidth=3;ctx.strokeStyle='#ffb347';ctx.fillStyle='rgba(255,179,71,.16)';ctx.fillRect(x*canvas.width,y*canvas.height,w*canvas.width,h*canvas.height);ctx.strokeRect(x*canvas.width,y*canvas.height,w*canvas.width,h*canvas.height);ctx.setLineDash([]);ctx.fillStyle='#ffb347';ctx.font='12px monospace';ctx.fillText('RELEASE TO SET',x*canvas.width+5,Math.max(15,y*canvas.height-6));ctx.restore()}
function installRoiSelection(){
  const canvas=$('[data-vision-overlay]');if(canvas.dataset.bound)return;canvas.dataset.bound='1';
  const normalizedPoint=e=>{const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]};
  const redraw=()=>[VisionCapture.MODES.CAPTURED,VisionCapture.MODES.ANNOTATING,VisionCapture.MODES.CALIBRATED,VisionCapture.MODES.ERROR].includes(visionCaptureState.mode)?renderFrozenPoints(visionCaptureState.draftPoints.length?visionCaptureState.draftPoints:visionCaptureState.activePoints||[]):drawOverlay(latestVision);
  const updateDraft=end=>{roiDraft=[Math.min(roiStart[0],end[0]),Math.min(roiStart[1],end[1]),Math.abs(end[0]-roiStart[0]),Math.abs(end[1]-roiStart[1])];redraw()};
  canvas.addEventListener('pointerdown',e=>{if(!roiMode)return;roiStart=normalizedPoint(e);roiDraft=[roiStart[0],roiStart[1],0,0];canvas.setPointerCapture?.(e.pointerId);redraw()});
  canvas.addEventListener('pointermove',e=>{if(!roiMode||!roiStart)return;updateDraft(normalizedPoint(e))});
  canvas.addEventListener('pointerup',e=>{if(!roiMode||!roiStart)return;updateDraft(normalizedPoint(e));instrumentRoi=roiDraft;roiStart=null;roiDraft=null;roiMode=false;canvas.style.pointerEvents='none';$('[data-roi-toggle]').textContent=config.lang==='zh'?'重新选择乐器':'RESELECT INSTRUMENT';$('[data-overlay-status]').textContent=config.lang==='zh'?'冻结画面上的乐器 ROI 已固定。摄像头或吉他移动后请重新选择。':'Instrument ROI fixed on the frozen still. Reselect if the camera or guitar moves.';redraw()});
  canvas.addEventListener('pointercancel',()=>{roiStart=null;roiDraft=null;redraw()});
}
function toggleRoi(){const frozen=[VisionCapture.MODES.CAPTURED,VisionCapture.MODES.ANNOTATING,VisionCapture.MODES.CALIBRATED,VisionCapture.MODES.ERROR].includes(visionCaptureState.mode);if(!frozen)return;roiMode=!roiMode;const canvas=$('[data-vision-overlay]');if(roiMode){instrumentRoi=null;roiStart=null;roiDraft=null;$('[data-overlay-status]').textContent=config.lang==='zh'?'在冻结画面上拖出完整的吉他琴身和琴颈。':'Drag a box around the visible guitar body and neck on the frozen still.'}canvas.style.pointerEvents=roiMode?'auto':'none';$('[data-roi-toggle]').textContent=roiMode?(config.lang==='zh'?'拖动框选吉他':'DRAG BOX AROUND GUITAR'):(config.lang==='zh'?'重新选择乐器':'RESELECT INSTRUMENT')}
let visionStillObservation=null;
function releaseVisionStill(){visionStillObservation=null;if(visionStillUrl)URL.revokeObjectURL(visionStillUrl);visionStillUrl=null;visionStillBlob=null;const still=$('[data-vision-still]');if(still){still.removeAttribute('src');still.hidden=true}}
function renderFrozenPoints(points=[]){const canvas=$('[data-vision-overlay]'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);if(visionStillObservation)drawOverlay(visionStillObservation);ctx.fillStyle='#ffb347';ctx.strokeStyle='#162e1b';ctx.lineWidth=2;ctx.font='14px monospace';points.forEach((point,index)=>{const x=point[0]*canvas.width,y=point[1]*canvas.height;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#162e1b';ctx.fillText(String(index+1),x+11,y-10);ctx.fillStyle='#ffb347'});if(instrumentRoi){const [x,y,w,h]=instrumentRoi;ctx.save();ctx.setLineDash([8,5]);ctx.strokeStyle='#ffb347';ctx.fillStyle='rgba(255,179,71,.12)';ctx.fillRect(x*canvas.width,y*canvas.height,w*canvas.width,h*canvas.height);ctx.strokeRect(x*canvas.width,y*canvas.height,w*canvas.width,h*canvas.height);ctx.setLineDash([]);ctx.fillStyle='#ffb347';ctx.fillText(config.lang==='zh'?'乐器 ROI':'INSTRUMENT ROI',x*canvas.width+5,Math.max(15,y*canvas.height-6));ctx.restore()}if(roiDraft)drawRoiDraft(ctx,canvas)}
function renderVisionCapture(){
  const mode=visionCaptureState.mode;
  const frozen=[VisionCapture.MODES.CAPTURED,VisionCapture.MODES.ANNOTATING,VisionCapture.MODES.CONFIRMING,VisionCapture.MODES.CALIBRATED,VisionCapture.MODES.ERROR].includes(mode);
  const annotating=mode===VisionCapture.MODES.ANNOTATING;
  const hasFourPoints=visionCaptureState.draftPoints.length===4;
  const setHidden=(selector,hidden)=>{const element=$(selector);if(element)element.hidden=hidden};
  setHidden('[data-vision-capture]',!cameraStream||![VisionCapture.MODES.LIVE,VisionCapture.MODES.TRACKING].includes(mode));
  setHidden('[data-vision-still]',!frozen);
  setHidden('[data-vision-annotate]',mode!==VisionCapture.MODES.CAPTURED);
  setHidden('[data-vision-undo]',!annotating);
  setHidden('[data-vision-cancel-annotation]',!annotating);
  setHidden('[data-vision-confirm]',!annotating);
  setHidden('[data-vision-retake]',!frozen);
  setHidden('[data-vision-resume]',mode!==VisionCapture.MODES.CALIBRATED);
  const confirm=$('[data-vision-confirm]');if(confirm)confirm.disabled=!hasFourPoints;
  const canvas=$('[data-vision-overlay]');if(canvas){canvas.style.pointerEvents=annotating||roiMode?'auto':'none';if(frozen)renderFrozenPoints(visionCaptureState.draftPoints.length?visionCaptureState.draftPoints:visionCaptureState.activePoints||[])}
}
const visionPointLabels={en:['nut / low E','nut / high E','bridge / low E','bridge / high E'],zh:['琴枕 / 低音 E','琴枕 / 高音 E','琴桥 / 低音 E','琴桥 / 高音 E']};
function applyVisionLanguage(){const panel=$('[data-tool-window="vision"]');if(!panel)return;const copy=visionCopy[config.lang]||visionCopy.en;panel.querySelector('.window-bar span').textContent=copy.title;const gridLabels=panel.querySelectorAll('.human-state-grid b');[copy.instrument,copy.gesture,copy.vision].forEach((text,index)=>{if(gridLabels[index])gridLabels[index].textContent=text});const labels=[['data-camera-start','start'],['data-camera-stop','stop'],['data-roi-toggle','roi'],['data-vision-capture','capture'],['data-vision-annotate','annotate'],['data-vision-undo','undo'],['data-vision-cancel-annotation','cancel'],['data-vision-confirm','confirm'],['data-vision-retake','retake'],['data-vision-resume','resume']];labels.forEach(([selector,key])=>{const el=panel.querySelector(`[${selector}]`);if(el)el.textContent=copy[key]});panel.querySelector('[data-overlay-status]').textContent=copy.idle;const still=panel.querySelector('[data-vision-still]');if(still)still.alt=config.lang==='zh'?'冻结的吉他参考画面':'Frozen guitar reference frame';renderVisionCapture();}
const legacyRenderVisionCapture=renderVisionCapture;
renderVisionCapture=function(){legacyRenderVisionCapture();const mode=visionCaptureState.mode;if(mode===VisionCapture.MODES.COUNTDOWN)$('[data-vision-capture-status]').textContent=vt('hold');else if(mode===VisionCapture.MODES.CAPTURED)$('[data-vision-capture-status]').textContent=vt('captured');else if(mode===VisionCapture.MODES.ANNOTATING)$('[data-vision-capture-status]').textContent=vt('point',{n:visionCaptureState.draftPoints.length+1,label:(visionPointLabels[config.lang]||visionPointLabels.en)[visionCaptureState.draftPoints.length]||'complete'});else if(mode===VisionCapture.MODES.CONFIRMING)$('[data-vision-capture-status]').textContent=vt('confirming');else if(mode===VisionCapture.MODES.CALIBRATED)$('[data-vision-capture-status]').textContent=vt('calibrated');else if(mode===VisionCapture.MODES.TRACKING)$('[data-vision-capture-status]').textContent=vt('resumed');else if(mode===VisionCapture.MODES.ERROR)$('[data-vision-capture-status]').textContent=vt('error',{reason:visionCaptureState.error||'retry or retake'})};
const batchDRenderVisionCapture=renderVisionCapture;
renderVisionCapture=function(){batchDRenderVisionCapture();const frozen=[VisionCapture.MODES.CAPTURED,VisionCapture.MODES.ANNOTATING,VisionCapture.MODES.CONFIRMING,VisionCapture.MODES.CALIBRATED,VisionCapture.MODES.ERROR].includes(visionCaptureState.mode);const roiButton=$('[data-roi-toggle]');if(roiButton)roiButton.hidden=!cameraStream||!frozen||visionCaptureState.mode===VisionCapture.MODES.CONFIRMING;if(!frozen&&!roiMode){const canvas=$('[data-vision-overlay]');if(canvas)canvas.style.pointerEvents='none'}else if(frozen){const canvas=$('[data-vision-overlay]');if(canvas)canvas.style.pointerEvents=visionCaptureState.mode===VisionCapture.MODES.ANNOTATING||roiMode?'auto':'none'}};
const roiAndMultiRenderVisionCapture=renderVisionCapture;
renderVisionCapture=function(){roiAndMultiRenderVisionCapture();const multi=$('[data-vision-multiview]');if(multi){multi.hidden=!cameraStream||visionCaptureState.mode!==VisionCapture.MODES.TRACKING;multi.textContent=vt('multiview')}};
const captureLanguageApply=applyVisionLanguage;
applyVisionLanguage=function(){captureLanguageApply();const multi=$('[data-vision-multiview]');if(multi)multi.textContent=vt('multiview')};
const baseVisionLanguage=applyVisionLanguage;
applyVisionLanguage=function(){baseVisionLanguage();const panel=$('.guitar-space-panel');if(!panel)return;const zh=config.lang!=='en';const state=panel.querySelector('[data-guitar-coordinate]');if(state)state.textContent=zh?'固定机位：冻结参考图定义两根外侧 E 弦；A/D/G/B 自动插值。':'Fixed camera: the frozen reference defines the two outer E strings; A/D/G/B are interpolated.';const summary=panel.querySelector('.guitar-calibration-help summary');if(summary)summary.textContent=zh?'TRACKING DIAGNOSTICS / 操作说明':'TRACKING DIAGNOSTICS / notes';const items=panel.querySelectorAll('.guitar-calibration-help li');const copy=zh?['使用 CAPTURE GUITAR STILL 拍摄静帧。','在冻结画面上标注：琴枕低音 E、琴枕高音 E、琴桥低音 E、琴桥高音 E。','确认后等待 Vision acknowledgement。','确认后可恢复实时跟踪；若丢失，请重新拍摄。']:['Use CAPTURE GUITAR STILL to create a frozen reference.','Mark nut low E, nut high E, bridge low E, and bridge high E on the still.','Confirm and wait for the Vision acknowledgement.','Resume live tracking after confirmation; retake if tracking is lost.'];items.forEach((item,index)=>{if(copy[index])item.textContent=copy[index]});const falsePositive=panel.querySelector('[data-guitar-false-positive]'),reset=panel.querySelector('[data-guitar-reset]');if(falsePositive)falsePositive.textContent=zh?'标记误报':'MARK FALSE POSITIVE';if(reset)reset.textContent=zh?'重置诊断':'RESET DIAGNOSTICS'};
function visionCaptureTransition(event){const outcome=VisionCapture.transition(visionCaptureState,event);if(!outcome.accepted){$('[data-overlay-status]').textContent=outcome.reason||'Action unavailable in the current Vision state.';return false}visionCaptureState=outcome.state;if(outcome.effects.includes(VisionCapture.EFFECTS.RELEASE_STILL))releaseVisionStill();renderVisionCapture();return true}
function captureFrozenFrame(){if(!cameraStream)return;const video=$('[data-camera-preview]'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.getContext('2d').drawImage(video,0,0,640,360);canvas.toBlob(blob=>{if(!blob||visionCaptureState.mode!==VisionCapture.MODES.COUNTDOWN)return;visionStillObservation=latestVision?JSON.parse(JSON.stringify(latestVision)):null;visionStillBlob=blob;visionStillUrl=URL.createObjectURL(blob);$('[data-vision-still]').src=visionStillUrl;visionCaptureTransition({type:VisionCapture.EVENTS.COUNTDOWN_FINISHED,stillToken:`still:${Date.now()}`});$('[data-overlay-status]').textContent=vt('frozen')},'image/jpeg',.88)}
function requestVisionCapture(){if(!visionCaptureTransition({type:VisionCapture.EVENTS.CAPTURE_REQUESTED}))return;let remaining=3;$('[data-vision-countdown]').textContent=String(remaining);clearInterval(visionCountdownTimer);visionCountdownTimer=setInterval(()=>{remaining-=1;if(remaining>0){$('[data-vision-countdown]').textContent=String(remaining);return}clearInterval(visionCountdownTimer);visionCountdownTimer=null;$('[data-vision-countdown]').textContent='CAPTURED';captureFrozenFrame();setTimeout(()=>{$('[data-vision-countdown]').textContent=''},650)},1000)}
function addFrozenPoint(event){const canvas=$('[data-vision-overlay]'),rect=canvas.getBoundingClientRect(),point=[(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height];visionCaptureTransition({type:VisionCapture.EVENTS.POINT_ADDED,point})}
async function confirmVisionCalibration(){const id=`cal-${Date.now()}`;if(!visionCaptureTransition({type:VisionCapture.EVENTS.CONFIRM,calibrationId:id}))return;guitarCalibrationId=id;guitarCalibrationAcknowledged=false;guitarCalibrationPoints=visionCaptureState.draftPoints.map(point=>[...point]);try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(visionStillBlob)});const {response,payload}=await requestVisionFrame({jpeg_base64:dataUrl.split(',')[1],frame_role:'calibration_reference',client_id:visionClientId,client_frame_id:++visionFrameSeq,guitar_calibration_id:id,guitar_calibration_points:guitarCalibrationPoints});if(!response.ok)throw Error(payload.reason||payload.error||`HTTP ${response.status}`);if(response.status===202||payload.dropped)throw Error('Vision busy: reference was not processed; retry calibration.');if(visionCaptureState.mode!==VisionCapture.MODES.CONFIRMING||visionCaptureState.pendingCalibrationId!==id)return;const tracking=payload.guitar_tracking;if(tracking?.calibration_id===id&&tracking.status==='initialized'){handleVisionMessage({type:'body_observation',guitar_tracking:tracking})}else{$('[data-overlay-status]').textContent=vt('sent');clearTimeout(visionObservationTimer);visionObservationTimer=setTimeout(()=>{if(visionCaptureState.mode===VisionCapture.MODES.CONFIRMING){visionCaptureTransition({type:VisionCapture.EVENTS.REFERENCE_REJECTED,calibrationId:id,reason:'no calibration acknowledgement'});markVisionFailure('calibration request returned without an acknowledgement.')}},2000)}}catch(error){visionCaptureTransition({type:VisionCapture.EVENTS.REFERENCE_REJECTED,calibrationId:id,reason:error.message});$('[data-overlay-status]').textContent=vt('failed');markVisionFailure(error.message)}}
function resumeVisionTracking(){if(!visionCaptureTransition({type:VisionCapture.EVENTS.RESUME}))return;const canvas=$('[data-vision-overlay]');canvas.style.pointerEvents='none';$('[data-overlay-status]').textContent=vt('resumed')}
function handleVisionMessage(m){const p=m.payload||m.data||m;if(m.type==='body_observation'){if(!cameraStream||(p.client_id&&p.client_id!==visionClientId))return;lastVisionObservationAt=performance.now();visionOverlayStale=false;if(visionCaptureState.failureStage===VisionCapture.FAILURE_STAGES.INFERENCE)visionCaptureTransition({type:VisionCapture.EVENTS.INFERENCE_RECOVERED});clearTimeout(visionObservationTimer);visionObservationTimer=null;visionAwaitingObservation=false;if(p.client_id===visionClientId&&Number.isFinite(Number(p.client_capture_ms)))recordVisionLatency(performance.now()-Number(p.client_capture_ms));const tracking=p.guitar_tracking;if(guitarCalibrationId&&tracking?.calibration_id===guitarCalibrationId){guitarReferenceCount=Number(tracking.reference_count||guitarReferenceCount);if(['initialized','flow_tracking','relocalized'].includes(tracking.status)&&Array.isArray(tracking.points)&&tracking.points.length===4){try{guitarCalibrationAcknowledged=true;guitarCalibrationPoints=tracking.points;guitarCalibration=GuitarSpace.calibrate(guitarCalibrationPoints);instrumentRoi=roiFromCalibrationPoints(guitarCalibrationPoints);guitarTrackingMethod=tracking.status==='relocalized'?'RELOCALIZED':tracking.status==='flow_tracking'?'FLOW TRACKING':'REFERENCE READY';guitarTrackingMisses=0}catch{guitarTrackingMisses+=1}}else if(tracking.status==='lost'){guitarTrackingMisses+=1;if(guitarTrackingMisses>=3){guitarCalibrationAcknowledged=false;guitarCalibration=null;instrumentRoi=null;guitarTrackingMethod='TRACKING LOST';$('[data-guitar-state]').textContent='TRACKING LOST · RECALIBRATE';$('[data-guitar-coordinate]').textContent='Guitar reference was occluded or moved too quickly. Recalibrate to restore coordinates.'}}}latestVision=p;drawOverlay(p);if(p.gesture?.status==='confirmed')$('[data-gesture-state]').textContent='WAVE CONFIRMED';setVisionState('STREAMING',p.person_present?'Body, hand, instrument, and motion streams active.':'Video frames streaming; body pose not yet confirmed.');if(p.human_state)setHumanState(p.human_state);if(p.instrument_state)setInstrumentState(p.instrument_state);return}if(m.type==='instrument_context'){if(cameraStream)setVisionState('SEMANTIC','Instrument context reported by player.');setInstrumentState(p.instrument_state||p.instrument||p.state);return}if(m.type==='human_state'){setVisionState('SEMANTIC','Human readiness reported by local vision.');setHumanState(p.state||p.human_state);return}if(m.type==='gesture_candidate'){$('[data-gesture-state]').textContent=p.status==='confirmed'?'WAVE CONFIRMED':String(p.event||'WAVE CANDIDATE').toUpperCase();setVisionState('SEMANTIC',p.status==='confirmed'?'Wave confirmed; DRUMS_TOGGLE candidate only.':'Open-palm gesture candidate; waiting for wave trajectory.')}}
document.addEventListener('click',event=>{if(event.target.matches('[data-roi-toggle]'))toggleRoi()});
document.addEventListener('change',event=>{if(event.target.matches('[data-instrument]')){const mirror=$('[data-vision-instrument]');if(mirror)mirror.value=event.target.value;postControl('set_instrument_context',{instrument:event.target.value,source:'player'})}});
document.addEventListener('change',event=>{if(event.target.matches('[data-setting-lang],[data-lang]')){config.lang=event.target.value==='en'?'en':'zh';save();applyVisionLanguage()}});
function roiFromCalibrationPoints(points){const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);const left=Math.max(0,Math.min(...xs)-.02),top=Math.max(0,Math.min(...ys)-.02),right=Math.min(1,Math.max(...xs)+.02),bottom=Math.min(1,Math.max(...ys)+.02);return[left,top,right-left,bottom-top]}
const handleLiveVisionMessage=handleVisionMessage;
handleVisionMessage=function(message){const payload=message.payload||message.data||message,tracking=payload.guitar_tracking;if(message.type==='body_observation'&&visionCaptureState.mode===VisionCapture.MODES.CONFIRMING&&tracking?.calibration_id===visionCaptureState.pendingCalibrationId&&tracking.status==='initialized'){visionCaptureTransition({type:VisionCapture.EVENTS.REFERENCE_ACCEPTED,calibrationId:tracking.calibration_id,status:tracking.status});guitarCalibrationId=tracking.calibration_id;guitarCalibrationPoints=visionCaptureState.activePoints.map(point=>[...point]);try{guitarCalibration=GuitarSpace.calibrate(guitarCalibrationPoints);instrumentRoi=roiFromCalibrationPoints(guitarCalibrationPoints);guitarTrackingMethod='REFERENCE READY';guitarTrackingMisses=0}catch{}}handleLiveVisionMessage(message)};
const liveSendVisionFrame=sendVisionFrame;
sendVisionFrame=function(blob){return [VisionCapture.MODES.LIVE,VisionCapture.MODES.COUNTDOWN,VisionCapture.MODES.TRACKING].includes(visionCaptureState.mode)?liveSendVisionFrame(blob):Promise.resolve()};
function restartVisionCountdown(){let remaining=3;$('[data-vision-countdown]').textContent=String(remaining);clearInterval(visionCountdownTimer);visionCountdownTimer=setInterval(()=>{remaining-=1;if(remaining>0){$('[data-vision-countdown]').textContent=String(remaining);return}clearInterval(visionCountdownTimer);visionCountdownTimer=null;$('[data-vision-countdown]').textContent='CAPTURED';captureFrozenFrame();setTimeout(()=>{$('[data-vision-countdown]').textContent=''},650)},1000)}
const legacyRequestVisionCapture=requestVisionCapture;
requestVisionCapture=function(){if(visionCaptureState.mode===VisionCapture.MODES.COUNTDOWN){restartVisionCountdown();return}legacyRequestVisionCapture()};
document.addEventListener('click',event=>{if(event.target.matches('[data-vision-capture]'))requestVisionCapture();if(event.target.matches('[data-vision-annotate]'))visionCaptureTransition({type:VisionCapture.EVENTS.ANNOTATE});if(event.target.matches('[data-vision-undo]'))visionCaptureTransition({type:VisionCapture.EVENTS.UNDO});if(event.target.matches('[data-vision-cancel-annotation]'))visionCaptureTransition({type:VisionCapture.EVENTS.ANNOTATION_CANCELLED});if(event.target.matches('[data-vision-confirm]'))confirmVisionCalibration();if(event.target.matches('[data-vision-retake]')){clearInterval(visionCountdownTimer);visionCountdownTimer=null;visionCaptureTransition({type:VisionCapture.EVENTS.RETAKE});if(visionCaptureState.mode===VisionCapture.MODES.COUNTDOWN)requestVisionCapture()}if(event.target.matches('[data-vision-resume]'))resumeVisionTracking()});
document.addEventListener('click',event=>{if(event.target.matches('[data-vision-multiview]')){startMultiViewCapture();event.target.textContent=config.lang==='zh'?'多视角采集中…':'CAPTURING MULTI-VIEW…';setTimeout(()=>{event.target.textContent=vt('multiview')},3400)}});
document.addEventListener('click',event=>{if(event.target.matches('[data-close-tool]')&&event.target.closest('[data-tool-window="vision"]')&&cameraStream)$('[data-camera-stop]').click()},{capture:true});
document.addEventListener('pointerdown',event=>{if(event.target.matches('[data-vision-overlay]')&&visionCaptureState.mode===VisionCapture.MODES.ANNOTATING){event.preventDefault();addFrozenPoint(event)}},{capture:true});
const handleFrozenVisionMessage=handleVisionMessage;
handleVisionMessage=function(message){handleFrozenVisionMessage(message);if([VisionCapture.MODES.CAPTURED,VisionCapture.MODES.ANNOTATING,VisionCapture.MODES.CONFIRMING,VisionCapture.MODES.CALIBRATED,VisionCapture.MODES.ERROR].includes(visionCaptureState.mode))renderFrozenPoints(visionCaptureState.draftPoints.length?visionCaptureState.draftPoints:visionCaptureState.activePoints||[])};
const baseSetVisionState=setVisionState;
setVisionState=function(state,note){const notes={'Semantic visual stream offline.':'cameraStopped','Video connected; body and hand overlay starting.':'cameraConnected','Waiting for body and hand landmarks.':'cameraWaiting'};const localized=notes[note]?vt(notes[note]):String(note||'').startsWith('Camera unavailable:')?vt('cameraUnavailable',{reason:String(note).slice('Camera unavailable:'.length).trim()}):note;baseSetVisionState(state,localized)};
const baseSetHumanState=setHumanState;
setHumanState=function(state,note){baseSetHumanState(state,note==='Camera stopped.'?vt('cameraStopped'):note)};
const baseDrawOverlay=drawOverlay;
drawOverlay=function(data){baseDrawOverlay(data);if(config.lang==='zh'){const status=$('[data-overlay-status]');if(status)status.textContent=status.textContent.replace('Body detected','检测到身体').replace('Body not confirmed','尚未确认身体').replace('hands','手部').replace('motion','动作').replace('manual instrument ROI fixed','乐器 ROI 已固定').replace('WAVE confirmed','挥手已确认')}};
applyVisionLanguage();
setTimeout(applyVisionLanguage,0);
function installGuitarUi(){
  const actions=$('.vision-actions');
  const chooser=document.createElement('label');
  chooser.className='vision-instrument-choice';
  chooser.innerHTML='<span>VISION INSTRUMENT</span><select data-vision-instrument aria-label="Vision instrument"><option value="electric_guitar">ELECTRIC GUITAR</option><option value="bass_guitar">BASS GUITAR</option></select>';
  actions.insertAdjacentElement('afterend',chooser);
  const visionInstrument=chooser.querySelector('[data-vision-instrument]');
  visionInstrument.value=config.instrument;
  visionInstrument.onchange=()=>{config.instrument=visionInstrument.value;updatePerceptionFeedback({type:'select',instrument:config.instrument});config.preset=instrument().presets[0].id;config.string='auto';resetLock();save();renderTunerChoices();postControl('set_instrument_context',{instrument:config.instrument,source:'player'})};
  const panel=document.createElement('section');
  panel.className='guitar-space-panel';
  panel.innerHTML='<div class="guitar-space-actions"><button type="button" data-guitar-calibrate>START 4-POINT CALIBRATION</button><button type="button" data-guitar-reference disabled>CAPTURE MULTI-VIEW (3S)</button><button type="button" data-guitar-false-positive disabled>MARK FALSE POSITIVE</button><button type="button" data-guitar-reset>RESET TEST</button></div><div class="guitar-space-state"><b data-guitar-state>UNCALIBRATED</b><span data-guitar-coordinate>固定机位：四点定义两根外侧 E 弦；A/D/G/B 自动插值。</span></div><details class="guitar-calibration-help" open><summary>CALIBRATION HELP / 操作说明</summary><ol><li>点击 START 4-POINT CALIBRATION。</li><li>在下方摄像头画面里点击：琴枕粗弦、琴枕细弦、琴桥粗弦、琴桥细弦。</li><li>完成后点击 CAPTURE MULTI-VIEW。</li><li>3 秒内缓慢左右倾斜，并稍微上下移动吉他；保持整把琴可见。</li></ol></details><div class="guitar-space-stats"><span data-guitar-latency>LATENCY --</span><span data-guitar-counts>CAND 0 · CAP 0 · FP 0</span></div>';
  // Capture/annotation belongs ahead of secondary diagnostics.
  $('[data-overlay-status]').insertAdjacentElement('afterend',panel);
  $('[data-guitar-calibrate]').hidden=true;
  $('[data-guitar-reference]').hidden=true;
  $('[data-guitar-calibrate]').onclick=beginGuitarCalibration;
  $('[data-guitar-reference]').onclick=startMultiViewCapture;
  $('[data-guitar-false-positive]').onclick=markFalsePositive;
  $('[data-guitar-reset]').onclick=resetGuitarTest;
  const canvas=$('[data-vision-overlay]');
  canvas.addEventListener('pointerdown',event=>{
    if(!guitarCalibrationMode)return;
    event.preventDefault();
    const rect=canvas.getBoundingClientRect();
    guitarCalibrationPoints.push([(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height]);
    if(guitarCalibrationPoints.length===4){
      try{
        guitarCalibration=GuitarSpace.calibrate(guitarCalibrationPoints);
        instrumentRoi=roiFromCalibrationPoints(guitarCalibrationPoints);
        guitarCalibrationId=`cal-${Date.now()}`;guitarCalibrationAcknowledged=false;guitarTrackingMisses=0;guitarTrackingMethod='WAITING FOR VISION ACK';
        localStorage.setItem(guitarCalibrationStorageKey(),JSON.stringify({id:guitarCalibrationId,points:guitarCalibrationPoints,savedAt:new Date().toISOString()}));
        guitarCalibrationMode=false;
        canvas.classList.remove('is-calibrating');
        canvas.style.pointerEvents='none';
        guitarActionTracker.reset();
        $('[data-guitar-state]').textContent='PENDING ACK · ANCHORS 4/4 · STRINGS 6/6';
        $('[data-guitar-coordinate]').textContent='Points saved locally; waiting for actual Vision acknowledgement before showing success.';
        $('[data-guitar-calibrate]').textContent='RECALIBRATE';
        $('[data-guitar-reference]').disabled=false;guitarReferenceCount=1;
      }catch(error){
        guitarCalibrationPoints=[];
        $('[data-guitar-state]').textContent='CALIBRATION ERROR';
        $('[data-guitar-coordinate]').textContent=error.message;
      }
    }else{
      $('[data-guitar-coordinate]').textContent=`第 ${guitarCalibrationPoints.length+1}/4 点：点击 ${guitarCalibrationLabels[guitarCalibrationPoints.length]}`;
    }
  });
  try{
    const saved=JSON.parse(localStorage.getItem(guitarCalibrationStorageKey())||'null');
    if(Array.isArray(saved?.points)&&saved.points.length===4){
      guitarCalibrationPoints=saved.points.map(point=>[Number(point[0]),Number(point[1])]);
      guitarCalibration=GuitarSpace.calibrate(guitarCalibrationPoints);
      guitarCalibrationId=String(saved.id||saved.savedAt||`restored-${Date.now()}`);guitarCalibrationAcknowledged=false;guitarTrackingMisses=0;guitarTrackingMethod='WAITING FOR VISION ACK';
      instrumentRoi=roiFromCalibrationPoints(guitarCalibrationPoints);
      $('[data-guitar-state]').textContent='LOCAL ONLY · ANCHORS 4/4 · STRINGS 6/6';
      $('[data-guitar-coordinate]').textContent='Local points restored; verify actual Vision acknowledgement before treating calibration as active.';
      $('[data-guitar-calibrate]').textContent='RECALIBRATE';
      $('[data-guitar-reference]').disabled=false;
    }
  }catch{localStorage.removeItem(guitarCalibrationStorageKey())}
  updateGuitarStats();
}

function beginGuitarCalibration(){
  if(!cameraStream){$('[data-guitar-coordinate]').textContent='Start the camera first.';return}
  guitarCalibration=null;guitarCalibrationPoints=[];guitarCalibrationId=null;guitarTrackingMisses=0;guitarTrackingMethod='REFERENCE READY';guitarReferenceCaptureUntil=0;guitarReferenceCount=0;guitarCalibrationMode=true;guitarActionTracker.reset();instrumentRoi=null;$('[data-guitar-reference]').disabled=true;
  roiMode=false;const canvas=$('[data-vision-overlay]');canvas.style.pointerEvents='auto';canvas.classList.add('is-calibrating');
  $('[data-guitar-state]').textContent='CALIBRATING · ANCHORS 0/4 · STRINGS 0/6';
  $('[data-guitar-coordinate]').textContent=`第 1/4 点：点击 ${guitarCalibrationLabels[0]}`;
}

function startMultiViewCapture(){
  if(!cameraStream||!guitarCalibration){$('[data-guitar-coordinate]').textContent='Calibrate the visible guitar first.';return}
  guitarReferenceCaptureUntil=performance.now()+3200;
  const button=$('[data-guitar-reference]');button.disabled=true;button.textContent='CAPTURING · MOVE GUITAR SLOWLY';
  $('[data-guitar-coordinate]').textContent='For 3 seconds, slowly tilt left/right and slightly up/down. Keep the entire guitar visible.';
  setTimeout(()=>{guitarReferenceCaptureUntil=0;button.disabled=false;button.textContent='CAPTURE MULTI-VIEW (3S)';$('[data-guitar-coordinate]').textContent=`Multi-view capture complete · ${guitarReferenceCount} references in memory.`},3300);
}

function resetGuitarTest(){
  guitarStats.candidates=0;guitarStats.captures=0;guitarStats.falsePositives=0;guitarStats.latencies=[];
  guitarActionState='TRACKING';guitarLastEventId=0;guitarActionTracker.reset();updateGuitarStats();
  $('[data-guitar-state]').textContent=guitarCalibrationAcknowledged?'CALIBRATED ✓ · ANCHORS 4/4 · STRINGS 6/6':guitarCalibration?'LOCAL ONLY · ANCHORS 4/4 · STRINGS 6/6':'UNCALIBRATED';
  $('[data-guitar-false-positive]').disabled=true;
}

function markFalsePositive(){
  if(guitarStats.falsePositives<guitarStats.captures)guitarStats.falsePositives+=1;
  $('[data-guitar-false-positive]').disabled=true;updateGuitarStats();
}

function recordVisionLatency(value){
  if(!Number.isFinite(value))return;guitarStats.latencies.push(value);if(guitarStats.latencies.length>120)guitarStats.latencies.shift();updateGuitarStats();
}

function updateGuitarStats(){
  const values=[...guitarStats.latencies].sort((a,b)=>a-b);
  const mean=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
  const p95=values.length?values[Math.min(values.length-1,Math.floor(values.length*.95))]:null;
  const latency=$('[data-guitar-latency]');if(latency)latency.textContent=mean==null?'LATENCY --':`LAT ${mean.toFixed(0)}ms AVG · ${p95.toFixed(0)}ms P95`;
  const counts=$('[data-guitar-counts]');if(counts)counts.textContent=`CAND ${guitarStats.candidates} · CAP ${guitarStats.captures} · FP ${guitarStats.falsePositives}`;
}

function guitarCanvasPoint(calibration,canvas,point){
  const projected=GuitarSpace.project(calibration.guitarToImage,point);return projected?[projected[0]*canvas.width,projected[1]*canvas.height]:null;
}

function drawGuitarLine(ctx,calibration,canvas,a,b){
  const pa=guitarCanvasPoint(calibration,canvas,a),pb=guitarCanvasPoint(calibration,canvas,b);if(!pa||!pb)return;
  ctx.beginPath();ctx.moveTo(...pa);ctx.lineTo(...pb);ctx.stroke();
}

function drawGuitarSpace(ctx,canvas,data){
  if(guitarCalibrationMode){
    ctx.fillStyle='#58c72c';ctx.font='12px monospace';
    guitarCalibrationPoints.forEach((point,index)=>{const x=point[0]*canvas.width,y=point[1]*canvas.height;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.fillText(String(index+1),x+9,y-8)});
    $('[data-guitar-state]').textContent=`CALIBRATING · ANCHORS ${guitarCalibrationPoints.length}/4 · STRINGS 0/6`;return;
  }
  if(!guitarCalibration)return;
  ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(88,199,44,.72)';
  for(let stringIndex=0;stringIndex<6;stringIndex+=1)drawGuitarLine(ctx,guitarCalibration,canvas,[0,stringIndex/5],[1,stringIndex/5]);
  for(let fret=0;fret<=22;fret+=1){const u=GuitarSpace.fretPosition(fret);drawGuitarLine(ctx,guitarCalibration,canvas,[u,0],[u,1])}
  for(const [from,to,label] of [[.57,.69,'NECK PU'],[.81,.93,'BRIDGE PU']]){
    const corners=[[from,0],[from,1],[to,1],[to,0]].map(point=>guitarCanvasPoint(guitarCalibration,canvas,point));
    if(corners.every(Boolean)){ctx.fillStyle='rgba(255,179,71,.16)';ctx.beginPath();ctx.moveTo(...corners[0]);corners.slice(1).forEach(point=>ctx.lineTo(...point));ctx.closePath();ctx.fill();ctx.fillStyle='#ffb347';ctx.font='10px monospace';ctx.fillText(label,corners[0][0]+3,corners[0][1]+12)}
  }
  const hand=(data.hands||[]).find(item=>item.handedness==='RIGHT')||(data.hands||[])[0];
  if(hand?.landmarks?.[8]){
    const tip=hand.landmarks[8];const coordinate=GuitarSpace.classify(guitarCalibration,[Number(tip.x),Number(tip.y)]);
    const action=guitarActionTracker.update(coordinate,performance.now());
    if(action.state==='CANDIDATE'&&guitarActionState!=='CANDIDATE')guitarStats.candidates+=1;
    if(action.captured&&action.eventId!==guitarLastEventId){updatePerceptionFeedback({type:'local_candidate'});guitarLastEventId=action.eventId;guitarStats.captures+=1;$('[data-guitar-false-positive]').disabled=false}
    guitarActionState=action.state;$('[data-guitar-state]').textContent=`${guitarCalibrationAcknowledged?'CALIBRATED ✓':'PENDING ACK'} · ${guitarTrackingMethod} · REF ${guitarReferenceCount} · STRINGS 6/6 · ${action.state==='CAPTURED'?'MOTION CANDIDATE':action.state}`;
    $('[data-guitar-coordinate]').textContent=coordinate?`INDEX · fret ${coordinate.fret??'--'} · ${coordinate.string} · ${coordinate.pickup} · u ${coordinate.u.toFixed(2)} v ${coordinate.v.toFixed(2)}`:'Hand mapping unavailable';
    const x=Number(tip.x)*canvas.width,y=Number(tip.y)*canvas.height;ctx.fillStyle=action.state==='CAPTURED'?'#58c72c':action.state==='COOLDOWN'?'#ffb347':'#ffffff';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();
    updateGuitarStats();
  }else{$('[data-guitar-state]').textContent=`${guitarCalibrationAcknowledged?'CALIBRATED ✓':'PENDING ACK'} · ${guitarTrackingMethod} · REF ${guitarReferenceCount} · STRINGS 6/6`;$('[data-guitar-coordinate]').textContent=guitarCalibrationAcknowledged?'Show the picking hand to map its index fingertip.':'Waiting for actual Vision acknowledgement before showing success.'}
  ctx.restore();
}

// Camera transport and frozen-reference state have one lifecycle owner.
async function openVisionCamera(){
  const video={facingMode:'user',width:{ideal:640},height:{ideal:360}};
  try{return await navigator.mediaDevices.getUserMedia({video,audio:false})}
  catch(error){
    if(error.name!=='NotReadableError'||!navigator.mediaDevices.enumerateDevices)throw error;
    // Retry only named ordinary cameras, never infrared/virtual devices.
    const devices=await navigator.mediaDevices.enumerateDevices();
    for(const device of devices.filter(d=>d.kind==='videoinput'&&d.label&&!/\bIR\b|infrared|virtual/i.test(d.label))){
      try{return await navigator.mediaDevices.getUserMedia({video:{...video,deviceId:{exact:device.deviceId}},audio:false})}
      catch(retryError){if(retryError.name!=='NotReadableError')throw retryError}
    }
    throw error;
  }
}
function visionFailureDetail(error){return [error?.name,error?.message].filter(Boolean).join(': ')||String(error||'unknown failure')}
function reportVisionFailure(stage,error){
  const reason=visionFailureDetail(error),labels={acquisition:'CAMERA ACQUISITION FAILED',preview:'CAMERA PREVIEW FAILED',transport:'CAMERA TRANSPORT FAILED',inference:'VISION INFERENCE FAILED'};
  const event=stage===VisionCapture.FAILURE_STAGES.INFERENCE?{type:VisionCapture.EVENTS.INFERENCE_FAILED,reason}:{type:VisionCapture.EVENTS.CAMERA_FAILED,stage,reason};
  visionCaptureTransition(event);setHumanState('UNKNOWN');setVisionState(labels[stage]||'VISION FAILURE',`${labels[stage]||'VISION FAILURE'}: ${reason}`);$('[data-overlay-status]').textContent=`${labels[stage]||'VISION FAILURE'}: ${reason}`;
}
let lastVisionObservationAt=0,visionOverlayStale=false;
const visionRequests=new Set();
async function requestVisionFrame(payload){
  window.BandPerception?.synchronize(base);
  if(Number.isFinite(payload.client_capture_ms))payload.perception=window.BandPerception?.metadata(payload.client_capture_ms);
  const controller=new AbortController();visionRequests.add(controller);
  const timer=setTimeout(()=>controller.abort(),payload.frame_role==='calibration_reference'?15000:8000);
  try{
    const response=await fetch(`${base}/api/v1/vision/frame`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify(payload)});
    const data=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return {}});
    return {response,payload:data};
  }catch(error){if(controller.signal.aborted)throw Error('Vision request timed out or cancelled; retrying.');throw error}
  finally{clearTimeout(timer);visionRequests.delete(controller)}
}
function clearVisionTransport(){
  updatePerceptionFeedback({type:'camera_off'});
  fetch(`${base}/api/v1/vision/stop`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{});
  visionRequests.forEach(controller=>controller.abort());
  visionRequests.clear();
  clearInterval(visionTimer);visionTimer=null;
  clearInterval(visionCountdownTimer);visionCountdownTimer=null;
  clearTimeout(visionObservationTimer);visionObservationTimer=null;
  visionAwaitingObservation=false;visionInFlight=false;
}
function showStoppedCameraControls(){
  $('[data-camera-start]').hidden=false;$('[data-camera-stop]').hidden=true;
  $('[data-camera-start]').setAttribute('aria-pressed','false');
}
function handleVisionTransportFailure(activeStream,error){
  if(cameraStream!==activeStream)return;
  clearVisionTransport();cameraStream=null;
  activeStream.getTracks().forEach(track=>track.stop());
  const video=$('[data-camera-preview]');video.srcObject=null;video.hidden=true;
  showStoppedCameraControls();
  const frozen=Boolean(visionCaptureState.stillToken);
  $('[data-vision-overlay]').hidden=!frozen;
  reportVisionFailure(VisionCapture.FAILURE_STAGES.TRANSPORT,error||Error('camera stream ended'));
}
let cameraGeneration=0;
window.BandVision={stop(){cameraGeneration++;if(cameraStream)toggleCamera();fetch(`${base}/api/v1/vision/stop`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{})}};
async function toggleCamera(){
  if(cameraOpening)return;
  if(cameraStream){
    clearVisionTransport();
    visionCaptureTransition({type:VisionCapture.EVENTS.STOP});
    const activeStream=cameraStream;cameraStream=null;activeStream.getTracks().forEach(track=>track.stop());
    const video=$('[data-camera-preview]');video.srcObject=null;video.hidden=true;
    $('[data-vision-overlay]').hidden=true;
    showStoppedCameraControls();
    setVisionState('OFFLINE',vt('cameraStopped'));setHumanState('UNKNOWN',vt('cameraStopped'));

    renderVisionCapture();return;
  }
  const cameraToken=++cameraGeneration;
  cameraOpening=true;
  $('[data-camera-start]').disabled=true;
  try{
    let activeStream;
    try{activeStream=await openVisionCamera()}
    catch(error){reportVisionFailure(VisionCapture.FAILURE_STAGES.ACQUISITION,error);showStoppedCameraControls();renderVisionCapture();return}
    if(cameraToken!==cameraGeneration){activeStream.getTracks().forEach(track=>track.stop());return}
    cameraStream=activeStream;updatePerceptionFeedback({type:'resume'});
    const video=$('[data-camera-preview]');video.srcObject=activeStream;video.hidden=false;
    try{if(video.play)await video.play()}
    catch(error){cameraStream=null;activeStream.getTracks().forEach(track=>track.stop());video.srcObject=null;video.hidden=true;reportVisionFailure(VisionCapture.FAILURE_STAGES.PREVIEW,error);showStoppedCameraControls();renderVisionCapture();return}
    if(cameraToken!==cameraGeneration){activeStream.getTracks().forEach(track=>track.stop());video.srcObject=null;video.hidden=true;cameraStream=null;showStoppedCameraControls();return}
    $('[data-vision-overlay]').hidden=false;
    $('[data-camera-start]').hidden=true;$('[data-camera-stop]').hidden=false;
    $('[data-camera-start]').setAttribute('aria-pressed','true');
    installRoiSelection();
    visionCaptureTransition({type:VisionCapture.EVENTS.CAMERA_STARTED});
    setVisionState('CONNECTED',vt('cameraConnected'));setHumanState('UNKNOWN',vt('cameraWaiting'));
    visionCanvas=document.createElement('canvas');visionCanvas.width=VISION_FRAME_WIDTH;visionCanvas.height=VISION_FRAME_HEIGHT;
    activeStream.getTracks().forEach(track=>track.addEventListener?.('ended',()=>handleVisionTransportFailure(activeStream,Error('camera stream ended')),{once:true}));
    lastVisionObservationAt=performance.now();visionOverlayStale=false;
    visionTimer=setInterval(()=>{
      if(cameraStream===activeStream&&performance.now()-lastVisionObservationAt>2500&&!visionOverlayStale&&[VisionCapture.MODES.LIVE,VisionCapture.MODES.COUNTDOWN,VisionCapture.MODES.TRACKING].includes(visionCaptureState.mode)){
        visionOverlayStale=true;latestVision=null;
        const overlay=$('[data-vision-overlay]'),context=overlay.getContext('2d');context.clearRect(0,0,overlay.width,overlay.height);
        context.fillStyle='#162e1b';context.font='14px monospace';context.fillText('VISION STALE · waiting / retrying',8,20);
        setVisionState('STALE','Vision observations paused; retrying.');setHumanState('UNKNOWN','Vision observations paused; retrying.');
      }
      if(cameraStream!==activeStream||video.readyState<2||visionInFlight||![VisionCapture.MODES.LIVE,VisionCapture.MODES.COUNTDOWN,VisionCapture.MODES.TRACKING].includes(visionCaptureState.mode))return;
      visionInFlight=true;
      visionCanvas.getContext('2d').drawImage(video,0,0,VISION_FRAME_WIDTH,VISION_FRAME_HEIGHT);
      visionCanvas.toBlob(blob=>{
        if(!blob||cameraStream!==activeStream){visionInFlight=false;return}
        sendVisionFrame(blob).catch(error=>{if(cameraStream===activeStream)markVisionFailure(error?.message||'frame POST failed')}).finally(()=>{if(cameraStream===activeStream)visionInFlight=false});
      },'image/jpeg',0.55);
    },VISION_FRAME_INTERVAL_MS);
  }finally{cameraOpening=false;$('[data-camera-start]').disabled=Boolean(window.BandRuntime&&window.BandRuntime.mode()!=='live')}
}

async function sendVisionFrame(blob){
  const submittedStream=cameraStream;
  const capturedAt=performance.now(),frameId=++visionFrameSeq;
  const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
  if(!submittedStream||cameraStream!==submittedStream)return;
  const {response,payload}=await requestVisionFrame({jpeg_base64:dataUrl.split(',')[1],instrument_roi:instrumentRoi,client_id:visionClientId,client_frame_id:frameId,client_capture_ms:capturedAt,guitar_calibration_id:guitarCalibrationId,guitar_calibration_points:guitarCalibrationPoints,guitar_reference_capture:performance.now()<guitarReferenceCaptureUntil});
  if(cameraStream!==submittedStream)return;
  if(response.status===501)throw Error('HTTP 501 / 静态页面不支持 Vision 请求，请打开本地服务页面。');
  if(!response.ok)throw Error(payload.reason||payload.error||`HTTP ${response.status}`);
  if(response.status===202)return payload;
  if(!visionAwaitingObservation){visionAwaitingObservation=true;
  visionObservationTimer=setTimeout(()=>{if(visionAwaitingObservation)markVisionFailure('HTTP accepted the frame, but no body/hand observation was returned.')},2000);}
  return payload;
}

function markVisionFailure(reason){
  clearTimeout(visionObservationTimer);visionObservationTimer=null;visionAwaitingObservation=false;
  reportVisionFailure(VisionCapture.FAILURE_STAGES.INFERENCE,reason);
  if(reason.includes('HTTP 501')){const link=document.createElement('a');link.href='http://127.0.0.1:18765/agent-console.html';link.textContent=consoleText('Open local Console');$('[data-vision-note]').append(' ',link);}
}

async function boot(){bind();installGuitarUi();try{const s=await getJSON('/api/v1/status');renderStatus(s);const c=await getJSON('/api/v1/config');if(c.clean_mix!=null)syncControl('clean_mix',c.clean_mix);if(s.drum_mix!=null)syncControl('drum_mix',s.drum_mix);await postControl('set_instrument_context',{instrument:config.instrument,source:'player'});setConnection('ONLINE',true)}catch{setConnection('OFFLINE',false);$('[data-status]').textContent=consoleText('API unavailable / local preview mode.')}connectStream()}boot();
window.BandLanguage?.subscribe(language=>{
  config.lang=language;
  typeWelcome();
  applyVisionLanguage();
  const auto=$('[data-string] option[value="auto"]');if(auto)auto.textContent=consoleText('Auto / nearest string');
});
