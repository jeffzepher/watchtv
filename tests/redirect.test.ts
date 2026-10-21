import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {PassThrough} from 'node:stream';
import {EventEmitter} from 'node:events';
import {safeFetch,readText} from '../apps/server/src/upstream.ts';
import {rewritePlaylist} from '../apps/server/src/media.ts';
test('redirected playlist retains final URL for relative media references',async()=>{
 const original=https.get;let calls=0;
 (https as any).get=(url:URL,options:any,callback:any)=>{
  const req=new EventEmitter();const res=Object.assign(new PassThrough(),{statusCode:calls++?200:302,headers:calls===1?{location:'https://1.1.1.1/new/master.m3u8'}:{'content-type':'application/vnd.apple.mpegurl'}});
  queueMicrotask(()=>{callback(res);if(res.statusCode===200)res.end('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\nsegment.ts\nchild/index.m3u8');});
  return req;
 };
 try{
  const response=await safeFetch(new URL('https://1.1.1.1/entry.m3u8'));
  assert.equal(response.url,'https://1.1.1.1/new/master.m3u8');
  const rewritten=rewritePlaylist(await readText(response),new URL(response.url!),u=>u);
  assert.match(rewritten,/https:\/\/1.1.1.1\/new\/key/);assert.match(rewritten,/https:\/\/1.1.1.1\/new\/segment.ts/);assert.match(rewritten,/https:\/\/1.1.1.1\/new\/child\/index.m3u8/);
 }finally{https.get=original;}
});
