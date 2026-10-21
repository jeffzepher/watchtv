import test from 'node:test';
import assert from 'node:assert/strict';
import {rewritePlaylist,createTickets} from '../apps/server/src/media.ts';
test('media tickets reject tampering and expire',()=>{
 const t=createTickets('secret',()=>1000);
 const token=t.sign('https://example.com/film.m3u8',100);
 assert.equal(t.verify(token),'https://example.com/film.m3u8');
 assert.throws(()=>t.verify(token+'x'));
 assert.throws(()=>createTickets('secret',()=>1200).verify(token));
});
test('HLS rewrite resolves nested, relative segments, keys and maps',()=>{
 const playlist='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="../key"\n#EXT-X-MAP:URI="init.mp4"\nsegment.ts\nchild/index.m3u8';
 const result=rewritePlaylist(playlist,new URL('https://example.com/video/master.m3u8'),url=>`PROXY(${url})`);
 assert.match(result,/PROXY\(https:\/\/example.com\/key\)/);
 assert.match(result,/PROXY\(https:\/\/example.com\/video\/init.mp4\)/);
 assert.match(result,/PROXY\(https:\/\/example.com\/video\/child\/index.m3u8\)/);
 assert.throws(()=>rewritePlaylist('#EXTM3U\nfile:///etc/passwd',new URL('https://example.com/a'),x=>x));
});
