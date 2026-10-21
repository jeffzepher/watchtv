import {useEffect,useRef,useState} from 'react';
import {X,Heart,Play,ArrowLeft,LoaderCircle} from 'lucide-react';
import type {Video,HistoryEntry} from '../../../../packages/core/src/types.ts';
import {episodeIndexByName} from '../../../../packages/core/src/index.ts';
import {api} from '../lib/api.ts';
import {Poster} from './VideoCard.tsx';
import Player from './Player.tsx';

export default function Detail({initial,alternatives,history,favorite,onFavorite,onClose,onSaved,notify}:{initial:Video;alternatives:Video[];history:HistoryEntry[];favorite:boolean;onFavorite:(v:Video)=>void;onClose:()=>void;onSaved:()=>void;notify:(s:string)=>void}){
 const [video,setVideo]=useState(initial);const [proxy,setProxy]=useState<string[][]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const prior=history.find(h=>h.key===initial.key);const [line,setLine]=useState(0);const [episode,setEpisode]=useState(0);const [playing,setPlaying]=useState(false);const [resume,setResume]=useState(0);
 const matching=useRef<{name:string;time:number}|null>(null);const request=useRef(0);
 async function load(v:Video){const seq=++request.current;setLoading(true);setError('');
  try{const data=await api<{video:Video;proxy:string[][]}>('/api/detail',{source:v.source,id:v.id});if(seq!==request.current)return;
   setVideo(data.video);setProxy(data.proxy);setLine(0);setEpisode(0);setResume(0);
   const old=matching.current;matching.current=null;
   if(old){const index=episodeIndexByName(old.name,data.video.lines[0]?.episodes.map(e=>e.name)||[]);if(index>=0){setEpisode(index);setResume(old.time);}else{setPlaying(false);notify('新来源未匹配到同一集，请重新选择剧集');}}
   else if(v.key===initial.key&&prior){const episodes=data.video.lines[prior.line]?.episodes;if(episodes?.[prior.episode]){setLine(prior.line);setEpisode(prior.episode);setResume(prior.time);}}
  }catch(e){if(seq===request.current)setError((e as Error).message);}finally{if(seq===request.current)setLoading(false);}
 }
 useEffect(()=>{void load(initial);const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',key);const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{request.current++;document.body.style.overflow=before;document.removeEventListener('keydown',key);};},[initial.key]);
 function switchSource(v:Video){const current=video.lines[line]?.episodes[episode];if(playing&&current)matching.current={name:current.name,time:document.querySelector('video')?.currentTime||0};void load(v);}
 function choose(i:number){setEpisode(i);setResume(i===episode?resume:0);setPlaying(true);}
 return <div className="modal-backdrop" role="presentation"><section className={`detail-modal ${playing?'watching':''}`} role="dialog" aria-modal="true" aria-label={video.name}>
 <div className="modal-top"><span>{playing?'正在播放':'影片详情'}</span><button className="icon-button" onClick={onClose} aria-label="关闭详情"><X/></button></div>
 {loading?<div className="loading-state"><LoaderCircle className="spin"/>正在获取影片详情…</div>:error?<div className="empty-state"><p>{error}</p><button onClick={()=>void load(video)}>重新加载</button></div>:<>
 {playing&&video.lines[line]?.episodes[episode]?<Player video={video} line={line} episode={episode} proxy={proxy} initialTime={resume} onEpisode={i=>{setResume(0);setEpisode(i);}} onSaved={onSaved} onError={notify}/>:<div className="detail-intro"><div className="detail-poster"><Poster video={video}/></div><div><span className="eyebrow">{video.source.name}</span><h2>{video.name}</h2><p className="detail-meta">{[video.year,video.area,video.category,video.note].filter(Boolean).join(' / ')}</p><p className="credits">{video.director&&`导演：${video.director}`}<br/>{video.actors&&`主演：${video.actors}`}</p><p className="synopsis">{video.description||'此来源暂未提供简介。'}</p><div className="detail-actions"><button className="primary" disabled={!video.lines.length} onClick={()=>setPlaying(true)}><Play size={17} fill="currentColor"/>{resume>0?`继续观看 · ${Math.floor(resume/60)} 分钟`:'开始观看'}</button><button onClick={()=>onFavorite(video)}><Heart size={17} fill={favorite?'currentColor':'none'}/>{favorite?'已收藏':'加入收藏'}</button></div></div></div>}
 {playing&&<div className="watch-heading"><h2>{video.name}</h2><button className="text-button" onClick={()=>setPlaying(false)}><ArrowLeft size={14}/>影片信息</button></div>}
 <div className="source-choice"><span>播放来源</span><div>{[...new Map([video,...alternatives].map(v=>[v.key,v])).values()].map(v=><button key={v.key} className={v.key===video.key?'active':''} onClick={()=>v.key!==video.key&&switchSource(v)}>{v.source.name}</button>)}</div></div>
 {video.lines.length?<><div className="line-tabs">{video.lines.map((l,i)=><button className={line===i?'active':''} key={`${l.name}-${i}`} onClick={()=>{setLine(i);setEpisode(0);setResume(0);}}>{l.name}<span>{l.episodes.length} 集</span></button>)}</div><div className="episode-grid">{video.lines[line]?.episodes.map((ep,i)=><button className={i===episode?'selected':''} key={i} onClick={()=>choose(i)}>{ep.name}</button>)}</div></>:<div className="empty-state small">此来源未提供可直接播放的地址，请尝试其他来源。</div>}
 </>}
 </section></div>;
}
