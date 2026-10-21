import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeIndexByName} from '../packages/core/src/index.ts';
import {parseBackup,mergeVideos,SseDecoder,searchRequestForPage} from '../apps/web/src/lib/state.ts';
import {startPlayback} from '../apps/web/src/lib/playback.ts';
test('source switching preserves episode only on unambiguous match',()=>{
 assert.equal(episodeIndexByName('第01集',['第1集','第2集']),0);
 assert.equal(episodeIndexByName('第1集',['第1集','第01集']),-1);
 assert.equal(episodeIndexByName('第3集',['第1集']),-1);
});
test('load more uses submitted keyword and source snapshot after input changes',()=>{
 const source={name:'Test',url:'https://example.com/api',enabled:true};
 const first=searchRequestForPage('A',[source],1,null);
 const next=searchRequestForPage('B',[],2,first);
 assert.equal(next.keyword,'A');assert.deepEqual(next.sources,[source]);assert.equal(next.page,2);
});
test('episode readiness requests playback and handles autoplay denial',async()=>{
 let played=false;assert.equal(await startPlayback({play:async()=>{played=true;}}),true);assert.equal(played,true);
 assert.equal(await startPlayback({play:async()=>{throw new Error('NotAllowed');}}),false);
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
test('backup rejects object display fields and unsupported versions before storage',()=>{
 const video={key:'https://example.com/api::1',id:'1',name:'Film',source:{name:'Test',url:'https://example.com/api',enabled:true},lines:[],year:'2020',category:'movie',area:'',note:{bad:true},poster:'',description:'',actors:'',director:''};
 assert.throws(()=>parseBackup({version:1,sources:[],favorites:[video],history:[]}));
 assert.throws(()=>parseBackup({version:99,sources:[],favorites:[],history:[]}));
});
