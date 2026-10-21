import {Play,Layers,Heart} from 'lucide-react';
import type {Video,VideoGroup,HistoryEntry} from '../../../../packages/core/src/types.ts';
export function Poster({video}:{video:Video}){
 return <div className="poster-art">{video.poster?<img src={video.poster} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}}/>:null}<span className="poster-letter">{video.name.slice(0,1)}</span></div>;
}
export default function VideoCard({group,onOpen,history,favorite}:{group:VideoGroup;onOpen:(video:Video)=>void;history?:HistoryEntry;favorite?:boolean}){
 const v=group.items[0];
 return <button className="video-card" onClick={()=>onOpen(v)} aria-label={`打开 ${v.name}`}>
  <div className="poster-wrap"><Poster video={v}/><span className="poster-note">{v.note||v.category||'影视'}</span><span className="poster-play"><Play size={24} fill="currentColor"/></span>{favorite&&<span className="favorite-badge"><Heart size={14} fill="currentColor"/></span>}{history&&<div className="progress-track"><i style={{width:`${Math.min(100,history.duration?history.time/history.duration*100:0)}%`}}/></div>}</div>
  <h3>{v.name}</h3><p>{history?`${v.lines[history.line]?.episodes[history.episode]?.name||'继续观看'} · ${Math.floor(history.time/60)} 分钟`:[v.year,v.area].filter(Boolean).join(' · ')||'年份未知'}<span>{group.items.length>1?<><Layers size={12}/>{group.items.length} 个来源</>:v.source.name}</span></p>
 </button>;
}
