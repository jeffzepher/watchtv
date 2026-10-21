import {useEffect,useRef,useState} from 'react';
import Hls from 'hls.js';
import {ArrowRight,RefreshCw} from 'lucide-react';
import type {Video,HistoryEntry} from '../../../../packages/core/src/types.ts';
import {saveProgress} from '../lib/storage.ts';
import {startPlayback,playbackFailure} from '../lib/playback.ts';

export default function Player({video,line,episode,proxy,initialTime,onEpisode,onSaved,onError}:{video:Video;line:number;episode:number;proxy:string[][];initialTime:number;onEpisode:(i:number)=>void;onSaved:()=>void;onError:(message:string)=>void}){
 const ref=useRef<HTMLVideoElement>(null);const [useProxy,setUseProxy]=useState(false);const [error,setError]=useState('');const [speed,setSpeed]=useState(1);const [auto,setAuto]=useState(true);
 const current=video.lines[line]?.episodes[episode];const last=useRef(0);const [attempt,setAttempt]=useState(0);
 useEffect(()=>{setUseProxy(false);setError('');},[video.key,line,episode]);
 useEffect(()=>{
  const el=ref.current;if(!el||!current)return;
  let hls:Hls|undefined;let alive=true;let completed=false;
  const src=useProxy?proxy[line]?.[episode]:current.url;
  if(!src){setError('此线路没有可用的播放地址');return;}
  const fail=(status?:number,detail='')=>{if(!alive)return;if(!useProxy&&proxy[line]?.[episode])setUseProxy(true);else setError(playbackFailure(current.url,status,detail));};
  const mediaError=()=>fail();
  const ready=()=>{if(initialTime>0&&Number.isFinite(el.duration))el.currentTime=Math.min(initialTime,Math.max(0,el.duration-2));el.playbackRate=speed;void startPlayback(el);};
  el.addEventListener('loadedmetadata',ready);el.addEventListener('error',mediaError);
  if(/\.m3u8(?:\?|$)/i.test(current.url)||useProxy&&/m3u8/i.test(current.url)){
   if(Hls.isSupported()){
    hls=new Hls({maxBufferLength:30,maxMaxBufferLength:60});hls.loadSource(src);hls.attachMedia(el);
    hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)fail(data.response?.code,typeof data.response?.data==='string'?data.response.data:'');});
   }else if(el.canPlayType('application/vnd.apple.mpegurl'))el.src=src;
   else setError('当前浏览器不支持 HLS，请使用新版浏览器');
  }else el.src=src;
  const persist=()=>{
   if(!Number.isFinite(el.currentTime)||el.currentTime<=0)return;
   const record:HistoryEntry={key:video.key,video,line,episode,time:el.currentTime,duration:Number.isFinite(el.duration)?el.duration:0,updatedAt:Date.now()};
   void saveProgress(record).then(()=>{if(!completed)onSaved();}).catch(()=>onError('无法保存播放进度，请检查浏览器存储权限'));
  };
  const tick=()=>{if(Date.now()-last.current>5000){last.current=Date.now();persist();}};
  const hide=()=>{if(document.hidden)persist();};
  el.addEventListener('timeupdate',tick);el.addEventListener('pause',persist);document.addEventListener('visibilitychange',hide);
  return()=>{persist();completed=true;alive=false;el.removeEventListener('error',mediaError);el.removeEventListener('loadedmetadata',ready);el.removeEventListener('timeupdate',tick);el.removeEventListener('pause',persist);document.removeEventListener('visibilitychange',hide);hls?.destroy();el.removeAttribute('src');el.load();};
 // Changing speed or callback identity must not restart the current media.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[video.key,line,episode,useProxy,current?.url,attempt]);
 useEffect(()=>{if(ref.current)ref.current.playbackRate=speed;},[speed]);
 const next=episode+1<video.lines[line].episodes.length;
 return <div className="player-block"><div className="player-screen"><video ref={ref} controls playsInline preload="metadata" onEnded={()=>{if(auto&&next)onEpisode(episode+1);}}/>{error&&<div className="player-error"><p>{error}</p><button onClick={()=>{setError('');setAttempt(n=>n+1);}}><RefreshCw size={16}/>重试播放</button></div>}</div>
 <div className="player-tools"><span className="live-dot"/ ><span>{current?.name} <small>· {useProxy?'兼容播放':'直接播放'}</small></span><div className="player-tools-right"><label className="auto-toggle"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>自动连播</label><select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[0.5,0.75,1,1.25,1.5,2].map(s=><option key={s} value={s}>{s}×</option>)}</select><button disabled={!next} onClick={()=>onEpisode(episode+1)}>下一集<ArrowRight size={15}/></button></div></div></div>;
}
