const temple='<svg viewBox="0 0 240 180" role="img" aria-label="رسم توضيحي لزقورة"><circle cx="170" cy="45" r="29" fill="#ccb17c"/><path d="M15 155h210v-28H15zm25-28h160V99H40zm25-28h110V71H65zm25-28h60V43H90z" fill="#9e7950"/><path d="M110 155V71h20v84M15 141h210M40 113h160M65 85h110" stroke="#e6cfaa" fill="none" stroke-width="3"/></svg>';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=value=>String(value).normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
let category='الكل',onlySaved=false,saved=[];
try{const stored=JSON.parse(localStorage.getItem('elam-saved')||'[]');if(Array.isArray(stored))saved=stored.filter(id=>items.some(x=>x.id===id))}catch(e){}
const grid=document.getElementById('grid');
const categories=['الكل','مقالات','صور','فيديو','وثائق','كتب','المراجع'];
function reference(key){const s=sources[key];return `<li><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.title)} ↗</a><small>${escapeHTML(s.author)} · ${escapeHTML(s.language)}</small></li>`}
function credit(x){return x.credit?`<figcaption>${escapeHTML(x.credit)}<br><a href="${escapeHTML(x.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(x.license)}</a> · الملف دون تعديل</figcaption>`:''}
function render(){
 const q=normalize(document.getElementById('search').value.trim());
 document.querySelector('.filters').innerHTML=categories.map(t=>`<button class="${category===t?'active':''}" aria-pressed="${category===t}" data-category="${t}">${t}</button>`).join('');
 document.getElementById('heading').textContent=category==='المراجع'?'المصادر والمراجع':onlySaved?'محفوظاتي':category==='الكل'?'اكتشف تاريخ عيلام':category;
 if(category==='المراجع'){
  const refs=Object.entries(sources).filter(([key,s])=>normalize(s.title+' '+s.author+' '+s.kind).includes(q));
  document.getElementById('count').textContent=refs.length+' مراجع';
  grid.innerHTML=refs.length?refs.map(([key,s])=>`<article class="card"><div class="body"><span class="tag">${escapeHTML(s.kind)}</span><h3>${escapeHTML(s.title)}</h3><p>${escapeHTML(s.author)}</p><p>${escapeHTML(s.language)}</p><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">المصدر الأصلي ↗</a><p class="muted">تاريخ المراجعة: 31 أكتوبر 2026</p></div></article>`).join(''):'<p class="empty">لا توجد مراجع مطابقة للبحث.</p>';return;
 }
 const results=items.filter(x=>(category==='الكل'||x.type===category)&&(!onlySaved||saved.includes(x.id))&&normalize(x.title+' '+x.desc+' '+x.text+' '+x.refs.map(k=>sources[k].title).join(' ')).includes(q));
 document.getElementById('count').textContent=results.length+' مواد';
 grid.innerHTML=results.length?results.map(x=>`<article class="card"><div class="cover">${x.image?`<img src="${escapeHTML(x.image)}" alt="${escapeHTML(x.alt||x.title)}" loading="lazy" width="600" height="400">`:temple}<span class="caption">${escapeHTML(x.label||(x.type==='فيديو'?'رسم متحرك توضيحي':'نص عربي • قراءة دون اتصال'))}</span></div><div class="body"><span class="tag">${escapeHTML(x.type)} / عيلام</span><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.desc)}</p><div class="row"><button class="read" data-open="${x.id}">${x.type==='صور'?'شاهد الصورة':'اقرأ المادة'} ←</button><button class="save" data-save="${x.id}" aria-label="${saved.includes(x.id)?'إزالة من المحفوظات':'حفظ'}: ${escapeHTML(x.title)}" aria-pressed="${saved.includes(x.id)}">${saved.includes(x.id)?'♥ محفوظ':'♡ حفظ'}</button></div></div></article>`).join(''):'<p class="empty">لا توجد مواد مطابقة. جرّب قسمًا آخر أو كلمة بحث مختلفة.</p>';
}
function openArticle(id){
 const x=items.find(v=>v.id===id);if(!x)return;
 try{sessionStorage.setItem('elam-list',JSON.stringify({category,onlySaved,query:document.getElementById('search').value,scroll:window.scrollY}))}catch(e){}
 location.assign('article.html?id='+encodeURIComponent(id));
}
document.querySelector('.filters').onclick=e=>{if(e.target.dataset.category){category=e.target.dataset.category;render()}};
document.getElementById('search').oninput=render;
document.getElementById('favorites').onclick=function(){onlySaved=!onlySaved;if(onlySaved)category='الكل';this.setAttribute('aria-pressed',onlySaved);this.textContent=onlySaved?'← كل المواد':'♡ محفوظاتي';render()};
document.getElementById('explore').onclick=()=>document.getElementById('library').scrollIntoView({behavior:'smooth'});
grid.onclick=e=>{const id=e.target.dataset.save;if(id){saved=saved.includes(id)?saved.filter(v=>v!==id):[...saved,id];try{localStorage.setItem('elam-saved',JSON.stringify(saved))}catch(e){}render();grid.querySelector(`[data-save="${id}"]`)?.focus()}if(e.target.dataset.open)openArticle(e.target.dataset.open)};
document.getElementById('stats').textContent=items.length+' مادة عربية · '+photos.length+' صور حقيقية · '+Object.keys(sources).length+' مصدرًا';
try{const state=JSON.parse(sessionStorage.getItem('elam-list')||'null');if(state){if(categories.includes(state.category))category=state.category;onlySaved=state.onlySaved===true;document.getElementById('search').value=typeof state.query==='string'?state.query:'';document.getElementById('favorites').setAttribute('aria-pressed',onlySaved);document.getElementById('favorites').textContent=onlySaved?'← كل المواد':'♡ محفوظاتي';window.addEventListener('pageshow',()=>window.scrollTo(0,Number(state.scroll)||0),{once:true})}}catch(e){}
render();
