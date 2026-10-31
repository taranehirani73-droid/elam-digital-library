export const types=['article','reference','book','story','video','photo'] as const;
export const evidence=['موثّق','تفسير بحثي','رواية أدبية'] as const;
export type Category={id:string;name:string;description:string;cover:string;parentId:string|null};
export type Source={title:string;author:string;year:number|null;url:string;pages:string};
export type Item={id:string;slug:string;title:string;summary:string;cover:string;type:typeof types[number];categories:string[];tags:string[];author:string;publishedAt:string;updatedAt:string;body:string;sources:Source[];evidence:typeof evidence[number];status:'draft'|'published';videoUrl?:string;imageCredit?:string;imageLicense?:string;imageSource?:string};
export type Catalog={schemaVersion:1;items:Item[]};
export type Manifest={schemaVersion:1;version:string;catalog:string;categories:string;files:Record<string,string>};
export type Snapshot={source:string;version:string;checkedAt:string;items:Item[];categories:Category[];bodies:Record<string,string>;images:Record<string,Blob>};
const fail=(s:string):never=>{throw Error(s)};
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail('صيغة بيانات غير صالحة');
const str=(v:unknown,max=2000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max?v:fail('حقل نصي مطلوب أو أطول من الحد المسموح');
export const safePath=(v:unknown)=>{const s=str(v,250);if(!/^[a-zA-Z0-9][a-zA-Z0-9_./-]*\.(json|md|jpg|jpeg|png|webp)$/.test(s)||s.split('/').some(x=>x==='..'||x==='.'||!x))fail('مسار ملف غير آمن');return s};
export const https=(v:unknown)=>{const s=str(v);const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password)fail('الرابط يجب أن يكون HTTPS');return s};
const id=(v:unknown)=>{const s=str(v,100);if(!/^[a-z0-9][a-z0-9-]*$/.test(s))fail('المعرّف يجب أن يكون بحروف لاتينية صغيرة وأرقام وشرطة');return s};
const list=(v:unknown)=>Array.isArray(v)&&v.length<=2000?v:fail('قائمة غير صالحة');
const strings=(v:unknown)=>list(v).map(x=>str(x,150));
const date=(v:unknown)=>{const s=str(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)fail('تاريخ غير صالح');return s};
export function validateCategories(input:unknown):Category[]{
 const cats=list(input).map(value=>{const c=record(value);return {id:id(c.id),name:str(c.name,150),description:str(c.description),cover:c.cover?safePath(c.cover):'',parentId:c.parentId===null?null:id(c.parentId)}});
 const ids=new Set(cats.map(c=>c.id));if(ids.size!==cats.length)fail('معرّف قسم مكرر');
 for(const c of cats){let p:Category|undefined=c;const seen=new Set<string>();while(p){if(seen.has(p.id))fail('حلقة في الأقسام المتداخلة');seen.add(p.id);if(p.parentId&&!ids.has(p.parentId))fail('قسم أب غير موجود');p=cats.find(x=>x.id===p!.parentId)}}return cats;
}
export function validateCatalog(input:unknown,cats:Category[],publicOnly=true):Item[]{
 const doc=record(input);if(doc.schemaVersion!==1)fail('إصدار فهرس غير مدعوم');
 const items=list(doc.items).map(value=>{const x=record(value);const item:Item={id:id(x.id),slug:id(x.slug),title:str(x.title,250),summary:str(x.summary,1500),cover:x.cover?safePath(x.cover):'',type:types.includes(x.type as Item['type'])?x.type as Item['type']:fail('نوع محتوى غير صالح'),categories:strings(x.categories),tags:strings(x.tags),author:str(x.author,200),publishedAt:date(x.publishedAt),updatedAt:date(x.updatedAt),body:safePath(x.body),sources:list(x.sources).map(value=>{const s=record(value);return {title:str(s.title),author:str(s.author),year:s.year===null?null:typeof s.year==='number'&&Number.isInteger(s.year)&&s.year>0&&s.year<3000?s.year:fail('سنة مرجع غير صالحة'),url:https(s.url),pages:typeof s.pages==='string'?s.pages:fail('حقل الصفحات مطلوب؛ يمكن تركه فارغًا')}}),evidence:evidence.includes(x.evidence as Item['evidence'])?x.evidence as Item['evidence']:fail('تصنيف الدليل غير صالح'),status:x.status==='published'||x.status==='draft'?x.status:fail('حالة غير صالحة')};
 if(!item.body.endsWith('.md'))fail('المتن يجب أن يكون Markdown');
 if(item.cover&&!/\.(jpg|jpeg|png|webp)$/.test(item.cover))fail('غلاف غير صالح');
 if(!item.categories.length||item.categories.some(k=>!cats.some(c=>c.id===k)))fail('قسم مفقود أو غير موجود');
 if(publicOnly&&item.status!=='published')fail('الفهرس العام يحتوي مسودة');
 if(item.type==='story'&&item.evidence!=='رواية أدبية')fail('القصة الأدبية يجب أن تحمل تصنيف رواية أدبية');
 if(item.evidence==='موثّق'&&!item.sources.length)fail('المحتوى الموثق يحتاج مصدرًا');
 if(x.videoUrl){const u=new URL(https(x.videoUrl));if(!['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(u.hostname))fail('رابط فيديو غير مدعوم');item.videoUrl=u.href}
 for(const key of ['imageCredit','imageLicense','imageSource'] as const)if(x[key])item[key]=key==='imageSource'?https(x[key]):str(x[key]);
 return item});
 for(const key of ['id','slug'] as const)if(new Set(items.map(x=>x[key])).size!==items.length)fail('معرّف أو slug مكرر');return items;
}
export function validateManifest(input:unknown):Manifest{const m=record(input);if(m.schemaVersion!==1)fail('إصدار بيان غير مدعوم');const files=record(m.files);if(Object.keys(files).length>5000)fail('البيان كبير جدًا');for(const [p,h]of Object.entries(files)){safePath(p);if(typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h))fail('بصمة ملف غير صالحة')}const result={schemaVersion:1 as const,version:str(m.version,120),catalog:safePath(m.catalog),categories:safePath(m.categories),files:files as Record<string,string>};if(!files[result.catalog]||!files[result.categories])fail('ملفات الفهرس غير مكتملة');return result}
export const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
export function filterItems(items:Item[],cats:Category[],query:string,type:string,category:string,sort:string){const wanted=new Set([category]);let changed=true;while(changed){changed=false;for(const c of cats)if(c.parentId&&wanted.has(c.parentId)&&!wanted.has(c.id)){wanted.add(c.id);changed=true}}
 return items.filter(x=>(!type||x.type===type)&&(!category||x.categories.some(k=>wanted.has(k)))&&normalize([x.title,x.summary,x.author,...x.tags,...x.categories.map(k=>cats.find(c=>c.id===k)?.name||'')].join(' ')).includes(normalize(query))).sort((a,b)=>sort==='alpha'?a.title.localeCompare(b.title,'ar'):b.publishedAt.localeCompare(a.publishedAt));}
