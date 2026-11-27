import { createRequire } from 'module';
const require = createRequire('D:/elvar/cog-runs/package.json');
const { chromium } = require('playwright');
import fs from 'fs'; import path from 'path';
const ROOT = 'D:/elvar/cog-runs';
const out = process.argv[2] || 'cmp.png';
const html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"http://x/node_modules/three/build/three.module.js"}}</script>
<canvas id="c" width="2048" height="3072"></canvas>
<script type="module">
import * as THREE from 'three';
const { createHammer } = await import('http://x/14-hammer/route-a/14-hammer.js?' + Date.now());
const g = createHammer();
let tris=0; g.traverse(o=>{ if(o.isMesh){ const geo=o.geometry; tris += (geo.index?geo.index.count:geo.attributes.position.count)/3; }});
const box = new THREE.Box3().setFromObject(g);
const r = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true}); r.setSize(1024,1024); r.setClearColor(0xffffff);
const scene = new THREE.Scene(); scene.add(g);
scene.add(new THREE.HemisphereLight(0xffffff,0x888888,1.6));
const dl = new THREE.DirectionalLight(0xffffff,1.6); dl.position.set(-1,2,3); scene.add(dl);
const dl2 = new THREE.DirectionalLight(0xffffff,0.8); dl2.position.set(2,1,-2); scene.add(dl2);
// world scale: 1024 px reference = 1.024 units, ground y=0 at image y=960
const cam = new THREE.OrthographicCamera(-0.512,0.512,0.960,-0.064,0.01,10);
const ctx = document.getElementById('c').getContext('2d');
const views = [['front',[0,0,3]],['left',[3,0,0]],['back',[0,0,-3]]];
for (let i=0;i<3;i++){
  const [n,p]=views[i]; cam.position.set(p[0],p[1],p[2]); cam.lookAt(0,0,0); cam.position.y=0; cam.updateMatrixWorld();
  cam.position.set(p[0],0,p[2]); cam.lookAt(0,0,0);
  dl.position.set(p[0]-1*(p[2]?1:0), 2, p[2] + (p[0]?1:0)).normalize();
  r.render(scene,cam);
  const img = new Image(); img.src='http://x/14-hammer/assets/14-hammer/'+n+'.png'; await img.decode();
  ctx.drawImage(img,0,i*1024); ctx.drawImage(r.domElement,1024,i*1024);
  ctx.fillStyle='#000'; ctx.font='30px sans-serif'; ctx.fillText(n,10,i*1024+40);
}
window.DONE = {tris, box:[box.min.toArray(),box.max.toArray()]};
</script></body></html>`;
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport:{width:2048,height:3072} });
pg.on('console', m=>console.log('console:', m.text())); pg.on('pageerror', e=>console.log('err:', e.message));
await pg.route('http://x/**', (rt) => { const u = new URL(rt.request().url()); const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!fs.existsSync(f)) return rt.fulfill({status:404});
  rt.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.png')?'image/png':f.endsWith('.html')?'text/html':'text/javascript' }); });
await pg.route('http://x/index.html', rt=>rt.fulfill({body:html, contentType:'text/html'}));
await pg.goto('http://x/index.html');
await pg.waitForFunction(()=>window.DONE, null, {timeout:60000});
console.log(JSON.stringify(await pg.evaluate(()=>window.DONE)));
const el = await pg.$('#c'); await el.screenshot({ path: out });
await b.close();
