import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
import { serve } from 'file:///D:/elvar/cog-runs/server.mjs';
import fs from 'fs';
const tag = process.argv[2] || 'r0';
const OUT = process.cwd();
const s = await serve(8767);
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
const html = `<html><head><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script></head><body style="margin:0"><script type="module">
import * as THREE from 'three';
const { createWolf } = await import('/05-wolf/route-a/05-wolf.js?'+Date.now());
const K=500, W=1024;
const wolf = createWolf();
let tris=0; wolf.traverse(o=>{ if(o.isMesh){ const g=o.geometry; tris += (g.index?g.index.count:g.attributes.position.count)/3; }});
console.log('triangles', tris);
const r = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true}); r.setSize(W,W); r.setClearColor(0xffffff,1);
r.outputColorSpace = THREE.SRGBColorSpace;
const sc = new THREE.Scene(); sc.add(wolf);
sc.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 1.6));
const dl = new THREE.DirectionalLight(0xffffff, 1.4); sc.add(dl);
const views = { front:{cx:460, pos:[0,0,5]}, left:{cx:500, pos:[5,0,0]}, back:{cx:460, pos:[0,0,-5]} };
window.shots = {};
for (const [n,v] of Object.entries(views)) {
  const cam = new THREE.OrthographicCamera(-v.cx/K, (W-v.cx)/K, 838/K, -(W-838)/K, 0.1, 20);
  cam.position.set(...v.pos); cam.lookAt(v.pos[0]===0?0:0, 0, 0); cam.position.y=0; cam.updateMatrixWorld();
  dl.position.set(v.pos[0]*0.6+ (n==='left'?0:1.5), 4, v.pos[2]*0.6 + (n==='left'?2:0));
  r.render(sc, cam); window.shots[n] = r.domElement.toDataURL('image/png');
}
// comparison sheets
async function load(src){ const i=new Image(); i.src=src; await i.decode(); return i; }
for (const n of Object.keys(views)) {
  const ref = await load('/05-wolf/assets/05-wolf/'+n+'.png'); const ren = await load(window.shots[n]);
  const c = document.createElement('canvas'); c.width=W*3; c.height=W; const g=c.getContext('2d');
  g.drawImage(ref,0,0); g.drawImage(ren,W,0);
  // silhouette overlay: red = ref only, blue = render only, grey = both
  const tmp=document.createElement('canvas'); tmp.width=W; tmp.height=W; const tg=tmp.getContext('2d');
  tg.drawImage(ref,0,0); const a=tg.getImageData(0,0,W,W).data; tg.clearRect(0,0,W,W); tg.drawImage(ren,0,0); const bb=tg.getImageData(0,0,W,W).data;
  const o=tg.createImageData(W,W); let refOnly=0, renOnly=0, both=0;
  for(let i=0;i<W*W*4;i+=4){ const fa=a[i]+a[i+1]+a[i+2]<720, fb=bb[i]+bb[i+1]+bb[i+2]<720;
    const col = fa&&fb?[150,150,150]: fa?[230,40,40]: fb?[40,80,230]:[255,255,255];
    if(fa&&fb)both++; else if(fa)refOnly++; else if(fb)renOnly++;
    o.data[i]=col[0];o.data[i+1]=col[1];o.data[i+2]=col[2];o.data[i+3]=255; }
  tg.putImageData(o,0,0); g.drawImage(tmp,2*W,0);
  window.shots[n+'_cmp'] = c.toDataURL('image/png');
  console.log(n, 'IoU', (both/(both+refOnly+renOnly)).toFixed(3), 'refOnly', refOnly, 'renOnly', renOnly);
}
window.done=true;
</script></body></html>`;
await p.route('**/__r.html', r => r.fulfill({ contentType: 'text/html', body: html }));
await p.goto('http://localhost:8767/__r.html');
await p.waitForFunction(() => window.done, null, { timeout: 60000 });
const shots = await p.evaluate(() => window.shots);
for (const [k, v] of Object.entries(shots)) fs.writeFileSync(`${OUT}/${tag}_${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
await b.close(); s.close();
