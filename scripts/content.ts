import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {validateCategories,validateCatalog} from '../src/lib/model.ts';
const root=process.cwd(),source=path.join(root,'content');
const cats=validateCategories(JSON.parse(await fs.readFile(path.join(source,'categories.json'),'utf8')));
const all=validateCatalog(JSON.parse(await fs.readFile(path.join(source,'catalog.json'),'utf8')),cats,false);
const files=new Map<string,Buffer>();
for(const item of all){const body=await fs.readFile(path.join(source,item.body));if(!body.toString('utf8').trim())throw Error('Empty Markdown: '+item.id)}
for(const p of [...all.map(x=>x.cover),...cats.map(x=>x.cover)].filter(Boolean))await fs.access(path.join(source,p));
if(process.argv[2]==='publish'){
 const published=all.filter(x=>x.status==='published');validateCatalog({schemaVersion:1,items:published},cats);
 files.set('catalog.json',Buffer.from(JSON.stringify({schemaVersion:1,items:published},null,2)));files.set('categories.json',Buffer.from(JSON.stringify(cats,null,2)));
 for(const p of [...new Set([...published.flatMap(x=>[x.body,x.cover]),...cats.map(x=>x.cover)].filter(Boolean))])files.set(p,await fs.readFile(path.join(source,p)));
 const hashes=Object.fromEntries([...files].map(([p,b])=>[p,crypto.createHash('sha256').update(b).digest('hex')]));
 const version=crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
 const manifest=JSON.stringify({schemaVersion:1,version,catalog:'catalog.json',categories:'categories.json',files:hashes},null,2);
 for(const dir of [path.join(root,'public/content'),path.join(root,'build/pages/content')]){
  // Only this generated content directory is replaced, after all inputs validate.
  if(!dir.startsWith(root+path.sep))throw Error('Unsafe output');await fs.rm(dir,{recursive:true,force:true});await fs.mkdir(dir,{recursive:true});
  for(const [p,b]of files){await fs.mkdir(path.dirname(path.join(dir,p)),{recursive:true});await fs.writeFile(path.join(dir,p),b)}await fs.writeFile(path.join(dir,'manifest.json'),manifest);
 }
 console.log('Published '+published.length+' entries. Catalog version '+version.slice(0,12));
}else console.log('Validated '+all.length+' entries and '+cats.length+' categories.');
