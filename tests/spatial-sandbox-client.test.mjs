import assert from 'node:assert/strict';
import {createSpatialController,isSpatialSandbox} from '../h5-static/3d/huijing-huayuan/spatial-agent.js';
const original=globalThis.location;
const allowed={origin:'https://jiyiji.cn',pathname:'/webqing/sandbox/pr-14/3d/huijing-huayuan/'};
try{
 for(const location of [undefined,{...allowed,origin:'https://evil.invalid'},{...allowed,pathname:'/webqing/3d/huijing-huayuan/'}]){globalThis.location=location;assert.equal(isSpatialSandbox(),false);}
 globalThis.location=allowed;assert.equal(isSpatialSandbox(),true);
 let seen;const controller=createSpatialController({}, {},{fetchImpl:async(url)=>{seen=url;return {ok:true,text:async()=>JSON.stringify({profile_id:'huijing-spatial-workflow-v1',session_id:'test'})};}});
 await controller.start('browser');assert.equal(seen,'/webqing/api/spatial-sandbox-pr14/start');
 globalThis.location={origin:'http://localhost:8794',pathname:'/'};await controller.start('local');assert.equal(seen,'/api/spatial/start');
}finally{globalThis.location=original;}
console.log('PASS: hosted spatial API enabled only at exact approved origin/path; local route preserved.');
