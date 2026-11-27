import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
import { serve } from 'file:///D:/elvar/cog-runs/server.mjs';
import fs from 'fs';
const OUT = process.argv[2];
const srv = await serve(8765);
const html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import build from '/21-alchemist/route-a/21-alchemist.js';
const g = build();
let tris=0; g.traverse(o=>{ if(o.isMesh){ const geo=o.geometry; tris += (geo.index?geo.index.count:geo.attributes.position.count)/3; }});
window.TRIS=tris;
const box=new THREE.Box3().setFromObject(g); window.BOX=[box.min.toArray(),box.max.toArray()];
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xffffff); scene.add(g);
scene.add(new THREE.HemisphereLight(0xffffff,0x887766,1.6));
const d=new THREE.DirectionalLight(0xffffff,1.6); d.position.set(3,8,6); scene.add(d);
const d2=new THREE.DirectionalLight(0xffffff,0.8); d2.position.set(-4,5,-6); scene.add(d2);
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(1024,1024); r.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(r.domElement);
const H=box.max.y, cy=H/2, half=Math.max(H, box.max.x-box.min.x, box.max.z-box.min.z)/2*1.1;
const views={front:[0,0,1,5.62,9.5],left:[1,0,0,5.10,9.55],back:[0,0,-1,4.75,9.45]};
window.SHOTS={};
for(const [k,v] of Object.entries(views)){
  const cam=new THREE.OrthographicCamera(-v[3],10.24-v[3],v[4],v[4]-10.24,0.1,100);
  cam.position.set(v[0]*30,0,v[2]*30); cam.lookAt(0,0,0);
  r.render(scene,cam); window.SHOTS[k]=r.domElement.toDataURL('image/png');
}
// side-by-side
for(const k of Object.keys(views)){
  const ref=new Image(); ref.src='/21-alchemist/assets/21-alchemist/'+k+'.png'; await ref.decode();
  const me=new Image(); me.src=window.SHOTS[k]; await me.decode();
  const c=document.createElement('canvas'); c.width=2048; c.height=1024; const x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,2048,1024); x.drawImage(ref,0,0,1024,1024); x.drawImage(me,1024,0);
  window.SHOTS[k+'_cmp']=c.toDataURL('image/png');
}
window.DONE=true;
</script></body></html>`;
fs.writeFileSync('D:/elvar/cog-runs/21-alchemist/_render.html', html);
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:1024,height:1024} });
p.on('console', m=>console.log('console:', m.text())); p.on('pageerror', e=>console.log('pageerror:', e.message));
await p.goto('http://localhost:8765/21-alchemist/_render.html');
await p.waitForFunction(()=>window.DONE, null, {timeout:120000});
const shots = await p.evaluate(()=>window.SHOTS);
for (const [k,v] of Object.entries(shots)) fs.writeFileSync(`${OUT}/${k}.png`, Buffer.from(v.split(',')[1],'base64'));
console.log('tris', await p.evaluate(()=>window.TRIS), 'box', JSON.stringify(await p.evaluate(()=>window.BOX)));
await b.close(); srv.close(); fs.unlinkSync('D:/elvar/cog-runs/21-alchemist/_render.html');
