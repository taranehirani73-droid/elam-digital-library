import {validateManifest,validateCategories,validateCatalog,type Snapshot} from './model';
export function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('elam-library',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function readSnapshot():Promise<Snapshot|undefined>{const db=await database();try{return await new Promise((resolve,reject)=>{const t=db.transaction('snapshots'),r=t.objectStore('snapshots').get('active');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{db.close()}}
export async function writeSnapshot(value:Snapshot){const db=await database();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction('snapshots','readwrite');t.objectStore('snapshots').put(value,'active');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}finally{db.close()}}
export function contentBase(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('أدخل عنوان HTTPS لمجلد المحتوى دون معاملات أو بيانات دخول');return u.href.replace(/\/?$/,'/')}
async function bytes(url:string,max:number){const r=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store',credentials:'omit',redirect:'error'});if(!r.ok)throw Error('تعذر تحميل المحتوى ('+r.status+')');if(Number(r.headers.get('content-length'))>max)throw Error('ملف أكبر من الحد المسموح');const reader=r.body!.getReader();const chunks:Uint8Array[]=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('ملف كبير جدًا')}chunks.push(value)}const all=new Uint8Array(size);let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length}return all}
const json=(b:Uint8Array)=>JSON.parse(new TextDecoder().decode(b));
export async function downloadSnapshot(base:string,previous?:Snapshot,save=writeSnapshot):Promise<Snapshot>{
 const manifest=validateManifest(json(await bytes(base+'manifest.json',1024*1024)));
 if(previous?.source===base&&previous.version===manifest.version)return previous;
 let total=0;const buffers=new Map<string,Uint8Array>();
 async function verified(p:string){if(buffers.has(p))return buffers.get(p)!;if(!manifest.files[p])throw Error('ملف غير مسجل في البيان');const b=await bytes(base+p,/\.(png|jpg|jpeg|webp)$/.test(p)?5*1024*1024:2*1024*1024);total+=b.length;if(total>60*1024*1024)throw Error('حجم المجموعة يتجاوز 60 ميغابايت');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b as BufferSource)),v=>v.toString(16).padStart(2,'0')).join('');if(hash!==manifest.files[p])throw Error('بصمة ملف لا تطابق البيان؛ بقيت النسخة السابقة');buffers.set(p,b);return b}
 const cats=validateCategories(json(await verified(manifest.categories))),items=validateCatalog(json(await verified(manifest.catalog)),cats);
 const paths=[...new Set([...items.map(x=>x.body),...items.map(x=>x.cover),...cats.map(c=>c.cover)].filter(Boolean))];
 let cursor=0;await Promise.all(Array.from({length:Math.min(4,paths.length)},async()=>{while(cursor<paths.length)await verified(paths[cursor++])}));
 const snapshot:Snapshot={source:base,version:manifest.version,checkedAt:new Date().toISOString(),items,categories:cats,bodies:{},images:{}};
 for(const x of items){const body=new TextDecoder().decode(buffers.get(x.body));if(!body.trim())throw Error('متن فارغ');snapshot.bodies[x.id]=body}
 for(const p of paths.filter(p=>!p.endsWith('.md'))){const b=buffers.get(p)!;if(!((b[0]===255&&b[1]===216)||(b[0]===137&&b[1]===80)||(new TextDecoder().decode(b.slice(0,4))==='RIFF')))throw Error('صورة غير صالحة');snapshot.images[p]=new Blob([b as BlobPart],{type:p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':'image/jpeg'})}
 await save(snapshot);return snapshot;
}
