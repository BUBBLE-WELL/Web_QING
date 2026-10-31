// Browser-only session card. No upload, example metrics, or inferred audio claims.
(function(root){
  'use strict';
  // Share copy is plain language only; routing/verification caveats stay in the Share window details.
  const strings={en:{title:'A take to keep.',subtitle:"TODAY'S SESSION",take:'FULL TAKE',clip:'SELECTED',follow:n=>['Your bandmate followed you ',String(n),` time${n===1?'':'s'}`],silent:'This take seems silent',footer:'Jammed with Band-with'},zh:{title:'留下一段演奏。',subtitle:'今日结算',take:'完整录音',clip:'选段',follow:n=>['伙伴跟了你 ',String(n),' 次'],silent:'这段好像没有声音',footer:'和 Band-with 一起 jam'}};
  function validate(data){
    const {durationSeconds,startSeconds,endSeconds}=data;
    if(!Number.isFinite(durationSeconds)||durationSeconds<=0||!Number.isFinite(startSeconds)||!Number.isFinite(endSeconds)||startSeconds<0||endSeconds<=startSeconds||endSeconds>durationSeconds+.001)throw Error('No valid recorded selection');
    return data;
  }
  function clock(value){const ticks=Math.round(value*100);return `${Math.floor(ticks/6000)}:${((ticks%6000)/100).toFixed(2).padStart(5,'0')}`;}
  async function render(data,language='en'){
    validate(data);const t=strings[language==='zh'?'zh':'en'];
    await root.document.fonts?.ready;
    const canvas=root.document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable');
    const style=getComputedStyle(root.document.documentElement),token=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;
    const ink=token('--ink','#162e1b'),pop=token('--pop-purple','#ae6cfe'),paper=token('--paper','#f7f8ec'),lime=token('--lime','#d9f6a2');
    const body=token('--data','monospace'),display=token('--pixel','monospace');
    const text=(value,x,y,size=28,color=ink,font=body,align='left')=>{ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign=align;ctx.fillText(value,x,y);};
    const now=new Date(),date=`${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}`;
    ctx.fillStyle=lime;ctx.fillRect(0,0,1080,1350);
    ctx.fillStyle=ink;for(let x=24;x<1080;x+=24)for(let y=24;y<1350;y+=24)ctx.fillRect(x,y,2,2);
    ctx.fillRect(66,66,966,1230);ctx.fillStyle=paper;ctx.fillRect(48,48,966,1230);ctx.strokeStyle=ink;ctx.lineWidth=4;ctx.strokeRect(48,48,966,1230);
    ctx.fillStyle=ink;ctx.fillRect(48,48,966,72);text('BAND-WITH',80,98,40,paper,display);text(date,982,98,40,paper,display,'right');ctx.font=`40px ${display}`;ctx.fillStyle=pop;ctx.beginPath();ctx.arc(982-ctx.measureText(date).width-22,86,9,0,Math.PI*2);ctx.fill();
    text(t.subtitle,88,186,25);text(t.title,88,278,72,ink,display);
    const state=(data.observedStates||[]).filter(s=>['LISTEN','FOLLOW','REST'].includes(s));
    const last=state.includes(data.last)?data.last:state.at(-1),face=root.AgentFaceStates?.[last||'LISTEN']||'(・_・)';
    ctx.fillStyle=lime;ctx.fillRect(88,326,886,290);text(face,531,486,120,ink,body,'center');
    if(last)text(last,531,580,44,ink,display,'center');
    text(t.take,88,690,25);text(clock(data.durationSeconds),88,772,76,ink,display);
    text(t.clip,574,690,25);text(clock(data.endSeconds-data.startSeconds),574,772,76,ink,display);
    ctx.fillStyle=ink;ctx.fillRect(88,812,886,3);
    let y=888;const follows=Number(data.followEntries)||0;
    if(state.length&&follows>0){let x=88;for(const [i,part] of t.follow(follows).entries()){const size=i===1?72:36;text(part,x,y,size,i===1?pop:ink,i===1?display:body);x+=ctx.measureText(part).width;}y+=62;}
    if(state.length){text(state.join(' / '),88,y,30,ink,display);y+=62;}
    if(data.silent)text(t.silent,88,y,30);
    ctx.fillStyle=ink;ctx.fillRect(88,1190,886,3);text(t.footer,88,1240,26);text('jiyiji.cn/webqing/music',974,1240,30,ink,display,'right');
    ctx.textAlign='left';
    return canvas;
  }
  async function png(data,language){const canvas=await render(data,language);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding failed')),'image/png'));}
  root.BandSessionCard={render,png,validate};
})(globalThis);
