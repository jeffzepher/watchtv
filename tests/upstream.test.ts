import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicAddress,validateTarget} from '../apps/server/src/upstream.ts';
test('private, reserved and mapped IPv6 addresses cannot be fetched',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1','100.64.0.1','2001:db8::1']) assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('1.1.1.1'),true);
});
test('all DNS answers must be public; credentials and custom ports rejected',async()=>{
 await assert.rejects(()=>validateTarget(new URL('https://x.example'),async()=>[{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}]));
 await assert.rejects(()=>validateTarget(new URL('http://user:pass@example.com')));
 await assert.rejects(()=>validateTarget(new URL('http://example.com:2375')));
});
