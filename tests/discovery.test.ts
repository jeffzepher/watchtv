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

test('explicit refresh bypasses recommendation cache and updates the cached list',async()=>{
 let calls=0;
 const app=await createApp({fetchJson:async()=>({subjects:[{id:String(++calls),title:`片单${calls}`} ]})});
 try {
  assert.equal((await app.inject('/api/recommendations?category=tv')).json().items[0].title,'片单1');
  await app.inject('/api/recommendations?category=tv');assert.equal(calls,1);
  assert.equal((await app.inject('/api/recommendations?category=tv&refresh=1')).json().items[0].title,'片单2');
  assert.equal((await app.inject('/api/recommendations?category=tv')).json().items[0].title,'片单2');
  assert.equal(calls,2);
 } finally {await app.close();}
});

test('children, short dramas and US series request their own recommendation tags',async()=>{
 let requested:URL|undefined;
 const app=await createApp({fetchJson:async u=>{requested=u;return {subjects:[]};}});
 try {
  for(const [category,tag,type] of [['children','儿童','movie'],['short','短剧','movie'],['us','美剧','tv']]){
   assert.equal((await app.inject(`/api/recommendations?category=${category}`)).statusCode,200);
   assert.equal(requested?.searchParams.get('tag'),tag);
   assert.equal(requested?.searchParams.get('type'),type);
  }
 } finally {await app.close();}
});
