import { serve } from 'file:///D:/elvar/cog-runs/server.mjs';
import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
const out = process.argv[2] || 'compare.png';
const srv = await serve(8765);
const html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<canvas id="c" width="1536" height="1024"></canvas>
<script type="module">
import * as THREE from 'three';
const { createTree } = await import('/04-tree/route-a/04-tree.js?'+Date.now());
const S=4/880, W=1024*S, cx=(512-560)*S, cy=(945-512)*S;
const tree=createTree();
let tris=0; tree.traverse(o=>{if(o.isMesh){const g=o.geometry; tris+=(g.index?g.index.count:g.attributes.position.count)/3;}});
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(512,512); r.setClearColor(0xffffff,1);
const scene=new THREE.Scene(); scene.add(tree);
scene.add(new THREE.HemisphereLight(0xffffff,0x9a9080,2.2));
const d=new THREE.DirectionalLight(0xfff4e0,2.0); scene.add(d);
const views={front:[new THREE.Vector3(0,0,1),cx,'front'],left:[new THREE.Vector3(1,0,0),null,'left'],back:[new THREE.Vector3(0,0,-1),null,'back']};
const out=document.getElementById('c').getContext('2d'); out.fillStyle='#fff'; out.fillRect(0,0,1536,1024);
const load=s=>new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=s;});
let k=0;
for(const [name,[dir]] of Object.entries(views)){
  const cam=new THREE.OrthographicCamera(-W/2,W/2,W/2,-W/2,0.1,100);
  const tgt = name==='left'? new THREE.Vector3(0,cy,(520-512)*S) : new THREE.Vector3(cx,cy,0);
  cam.position.copy(tgt).addScaledVector(dir,20); cam.up.set(0,1,0); cam.lookAt(tgt);
  d.position.copy(cam.position).add(new THREE.Vector3(-6,10,0).applyQuaternion(cam.quaternion));
  r.render(scene,cam);
  const ref=await load('/04-tree/assets/04-tree/'+name+'.png');
  out.drawImage(ref,k*512,0,512,512);
  out.drawImage(r.domElement,k*512,512,512,512);
  // overlay outline: render tinted on reference
  k++;
}
out.fillStyle='#000';out.font='16px sans-serif';out.fillText('tris '+tris,8,530);
window.done=tris;
</script></body></html>`;
const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:1536,height:1024}});
p.on('console',m=>console.log('console:',m.text())); p.on('pageerror',e=>console.log('err:',e.message));
await p.route('http://localhost:8765/page.html', r=>r.fulfill({contentType:'text/html',body:html}));
await p.goto('http://localhost:8765/page.html');
await p.waitForFunction(()=>window.done,null,{timeout:60000});
console.log('triangles', await p.evaluate(()=>window.done));
await (await p.$('#c')).screenshot({path:out});
await b.close(); srv.close();
