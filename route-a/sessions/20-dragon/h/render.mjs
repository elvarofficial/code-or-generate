import http from 'http'; import fs from 'fs'; import path from 'path';
const { chromium } = await import('file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs');
const H=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
const P='D:/elvar/cog-runs/20-dragon';
const map=u=>u.startsWith('/node_modules/')?'D:/elvar/cog-runs'+u:u==='/'?H+'/page.html':P+u;
const types={'.js':'text/javascript','.html':'text/html','.png':'image/png'};
const s=http.createServer((q,res)=>{const p=map(decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(d);});});
await new Promise(r=>s.listen(8791,r));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage(); pg.on('console',m=>console.log('console:',m.text())); pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('http://localhost:8791/'); await pg.waitForFunction(()=>window.__out,null,{timeout:60000});
const o=await pg.evaluate(()=>window.__out);
const tag=process.argv[2]||'r';
for(const n of ['front','left','back']){fs.writeFileSync(`${H}/${tag}_${n}.png`,Buffer.from(o[n].split(',')[1],'base64'));fs.writeFileSync(`${H}/${tag}_${n}_full.png`,Buffer.from(o[n+'_full'].split(',')[1],'base64'));}
console.log('tris',o.tris,'box',JSON.stringify(o.box));
await b.close(); s.close();
