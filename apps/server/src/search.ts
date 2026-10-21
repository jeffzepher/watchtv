import type {Source,SearchEvent} from '../../../packages/core/src/types.ts';
import {parseVod} from '../../../packages/core/src/index.ts';

export type FetchJson = (url: URL, signal?: AbortSignal) => Promise<any>;
export async function searchSources(sources: Source[], keyword: string, page: number, fetchJson: FetchJson, signal: AbortSignal, emit: (event: SearchEvent)=>void, timeoutMs=10000) {
  const queue=[...sources];
  await Promise.all(Array.from({length:Math.min(5,queue.length)},async()=>{
    while(queue.length && !signal.aborted) {
      const source=queue.shift()!;
      const timeout=AbortSignal.timeout(timeoutMs);
      const combined=AbortSignal.any([signal,timeout]);
      try {
        const url=new URL(source.url);url.searchParams.set('ac','videolist');url.searchParams.set('wd',keyword);url.searchParams.set('pg',String(page));
        const data=await fetchJson(url,combined);
        combined.throwIfAborted();
        if(!Array.isArray(data.list))throw new Error('来源没有返回有效的影片列表');
        const videos=data.list.slice(0,100).flatMap((item:unknown)=>{try{return [parseVod(item,source)];}catch{return [];}});
        emit({type:'result',source,videos,pagecount:Math.min(10000,Number(data.pagecount)||1)});
      }catch(e){if(!signal.aborted)emit({type:'error',source,error:timeout.aborted?'来源搜索超时':e instanceof Error?e.message:'来源连接失败'});}
    }
  }));
  if(!signal.aborted)emit({type:'done'});
}
