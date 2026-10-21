import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../apps/server/src/app.ts';
const source={name:'Example',url:'https://example.com/api',enabled:true};
test('authentication protects API, sets private cookie and rejects cross origin writes',async()=>{
 const app=await createApp({password:'a-long-test-password',secret:'test-secret',fetchJson:async()=>({list:[]})});
 try {
  assert.equal((await app.inject({method:'POST',url:'/api/detail',payload:{source,id:'1'}})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url:'/api/login',payload:{password:'wrong'}})).statusCode,401);
  const login=await app.inject({method:'POST',url:'/api/login',payload:{password:'a-long-test-password'}});
  assert.equal(login.statusCode,200); assert.match(String(login.headers['set-cookie']),/HttpOnly/);
  const cookie=String(login.headers['set-cookie']).split(';')[0];
  assert.equal((await app.inject({url:'/api/session',headers:{cookie}})).json().authenticated,true);
  assert.equal((await app.inject({method:'POST',url:'/api/logout',headers:{cookie,origin:'https://evil.example'}})).statusCode,403);
  await app.inject({method:'POST',url:'/api/logout',headers:{cookie}});
  assert.equal((await app.inject({url:'/api/session',headers:{cookie}})).json().authenticated,false);
 } finally {await app.close();}
});
test('SSE search returns successful sources even when another fails; limits concurrency',async()=>{
 let active=0,max=0;
 const app=await createApp({fetchJson:async(url,signal)=>{
   active++;max=Math.max(active,max);
   try { await new Promise(r=>setTimeout(r,10)); if(url.hostname==='bad.example')throw new Error('bad source');return {list:[{vod_id:1,vod_name:'Film',vod_year:'2020',type_name:'movie'}],pagecount:3}; }
   finally{active--;}
 }});
 try {
  const sources=Array.from({length:9},(_,i)=>({...source,url:`https://${i===0?'bad':`source${i}`}.example/api`}));
  const res=await app.inject({method:'POST',url:'/api/search',payload:{keyword:'Film',sources,page:1}});
  assert.equal(res.statusCode,200); assert.match(res.body,/'never'|"type":"done"/);
  assert.equal((res.body.match(/"type":"result"/g)||[]).length,8);
  assert.match(res.body,/"type":"error"/); assert.ok(max<=5);
 } finally {await app.close();}
});
test('bad source payloads are rejected rather than causing server errors',async()=>{
 const app=await createApp();try{
  const res=await app.inject({method:'POST',url:'/api/search',payload:{keyword:'x',sources:[{url:'file:///etc/passwd'}]}});
  assert.equal(res.statusCode,400);
 }finally{await app.close();}
});
test('login attempts are rate limited',async()=>{
 const app=await createApp({password:'test-password',secret:'secret'});try{
  for(let i=0;i<8;i++) await app.inject({method:'POST',url:'/api/login',payload:{password:'wrong'}});
  assert.equal((await app.inject({method:'POST',url:'/api/login',payload:{password:'wrong'}})).statusCode,429);
 }finally{await app.close();}
});
