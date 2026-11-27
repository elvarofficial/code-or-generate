import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const ROOT = 'D:/elvar/cog-runs';
const require = createRequire(ROOT + '/package.json');
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';
const page_html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const { createPillar } = await import('/08-pillar/route-a/08-pillar.js?' + Date.now());
const S=1024, PPU=300;
const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(S,S); renderer.setClearColor(0xffffff,1);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const obj = createPillar(); scene.add(obj);
let tris=0; obj.traverse(o=>{if(o.isMesh){const g=o.geometry; tris += (g.index?g.index.count:g.attributes.position.count)/3;}});
scene.add(new THREE.HemisphereLight(0xffffff,0x8a8070,1.6));
const d = new THREE.DirectionalLight(0xffffff,1.6); scene.add(d);
const h=S/2/PPU, cy=(955-512)/PPU;
const cam = new THREE.OrthographicCamera(-h,h,h,-h,0.1,50);
const views = {front:[0,0,10], left:[10,0,0], back:[0,0,-10]};
const out={tris};
for (const [k,p] of Object.entries(views)) {
  cam.position.set(p[0],cy+p[1],p[2]); cam.lookAt(0,cy,0);
  d.position.set(p[0]*0.6+ (k==='left'? 0: (k==='back'?3:-3)), 8, p[2]*0.6 + (k==='left'?3:0));
  renderer.render(scene,cam);
  out[k]=renderer.domElement.toDataURL('image/png');
}
// composite
const c=document.createElement('canvas'); c.width=1536; c.height=1024; const x=c.getContext('2d');
x.fillStyle='#fff'; x.fillRect(0,0,1536,1024);
let i=0;
for (const k of ['front','left','back']) {
  const a=new Image(); a.src='/08-pillar/assets/08-pillar/'+k+'.png'; await a.decode();
  const b=new Image(); b.src=out[k]; await b.decode();
  x.drawImage(a,i*512,0,512,512); x.drawImage(b,i*512,512,512,512); i++;
}
out.composite=c.toDataURL('image/png');
window.__out=out;
</script></body></html>`;
const srv = http.createServer((req,res)=>{
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u==='/' ) { res.writeHead(200,{'content-type':'text/html'}); return res.end(page_html); }
  const f = path.join(ROOT,u);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f);
  res.writeHead(200,{'content-type': ext==='.js'?'text/javascript': ext==='.png'?'image/png':'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
}).listen(0, async ()=>{
  const port = srv.address().port;
  const browser = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport:{width:1100,height:1100}});
  page.on('console', m=>console.log('console:', m.text()));
  page.on('pageerror', e=>console.log('pageerror:', e.message));
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(()=>window.__out, null, {timeout:60000});
  const out = await page.evaluate(()=>window.__out);
  console.log('triangles:', out.tris);
  for (const k of ['front','left','back','composite']) fs.writeFileSync(path.join(OUT,k+'.png'), Buffer.from(out[k].split(',')[1],'base64'));
  await browser.close(); srv.close();
});
