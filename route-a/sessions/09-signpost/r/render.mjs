import http from 'http'; import fs from 'fs'; import path from 'path';
import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
const ROOT='D:/elvar/cog-runs'; const OUT=process.argv[2]||'.';
const page_html=`<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import { createSignpost } from '/09-signpost/route-a/09-signpost.js';
const obj=createSignpost(); let tris=0;
obj.traverse(o=>{if(o.isMesh){const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;}});
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(1024,1024); r.setClearColor(0xffffff);
r.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(); scene.add(obj);
scene.add(new THREE.HemisphereLight(0xffffff,0x554433,1.6));
const views={front:[0,0,1],left:[1,0,0],back:[0,0,-1]}; const out={};
for(const [k,d] of Object.entries(views)){
  const cam=new THREE.OrthographicCamera(-5.12,5.12,5.12,-5.12,0.1,100);
  const c=new THREE.Vector3(k==='front'?0.07:k==='back'?-0.07:0,4.43,k==='left'?0.07:0);
  cam.position.copy(c).add(new THREE.Vector3(...d).multiplyScalar(30)); cam.lookAt(c);
  const dl=new THREE.DirectionalLight(0xffffff,1.6); dl.position.set(d[0]*10+3,15,d[2]*10+4); scene.add(dl);
  r.render(scene,cam); scene.remove(dl);
  const img=new Image(); img.src=r.domElement.toDataURL(); await img.decode();
  const ref=new Image(); ref.src='/09-signpost/assets/09-signpost/'+k+'.png'; await ref.decode();
  const cv=document.createElement('canvas'); cv.width=2048; cv.height=1024; const x=cv.getContext('2d');
  x.drawImage(ref,0,0,1024,1024); x.drawImage(img,1024,0); x.font='32px sans-serif'; x.fillStyle='red'; x.fillText(k+' ref',10,40); x.fillText(k+' render',1034,40);
  out[k]=cv.toDataURL();
}
window.RESULT={tris,out};
</script></body></html>`;
const srv=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);
 if(u==='/')return s.end(page_html);
 const f=path.join(ROOT,u); if(!fs.existsSync(f)){s.statusCode=404;return s.end();}
 s.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.png')?'image/png':'text/plain'); s.end(fs.readFileSync(f));}).listen(8765);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage();
p.on('console',m=>console.log('console:',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:8765/'); await p.waitForFunction(()=>window.RESULT,null,{timeout:60000});
const R=await p.evaluate(()=>window.RESULT); console.log('triangles',R.tris);
for(const [k,v] of Object.entries(R.out)) fs.writeFileSync(path.join(OUT,k+'.png'),Buffer.from(v.split(',')[1],'base64'));
await b.close(); srv.close();
