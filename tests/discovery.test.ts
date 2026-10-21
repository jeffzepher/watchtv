import test from 'node:test';
import assert from 'node:assert/strict';
import {preferredLine} from '../packages/core/src/index.ts';
import {createApp} from '../apps/server/src/app.ts';

test('playback prefers direct media over embedded player pages',()=>{
 assert.equal(preferredLine([{name:'web',episodes:[{name:'1',url:'https://example.com/share/123'}]},{name:'m3u8',episodes:[{name:'1',url:'https://example.com/index.m3u8'}]}]),1);
 assert.equal(preferredLine([]),0);
});
test('popular recommendations preserve upstream order, validate fields and whitelist categories',async()=>{
 let requested='';
 const app=await createApp({fetchJson:async u=>{requested=u.href;return {subjects:[{id:'1',title:'热播剧',cover:'https://img3.doubanio.com/a.jpg',rate:'8.1'},{id:'2',title:'下一部',cover:'javascript:bad',rate:'9'}]};}});
 const res=await app.inject('/api/recommendations?category=tv');
 assert.equal(res.statusCode,200);assert.equal(res.json().items[0].title,'热播剧');assert.equal(res.json().items[1].cover,'');
 assert.match(res.json().items[0].cover,/^\/api\/poster\?ticket=/);
 assert.match(requested,/sort=recommend/);
 assert.equal((await app.inject('/api/recommendations?category=invalid')).statusCode,400);
 await app.close();
});
test('recommendations and posters require session on protected deployments',async()=>{
 const app=await createApp({password:'test-only'});
 assert.equal((await app.inject('/api/recommendations?category=tv')).statusCode,401);
 assert.equal((await app.inject('/api/poster?ticket=invalid')).statusCode,401);
 await app.close();
});
