import http from 'http'; import fs from 'fs'; import path from 'path';
import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
const ROOT = 'D:/elvar/cog-runs';
const OUT = process.argv[2];
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.png': 'image/png' };
const html = `<!doctype html><html><body style="margin:0">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const { createBarrel } = await import('/10-barrel/route-a/10-barrel.js?' + Date.now());
const S=0.00125, N=1024;
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
r.setSize(N,N); r.setClearColor(0xffffff); r.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(r.domElement);
const scene=new THREE.Scene(); const g=createBarrel(); scene.add(g);
let tris=0; g.traverse(o=>{if(o.isMesh){const gg=o.geometry; tris+=(gg.index?gg.index.count:gg.attributes.position.count)/3;}});
scene.add(new THREE.HemisphereLight(0xffffff,0x554433,1.0));
const views={front:[0,0,1],left:[1,0,0],back:[0,0,-1]};
const half=N*S/2, cy=(960-512)*S;
const cam=new THREE.OrthographicCamera(-half,half,half,-half,0.01,20);
const dl=new THREE.DirectionalLight(0xffffff,2.4); scene.add(dl); scene.add(dl.target);
const out={tris};
for(const [k,d] of Object.entries(views)){
  cam.position.set(d[0]*5,cy,d[2]*5); cam.lookAt(0,cy,0);
  dl.position.set(d[0]*5+ (k==='left'?0:0), cy+3, d[2]*5); dl.position.add(new THREE.Vector3(...d).cross(new THREE.Vector3(0,1,0)).multiplyScalar(-1.5));
  r.render(scene,cam);
  const img=new Image(); img.src='/10-barrel/assets/10-barrel/'+k+'.png'; await img.decode();
  const c=document.createElement('canvas'); c.width=N*3; c.height=N; const x=c.getContext('2d');
  x.drawImage(img,0,0,N,N); x.drawImage(r.domElement,N,0);
  x.globalAlpha=0.5; x.drawImage(img,2*N,0,N,N); x.drawImage(r.domElement,2*N,0); x.globalAlpha=1;
  out[k]=c.toDataURL('image/png');
}
window.__out=out;
</script></body></html>`;
const srv = http.createServer((q, res) => {
  if (q.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); return; }
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise(r => srv.listen(0, r));
const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage();
pg.on('console', m => console.log('console:', m.text())); pg.on('pageerror', e => console.log('err:', e.message));
await pg.goto(`http://localhost:${port}/`);
await pg.waitForFunction(() => window.__out, null, { timeout: 60000 });
const out = await pg.evaluate(() => window.__out);
console.log('triangles', out.tris);
for (const k of ['front', 'left', 'back']) fs.writeFileSync(`${OUT}/${k}.png`, Buffer.from(out[k].split(',')[1], 'base64'));
await b.close(); srv.close();
