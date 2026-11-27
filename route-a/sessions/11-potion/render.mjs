import { createRequire } from 'module';
const require = createRequire('D:/elvar/cog-runs/package.json');
const { chromium } = require('playwright');
import fs from 'fs'; import path from 'path';
const ROOT='D:/elvar/cog-runs'; const OUT=process.argv[2]||'.'; const tag=process.argv[3]||'r';
const html=`<html><body style="margin:0;background:#fff"><canvas id=c width=2048 height=1024></canvas>
<script type=importmap>{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type=module>
import * as THREE from 'three';
import {createPotion} from '/11-potion/route-a/11-potion.js';
const g=createPotion(); let tris=0;
g.traverse(o=>{if(o.isMesh){const ge=o.geometry;tris+=(ge.index?ge.index.count:ge.attributes.position.count)/3;}});
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(1024,1024); r.setClearColor(0xffffff);
const sc=new THREE.Scene(); sc.add(g);
sc.add(new THREE.HemisphereLight(0xffffff,0x888888,1.6)); const dl=new THREE.DirectionalLight(0xffffff,2.2); dl.position.set(-2,3,3); sc.add(dl);
const box=new THREE.Box3().setFromObject(g);
const out=document.getElementById('c').getContext('2d');
const views={front:[0,0,5],left:[5,0,0],back:[0,0,-5]}; const res={tris,box:[box.min.toArray(),box.max.toArray()]};
for(const [k,p] of Object.entries(views)){
  const cy=0.443; const h=0.512; let cx=0;
  const c=new THREE.OrthographicCamera(-h,h,cy+h,cy-h,0.1,20);
  c.position.set(...p); c.lookAt(0,0,0); c.position.y=0; c.updateMatrixWorld();
  // centre horizontally on bbox
  const ctr=box.getCenter(new THREE.Vector3()); const right=new THREE.Vector3().setFromMatrixColumn(c.matrixWorld,0);
  const off=ctr.dot(right); c.left=off-h;c.right=off+h;c.updateProjectionMatrix();
  dl.position.set(p[0]?p[0]*0.6:-2, 3, p[2]?p[2]*0.6:2);
  r.render(sc,c);
  const img=new Image(); img.src='/11-potion/assets/11-potion/'+k+'.png'; await img.decode();
  out.fillStyle='#fff';out.fillRect(0,0,2048,1024); out.drawImage(img,0,0,1024,1024); out.drawImage(r.domElement,1024,0);
  res[k]=document.getElementById('c').toDataURL('image/png');
}
window.RES=res;
</script></body></html>`;
const b=await chromium.launch(); const pg=await b.newPage();
pg.on('console',m=>console.log('console',m.text())); pg.on('pageerror',e=>console.log('err',e.message));
await pg.route('http://x/**',async rt=>{const u=new URL(rt.request().url()); if(u.pathname==='/index.html') return rt.fulfill({body:html,contentType:'text/html'});
 const f=path.join(ROOT,decodeURIComponent(u.pathname)); if(!fs.existsSync(f)) return rt.fulfill({status:404});
 rt.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.png')?'image/png':'text/javascript'});});
await pg.goto('http://x/index.html'); await pg.waitForFunction(()=>window.RES,null,{timeout:30000});
const res=await pg.evaluate(()=>window.RES);
for(const k of ['front','left','back']) fs.writeFileSync(path.join(OUT,`${tag}-${k}.png`),Buffer.from(res[k].split(',')[1],'base64'));
console.log('tris',res.tris,'box',JSON.stringify(res.box)); await b.close();
