import http from 'http'; import fs from 'fs'; import path from 'path';
import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
const ROOT='D:/elvar/cog-runs'; const OUT=process.argv[2]||'.'; const tag=process.argv[3]||'r';
const html=`<!doctype html><html><body style="margin:0"><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three'; import {createGoblin} from '/24-goblin/route-a/24-goblin.js';
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(1024,1024); r.setClearColor(0xffffff);
r.outputColorSpace=THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
const s=new THREE.Scene(); const g=createGoblin(); s.add(g);
let tris=0; const by={}; g.traverse(o=>{if(o.isMesh){const gg=o.geometry; const t=(gg.index?gg.index.count:gg.attributes.position.count)/3; tris+=t; by[gg.type]=(by[gg.type]||0)+t;}}); console.log(JSON.stringify(by));
s.add(new THREE.HemisphereLight(0xffffff,0x887766,1.6)); const d=new THREE.DirectionalLight(0xffffff,1.6); s.add(d);
const cam=new THREE.OrthographicCamera(-5.12,5.12,5.12,-5.12,0.1,100); const res={tris};
for(const [n,p] of [['front',[0,0,20]],['left',[20,0,0]],['back',[0,0,-20]]]){
 cam.position.set(p[0],4.43+p[1],p[2]); cam.lookAt(0,4.43,0); d.position.set(p[0]*0.6+6,14,p[2]*0.6+6);
 if(n==='left') d.position.set(14,14,6); if(n==='back') d.position.set(-6,14,-14);
 r.render(s,cam); res[n]=r.domElement.toDataURL('image/png');}
window.RES=res;
</script></body></html>`;
const srv=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]); if(u==='/'){s.writeHead(200,{'content-type':'text/html'});return s.end(html);}
 const f=path.join(ROOT,u); if(!fs.existsSync(f)){s.writeHead(404);return s.end();} s.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':'image/png'}); fs.createReadStream(f).pipe(s);}).listen(0); const PORT=await new Promise(r=>srv.on('listening',()=>r(srv.address().port)));
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage({viewport:{width:1100,height:1100}});
p.on('console',m=>console.log('console:',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:'+PORT+'/'); await p.waitForFunction(()=>window.RES,null,{timeout:60000});
const res=await p.evaluate(()=>window.RES); console.log('triangles',res.tris);
// side by side compose
for(const n of ['front','left','back']){
 const out=await p.evaluate(async([n,src])=>{const c=document.createElement('canvas');c.width=2048;c.height=1024;const x=c.getContext('2d');
  const ld=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=u;}); x.drawImage(await ld('/24-goblin/assets/24-goblin/'+n+'.png'),0,0,1024,1024); x.drawImage(await ld(src),1024,0);
  return c.toDataURL('image/png');},[n,res[n]]);
 fs.writeFileSync(path.join(OUT,`${tag}-${n}.png`),Buffer.from(out.split(',')[1],'base64'));}
await b.close(); srv.close();
