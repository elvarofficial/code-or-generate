import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='D:/elvar/cog-runs';
const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.png':'image/png'};
export function serve(port=8765){ return new Promise(r=>{ const s=http.createServer((q,res)=>{ const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0])); fs.readFile(p,(e,d)=>{ if(e){res.writeHead(404);res.end();return;} res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'}); res.end(d);});}); s.listen(port,()=>r(s));});}
