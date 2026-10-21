import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeIndexByName} from '../packages/core/src/index.ts';
import {parseBackup,mergeVideos,SseDecoder} from '../apps/web/src/lib/state.ts';
test('source switching preserves episode only on unambiguous match',()=>{
 assert.equal(episodeIndexByName('第01集',['第1集','第2集']),0);
 assert.equal(episodeIndexByName('第1集',['第1集','第01集']),-1);
 assert.equal(episodeIndexByName('第3集',['第1集']),-1);
});
test('SSE decoder handles fragmented Unicode frames and old pages deduplicate',()=>{
 const d=new SseDecoder(); assert.deepEqual(d.push('data: {"type":"res'),[]);
 assert.equal(d.push('ult","error":"中文"}\n\ndata: {"type":"done"}\n\n').length,2);
 assert.equal(mergeVideos([{key:'a'} as any],[{key:'a'} as any,{key:'b'} as any]).length,2);
});
test('backup import rejects invalid history and never imports service credentials',()=>{
 assert.throws(()=>parseBackup({sources:[],history:[{key:'a',time:-1}],favorites:[]}));
 const backup=parseBackup({version:1,sources:[],history:[],favorites:[],password:'secret'});
 assert.equal('password' in backup,false);
 assert.throws(()=>parseBackup({sources:[{url:'javascript:alert(1)'}],history:[],favorites:[]}));
});
