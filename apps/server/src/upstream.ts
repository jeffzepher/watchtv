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
export async function validateTarget(url: URL, resolve: Resolver = host => lookup(host, {all: true})): Promise<Answer> {
  httpUrl(url.href);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const answers = ipaddr.isValid(host) ? [{address: host, family: ipaddr.parse(host).kind() === 'ipv6' ? 6 : 4}] : await resolve(host);
  if (!answers.length || answers.some(a => !isPublicAddress(a.address))) throw new Error('禁止访问内网或保留地址');
  return answers[0];
}
export async function safeFetch(url: URL, options: { signal?: AbortSignal; headers?: Record<string,string>; redirects?: number } = {}): Promise<IncomingMessage> {
  const address = await validateTarget(url);
  options.signal?.throwIfAborted();
  const response = await new Promise<IncomingMessage>((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).get(url, {
      signal: options.signal, timeout: 10000,
      headers: {'User-Agent': 'Mozilla/5.0 WatchTV/0.1', 'Accept-Encoding':'identity', ...options.headers},
      // Pin the checked DNS answer to the actual TCP connection; keep hostname for TLS verification.
      lookup: (_host, _options, callback) => (callback as any)(null, address.address, address.family),
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
