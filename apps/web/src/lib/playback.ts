export async function startPlayback(video:Pick<HTMLVideoElement,'play'>):Promise<boolean>{
  try{await video.play();return true;}catch{return false;}
}
export function playbackFailure(url:string,status?:number,detail=''):string {
 const upstream=detail.match(/上游返回 HTTP (\d{3})/);
 if(upstream||status===403||status===404)return `片源服务器返回 HTTP ${upstream?.[1]||status}，此播放地址被拒绝或已失效，请切换线路或来源。`;
 if(/\/share\/|\.html?(?:\?|$)/i.test(url))return '这条线路提供的是网页播放器地址，无法直接播放，请切换到 m3u8 / MP4 线路。';
 return '媒体加载失败，可能是网络连接、跨域限制或编码不受支持，请重试或切换线路。';
}
