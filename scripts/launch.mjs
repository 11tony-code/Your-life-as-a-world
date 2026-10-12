import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const folder=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(new URL('../dist/index.html',import.meta.url))){console.error('未找到编译后的应用。请先运行 npm install 和 npm run build。');process.exit(1);}
const app=spawn(process.execPath,[fileURLToPath(new URL('../server/index.mjs',import.meta.url))],{cwd:folder,stdio:['inherit','pipe','inherit','ipc']});
app.stdout.pipe(process.stdout);
let opened = false;
app.on('message', message => {
  if (opened || message?.type !== 'ready' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(message.url)) return;
  opened = true;
  console.log(message.reused
    ? '应用已在运行，正在重新打开浏览器。此窗口可以关闭；保留原来的启动窗口。'
    : '正在打开浏览器。使用期间请保留此窗口，关闭此窗口即可停止应用。');
  console.log(`浏览器未显示时，请直接访问：${message.url}`);
  if (process.platform === 'win32' && process.env.ECHO_ATLAS_NO_BROWSER !== '1') {
    const browser = spawn('explorer.exe', [message.url], { windowsHide: true, stdio: 'ignore' });
    browser.on('error', () => console.error(`请手动打开浏览器访问 ${message.url}`));
    browser.unref();
  }
});
app.on('error', error => { console.error(`启动失败：${error.message}`); process.exitCode = 1; });
app.on('exit', code => { process.exitCode = code ?? 0; });
process.on('SIGINT', () => app.kill());
process.on('SIGTERM', () => app.kill());
