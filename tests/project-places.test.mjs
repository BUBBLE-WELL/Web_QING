import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createToolBridge} from '../h5-static/3d/huijing-huayuan/tool-actions.js';
const fc=JSON.parse(fs.readFileSync(new URL('../h5-static/3d/huijing-huayuan/assets/site/project_places.geojson',import.meta.url)));const rows=fc.features.map(f=>({...f.properties,coordinates:f.geometry.coordinates}));
test('place bridge validates records/hash and confirms actual attachment IDs',async()=>{
 const hash='a'.repeat(64);let ids=[],calls=0;const v={ready:true,catalogHash:'b'.repeat(64),queryBuildings:()=>[],placeCatalogHash:hash,projectPlaces:rows,get placeShownIds(){return ids},async showProjectPlaces(x){calls++;ids=x}};
 const a={type:'show_project_places',place_catalog_sha256:hash,place_ids:['E03']};const row={index:0,tool:a.type,status:'action_requested',data_source:'reviewed-design-and-cad-candidates',building_ids:[],places:rows.filter(p=>p.place_id==='E03'),place_catalog_sha256:hash,viewer_actions:[a]};const env={request_id:'one',ok:true,results:[row],viewer_actions:[a],catalog_sha256:v.catalogHash,error:null};
 const bridge=createToolBridge(v);assert.equal((await bridge.apply(env)).ok,true);assert.equal(calls,1);assert.equal((await bridge.apply(env)).error.code,'duplicate_request');
 const bad=structuredClone(env);bad.request_id='two';bad.results[0].places[0].coordinates=[0,0];assert.equal((await bridge.apply(bad)).ok,false);assert.equal(calls,1);
});
