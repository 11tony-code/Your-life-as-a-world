import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const folder=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(new URL('../dist/index.html',import.meta.url))){console.error('未找到编译后的应用。请先运行 npm install 和 npm run build。');process.exit(1);}
const app=spawn(process.execPath,[fileURLToPath(new URL('../server/index.mjs',import.meta.url))],{cwd:folder,stdio:['inherit','pipe','inherit']});
app.stdout.on('data',data=>{
  process.stdout.write(data);
  const url=data.toString().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  if(url&&process.platform==='win32')spawn('explorer.exe',[url],{windowsHide:true,stdio:'ignore'});
});
app.on('exit',code=>{process.exitCode=code||0;});
process.on('SIGINT',()=>app.kill());
