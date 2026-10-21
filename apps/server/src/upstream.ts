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
async function resolveHostname(host:string,signal?:AbortSignal):Promise<Answer[]>{
  if(process.env.WATCHTV_PUBLIC_DNS!=='cloudflare')return lookup(host,{all:true});
  const cached=dnsCache.get(host);if(cached&&cached.expires>Date.now())return cached.answers;
  const url=new URL('https://cloudflare-dns.com/dns-query');url.searchParams.set('name',host);url.searchParams.set('type','A');
  const data=await new Promise<string>((resolve,reject)=>{
    const req=https.get(url,{signal,family:4,lookup:((_h:any,_o:any,cb:any)=>cb(null,'1.1.1.1',4)) as any,headers:{accept:'application/dns-json'},timeout:8000},async res=>{
      try{if(res.statusCode!==200){res.destroy();throw new Error('公共 DNS 暂不可用');}resolve(await readText(res,64*1024));}catch(e){reject(e);}
    });req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('公共 DNS 查询超时')));
  });
  const record=JSON.parse(data);
  const answers:Answer[]=(record.Answer||[]).filter((a:any)=>a.type===1).map((a:any)=>({address:String(a.data),family:4}));
  if(!answers.length)throw new Error('公共 DNS 未返回地址');
  if(dnsCache.size>=1000)dnsCache.clear();dnsCache.set(host,{expires:Date.now()+60000,answers});return answers;
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
