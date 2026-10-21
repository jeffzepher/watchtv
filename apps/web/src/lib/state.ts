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
function validVideo(v:any): boolean {
  if(!v||typeof v.key!=='string'||typeof v.id!=='string'||typeof v.name!=='string'||!Array.isArray(v.lines))return false;
  try{parseSources([v.source]);return v.lines.length<=50&&v.lines.every((line:any)=>typeof line.name==='string'&&Array.isArray(line.episodes)&&line.episodes.length<=10000&&line.episodes.every((e:any)=>typeof e.name==='string'&&!!httpUrl(e.url)));}catch{return false;}
}
export function parseBackup(input: any): {version:1;sources:Source[];history:HistoryEntry[];favorites:Video[]} {
  const sources=parseSources(input?.sources);
  if(!Array.isArray(input.history)||!Array.isArray(input.favorites)||input.history.length>1000||input.favorites.length>1000)throw new Error('备份数据格式不正确');
  if(input.history.some((h:any)=>!h||!validVideo(h.video)||h.key!==h.video.key||!Number.isFinite(h.time)||h.time<0||!Number.isFinite(h.duration)||h.duration<0||!Number.isInteger(h.line)||h.line<0||!Number.isInteger(h.episode)||h.episode<0||!Number.isFinite(h.updatedAt)))throw new Error('历史记录格式不正确');
  if(input.favorites.some((v:any)=>!validVideo(v)))throw new Error('收藏格式不正确');
  return {version:1,sources,history:input.history,favorites:input.favorites};
}
