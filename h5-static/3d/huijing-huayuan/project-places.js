// Sanitized design references only. Saved framing is not an authored camera tour.
export async function mountProjectPlaces({map,maplibregl,toDisplay,projectToLngLat,padding,host,prepareContext}) {
  const response=await fetch('assets/site/project_places.geojson');if(!response.ok)throw new Error('Place catalog unavailable');
  const bytes=await response.arrayBuffer(),fc=JSON.parse(new TextDecoder().decode(bytes));
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const rows=fc.features.map(f=>({...f.properties,coordinates:f.geometry.coordinates}));
  const markers=new Map();let previous=null,cleanupContext=null;
  const xy=p=>toDisplay(projectToLngLat(p));
  for(const row of rows){
    const el=document.createElement('button');el.type='button';el.className='poi project-place';el.dataset.placeId=row.place_id;
    el.textContent=row.label;el.title=row.description;el.setAttribute('aria-label','查看'+row.label);
    el.style.cssText='background:#fffef8;color:#222;border:1px solid #777;padding:5px 8px;font:12px monospace;cursor:pointer;max-width:140px;white-space:normal;text-align:left';
    el.addEventListener('click',()=>show([row.place_id]));
    markers.set(row.place_id,new maplibregl.Marker({element:el,anchor:row.place_id==='F01'?'right':row.place_id==='C01'?'right':'bottom',offset:row.place_id==='F01'?[-8,-16]:row.place_id==='C01'?[-8,16]:[0,0]}).setLngLat(xy(row.coordinates)).addTo(map));
    el.setAttribute('aria-label','查看'+row.label);
  }
  const panel=document.createElement('section');panel.className='project-place-controls';
  const title=document.createElement('p');title.textContent='空间标注 · 方案入口 / CAD功能参考';panel.append(title);
  const note=document.createElement('p');note.textContent='功能标点不是区域边界；商业位置待核。';panel.append(note);
  const make=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='choice-chip';b.textContent=label;b.onclick=()=>Promise.resolve(fn()).catch(()=>{note.textContent='定位未完成，请重试。';});panel.append(b);};
  for(const [label,ids] of [['标注总览',rows.map(r=>r.place_id)],['入口',['E01','E02','E03']],['景观',['L01']],['养老院',['F01']],['商业参考',['C01']]])make(label,()=>show(ids));
  make('返回原视角',()=>{if(previous){map.stop();map.jumpTo(previous);previous=null;cleanupContext?.();cleanupContext=null;note.textContent='已返回原视角。';}else note.textContent='尚无保存的原视角。';});
  host?.append(panel);
  async function show(ids){
    if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!markers.has(id)))throw new Error('Unknown place');
    if(!previous)previous={center:map.getCenter().toArray(),zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),padding:map.getPadding()};
    const p=padding(),pad={top:(p.top||0)+45,bottom:(p.bottom||0)+45,left:(p.left||0)+65,right:(p.right||0)+150};
    const cleanup=await prepareContext?.();if(!cleanupContext)cleanupContext=cleanup;
    map.stop();map.jumpTo({pitch:0,bearing:0});
    if(ids.length===1)map.jumpTo({center:xy(rows.find(r=>r.place_id===ids[0]).coordinates),zoom:18.3,pitch:0,bearing:0,padding:pad});
    else {const bounds=new maplibregl.LngLatBounds();ids.forEach(id=>bounds.extend(xy(rows.find(r=>r.place_id===id).coordinates)));map.fitBounds(bounds,{padding:pad,pitch:0,bearing:0,maxZoom:17.5,duration:0});}
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const shown=ids.filter(id=>markers.get(id).getElement().isConnected);if(shown.length!==ids.length)throw new Error('Place attachment failed');
    note.textContent='已定位参考标注；可返回原视角。';return shown;
  }
  return {hash,rows,show,get visibleIds(){return rows.filter(r=>markers.get(r.place_id).getElement().isConnected).map(r=>r.place_id);}};
}
