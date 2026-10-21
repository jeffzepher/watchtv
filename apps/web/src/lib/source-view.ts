import type {Source,Video} from '../../../../packages/core/src/types.ts';
export function searchSourceView(sources:Source[],videos:Video[],selected:string){
 const counts=new Map<string,number>();
 for(const video of videos)counts.set(video.source.url,(counts.get(video.source.url)||0)+1);
 return {sources:sources.filter(source=>counts.has(source.url)).map(source=>({source,count:counts.get(source.url)!})),videos:selected?videos.filter(video=>video.source.url===selected):videos};
}
export function paginateSources(sources:Source[],requested:number){
 const pages=Math.max(1,Math.ceil(sources.length/10));const page=Math.min(pages,Math.max(1,requested));
 return {items:sources.slice((page-1)*10,page*10),page,pages};
}
export function setAllSourcesEnabled(sources:Source[],enabled:boolean):Source[]{return sources.map(source=>({...source,enabled}));}
