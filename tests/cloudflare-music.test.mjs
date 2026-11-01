import assert from 'node:assert/strict';
import worker from '../worker.mjs';
for (const path of ['/music/band-with/', '/music/band-with?key=fixture', '/music/band-with/live/status', '/music/media/share.mp4?v=20261031-share-1']) {
 const result=await worker.fetch(new Request('https://example.workers.dev'+path),{});
 assert.equal(result.status,302);
 const target=new URL(result.headers.get('location'));
 assert.equal(target.origin,'https://jiyiji.cn');
 assert.ok(target.pathname.startsWith('/webqing/music/'));
 assert.equal(target.search,new URL('https://example.workers.dev'+path).search);
}
for (const path of ['/', '/music/', '/music/share-card.png','/3d/huijing-huayuan/']) {
 const result=await worker.fetch(new Request('https://example.workers.dev'+path),{ASSETS:{fetch:async req=>new Response(new URL(req.url).pathname)}});
 assert.equal(await result.text(),path);
}
console.log('Cloudflare routing: 8 cases passed');
