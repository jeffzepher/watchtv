import { lookup } from 'node:dns/promises';
import http, {type IncomingMessage} from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import {httpUrl} from '../../../packages/core/src/index.ts';

export function isPublicAddress(address: string): boolean {
  try {
    let ip = ipaddr.parse(address.replace(/^\[|\]$/g, ''));
    if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress()) ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === 'unicast';
  } catch { return false; }
}
type Answer = {address: string; family: number};
type Resolver = (host: string) => Promise<Answer[]>;
const dnsCache=new Map<string,{expires:number;answers:Answer[]}>();
function checkedAnswers(answers:Answer[]):Answer[]{
  if(!answers.length||answers.some(a=>!isPublicAddress(a.address)))throw new Error('禁止访问内网或保留地址');
  return answers;
}
export async function resolveWithFallback(host:string,system:Resolver,fallback:Resolver,signal?:AbortSignal):Promise<Answer[]>{
  signal?.throwIfAborted();
  let answers:Answer[];
  try{answers=await abortable(system(host),signal);}catch{
    signal?.throwIfAborted();
    return checkedAnswers(await abortable(fallback(host),signal));
  }
  // Only the benchmark range used by Fake-IP proxies is eligible for re-resolution.
  // Private addresses in real DNS records remain blocked without a fallback.
  const fake=(address:string)=>/^198\.(18|19)\./.test(address)&&ipaddr.isValid(address);
  if(answers.some(a=>fake(a.address))&&answers.every(a=>fake(a.address)||isPublicAddress(a.address)))
    return checkedAnswers(await abortable(fallback(host),signal));
  return checkedAnswers(answers);
}
async function queryPublicDns(host:string,provider:'alidns'|'cloudflare',signal?:AbortSignal):Promise<Answer[]>{
  const url=new URL(provider==='alidns'?'https://dns.alidns.com/resolve':'https://cloudflare-dns.com/dns-query');url.searchParams.set('name',host);url.searchParams.set('type','A');
  const requestSignal=AbortSignal.any([AbortSignal.timeout(3000),...(signal?[signal]:[])]);
  const data=await new Promise<string>((resolve,reject)=>{
    const req=https.get(url,{signal:requestSignal,family:4,lookup:pinnedLookup({address:provider==='alidns'?'223.5.5.5':'1.1.1.1',family:4}) as any,headers:{accept:'application/dns-json'}},async res=>{
      try{if(res.statusCode!==200){res.destroy();throw new Error('公共 DNS 暂不可用');}resolve(await readText(res,64*1024));}catch(e){reject(e);}
    });req.on('error',reject);
  });
  const record=JSON.parse(data);
  const answers:Answer[]=(record.Answer||[]).filter((a:any)=>a.type===1).map((a:any)=>({address:String(a.data),family:4}));
  return checkedAnswers(answers);
}
async function resolveHostname(host:string,signal?:AbortSignal):Promise<Answer[]>{
  const mode=process.env.WATCHTV_PUBLIC_DNS;
  const key=`${mode||'auto'}:${host}`;
  const cached=dnsCache.get(key);if(cached&&cached.expires>Date.now())return cached.answers;
  const fallback=async()=>{
    for(const provider of ['alidns','cloudflare'] as const){
      try{return await queryPublicDns(host,provider,signal);}catch{signal?.throwIfAborted();}
    }
    throw new Error('域名解析失败，请检查网络或代理 DNS 设置');
  };
  const answers=mode==='cloudflare'?await queryPublicDns(host,'cloudflare',signal):await resolveWithFallback(host,
    name=>abortable(lookup(name,{all:true}),AbortSignal.any([AbortSignal.timeout(3000),...(signal?[signal]:[])])),fallback,signal);
  if(dnsCache.size>=1000)dnsCache.clear();dnsCache.set(key,{expires:Date.now()+60000,answers});return answers;
}
export function pinnedLookup(answer: Answer) {
  return (_host: string, options: {all?: boolean}, callback: (...args: any[]) => void) => {
    if(options.all)callback(null,[answer]);else callback(null,answer.address,answer.family);
  };
}
export async function abortable<T>(promise:Promise<T>,signal?:AbortSignal):Promise<T>{
  if(!signal)return promise;
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason||new Error('请求已取消'));
    signal.addEventListener('abort',abort,{once:true});
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
}
export async function validateTarget(url: URL, resolve?: Resolver, signal?:AbortSignal): Promise<Answer> {
  httpUrl(url.href);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const answers = ipaddr.isValid(host) ? [{address: host, family: ipaddr.parse(host).kind() === 'ipv6' ? 6 : 4}] : await abortable(resolve?resolve(host):resolveHostname(host,signal),signal);
  signal?.throwIfAborted();
  if (!answers.length || answers.some(a => !isPublicAddress(a.address))) throw new Error('禁止访问内网或保留地址');
  return answers[0];
}
export async function safeFetch(url: URL, options: { signal?: AbortSignal; headers?: Record<string,string>; redirects?: number } = {}): Promise<IncomingMessage> {
  const address = await validateTarget(url,undefined,options.signal);
  options.signal?.throwIfAborted();
  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).get(url, {
      signal: options.signal, timeout: 10000,
      headers: {'User-Agent': 'Mozilla/5.0 WatchTV/0.1', 'Accept-Encoding':'identity', ...options.headers},
      // Pin the checked DNS answer to the actual TCP connection; keep hostname for TLS verification.
      lookup: pinnedLookup(address) as any,
    }, resolve);
    req.on('timeout', () => req.destroy(new Error('来源请求超时')));
    req.on('error', reject);
  });
  if ([301,302,303,307,308].includes(response.statusCode || 0)) {
    response.destroy();
    if ((options.redirects || 0) >= 4 || !response.headers.location) throw new Error('来源重定向次数过多');
    return safeFetch(new URL(response.headers.location, url), {...options, redirects:(options.redirects || 0)+1});
  }
  if ((response.statusCode || 500) >= 400) { response.destroy(); throw new Error(`上游返回 HTTP ${response.statusCode}`); }
  response.url=url.href;
  return response;
}
export async function readText(body: IncomingMessage, limit = 4 * 1024 * 1024): Promise<string> {
  const chunks: Buffer[] = []; let size = 0;
  try {
    for await (const chunk of body) {
      size += chunk.length;
      if (size > limit) throw new Error('来源响应超过大小限制');
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch(e) { body.destroy(); throw e; }
}
export async function fetchJson(url: URL, signal?: AbortSignal): Promise<any> {
  return JSON.parse(await readText(await safeFetch(url, {signal})));
}
