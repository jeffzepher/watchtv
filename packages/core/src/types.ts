export interface Source { name: string; url: string; enabled: boolean }
export interface Episode { name: string; url: string }
export interface PlayLine { name: string; episodes: Episode[] }
export interface Video {
  key: string; id: string; name: string; year: string; category: string;
  area: string; note: string; poster: string; description: string;
  director: string; actors: string; source: Source; lines: PlayLine[];
}
export interface VideoGroup { key: string; name: string; items: Video[] }
export interface SearchEvent { type: 'result' | 'error' | 'done'; source?: Source; videos?: Video[]; error?: string; pagecount?: number }
export interface HistoryEntry { key: string; video: Video; line: number; episode: number; time: number; duration: number; updatedAt: number }
export const CANDIDATES: Source[] = [
  { name: '暴风资源', url: 'https://bfzyapi.com/api.php/provide/vod', enabled: false },
  { name: '非凡资源', url: 'https://cj.ffzyapi.com/api.php/provide/vod', enabled: false },
  { name: '量子资源', url: 'https://cj.lziapi.com/api.php/provide/vod', enabled: false },
];
