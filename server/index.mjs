import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './guide.mjs';
import { startWorldServer } from './runtime.mjs';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
export const server=http.createServer(async(req,res)=>{
  if(req.url?.startsWith('/api/'))return handleApi(req,res);
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end('Forbidden');}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    const s=await stat(file);if(!s.isFile())throw new Error('Not a file');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':path.extname(file)==='.html'?'no-cache':'public, max-age=3600'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('未找到文件，请从应用主页进入。');}
});
try {
  const result = await startWorldServer(server, process.env.PORT || 4173);
  console.log(`${result.reused ? 'Echo Atlas is already running' : 'Echo Atlas is ready'}: ${result.url}`);
  if (process.send) process.send({ type: 'ready', ...result });
  if (result.reused && process.connected) process.disconnect();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
