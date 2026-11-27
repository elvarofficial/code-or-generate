import http from 'http'; import fs from 'fs'; import path from 'path';
import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
const SP=process.argv[2], ROOT='D:/elvar/cog-runs';
const types={'.js':'text/javascript','.html':'text/html'};
const srv=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split('?')[0]); const p=u.startsWith('/check/')?path.join(SP,u):path.join(ROOT,u);
 fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(d);});});
await new Promise(r=>srv.listen(8791,r));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']}); const pg=await b.newPage();
pg.on('console',m=>console.log('console:',m.text())); pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('http://localhost:8791/check/page.html'); await pg.waitForFunction(()=>window.ready,null,{timeout:60000});
const jobs=[['walk',[0,0.325,0.65,0.975],['left','front','q','lowleft'],'walk'],['idle',[0,2,4,6],['left','front','q'],'idle']];
for(const [m,t,v,n] of jobs){ await pg.reload(); await pg.waitForFunction(()=>window.ready); const url=await pg.evaluate(([m,t,v])=>window.sheet(m,t,v),[m,t,v]);
 fs.writeFileSync(path.join(SP,'check',n+'.png'),Buffer.from(url.split(',')[1],'base64')); }
await b.close(); srv.close(); console.log('done');
