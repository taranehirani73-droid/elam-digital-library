import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
import {resolve} from 'node:path';
export default defineConfig(({mode})=>({base:'./',publicDir:mode==='editor'?false:'public',server:{watch:{ignored:['**/.build-tools/**','**/android/**','**/build/**','**/dist/**','**/app/**']}},plugins:[tailwindcss()],build:{outDir:mode==='editor'?'build/editor':'www',rollupOptions:{input:resolve(__dirname,mode==='editor'?'editor/index.html':'index.html')}}}));
