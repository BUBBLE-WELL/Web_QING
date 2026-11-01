import test from 'node:test';import assert from 'node:assert/strict';import {createLayerState} from '../h5-static/3d/huijing-huayuan/layer-state.js';
test('borrow returns only owned visibility changes; manual off/on survives return',async()=>{
 const state=createLayerState(),shown={};for(const id of ['places','plan'])state.register(id,false,v=>{shown[id]=v});
 assert.equal(state.get('places').visible,false);const release=await state.borrow(['places','plan']);assert.equal(shown.places,true);assert.equal(shown.plan,true);
 state.set('plan',false);state.set('plan',true);await release();assert.equal(shown.places,false);assert.equal(shown.plan,true);
});
test('existing visibility is retained; repeated show does not take new ownership',async()=>{
 const s=createLayerState();s.register('plan',true,()=>{});const release=await s.borrow(['plan']);await release();assert.equal(s.get('plan').visible,true);
 s.register('points',false,()=>{});const a=await s.borrow(['points']),b=await s.borrow(['points']);await b();assert.equal(s.get('points').visible,true);await a();assert.equal(s.get('points').visible,false);
});
test('manual switch off during lazy load is not overwritten on completion/return',async()=>{
 const s=createLayerState();let done;s.register('plan',false,v=>v?new Promise(r=>done=r):undefined);const task=s.borrow(['plan']);s.set('plan',false);done();const release=await task;await release();assert.equal(s.get('plan').visible,false);
});
