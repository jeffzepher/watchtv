export async function startPlayback(video:Pick<HTMLVideoElement,'play'>):Promise<boolean>{
  try{await video.play();return true;}catch{return false;}
}
