import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {mountProjectPlaces} from '../h5-static/3d/huijing-huayuan/project-places.js';import {createLayerState} from '../h5-static/3d/huijing-huayuan/layer-state.js';
test('actual marker module: hidden on boot, managed show, manual off, conditional return',async()=>{
 const original={document:globalThis.document,fetch:globalThis.fetch,requestAnimationFrame:globalThis.requestAnimationFrame};
 class Element{constructor(){this.children=[];this.style={};this.dataset={};this.isConnected=false;}append(...x){this.children.push(...x)}setAttribute(){}addEventListener(){}}
 class Marker{constructor({element}){this.el=element;}setLngLat(){return this;}addTo(){this.el.isConnected=true;return this;}remove(){this.el.isConnected=false;}getElement(){return this.el;}}
 class Bounds{extend(){return this;}}
 const data=fs.readFileSync(new URL('../h5-static/3d/huijing-huayuan/assets/site/project_places.geojson',import.meta.url));
 globalThis.document={createElement:()=>new Element()};globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)});globalThis.requestAnimationFrame=cb=>setImmediate(cb);
 try{
  const s=createLayerState(),host=new Element();let plan=false;const map={getCenter:()=>({toArray:()=>[0,0]}),getZoom:()=>17,getPitch:()=>55,getBearing:()=>0,getPadding:()=>({}),stop(){},jumpTo(){},fitBounds(){}};
  s.register('final-floorplan',false,on=>{plan=on});
  const places=await mountProjectPlaces({map,maplibregl:{Marker,LngLatBounds:Bounds},toDisplay:x=>x,projectToLngLat:x=>x,padding:()=>({}),host,prepareContext:()=>s.borrow(['project-places','final-floorplan'])});
  s.register('project-places',false,on=>places.layerItem.setVisible(on));
  assert.deepEqual(places.visibleIds,[]);assert.equal(plan,false);
  await places.show(['E03']);assert.equal(places.visibleIds.length,6);assert.equal(plan,true);assert.equal(s.get('project-places').visible,true);
  s.set('project-places',false);s.set('final-floorplan',false);assert.deepEqual(places.visibleIds,[]);assert.equal(plan,false);
  const back=host.children[0].children.find(x=>x.textContent==='返回原视角');await back.onclick();assert.deepEqual(places.visibleIds,[]);assert.equal(plan,false);
  await places.show(['E03']);s.set('final-floorplan',false);s.set('final-floorplan',true);await back.onclick();assert.deepEqual(places.visibleIds,[]);assert.equal(plan,true);
 }finally{Object.assign(globalThis,original);}
});

