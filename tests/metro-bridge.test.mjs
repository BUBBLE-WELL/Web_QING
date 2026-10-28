import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createToolBridge} from '../h5-static/3d/huijing-huayuan/tool-actions.js';
import {createSpatialController} from '../h5-static/3d/huijing-huayuan/spatial-agent.js';
const raw=fs.readFileSync(new URL('../h5-static/3d/huijing-huayuan/assets/site/metro_entrances.geojson',import.meta.url));
const data=JSON.parse(raw);const digest=crypto.createHash('sha256').update(raw).digest('hex');
const catalog=JSON.parse(fs.readFileSync(new URL('../h5-static/3d/huijing-huayuan/assets/buildings.geojson',import.meta.url)));
const hash=crypto.createHash('sha256').update(fs.readFileSync(new URL('../h5-static/3d/huijing-huayuan/assets/buildings.geojson',import.meta.url))).digest('hex');
const envelope=JSON.parse(fs.readFileSync(new URL('./fixtures/metro-envelope.json',import.meta.url)));
function viewer(){return {ready:true,catalogHash:hash,dataSource:'static',selected:'B02',section:30,metroCatalogHash:digest,metroShownIds:[],metroPois:data.features.map(f=>({poi_id:'osm:'+f.properties.osm_id,label:f.properties.label,coordinates:f.geometry.coordinates})),queryBuildings:()=>catalog.features.map(f=>f.properties),calls:0,async showMetroEntrances(){this.calls++;this.metroShownIds=this.metroPois.map(p=>p.poi_id);}};}
const copy=()=>JSON.parse(JSON.stringify(envelope));
test('reviewed dispatcher fixture -> bridge -> confirmed known metro points; selected building/cut preserved',async()=>{
 const v=viewer(),b=createToolBridge(v);const r=await b.apply(copy());assert.equal(r.ok,true);assert.equal(r.acknowledgements[0].status,'points_confirmed');assert.equal(v.metroShownIds.length,3);assert.equal(v.selected,'B02');assert.equal(v.section,30);
 assert.equal((await b.apply(copy())).error.code,'duplicate_request');assert.equal(v.calls,1);
});
test('bad source, forged coordinates and unknown point IDs cause zero effects',async()=>{
 for(const mutate of [e=>{e.viewer_actions[0].poi_catalog_sha256='0'.repeat(64);},e=>{e.results[0].pois[0].coordinates=[0,0];},e=>{e.viewer_actions[0].poi_ids[0]='osm:node/999';}]){
  const v=viewer(),e=copy();mutate(e);const r=await createToolBridge(v).apply(e);assert.equal(r.ok,false);assert.equal(v.calls,0);
 }
});
test('silent viewer display failure cannot produce a points-confirmed acknowledgement',async()=>{
 const v=viewer();v.showMetroEntrances=async()=>{};const r=await createToolBridge(v).apply(copy());assert.equal(r.ok,false);assert.equal(r.error.code,'state_mismatch');assert.deepEqual(r.acknowledgements,[]);
});
test('visitor POI visibility change during model wait cancels obsolete display',async()=>{
 const v=viewer();let resolve;let count=0;const messages=[];
 const controller=createSpatialController(v,createToolBridge(v),{notify:t=>messages.push(t),fetchImpl:async()=>({ok:true,text:async()=>++count===1?JSON.stringify({profile_id:'huijing-spatial-workflow-v1',session_id:'fake'}):await new Promise(r=>resolve=r)})});
 await controller.start('instance');const pending=controller.send('看看地铁');await new Promise(r=>setImmediate(r));v.metroShownIds=[v.metroPois[0].poi_id];resolve(JSON.stringify({profile_id:'huijing-spatial-workflow-v1',message:'等待确认',envelope:copy(),demo:false,engine:'live_provider'}));
 const result=await pending;assert.equal(result.error,'context_changed');assert.equal(v.calls,0);assert.equal(v.metroShownIds.length,1);
});
