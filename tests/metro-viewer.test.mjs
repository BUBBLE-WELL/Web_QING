import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
const source=await fs.readFile(new URL('../h5-static/3d/huijing-huayuan/main.js',import.meta.url),'utf8');
const raw=await fs.readFile(new URL('../h5-static/3d/huijing-huayuan/assets/site/metro_entrances.geojson',import.meta.url));
const point=source.slice(source.indexOf('async function pointItem(def)'),source.indexOf('function itemRow('));
const methods=source.slice(source.indexOf('function metroPois()'),source.indexOf('window.huijingViewer ='));
let fit=null;const markers=[];
class Marker{constructor({element}){this.el=element;markers.push(this);}setLngLat(ll){this.ll=ll;return this;}addTo(){this.el.isConnected=true;return this;}remove(){this.el.isConnected=false;}getElement(){return this.el;}}
const context=vm.createContext({crypto:webcrypto,TextDecoder,Uint8Array,JSON,console,fetch:async()=>({ok:true,arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)}),document:{createElement:()=>({isConnected:false,querySelector:()=>({textContent:''})})},maplibregl:{Marker,LngLatBounds:class{constructor(){this.points=[];}extend(ll){this.points.push(ll);return this;}}},map:{stop(){},fitBounds(b,o){fit={b,o};}},toDisplayCoord:()=>p=>p,toDisplay:p=>p,framePadding:{top:70,left:300,right:300,bottom:20},pointItems:[],itemsById:{},metroCatalogHash:null});
vm.runInContext(point+'\n'+methods,context);
const item=await context.pointItem({id:'metro',source:'assets/site/metro_entrances.geojson',crs:'wgs84',color:'#2bb673',label_field:'label',short_field:'short'});
context.itemsById.metro=v=>item.setVisible(v);
assert.equal(context.metroCatalogHash,createHash('sha256').update(raw).digest('hex'));assert.equal(context.metroShownIds().length,0);
await context.showMetroEntrances();assert.equal(context.metroShownIds().length,3);assert(markers.every(m=>m.el.isConnected));assert.equal(fit.b.points.length,3);assert.equal(fit.o.duration,0);assert.equal(fit.o.pitch,0);
await item.setVisible(false);assert.equal(context.metroShownIds().length,0);
console.log('PASS: actual point/viewer functions load3snapshot markers, verify source bytes, show/hide attached elements and request a view containing all points. DOM/map adapters are stubs; not rendered-browser acceptance.');
