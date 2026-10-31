import fs from'node:fs/promises';import path from'node:path';import{zip}from'../editor/zip.ts';
const root=process.cwd();const files=new Map<string,Uint8Array>();
const folders=['src','content','editor','templates','scripts','tests','docs','.github','android','app'];
async function collect(relative:string){const full=path.join(root,relative);for(const e of await fs.readdir(full,{withFileTypes:true})){const p=relative+'/'+e.name;if(e.name==='build'||e.name==='.gradle'||e.name==='local.properties'||p.startsWith('android/app/src/main/assets/'))continue;if(e.isDirectory())await collect(p);else if(e.isFile())files.set(p,new Uint8Array(await fs.readFile(path.join(root,p))))}}
for(const folder of folders)await collect(folder);
for(const file of ['package.json','package-lock.json','tsconfig.json','vite.config.ts','capacitor.config.ts','index.html','.gitignore','README.md','build-apk.ps1','verify-apk.ps1','build.gradle','settings.gradle'])files.set(file,new Uint8Array(await fs.readFile(path.join(root,file))));
await fs.mkdir('dist',{recursive:true});await fs.writeFile('dist/elam-digital-library-source.zip',new Uint8Array(await zip(files).arrayBuffer()));console.log('Packaged '+files.size+' source files; excludes tools, caches, private keys, and local paths.');
