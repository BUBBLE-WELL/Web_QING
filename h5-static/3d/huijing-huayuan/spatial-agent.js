const PROFILE='huijing-spatial-workflow-v1';
export const isSpatialSandbox=()=>typeof location!=='undefined' && location.origin==='https://jiyiji.cn' && location.pathname==='/webqing/sandbox/pr-14/3d/huijing-huayuan/';
const contextOf=v=>({selected:v.selected,section:v.section,catalog_sha256:v.catalogHash,source:v.dataSource,ready:v.ready});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const error=code=>Object.assign(new Error(code),{code});
const errorCopy=code=>({expired_session:'会话已过期，请清空后重新开始',expired_handoff:'这次交接已过期，可以直接开始新任务',handoff_consumed:'这次交接已由另一个窗口接收，可以直接开始新任务',stale_catalog:'数据版本不一致，请刷新页面',unsupported_source:'此助手当前支持静态数据，请使用静态模式',session_limit:'本轮请求次数已用完，请清空后重新开始',sandbox_budget:'测试环境今日请求额度已用完',invalid_session_owner:'测试会话已失效，请清空后重新开始',model_unavailable:'真实模型连接失败，未使用预设答复替代',invalid_proposal:'模型操作提议未通过校验，场景未改变',invalid_origin:'当前页面无法连接此服务'}[code]||'连接暂不可用，请稍后重试');

export function createSpatialController(viewer,bridge,{fetchImpl=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),notify=()=>{}}={}) {
  let session=null,active=null,restoreState=null,last=null;
  async function api(route,body,signal){
    const response=await fetchImpl((isSpatialSandbox()?'/webqing/api/spatial-sandbox-pr14/':'/api/spatial/')+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
    const raw=await response.text();
    if(raw.length>32768)throw error('response_limit');
    let data;try{data=JSON.parse(raw);}catch{throw error('invalid_response');}
    if(!response.ok||data.error)throw error(data.error?.code||'service_unavailable');
    return data;
  }
  return {
    get busy(){return active!==null;}, get last(){return last;},
    async start(instance,handoff=null){
      const data=await api('start',{instance_id:instance,...(handoff?{handoff_id:handoff}:{})});
      if(data.profile_id!==PROFILE)throw error('invalid_profile');session=data.session_id;return data;
    },
    stop(){active?.abort();},
    clear(){active?.abort();session=null;restoreState=null;last=null;},
    restore(){
      if(active)throw error('busy');
      if(!restoreState)return {restored:[],preserved:[]};
      const {before,owned}=restoreState,restored=[],preserved=[];
      for(const field of ['selected','section']){
        if(!(field in owned))continue;
        if(viewer[field]!==owned[field]){preserved.push(field);continue;}
        if(field==='selected'){if(before.selected===null)viewer.clear();else viewer.select(before.selected);}
        else viewer.setSection(before.section);
        restored.push(field);
      }
      restoreState=null;return {restored,preserved};
    },
    async send(message){
      if(active)throw error('busy');if(!session)throw error('not_started');
      const controller=new AbortController();active=controller;const signal=controller.signal;
      const before=contextOf(viewer),acks=[];let expected=before;
      const timer=setTimeout(()=>controller.abort(),35000);
      last={message,before,acknowledgements:acks,status:'pending'};
      try{
        const result=await api('turn',{session_id:session,request_id:crypto.randomUUID(),message,context:before},signal);
        signal.throwIfAborted();
        if(result.profile_id!==PROFILE)throw error('invalid_profile');
        if(!same(contextOf(viewer),before))throw error('context_changed');
        last.response=result;
        if(!result.envelope){last.status='answered';notify(result.message);return last;}
        notify(result.message);
        const envelope=result.envelope;
        const batches=result.demo?envelope.results.map((entry,i)=>({
          ...envelope,request_id:envelope.request_id+'_'+i,results:[{...entry,index:0}],viewer_actions:entry.viewer_actions
        })):[envelope];
        if(result.demo)restoreState={before,owned:{}};
        for(let i=0;i<batches.length;i++){
          signal.throwIfAborted();
          if(!same(contextOf(viewer),expected))throw error('context_changed');
          const ack=await bridge.apply(batches[i],{signal});
          acks.push(ack);last.current=contextOf(viewer);
          if(result.demo)for(const applied of ack.acknowledgements){
            if(applied.status==='state_confirmed'&&applied.type==='select_building')restoreState.owned.selected=applied.building_id;
            if(applied.status==='state_confirmed'&&applied.type==='set_section')restoreState.owned.section=applied.height_m;
          }
          if(!ack.ok)throw error(ack.error.code);
          expected=contextOf(viewer);
          const query=batches[i].results.find(r=>r.tool==='query_buildings');
          if(query)notify(`当前${query.data_source==='static'?'静态数据':'GIS 服务'}返回 ${query.total} 个几何分组`+(query.total===0?'；这不表示现实场地没有建筑。':'：'+query.building_ids.join('、')));
          for(const applied of ack.acknowledgements){
            if(applied.type==='select_building')notify('已确认选择 '+applied.building_id+'。');
            if(applied.type==='set_section')notify(applied.height_m===null?'已确认关闭水平剖切。':`已确认水平剖切 ${applied.height_m} 米；切面作用于整个场景。`);
            if(applied.type==='fly_to')notify('已请求定位；不代表相机已到达。');
          }
          if(result.demo&&i<batches.length-1)await pause(900);
        }
        last.status='completed';return last;
      }catch(e){
        last.status=signal.aborted?'cancelled':'failed';last.error=e.code||e.name;last.current=contextOf(viewer);
        notify(signal.aborted?'已停止后续步骤；已经执行的操作会保留。':e.code==='context_changed'?'你的选择或剖切已改变，旧任务已停止；保留你的操作。':'本次请求未完成：'+errorCopy(e.code)+'。已确认的操作会保留。');
        return last;
      }finally{clearTimeout(timer);active=null;}
    }
  };
}

export function mountSpatialAgent(viewer,bridge,host){
  const thread=host.querySelector('[data-spatial-thread]'),form=host.querySelector('form'),input=host.querySelector('textarea');
  const send=host.querySelector('[data-spatial-send]'),stop=host.querySelector('[data-spatial-stop]');
  const buttons=[...host.querySelectorAll('[data-spatial-message]')];
  const say=(text,role='assistant')=>{
    let row=thread.lastElementChild;
    if(role!=='assistant'||!row||row.dataset.role!==role){
      row=document.createElement('div');row.className='spatial-message';row.dataset.role=role;
      const author=document.createElement('span');author.className='message-author';author.textContent=role==='user'?'你':'空间助手';
      const bubble=document.createElement('div');bubble.className='message-bubble';row.append(author,bubble);thread.appendChild(row);
    }
    const p=document.createElement('p');p.textContent=text;row.querySelector('.message-bubble').appendChild(p);
    while(thread.children.length>16)thread.firstChild.remove();thread.scrollTop=thread.scrollHeight;
  };
  const control=createSpatialController(viewer,bridge,{notify:say});
  let started=false;
  const status=host.querySelector('[data-spatial-status]');
  const ready=()=>{send.disabled=!started||control.busy;buttons.forEach(b=>b.disabled=!started||control.busy||!viewer.ready);
    host.querySelector('[data-spatial-clear]').disabled=control.busy;
    host.querySelector('[data-spatial-restore]').disabled=control.busy;
    stop.disabled=!control.busy;input.disabled=control.busy;status.textContent=control.busy?'执行中，可以停止。':viewer.ready?'场景已就绪。':'场景加载中；可先了解项目，操作会等待就绪。';};
  async function submit(text){if(control.busy||!started)return;const returnFocus=document.activeElement===input;say(text,'user');const pending=control.send(text);ready();await pending;ready();if(returnFocus&&document.activeElement===document.body)input.focus({preventScroll:true});}
  form.addEventListener('submit',event=>{event.preventDefault();const text=input.value.trim();if(text){input.value='';submit(text);}});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!send.disabled)form.requestSubmit();}});
  buttons.forEach(button=>button.addEventListener('click',()=>submit(button.dataset.spatialMessage)));
  stop.addEventListener('click',()=>control.stop());
  host.querySelector('[data-spatial-restore]').addEventListener('click',()=>{
    try{const r=control.restore();say(r.restored.length?'已恢复演示拥有且未被你改变的状态。'+(r.preserved.length?'保留了你后来的更改。':''):'没有可恢复的演示状态；保留当前视图。');}
    catch{say('请先停止正在进行的任务。');}
  });
  async function start(handoff){
    try{
      let instance;try{instance=sessionStorage.getItem('huijing-receiver-instance')||crypto.randomUUID();sessionStorage.setItem('huijing-receiver-instance',instance);}catch{instance=crypto.randomUUID();}
      const data=await control.start(instance,handoff);started=true;host.hidden=host.dataset.collapsed==='true';say(data.message);ready();
      window.dispatchEvent(new Event('huijing-spatial-available'));
      const back=document.querySelector('[data-portfolio-return]');if(back)back.href='/portfolio/';
      // This is a bounded reviewed workflow, separate from the legacy model workbench.
      document.querySelector('#qing-gis')?.setAttribute('hidden','');
    }catch(e){
      host.hidden=false;started=false;ready();say(errorCopy(e.code)+'。原地图控件仍可使用，也可以清空后直接开始。');
      window.dispatchEvent(new Event('huijing-spatial-available'));
    }
  }
  host.querySelector('[data-spatial-clear]').addEventListener('click',()=>{control.clear();thread.replaceChildren();start(null);});
  start(new URLSearchParams(location.search).get('handoff'));
  return {ready,control};
}
