import {parseSources,httpUrl} from '../../../../packages/core/src/index.ts';
import type {Source,Video,HistoryEntry,SearchEvent} from '../../../../packages/core/src/types.ts';

export class SseDecoder {
  private pending='';
  push(chunk: string): SearchEvent[] {
    this.pending+=chunk;const blocks=this.pending.split('\n\n');this.pending=blocks.pop()||'';
    return blocks.flatMap(block=>block.startsWith('data: ')?[JSON.parse(block.slice(6))]:[]);
  }
}
export function mergeVideos(current: Video[],incoming: Video[]): Video[]{return [...new Map([...current,...incoming].map(v=>[v.key,v])).values()];}
function cleanVideo(v:any): Video {
  const fields=['key','id','name','year','category','area','note','poster','description','director','actors'] as const;
  if(!v||fields.some(f=>typeof v[f]!=='string'||v[f].length>15000)||!Array.isArray(v.lines))throw new Error('影片备份格式不正确');
  const source=parseSources([v.source])[0];
  if(v.key!==`${source.url}::${v.id}`)throw new Error('影片标识不正确');
  if(v.poster)httpUrl(v.poster);
  if(v.lines.length>50)throw new Error('线路数量超过限制');
  const lines=v.lines.map((line:any)=>{
    if(!line||typeof line.name!=='string'||!Array.isArray(line.episodes)||line.episodes.length>10000)throw new Error('线路格式不正确');
    return {name:line.name,episodes:line.episodes.map((e:any)=>{if(typeof e?.name!=='string')throw new Error('剧集格式不正确');return {name:e.name,url:httpUrl(e.url)};})};
  });
  const display=Object.fromEntries(fields.map(f=>[f,v[f]]));
  return {...display,source,lines} as Video;
}
export function parseBackup(input: any): {version:1;sources:Source[];history:HistoryEntry[];favorites:Video[]} {
  if(input?.version!==undefined&&input.version!==1)throw new Error('不支持此备份版本');
  const sources=parseSources(input?.sources);
  if(!Array.isArray(input.history)||!Array.isArray(input.favorites)||input.history.length>1000||input.favorites.length>1000)throw new Error('备份数据格式不正确');
  const history=input.history.map((h:any)=>{
    const video=cleanVideo(h?.video);
    if(h.key!==video.key||!Number.isFinite(h.time)||h.time<0||!Number.isFinite(h.duration)||h.duration<0||!Number.isInteger(h.line)||h.line<0||!Number.isInteger(h.episode)||h.episode<0||!Number.isFinite(h.updatedAt)||!video.lines[h.line]?.episodes[h.episode])throw new Error('历史记录格式不正确');
    return {key:video.key,video,line:h.line,episode:h.episode,time:h.time,duration:h.duration,updatedAt:h.updatedAt};
  });
  return {version:1,sources,history,favorites:input.favorites.map(cleanVideo)};
}
export interface SearchRequest {keyword:string;sources:Source[];page:number}
export function searchRequestForPage(keyword:string,sources:Source[],page:number,previous:SearchRequest|null):SearchRequest {
  if(page>1){if(!previous)throw new Error('请先搜索');return {...previous,page};}
  return {keyword:keyword.trim(),sources:sources.map(s=>({...s})),page:1};
}
