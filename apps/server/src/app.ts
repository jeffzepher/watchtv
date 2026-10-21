import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import {randomBytes} from 'node:crypto';
import {PassThrough,Readable} from 'node:stream';
import path from 'node:path';
import {parseSources,parseVod} from '../../../packages/core/src/index.ts';
import {fetchJson as realFetchJson,safeFetch,readText} from './upstream.ts';
import {createAuth} from './auth.ts';
import {createTickets,rewritePlaylist} from './media.ts';
import {searchSources,type FetchJson} from './search.ts';

export interface AppOptions {password?: string; secret?: string; staticRoot?: string; secureCookie?: boolean; fetchJson?: FetchJson; desktopToken?: string}
export async function createApp(options: AppOptions = {}) {
  const app=Fastify({bodyLimit:256*1024, logger:false, requestTimeout:30000});
  const auth=createAuth(options.password);const tickets=createTickets(options.secret||randomBytes(32).toString('hex'));
  const json=options.fetchJson||realFetchJson;
  let searches=0,mediaCount=0;
  await app.register(cookie);
  await app.register(rateLimit,{max:120,timeWindow:'1 minute'});
  app.addHook('onRequest',async(req,reply)=>{
    reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer').header('X-Frame-Options','DENY');
    reply.header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: data:; media-src 'self' blob: https: http:; connect-src 'self' https: http:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    if(req.url.startsWith('/api/')) {
      reply.header('Cache-Control','no-store');
      const origin=req.headers.origin;
      if(origin) {try{if(new URL(origin).host!==req.headers.host)return reply.code(403).send({error:'不允许跨站请求'});}catch{return reply.code(403).send({error:'无效来源'});}}
      if(req.headers['sec-fetch-site']==='cross-site')return reply.code(403).send({error:'不允许跨站请求'});
      if(!['/api/session','/api/login'].includes(req.url.split('?')[0])&&!auth.valid(req.cookies.watchtv_session))return reply.code(401).send({error:'请先输入访问密码'});
    }
  });
  app.setErrorHandler((error,req,reply)=>{
    const status=(error as any).statusCode;
    reply.code(status && status>=400&&status<500?status:400).send({error:error instanceof Error?error.message:'请求失败'});
  });
  app.get('/health',async()=>({ok:true,service:'watchtv',version:'0.1.0'}));
  app.get('/api/session',async(req)=>({authenticated:auth.valid(req.cookies.watchtv_session),required:auth.required}));
  app.post('/api/login',{config:{rateLimit:{max:8,timeWindow:'1 minute'}}},async(req,reply)=>{
    const token=auth.login((req.body as any)?.password);
    if(!token)return reply.code(401).send({error:'访问密码不正确'});
    reply.setCookie('watchtv_session',token,{httpOnly:true,sameSite:'strict',secure:options.secureCookie||false,path:'/',maxAge:7*86400});
    return {ok:true};
  });
  app.post('/api/logout',async(req,reply)=>{auth.logout(req.cookies.watchtv_session);reply.clearCookie('watchtv_session',{path:'/'});return {ok:true};});
  if(options.desktopToken) app.get('/desktop-auth',async(req,reply)=>{
    if((req.query as any).token!==options.desktopToken)return reply.code(403).send('Forbidden');
    const token=auth.login(options.password);
    if(token)reply.setCookie('watchtv_session',token,{httpOnly:true,sameSite:'strict',path:'/'});
    return reply.redirect('/');
  });
  app.post('/api/search',async(req,reply)=>{
    const body=req.body as any;
    if(typeof body?.keyword!=='string'||!body.keyword.trim()||body.keyword.length>100)throw new Error('请输入 1–100 字的关键词');
    const sources=parseSources(body.sources).filter(s=>s.enabled);
    if(!sources.length)throw new Error('请先启用至少一个来源');
    const page=Number(body.page)||1;if(!Number.isInteger(page)||page<1||page>10000)throw new Error('页码不正确');
    if(searches>=3)return reply.code(429).send({error:'搜索任务较多，请稍后再试'});
    searches++;
    const controller=new AbortController();const stream=new PassThrough();
    let finished=false;
    stream.on('close',()=>{if(!finished)controller.abort();});
    reply.type('text/event-stream').header('X-Accel-Buffering','no');
    void searchSources(sources,body.keyword.trim(),page,json,controller.signal,event=>{
      if(!stream.destroyed)stream.write(`data: ${JSON.stringify(event)}\n\n`);
    }).catch(()=>{}).finally(()=>{searches--;finished=true;stream.end();});
    return reply.send(stream);
  });
  app.post('/api/detail',async(req)=>{
    const {source:raw,id}=req.body as any;
    const [source]=parseSources([raw]);
    if(!['string','number'].includes(typeof id)||String(id).length>100)throw new Error('影片 ID 不正确');
    const url=new URL(source.url);url.searchParams.set('ac','videolist');url.searchParams.set('ids',String(id));
    const data=await json(url,AbortSignal.timeout(10000));
    const item=data.list?.find((i:any)=>String(i.vod_id)===String(id));
    if(!item)throw new Error('来源中未找到此影片');
    const video=parseVod(item,source);
    return {video,proxy:video.lines.map(line=>line.episodes.map(ep=>`/api/media?ticket=${encodeURIComponent(tickets.sign(ep.url))}`))};
  });
  app.post('/api/sources/test',async(req)=>{
    const [source]=parseSources([(req.body as any)?.source]);const start=Date.now();
    const url=new URL(source.url);url.searchParams.set('ac','videolist');
    const data=await json(url,AbortSignal.timeout(10000));
    if(!Array.isArray(data.list))throw new Error('接口未返回苹果 CMS JSON 列表');
    return {ok:true,ms:Date.now()-start,count:data.list.length,hasPlayUrls:data.list.some((i:any)=>!!i.vod_play_url)};
  });
  app.post('/api/subscriptions/import',async(req)=>{
    const url=new URL((req.body as any)?.url);
    return {sources:parseSources(await json(url,AbortSignal.timeout(10000)))};
  });
  app.get('/api/media',{config:{rateLimit:{max:3000,timeWindow:'1 minute'}}},async(req,reply)=>{
    if(mediaCount>=20)return reply.code(429).send({error:'媒体连接过多'});
    const url=new URL(tickets.verify((req.query as any)?.ticket||''));
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),120000);
    let released=false;mediaCount++;
    const release=()=>{if(!released){released=true;mediaCount--;clearTimeout(timeout);controller.abort();}};
    reply.raw.on('close',release);
    try{
      const range=req.headers.range;if(range&&!/^bytes=\d*-\d*$/.test(range))throw new Error('Range 格式不正确');
      const body=await safeFetch(url,{signal:controller.signal,headers:range?{Range:range}:{}});
      const type=String(body.headers['content-type']||'');
      const isHls=/mpegurl/i.test(type)||/\.m3u8$/i.test(url.pathname);
      reply.code(body.statusCode||200);
      if(isHls){
        const text=await readText(body,2*1024*1024);
        const base=new URL(body.url||url.href,url);
        return reply.type('application/vnd.apple.mpegurl').send(rewritePlaylist(text,base,target=>`/api/media?ticket=${encodeURIComponent(tickets.sign(target))}`));
      }
      const ext=path.extname(url.pathname).toLowerCase();
      const mediaTypes:Record<string,string>={'.ts':'video/mp2t','.mp4':'video/mp4','.m4s':'video/iso.segment','.aac':'audio/aac','.key':'application/octet-stream'};
      reply.type(mediaTypes[ext]||(/^(video|audio)\//i.test(type)?type:'application/octet-stream'));
      for(const name of ['content-range','accept-ranges','content-length'])if(body.headers[name])reply.header(name,body.headers[name]);
      return reply.send(body);
    }catch(e){release();throw e;}
  });
  if(options.staticRoot){
    await app.register(staticFiles,{root:path.resolve(options.staticRoot),wildcard:false});
    app.setNotFoundHandler((req,reply)=>{
      if(req.url.startsWith('/api/'))return reply.code(404).send({error:'接口不存在'});
      return reply.sendFile('index.html');
    });
  }
  return app;
}
