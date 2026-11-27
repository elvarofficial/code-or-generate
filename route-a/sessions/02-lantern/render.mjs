const PORT = 9000 + Math.floor(Math.random()*900);
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire('D:/elvar/cog-runs/package.json');
const { chromium } = require('playwright');
const ROOT = 'D:/elvar/cog-runs';
const OUT = process.argv[2];
const page_html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const { createLantern } = await import('/02-lantern/route-a/02-lantern.js?'+Date.now());
const S=1/3000, W=1024;
const lantern = createLantern();
let tris=0; lantern.traverse(o=>{if(o.isMesh){const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;}});
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xffffff); scene.add(lantern);
scene.add(new THREE.HemisphereLight(0xffffff,0x887766,1.6));
const dl=new THREE.DirectionalLight(0xffffff,1.6); dl.position.set(1,2,3); scene.add(dl);
const dl2=new THREE.DirectionalLight(0xffffff,0.8); dl2.position.set(-2,1,-3); scene.add(dl2);

const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); r.setSize(W,W); document.body.appendChild(r.domElement);
const cam=new THREE.OrthographicCamera(-512*S,512*S,955*S,-(W-955)*S,0.01,10);
const views={front:[0,0,2],left:[2,0,0],back:[0,0,-2]}; const out={};
for(const [k,p] of Object.entries(views)){cam.position.set(p[0],p[1],p[2]);cam.lookAt(p[0]?0:0,0,0);cam.position.y=0;cam.lookAt(0,0,0);cam.updateProjectionMatrix();r.render(scene,cam);out[k]=r.domElement.toDataURL('image/png');}
window.RESULT={out,tris};
</script></body></html>`;
const srv = http.createServer((req,res)=>{
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u==='/') { res.writeHead(200,{'content-type':'text/html'}); return res.end(page_html); }
  const f = path.join(ROOT,u);
  if(!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type': f.endsWith('.js')?'text/javascript':f.endsWith('.png')?'image/png':'text/plain'}); fs.createReadStream(f).pipe(res);
}).listen(PORT);
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1024,height:1024}});
p.on('console',m=>console.log('console:',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('http://localhost:'+PORT+'/'); await p.waitForFunction(()=>window.RESULT,null,{timeout:30000});
const {out,tris} = await p.evaluate(()=>window.RESULT); console.log('triangles',tris);
fs.mkdirSync(OUT,{recursive:true});
for (const k of Object.keys(out)) fs.writeFileSync(`${OUT}/${k}.png`, Buffer.from(out[k].split(',')[1],'base64'));
// side-by-side: reference | render | overlay
const p2 = await b.newPage({viewport:{width:1536,height:512}});
for (const k of Object.keys(out)) {
  await p2.setContent(`<body style="margin:0;display:flex;background:#fff">
  <img src="http://localhost:${PORT}/02-lantern/assets/02-lantern/${k}.png" width=512>
  <img src="${out[k]}" width=512>
  <div style="position:relative;width:512px;height:512px"><img src="http://localhost:${PORT}/02-lantern/assets/02-lantern/${k}.png" width=512 style="position:absolute;opacity:.5"><img src="${out[k]}" width=512 style="position:absolute;opacity:.5"></div></body>`);
  await p2.waitForTimeout(300);
  await p2.screenshot({path:`${OUT}/cmp_${k}.png`});
}
await b.close(); srv.close();
