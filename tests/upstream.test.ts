import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicAddress,validateTarget,pinnedLookup,resolveWithFallback} from '../apps/server/src/upstream.ts';

test('Fake-IP DNS answers are replaced with checked public answers',async()=>{
 let calls=0;
 const publicAnswers=[{address:'1.1.1.1',family:4}];
 assert.deepEqual(await resolveWithFallback('example.com',async()=>[{address:'198.18.0.70',family:4}],async()=>{calls++;return publicAnswers;}),publicAnswers);
 assert.equal(calls,1);
 assert.deepEqual(await resolveWithFallback('example.com',async()=>publicAnswers,async()=>{throw Error('must not query');}),publicAnswers);
 await assert.rejects(()=>resolveWithFallback('example.com',async()=>[{address:'198.19.1.2',family:4}],async()=>[{address:'127.0.0.1',family:4}]),/禁止/);
});

test('DNS fallback preserves private-address blocking and cancellation',async()=>{
 let calls=0;
 const fallback=async()=>{calls++;return [{address:'1.1.1.1',family:4}];};
 await assert.rejects(()=>resolveWithFallback('example.com',async()=>[{address:'10.0.0.1',family:4}],fallback),/禁止/);
 assert.equal(calls,0);
 assert.equal((await resolveWithFallback('example.com',async()=>{throw Error('DNS unavailable');},fallback))[0].address,'1.1.1.1');
 const controller=new AbortController();controller.abort(Error('cancelled'));
 await assert.rejects(()=>resolveWithFallback('example.com',async()=>new Promise(()=>{}),fallback,controller.signal),/cancelled/);
 assert.equal(calls,1);
 await assert.rejects(()=>resolveWithFallback('example.com',async()=>[{address:'198.18.0.1',family:4}],async()=>{throw Error('offline');}),/offline/);
 await assert.rejects(()=>validateTarget(new URL('http://198.18.0.1')),/禁止/);
});
test('private, reserved and mapped IPv6 addresses cannot be fetched',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1','100.64.0.1','2001:db8::1']) assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('1.1.1.1'),true);
});
test('pinned DNS lookup supports Node 22 all-address connection mode',()=>{
 const pin=pinnedLookup({address:'1.1.1.1',family:4});
 pin('example.com',{all:true},(error:any,addresses:any)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'1.1.1.1',family:4}]);});
 pin('example.com',{},(error:any,address:any,family:any)=>{assert.equal(address,'1.1.1.1');assert.equal(family,4);});
});
test('all DNS answers must be public; credentials and custom ports rejected',async()=>{
 await assert.rejects(()=>validateTarget(new URL('https://x.example'),async()=>[{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}]));
 await assert.rejects(()=>validateTarget(new URL('http://user:pass@example.com')));
 await assert.rejects(()=>validateTarget(new URL('http://example.com:2375')));
});
test('a stalled DNS resolver is interrupted by source cancellation',async()=>{
 const controller=new AbortController();
 const pending=validateTarget(new URL('https://stalled.example'),()=>new Promise(()=>{}),controller.signal);
 controller.abort(new Error('cancelled'));
 await assert.rejects(pending,/cancelled/);
});
