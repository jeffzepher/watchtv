import test from 'node:test';
import assert from 'node:assert/strict';
import {searchSourceView,paginateSources,setAllSourcesEnabled} from '../apps/web/src/lib/source-view.ts';
import type {Source,Video} from '../packages/core/src/types.ts';
const sources:Source[]=Array.from({length:23},(_,i)=>({name:`来源${i}`,url:`https://s${i}.example/api`,enabled:i%2===0}));
const videos=[{key:'a',source:sources[0]},{key:'b',source:sources[1]},{key:'c',source:sources[0]}] as Video[];
test('source filters include only sources with results and preserve results when switching back to all',()=>{
 const all=searchSourceView(sources,videos,'');
 assert.deepEqual(all.sources.map(s=>[s.source.url,s.count]),[[sources[0].url,2],[sources[1].url,1]]);
 assert.equal(all.videos.length,3);
 assert.deepEqual(searchSourceView(sources,videos,sources[1].url).videos.map(v=>v.key),['b']);
 assert.equal(searchSourceView(sources,videos,'').videos.length,3);
});
test('pagination uses ten sources per page and clamps after deleting the final page',()=>{
 assert.equal(paginateSources(sources,1).items.length,10);
 assert.equal(paginateSources(sources,2).items[0].url,sources[10].url);
 assert.equal(paginateSources(sources,3).items.length,3);
 assert.equal(paginateSources(sources.slice(0,20),3).page,2);
 assert.deepEqual(paginateSources([],4),{items:[],page:1,pages:1});
});
test('bulk switch applies to every page and preserves source data without mutation',()=>{
 const enabled=setAllSourcesEnabled(sources,true);
 assert.equal(enabled.filter(s=>s.enabled).length,23);
 assert.equal(setAllSourcesEnabled(enabled,false).filter(s=>s.enabled).length,0);
 assert.equal(sources[1].enabled,false);assert.equal(enabled[22].url,sources[22].url);
});
