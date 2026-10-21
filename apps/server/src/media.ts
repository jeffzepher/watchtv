import {createHmac, timingSafeEqual} from 'node:crypto';
import {httpUrl} from '../../../packages/core/src/index.ts';

export function createTickets(secret: string, now = Date.now) {
  const mac = (value: string) => createHmac('sha256', secret).update(value).digest('base64url');
  return {
    sign(url: string, ttl = 12 * 60 * 60 * 1000): string {
      const data = Buffer.from(JSON.stringify({url:httpUrl(url),exp:now()+ttl})).toString('base64url');
      return `${data}.${mac(data)}`;
    },
    verify(ticket: string): string {
      const [data,sig] = ticket.split('.');
      if (!data || !sig || ticket.length > 12000) throw new Error('播放凭证无效');
      const expected = Buffer.from(mac(data)); const actual = Buffer.from(sig);
      if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw new Error('播放凭证无效');
      const payload = JSON.parse(Buffer.from(data,'base64url').toString());
      if (typeof payload.exp !== 'number' || payload.exp <= now()) throw new Error('播放凭证已过期，请重新打开影片');
      return httpUrl(payload.url);
    },
  };
}
export function rewritePlaylist(text: string, base: URL, proxy: (url: string)=>string): string {
  if (!text.trimStart().startsWith('#EXTM3U')) throw new Error('不是有效的 HLS 播放列表');
  const rewrite = (uri: string) => proxy(httpUrl(new URL(uri,base).href));
  return text.split(/\r?\n/).map(line => {
    if (!line.trim()) return line;
    if (!line.startsWith('#')) return rewrite(line.trim());
    return line.replace(/URI="([^"]+)"/g, (_all,uri) => `URI="${rewrite(uri)}"`);
  }).join('\n');
}
