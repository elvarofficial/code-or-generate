import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
import { serve } from 'file:///D:/elvar/cog-runs/server.mjs';
import fs from 'fs';
const S=process.argv[2]; fs.copyFileSync(S+'/page.html','D:/elvar/cog-runs/05-wolf-walk/_page.html'); fs.copyFileSync(S+'/05-wolf.orig.js','D:/elvar/cog-runs/05-wolf-walk/_orig.js');
const srv=await serve(8771); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:300}});
p.on('console',m=>console.log('console:',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
async function load(m){ await p.goto('http://localhost:8771/05-wolf-walk/_page.html?m='+m); await p.waitForFunction('window.ready',null,{timeout:20000}); }
await load('/05-wolf-walk/_orig.js'); await p.evaluate('render()'); await p.screenshot({path:S+'/out/orig.png'});
await load('/05-wolf-walk/route-a/05-wolf.js');
await p.evaluate('render()'); await p.screenshot({path:S+'/out/rest.png'});
await p.evaluate(()=>{for(let i=0;i<120;i++)wolf.userData.update(1/30)}); await p.evaluate('render()'); await p.screenshot({path:S+'/out/idle4s.png'});
await p.evaluate(()=>wolf.userData.play('walk'));
await p.evaluate(()=>{for(let i=0;i<30;i++)wolf.userData.update(1/30)});
const ys=[];
for(let f=0;f<8;f++){ await p.evaluate(()=>{for(let i=0;i<4;i++)wolf.userData.update(1.05/32)}); await p.evaluate('render()'); await p.screenshot({path:S+`/out/walk${f}.png`}); ys.push(await p.evaluate('pawMinY()')); }
console.log('paw minY per frame', JSON.stringify(ys));
await p.evaluate(()=>wolf.userData.play('idle')); await p.evaluate(()=>{for(let i=0;i<30;i++)wolf.userData.update(1/30)}); console.log('back idle', JSON.stringify(await p.evaluate('pawMinY()')));
await b.close(); srv.close(); fs.unlinkSync('D:/elvar/cog-runs/05-wolf-walk/_page.html'); fs.unlinkSync('D:/elvar/cog-runs/05-wolf-walk/_orig.js');
