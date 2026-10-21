export async function api<T=any>(url:string,body?:unknown,signal?:AbortSignal):Promise<T>{
  const res=await fetch(url,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal});
  const data=await res.json();
  if(!res.ok){if(res.status===401)window.dispatchEvent(new Event('session-expired'));throw new Error(data.error||'请求失败');}
  return data;
}
export function downloadJson(data:unknown,name:string){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
