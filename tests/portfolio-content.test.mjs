import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source=await fs.readFile(process.env.PORTFOLIO_SOURCE || path.join(repo,'h5-static/kg-app.js'),'utf8');
const cases=vm.runInNewContext(source.match(/var CASES = (\[[\s\S]*?\n  \]);/)[1]);
const index=vm.runInNewContext(source.match(/var PORTAL_INDEX = (\[[\s\S]*?\n  \]);/)[1]);
assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
const coast=cases.find(c=>c.id==='coastal-change');assert.ok(coast&&coast.story&&coast.story_zh&&coast.proof&&coast.proof_zh);
assert.ok(!coast.url);assert.equal(index.find(c=>c.caseId===coast.id).group,'research');
for(const id of ['wake-me-up','band-with']) {const row=index.find(r=>r.caseId===id);assert.ok(row.url&&row.caseId);}
for(const row of index.filter(r=>r.caseId)) assert.ok(cases.some(c=>c.id===row.caseId),row.caseId);
assert.ok(source.includes('data-portfolio-return')===false);
assert.ok(source.includes('from=portfolio'));
assert.ok(!/sole.*training.*ownership.*is confirmed/i.test(coast.story));
console.log(`PASS: ${cases.length} unique cards, evidence-backed bilingual coastal card, research index, valid card IDs and dual page/card destinations.`);
