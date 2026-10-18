import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.env.TRANSITION_SOURCE || path.join(repo, 'h5-static/page-transition.js');
const source = await fs.readFile(sourcePath, 'utf8');
function setup({gate=false,reduced=false}={}) {
  const listeners = {}, timers = new Map(), motion = [], navigations=[];
  let nextTimer=0, observed;
  class Element {
    constructor(tag='DIV') { this.tagName=tag; this.dataset={}; this.style={}; this.attrs={}; this.children=[]; this.inert=false; this.isConnected=true; this.hidden=false; this.visible=true; this.nodes={}; this.listeners={}; }
    setAttribute(k,v) { this.attrs[k]=v; } removeAttribute(k) { delete this.attrs[k]; }
    hasAttribute(k) { return k in this.attrs; }
    focus() { document.activeElement=this; }
    closest(selector) { if(selector==='[inert]') return this.inert?this:null; if(selector==='a[data-portfolio-return]') return this.back?this:null; return this.link?this:null; }
    getClientRects() { return this.visible?[{}]:[]; }
    appendChild(n) { this.children.push(n); if(observed) observed([{addedNodes:[n]}]); }
    addEventListener(name,fn) { this.listeners[name]=fn; }
    querySelector(selector) { return this.nodes[selector] ||= new Element(selector==='[data-transition-dismiss]'?'BUTTON':'DIV'); }
    animate(frames,options) { motion.push({frames,options}); return {finished:Promise.resolve(),cancel(){}}; }
  }
  const body=new Element('BODY'), trigger=new Element('BUTTON'), existingInert=new Element('ASIDE');existingInert.inert=true;
  body.children=[trigger,existingInert];
  const document={body,activeElement:trigger,documentElement:{lang:'zh-CN'},currentScript:{hasAttribute:()=>gate},createElement:()=>new Element(),addEventListener:(n,fn)=>listeners[n]=fn};
  const location={href:'https://example.test/webqing/',search:'',assign:(url)=>navigations.push(url),reload:()=>navigations.push('reload')};
  const context={document,location,HTMLElement:Element,MutationObserver:class {constructor(fn){observed=fn;}observe(){}},URL,URLSearchParams,Map,Set,Promise,console,
    setTimeout:(fn,ms)=>{timers.set(++nextTimer,{fn,ms});return nextTimer;},clearTimeout:(id)=>timers.delete(id)};
  context.window={close:()=>navigations.push('close-tab'),matchMedia:()=>({matches:reduced}),location,addEventListener:(n,fn)=>listeners[n]=fn};
  vm.runInNewContext(source,context);
  return {location,api:context.window.QingTransition,root:body.children.at(-1),body,trigger,existingInert,motion,navigations,listeners,timers,Element};
}
async function settle() { for(let n=0;n<25;n++) await Promise.resolve(); }
{
 const s=setup();let release,calls=0;
 const done=s.api.run(()=>{calls++;return new Promise(r=>release=r);});
 await settle();assert.equal(s.root.dataset.phase,'waiting');assert.equal(calls,1);
 assert.ok(s.trigger.inert);assert.equal(await s.api.run(()=>calls++),false);assert.equal(calls,1);
 const late=new s.Element();s.body.appendChild(late);assert.ok(late.inert);
 const mask=s.motion.find(m=>m.frames[0].transform==='translateY(-112vh)');
 const spider=s.motion.find(m=>m.frames[0].transform==='translateY(-68vh)');
 assert.ok(mask&&spider,'mask travels farther than spider');
 release();await done;assert.ok(s.root.hidden);assert.ok(!s.trigger.inert);assert.ok(s.existingInert.inert);assert.ok(!late.inert);
 assert.equal(s.motion.at(-3).frames.at(-1).transform,'translateY(-112vh)');
}
{
 const s=setup({gate:true});await settle();assert.ok(s.api.active,'scene stays covered before real ready');
 s.api.ready();s.api.ready();await settle();assert.ok(s.root.hidden);assert.equal(s.root.dataset.phase,'idle');
}
{
 const s=setup({gate:true});await settle();
 [...s.timers.values()].find(t=>t.ms===12000).fn();assert.ok(!s.root.querySelector('.page-transition-actions').hidden);
 s.api.fail();assert.equal(s.root.dataset.phase,'error');
 s.root.querySelector('[data-transition-dismiss]').listeners.click();await settle();assert.ok(s.root.hidden);assert.ok(!s.trigger.inert);
 s.api.ready();await settle();assert.ok(s.root.hidden,'late ready never reopens curtain');
}
{
 const s=setup({reduced:true});await s.api.run(()=>{});assert.equal(s.motion.length,0);assert.ok(s.root.hidden);
}
{
 const s=setup();const link=new s.Element('A');link.link=true;link.href='https://example.test/webqing/3d/huijing-huayuan/';link.target='';
 let prevented=0;const click={target:link,button:0,preventDefault(){prevented++;}};
 s.listeners.click({...click,ctrlKey:true});await settle();assert.equal(prevented,0);assert.equal(s.navigations.length,0);
 s.listeners.click(click);await settle();assert.equal(prevented,1);assert.equal(s.navigations.length,1);
 s.listeners.pageshow({persisted:true});assert.ok(s.root.hidden);assert.ok(!s.trigger.inert);
 link.target='_blank';s.listeners.click(click);await settle();assert.equal(prevented,1,'explicit new-tab links retain native behavior');
}
{
 const s=setup({gate:true});s.location.search='?from=portfolio';
 const back=new s.Element('A');back.back=true;let prevented=false;
 s.listeners.click({target:back,button:0,preventDefault(){prevented=true;}});
 assert.ok(prevented);assert.deepEqual(s.navigations,['close-tab'],'return closes child instead of reloading the portfolio landing');
}
console.log('PASS: action readiness, repeat click, inert/focus restoration, differing travel, scene gate, slow/error recovery, late ready, reduced motion, native modifiers and back-cache recovery.');
