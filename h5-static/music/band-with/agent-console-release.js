(()=>{
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const shell=$('.console-shell');
  if(!shell)return;
  const base=shell.dataset.apiBase||window.location.origin;
  const streamLabel=$('[data-release-stream]');
  const candidateLabel=$('[data-release-candidate]');
  const receiptLabel=$('[data-release-receipt]');
  const persistenceLabel=$('[data-release-persistence]');
  const candidateActions=$('[data-candidate-actions]');
  const note=$('[data-release-note]');
  let lastFrameAt=0;
  let candidate=null;

  function setDrumMixAvailability(available){
    const input=$('[data-control="drum_mix"]');
    if(!input)return;
    input.disabled=!available;
    input.closest('.fader')?.classList.toggle('is-unavailable',!available);
    input.setAttribute('aria-description',available?'Drum level; applies from the next rendered bar.':'Drum output is unavailable.');
  }

  async function post(path,payload){
    const response=await fetch(`${base}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({error:'invalid-response'}));
    if(!response.ok)throw new Error(data.error||`${response.status}`);
    return data;
  }

  async function sendPlayerResponse(response){
    persistenceLabel.textContent='SAVING…';
    try{
      const payload={episode_id:null,response,source:'browser',time_s:Date.now()/1000};
      const data=shell.dataset.runtimeMode==='web'?await window.BandWebAudio.recordFeedback(payload):await post('/api/v1/episode/response',payload);
      persistenceLabel.textContent=`PERSISTED / ${data.response}`;
      note.textContent=data.storage==='browser'?'Player feedback saved in this browser; it is evidence, not automatic learned memory.':'Player feedback was appended locally; it is evidence, not automatic learned memory.';
    }catch(error){
      persistenceLabel.textContent='NOT PERSISTED';
      note.textContent=`Feedback unavailable: ${error.message}. Nothing was claimed as saved.`;
    }
  }

  async function sendCandidateReceipt(acknowledgement){
    if(!candidate)return;
    receiptLabel.textContent='SAVING…';
    try{
      const payload={candidate_id:candidate.candidate_id,action:candidate.action||candidate.gesture||candidate.name||'GESTURE_CANDIDATE',acknowledgement,source:'browser',time_s:Date.now()/1000};
      const data=shell.dataset.runtimeMode==='web'?await window.BandWebAudio.recordReceipt(payload):await post('/api/v1/action/receipt',payload);
      receiptLabel.textContent=data.action_status;
      candidateActions.hidden=true;
      note.textContent=data.action_status==='ACKNOWLEDGED'?'Candidate acknowledged, but not labelled EXECUTED; runtime execution still requires its own evidence.':'Candidate rejected and persisted.';
    }catch(error){
      receiptLabel.textContent='NOT PERSISTED';
      note.textContent=`Receipt unavailable: ${error.message}.`;
    }
  }

  function handleMessage(message){
    if(message.type==='feature'){
      lastFrameAt=performance.now();
      streamLabel.textContent='LIVE';
      shell.classList.remove('is-stale');
    }
    if(message.type==='gesture_candidate'){
      candidate=message;
      candidateLabel.textContent=String(message.action||message.gesture||message.name||'GESTURE').toUpperCase();
      receiptLabel.textContent='AWAITING';
      candidateActions.hidden=false;
    }
    if(message.type==='action_receipt'&&message.candidate_id===candidate?.candidate_id){
      receiptLabel.textContent=message.action_status||'ACKNOWLEDGED';
      candidateActions.hidden=true;
    }
  }

  function connectEvidenceStream(){
    if(!('WebSocket' in window))return;
    const socket=new WebSocket(`${base.replace(/^http/,'ws')}/api/v1/stream`);
    socket.onmessage=event=>{try{handleMessage(JSON.parse(event.data))}catch{}};
    socket.onclose=()=>setTimeout(connectEvidenceStream,2500);
    socket.onerror=()=>socket.close();
  }

  setInterval(()=>{
    if(!lastFrameAt||performance.now()-lastFrameAt>1500){
      streamLabel.textContent='STALE';
      shell.classList.add('is-stale');
    }
  },500);
  $$('[data-player-response]').forEach(button=>button.addEventListener('click',()=>sendPlayerResponse(button.dataset.playerResponse)));
  $$('[data-candidate-receipt]').forEach(button=>button.addEventListener('click',()=>sendCandidateReceipt(button.dataset.candidateReceipt)));
  $('[data-enter]')?.addEventListener('click',()=>setTimeout(()=>{const panel=$('[data-settings-panel]');if(panel)panel.hidden=true},0));
  fetch(`${base}/api/v1/status`).then(response=>response.json()).then(status=>setDrumMixAvailability(Boolean(status.capabilities?.drum_mix))).catch(()=>setDrumMixAvailability(false));
  connectEvidenceStream();
})();
