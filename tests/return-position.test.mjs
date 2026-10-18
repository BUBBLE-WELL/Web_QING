import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source=await fs.readFile(process.env.PORTFOLIO_SOURCE||path.join(root,'h5-static/kg-app.js'),'utf8');
const ownership=source.slice(source.indexOf('  function mainScrollRoot()'),source.indexOf('  function mainScrollBehavior()'));
const area={};const docRoot={};let overflow='auto';
const ownerContext=vm.createContext({document:{querySelector:()=>area,scrollingElement:docRoot,documentElement:docRoot},window:{getComputedStyle:()=>({overflowY:overflow})}});
vm.runInContext(ownership,ownerContext);assert.equal(vm.runInContext('mainScrollRoot()',ownerContext),area);
overflow='visible';assert.equal(vm.runInContext('mainScrollRoot()',ownerContext),docRoot);
const helper=source.slice(source.indexOf('  function bindProjectReturnPosition()'),source.indexOf('  function bindChrome()'));
const documentEvents={},windowEvents={};let currentRoot;let mobile=false;
const desktop={scrollTop:200,clientHeight:600,getBoundingClientRect:()=>({top:80}),scrollTo({top}){this.scrollTop=top;}};
const mobileRoot={scrollTop:0,scrollTo({top}){this.scrollTop=top;}};currentRoot=desktop;
const link={isConnected:true,getBoundingClientRect:()=>({top:mobile?2400-mobileRoot.scrollTop:500}),closest:()=>link};
const ctx=vm.createContext({document:{body:{dataset:{state:'story'}},scrollingElement:mobileRoot,hidden:false,addEventListener:(n,f)=>documentEvents[n]=f},
 window:{innerHeight:800,addEventListener:(n,f)=>windowEvents[n]=f,setTimeout:()=>1,clearTimeout(){}},
 mainScrollRoot:()=>currentRoot,requestAnimationFrame:f=>f()});
vm.runInContext(helper+';bindProjectReturnPosition();',ctx);
documentEvents.click({type:'click',target:link});mobile=true;currentRoot=mobileRoot;windowEvents.focus();
assert.equal(mobileRoot.scrollTop,1980,'responsive return restores clicked link at its previous 420px viewport offset');
assert.equal(link.getBoundingClientRect().top,420);
documentEvents.wheel();mobileRoot.scrollTop=100;windowEvents.resize();assert.equal(mobileRoot.scrollTop,100,'manual scrolling cancels stale return bookmarks');
console.log('PASS: desktop/document scroll ownership, responsive new-tab return anchor, manual-scroll cancellation.');

const scrollCode=source.slice(source.indexOf('  function scrollMainToElement('),source.indexOf('  function renderInlineFollowUps('));
let requestedTop;
const page={scrollTop:2400,scrollTo:o=>requestedTop=o.top,querySelectorAll:()=>[]};
const target={getBoundingClientRect:()=>({top:360}),classList:{add(){},remove(){}}};
const scrollContext=vm.createContext({document:{scrollingElement:page,querySelector:()=>({getBoundingClientRect:()=>({height:70})})},window:{setTimeout(){}},mainScrollBehavior:()=> 'auto'});
vm.runInContext(scrollCode,scrollContext);scrollContext.root=page;scrollContext.target=target;
vm.runInContext('scrollMainToElement(root,target)',scrollContext);
assert.equal(requestedTop,2682,'mobile card heading lands below 70px fixed header plus 8px');
page.getBoundingClientRect=()=>({top:90});scrollContext.document.scrollingElement={};
vm.runInContext('scrollMainToElement(root,target)',scrollContext);
assert.equal(requestedTop,2662,'desktop card uses main-area viewport offset');
console.log('PASS: card heading placement below mobile header and desktop scroll viewport.');
