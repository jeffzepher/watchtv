import {useEffect,useRef,useState} from 'react';
import {Search,Home,Heart,History,Settings2,ArrowUpRight,ArrowRight,Play,Radio,Film,LoaderCircle,LogOut,X,ShieldCheck,MonitorPlay,ChevronRight,Bookmark,Pause} from 'lucide-react';
import {groupVideos,parseSources} from '../../../packages/core/src/index.ts';
import type {Source,Video,HistoryEntry} from '../../../packages/core/src/types.ts';
import {api} from './lib/api.ts';
import {SseDecoder,mergeVideos,searchRequestForPage,type SearchRequest} from './lib/state.ts';
import {listHistory,listFavorites,setFavorite,removeHistory} from './lib/storage.ts';
import VideoCard from './components/VideoCard.tsx';
import Detail from './components/Detail.tsx';
import Discovery from './components/Discovery.tsx';
import SourceManager from './components/SourceManager.tsx';
import {searchSourceView} from './lib/source-view.ts';

type Page='home'|'search'|'favorites'|'history'|'sources';
const NAV=[{id:'home',name:'发现',icon:Home},{id:'favorites',name:'我的收藏',icon:Heart},{id:'history',name:'观看历史',icon:History},{id:'sources',name:'来源管理',icon:Settings2}] as const;
export default function App(){
 const [session,setSession]=useState<boolean|null>(null);const [passwordRequired,setPasswordRequired]=useState(false);const [password,setPassword]=useState('');const [loginError,setLoginError]=useState('');const [logging,setLogging]=useState(false);
 const [page,setPage]=useState<Page>('home');const [sources,setSources]=useState<Source[]>(()=>{try{return parseSources(JSON.parse(localStorage.getItem('watchtv-sources')||'[]'));}catch{return [];}});
 const [query,setQuery]=useState('');const [searched,setSearched]=useState('');const [results,setResults]=useState<Video[]>([]);const [searching,setSearching]=useState(false);const [sourceFilter,setSourceFilter]=useState('');const [searchError,setSearchError]=useState('');const [searchPage,setSearchPage]=useState(1);const [hasMore,setHasMore]=useState(false);
 const [history,setHistory]=useState<HistoryEntry[]>([]);const [favorites,setFavorites]=useState<Video[]>([]);const [selected,setSelected]=useState<Video|null>(null);const [toast,setToast]=useState('');
 const searchController=useRef<AbortController|null>(null);const searchSeq=useRef(0);const toastTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const input=useRef<HTMLInputElement>(null);
 const lastSearch=useRef<SearchRequest|null>(null);const [searchSources,setSearchSources]=useState<Source[]>([]);
 const enabled=sources.filter(s=>s.enabled);const groups=groupVideos(results);
 const sourceView=searchSourceView(searchSources,results,sourceFilter);const visibleGroups=groupVideos(sourceView.videos);
 function notify(message:string){setToast(message);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),5000);}
 async function refresh(){try{const [h,f]=await Promise.all([listHistory(),listFavorites()]);setHistory(h);setFavorites(f);}catch{notify('浏览器存储不可用，收藏与历史暂时无法保存');}}
 function updateSources(next:Source[]){try{localStorage.setItem('watchtv-sources',JSON.stringify(next));setSources(next);}catch{notify('无法保存来源配置，请检查浏览器存储权限');}}
 useEffect(()=>{api('/api/session').then(data=>{setSession(data.authenticated);setPasswordRequired(data.required);}).catch(()=>{setSession(false);setLoginError('暂时无法连接服务，请刷新重试');});void refresh();const expired=()=>{setSelected(null);setSession(false);};window.addEventListener('session-expired',expired);return()=>{searchController.current?.abort();clearTimeout(toastTimer.current);window.removeEventListener('session-expired',expired);};},[]);
 async function login(e:React.FormEvent){e.preventDefault();setLogging(true);setLoginError('');try{await api('/api/login',{password});setSession(true);setPassword('');}catch(e){setLoginError((e as Error).message);}finally{setLogging(false);}}
 async function toggleFavorite(v:Video){try{await setFavorite(v,!favorites.some(f=>f.key===v.key));await refresh();}catch{notify('无法保存收藏');}}
 async function search(nextPage=1,keyword=query){
  if(nextPage===1&&!keyword.trim())return;
  if(nextPage===1&&!enabled.length){setPage('sources');notify('先添加并启用一个来源，就可以开始搜索');return;}
  const submission=searchRequestForPage(keyword,enabled,nextPage,lastSearch.current);lastSearch.current=submission;setSearchSources(submission.sources);
  searchController.current?.abort();const controller=new AbortController();searchController.current=controller;const seq=++searchSeq.current;
  setPage('search');setSearched(submission.keyword);setSearching(true);setSearchError('');setHasMore(false);setSearchPage(nextPage);if(nextPage===1){setResults([]);setSourceFilter('');}
  try{
   const res=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(submission),signal:controller.signal});
   if(!res.ok){if(res.status===401)setSession(false);throw new Error((await res.json()).error||'搜索失败');}
   const reader=res.body!.getReader();const decoder=new TextDecoder();const events=new SseDecoder();
   while(true){const {done,value}=await reader.read();if(done)break;if(seq!==searchSeq.current)break;
    for(const event of events.push(decoder.decode(value,{stream:true}))){if(event.type==='result'){setResults(prev=>mergeVideos(prev,event.videos||[]));if((event.pagecount||1)>nextPage)setHasMore(true);}}
   }
  }catch(e){if(!controller.signal.aborted&&seq===searchSeq.current)setSearchError((e as Error).message);}finally{if(seq===searchSeq.current)setSearching(false);}
 }
 function navigate(next:Page){setPage(next);}
 const historyGroups=history.map(h=>({key:h.video.key,name:h.video.name,items:[h.video]}));
 if(session===null)return <div className="boot"><img src="/icon.svg" alt=""/><LoaderCircle className="spin"/><span>准备好一个好故事</span></div>;
 if(!session)return <main className="login-page"><div className="login-card"><a className="brand" href="/"><img src="/icon.svg" alt=""/>Watch<span>TV</span></a><span className="eyebrow">YOUR PRIVATE CINEMA</span><h1>好故事，<br/>只等你入座。</h1><p>输入访问密码，打开你的私人影院。</p><form onSubmit={login}><label htmlFor="password">访问密码</label><input id="password" autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required placeholder="输入你的访问密码"/><button className="primary" disabled={logging}>{logging?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>}进入影院</button></form>{loginError&&<p className="error-text" role="alert">{loginError}</p>}<div className="login-foot"><ShieldCheck size={14}/>仅供个人使用 · 数据保存在本机</div></div><div className="login-orbit" aria-hidden="true"/></main>;
 return <div className="app-shell catalog-shell"><div className="main-shell"><header className="catalog-topbar"><button className="brand" onClick={()=>navigate('home')}><img src="/icon.svg" alt=""/>Watch<span>TV</span></button><form className="catalog-search top-search" onSubmit={e=>{e.preventDefault();void search();}}><Search size={16}/><input aria-label="搜索影片" placeholder="搜索电影、剧集、动漫…" value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit" aria-label="开始搜索"><ArrowRight size={15}/></button></form><nav>{NAV.map(({id,name,icon:Icon})=><button key={id} className={(page===id||id==='home'&&page==='search')?'active':''} onClick={()=>navigate(id)}><Icon size={17}/><span>{name}</span></button>)}</nav><span className="catalog-source-state"><span className={enabled.length?'live-dot':'idle-dot'}/>{enabled.length} 个来源</span>{passwordRequired&&<button className="icon-button" aria-label="退出登录" onClick={async()=>{await api('/api/logout',{});setSelected(null);setSession(false);}}><LogOut size={16}/></button>}</header>

 <main className="content">
 {page==='home'&&<Discovery onSearch={title=>{setQuery(title);void search(1,title);}}/>}
 {page==='search'&&<section><div className="page-heading"><div><span className="eyebrow">FIND YOUR NEXT STORY</span><h1>“{searched}”<span className="heading-dot">的搜索结果</span></h1><p>{searching?'正在从不同来源寻找故事…':`${visibleGroups.length} 部影片${sourceFilter?'，已按来源筛选':'，来自你的已启用来源'}`}</p></div>{searching&&<button onClick={()=>{searchController.current?.abort();setSearching(false);}}>停止搜索<X size={15}/></button>}</div>{sourceView.sources.length>0&&<div className="search-statuses source-filters" role="group" aria-label="按来源筛选"><button aria-pressed={!sourceFilter} className={!sourceFilter?'active':''} onClick={()=>setSourceFilter('')}>全部来源 <b>{groups.length} 部影片</b></button>{sourceView.sources.map(({source:s,count})=><button key={s.url} aria-pressed={sourceFilter===s.url} className={sourceFilter===s.url?'active':''} onClick={()=>setSourceFilter(s.url)}><Radio size={12}/><b>{s.name}</b>{count} 条结果</button>)}</div>}{searchError&&<div className="inline-error" role="alert">{searchError}</div>}{visibleGroups.length?<div className="video-grid">{visibleGroups.map(g=><VideoCard key={g.key} group={g} onOpen={setSelected} favorite={favorites.some(f=>f.key===g.items[0].key)}/>)}</div>:<div className="empty-state"><Film size={38}/><h3>{searching?'好故事正在路上':'暂时没有找到相关影片'}</h3><p>{searching?'搜索结果会逐步显示，无需等待全部来源。':'可以换个关键词，或在来源管理中检测和添加来源。'}</p>{!searching&&<button onClick={()=>navigate('sources')}>管理来源<ArrowRight size={16}/></button>}</div>}{hasMore&&!searching&&<div className="load-more"><button onClick={()=>void search(searchPage+1)}>加载更多<ArrowRight size={16}/></button></div>}</section>}
 {(page==='favorites'||page==='history')&&<section><div className="page-heading"><div><span className="eyebrow">{page==='favorites'?'SAVED FOR A GOOD DAY':'PICK UP YOUR STORY'}</span><h1>{page==='favorites'?'我的收藏':'观看历史'}<span className="heading-dot">.</span></h1><p>{page==='favorites'?'喜欢的故事，值得留一个位置。':'每一段故事，都记得你停下的地方。'}</p></div><span className="library-count">{page==='favorites'?favorites.length:history.length} 部影片</span></div>{(page==='favorites'?favorites:history).length?<div className="video-grid">{(page==='favorites'?favorites.map(v=>({key:v.key,name:v.name,items:[v]})):historyGroups).map((g,i)=><div key={g.key} className="library-item"><VideoCard group={g} history={page==='history'?history[i]:undefined} favorite={page==='favorites'} onOpen={setSelected}/><button className="remove-item" aria-label={`移除 ${g.name}`} onClick={async()=>{try{if(page==='favorites')await setFavorite(g.items[0],false);else await removeHistory(g.key);await refresh();}catch{notify('移除失败');}}}><X size={14}/></button></div>)}</div>:<div className="empty-state">{page==='favorites'?<Heart size={38}/>:<History size={38}/>}<h3>{page==='favorites'?'片单还空着，故事会来的':'还没有观看记录'}</h3><p>从发现页搜索一部影片，开启你的私人放映。</p><button onClick={()=>navigate('home')}>去发现<ArrowRight size={16}/></button></div>}</section>}
 {page==='sources'&&<SourceManager sources={sources} onChange={updateSources} notify={notify} onRestore={()=>void refresh()}/>}
 <footer className="site-footer"><span>WatchTV<span className="muted"> · 你的私人影院</span></span><span>仅聚合公开来源 · 不存储影视内容</span></footer></main></div>
 <nav className="mobile-nav">{NAV.map(({id,name,icon:Icon})=><button key={id} className={(page===id||id==='home'&&page==='search')?'active':''} onClick={()=>navigate(id)}><Icon size={20}/><span>{name}</span></button>)}</nav>
 {selected&&<Detail initial={selected} alternatives={groups.find(g=>g.items.some(v=>v.key===selected.key))?.items||[]} history={history} favorite={favorites.some(v=>v.key===selected.key)} onFavorite={v=>void toggleFavorite(v)} onClose={()=>{setSelected(null);void refresh();}} onSaved={()=>void refresh()} notify={notify}/>}
 {toast&&<div className="toast" role="status">{toast}<button className="icon-button" aria-label="关闭提示" onClick={()=>setToast('')}><X size={15}/></button></div>}
 </div>;
}
