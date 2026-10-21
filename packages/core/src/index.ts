export * from './types.ts';
export function preferredLine(lines: import('./types.ts').PlayLine[]): number {
  const index=lines.findIndex(l=>l.episodes.some(e=>/\.(m3u8|mp4|webm|m4v)(?:\?|$)/i.test(e.url)));
  return index<0?0:index;
}
import type { Source, Video, VideoGroup } from './types.ts';

export function httpUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) throw new Error('地址格式不正确');
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.hash) throw new Error('仅支持无凭证的 HTTP(S) 地址');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('来源仅支持标准 HTTP(S) 端口');
  return u.href.replace(/\/$/, '');
}
export function parseSources(input: unknown): Source[] {
  const list = Array.isArray(input) ? input : (input as { sources?: unknown })?.sources;
  if (!Array.isArray(list)) throw new Error('需要包含 sources 的 JSON 或源数组；不支持 Spider 配置');
  if (list.length > 50) throw new Error('最多导入 50 个来源');
  const seen = new Set<string>();
  return list.map((s: any) => {
    if (!s || typeof s !== 'object') throw new Error('来源格式不正确');
    const url = httpUrl(s.url);
    const name = typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 80) : new URL(url).hostname;
    return { name, url, enabled: s.enabled !== false };
  }).filter(s => !seen.has(s.url) && !!seen.add(s.url));
}
const str = (v: unknown) => typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
export function parseVod(item: any, source: Source): Video {
  if (!item || !str(item.vod_id) || !str(item.vod_name)) throw new Error('来源返回的影片缺少 ID 或片名');
  const names = str(item.vod_play_from).split('$$$');
  const lines = str(item.vod_play_url).split('$$$').map((line, i) => ({
    name: names[i] || `线路 ${i + 1}`,
    episodes: line.split('#').flatMap((entry, j) => {
      const split = entry.indexOf('$');
      const name = split < 0 ? `第 ${j + 1} 集` : entry.slice(0, split);
      const raw = split < 0 ? entry : entry.slice(split + 1);
      try { return [{ name: name || `第 ${j + 1} 集`, url: httpUrl(raw) }]; } catch { return []; }
    }),
  })).filter(line => line.episodes.length);
  let poster = ''; try { poster = httpUrl(item.vod_pic); } catch { /* absent image */ }
  return {
    key: `${source.url}::${str(item.vod_id)}`, id: str(item.vod_id), name: str(item.vod_name),
    year: str(item.vod_year), category: str(item.type_name), area: str(item.vod_area),
    note: str(item.vod_remarks), poster, director: str(item.vod_director), actors: str(item.vod_actor),
    description: str(item.vod_content).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').slice(0, 15000), source, lines,
  };
}
export function groupVideos(videos: Video[]): VideoGroup[] {
  const map = new Map<string, VideoGroup>();
  for (const video of videos) {
    const title = video.name.normalize('NFKC').replace(/\s/g, '').toLowerCase();
    const key = video.year && video.category ? `${title}|${video.year}|${video.category}` : video.key;
    if (!map.has(key)) map.set(key, { key, name: video.name, items: [] });
    const group = map.get(key)!;
    if (!group.items.some(v => v.key === video.key)) group.items.push(video);
  }
  return [...map.values()];
}

export function episodeIndexByName(name: string, names: string[]): number {
  const normal = (s: string) => s.normalize('NFKC').replace(/\s/g, '').replace(/第0*(\d+)集/, '$1').replace(/^0+(\d+)$/, '$1');
  const matches = names.map((n, i) => normal(n) === normal(name) ? i : -1).filter(i => i >= 0);
  return matches.length === 1 ? matches[0] : -1;
}
