const {spawnSync}=require('node:child_process');const path=require('node:path');
const result=spawnSync(process.execPath,['--import','tsx',path.join(__dirname,'content.ts'),process.argv[2]||'validate'],{cwd:path.resolve(__dirname,'..'),stdio:'inherit'});process.exit(result.status??1);
