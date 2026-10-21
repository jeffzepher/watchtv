import {useEffect,useState} from 'react';
import {RefreshCw,ArrowRight,Flame,Play} from 'lucide-react';
import {api} from '../lib/api.ts';
interface Item {id:string;title:string;cover:string;rate:string;note:string}
const CATEGORIES=[['tv','剧集'],['variety','综艺'],['movie','电影'],['animation','动漫'],['documentary','纪录片'],['children','儿童'],['short','短剧'],['us','美剧']] as const;
export default function Discovery({onSearch}:{onSearch:(s:string)=>void}){
 const [category,setCategory]=useState('tv');const [items,setItems]=useState<Item[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [status,setStatus]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setItems([]);setError('');setStatus('');
  api<{items:Item[]}>(`/api/recommendations?category=${category}${retry>0?'&refresh=1':''}`,undefined,controller.signal).then(data=>{if(!controller.signal.aborted){setItems(data.items);if(retry>0)setStatus('推荐已更新；上游榜单未变化时，片单可能相同。');}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[category,retry]);
 return <div className="discovery">
 <section className="discovery-library"><div className="discovery-filter-heading"><h2>分类浏览</h2><span>豆瓣热门 · 按推荐顺序</span></div><div className="discovery-tabs" role="tablist" aria-label="推荐分类">{CATEGORIES.map(([id,label])=><button key={id} role="tab" aria-selected={id===category} className={category===id?'active':''} onClick={()=>{setRetry(0);setCategory(id);}}>{label}</button>)}</div>
 <div className="discovery-section-heading"><h2><Flame size={18}/>热门{CATEGORIES.find(c=>c[0]===category)?.[1]}</h2><button className="text-button" disabled={loading} onClick={()=>setRetry(n=>n+1)}><RefreshCw size={14}/>{loading?'加载中…':'刷新推荐'}</button></div>
 <p className="recommendation-status" role="status">{status}</p>
 {loading?<div className="recommendation-grid" aria-label="正在加载热门推荐">{Array.from({length:20},(_,i)=><div key={i} className="recommendation-skeleton"><div/><i/></div>)}</div>:error?<div className="empty-state"><p role="alert">{error}</p><button onClick={()=>setRetry(n=>n+1)}>重新加载<RefreshCw size={15}/></button></div>:items.length?<div className="recommendation-grid">{items.map((item,index)=><button key={item.id} className="recommendation-card" onClick={()=>onSearch(item.title)} aria-label={`搜索 ${item.title}`}><div className="recommendation-poster">{item.cover&&<img src={item.cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}}/>}<span className="recommendation-placeholder">{item.title.slice(0,1)}</span><span className="recommendation-rank">{String(index+1).padStart(2,'0')}</span>{item.rate&&<span className="recommendation-rating">★ {item.rate}</span>}<span className="recommendation-play"><Play size={25} fill="currentColor"/></span></div><h3>{item.title}</h3><p>{item.note||'搜索可播放来源'}<ArrowRight size={12}/></p></button>)}</div>:<div className="empty-state">此分类暂时没有推荐影片，请稍后刷新或使用顶部搜索</div>}
 <p className="recommendation-credit">片单来源：豆瓣热门。顺序由上游推荐提供，评分仅在有数据时显示；点击影片搜索你的已启用来源。</p></section></div>;
}
