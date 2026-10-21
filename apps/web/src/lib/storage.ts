import {openDB,type DBSchema} from 'idb';
import type {HistoryEntry,Video} from '../../../../packages/core/src/types.ts';
interface Library extends DBSchema { history:{key:string;value:HistoryEntry}; favorites:{key:string;value:Video} }
const db=()=>openDB<Library>('watchtv-library',1,{upgrade(db){db.createObjectStore('history',{keyPath:'key'});db.createObjectStore('favorites',{keyPath:'key'});}});
export async function listHistory(){return (await(await db()).getAll('history')).sort((a,b)=>b.updatedAt-a.updatedAt);}
export async function listFavorites(){return (await(await db()).getAll('favorites')).reverse();}
export async function saveProgress(record:HistoryEntry){await(await db()).put('history',record);}
export async function setFavorite(video:Video,on:boolean){const d=await db();if(on)await d.put('favorites',video);else await d.delete('favorites',video.key);}
export async function removeHistory(key:string){await(await db()).delete('history',key);}
export async function restoreLibrary(history:HistoryEntry[],favorites:Video[]){
 const d=await db();const tx=d.transaction(['history','favorites'],'readwrite');
 for(const h of history)await tx.objectStore('history').put(h);
 for(const v of favorites)await tx.objectStore('favorites').put(v);
 await tx.done;
}
