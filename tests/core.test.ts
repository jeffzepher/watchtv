import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSources, parseVod, groupVideos} from '../packages/core/src/index.ts';
const source = {name:'Test',url:'https://example.com/api.php/provide/vod',enabled:true};
test('source imports reject invalid schemes and excessive lists, deduplicate URLs',()=>{
  assert.throws(()=>parseSources([{name:'x',url:'file:///etc/passwd'}]));
  assert.throws(()=>parseSources(Array.from({length:51},()=>source)));
  assert.equal(parseSources({sources:[source,{...source,url:source.url+'/'}]}).length,1);
  assert.throws(()=>parseSources({sites:[{api:'csp_spider'}]}));
});
test('Apple CMS parses multiple lines and rejects executable episode URLs',()=>{
  const v=parseVod({vod_id:1,vod_name:'Test',vod_play_from:'hls$$$mp4',vod_play_url:'第01集$https://example.com/1.m3u8#坏集$javascript:alert(1)$$$正片$https://example.com/a.mp4'},source);
  assert.equal(v.lines.length,2); assert.equal(v.lines[0].episodes.length,1);
  assert.equal(v.lines[1].episodes[0].name,'正片');
});
test('same title with different year or missing identity is not incorrectly merged',()=>{
 const v=(id:number,year:string)=>parseVod({vod_id:id,vod_name:'西游记',vod_year:year,type_name:'国产剧'},source);
 assert.equal(groupVideos([v(1,'1986'),v(2,'2011')]).length,2);
 assert.equal(groupVideos([v(1,'1986'),{...v(2,'1986'),source:{...source,url:'https://other.example/api'}}]).length,1);
 assert.equal(groupVideos([v(1,''),v(2,'')]).length,2);
});
