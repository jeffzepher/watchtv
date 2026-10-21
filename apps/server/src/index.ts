import {createApp} from './app.ts';
import path from 'node:path';
const host=process.env.HOST||'127.0.0.1';
if(host!=='127.0.0.1'&&host!=='::1'&&!process.env.APP_PASSWORD)throw new Error('非本机监听必须设置 APP_PASSWORD');
const app=await createApp({password:process.env.APP_PASSWORD,secret:process.env.SESSION_SECRET,secureCookie:process.env.COOKIE_SECURE==='true',staticRoot:path.resolve('dist/web')});
const address=await app.listen({host,port:Number(process.env.PORT||3210)});
console.log(`WatchTV: ${address}`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,async()=>{await app.close();process.exit(0);});
