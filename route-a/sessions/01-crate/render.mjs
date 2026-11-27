import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire('D:/elvar/cog-runs/node_modules/');
const { chromium } = require('playwright');
const ROOT = 'D:/elvar/cog-runs';
const tag = process.argv[2] || 'r0';
const page_html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import createCrate from '/01-crate/route-a/01-crate.js?${Date.now()}';
const S=1024;
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(S,S); renderer.setClearColor(0xffffff,1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const crate=createCrate(); scene.add(crate);
let tris=0; crate.traverse(o=>{if(o.isMesh){const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;}});
scene.add(new THREE.HemisphereLight(0xfff4e8,0x7a5a40,1.4));
const dl=new THREE.DirectionalLight(0xfff0dd,2.2); scene.add(dl); scene.add(dl.target);
const half=0.5*S/847, cy=0.5;
const cam=new THREE.OrthographicCamera(-half,half,half,-half,0.01,20);
const views={front:[0,0,5],left:[5,0,0],back:[0,0,-5]};
const out={tris};
async function load(src){const im=new Image();im.src=src;await im.decode();return im;}
function bbox(ctx){const d=ctx.getImageData(0,0,S,S).data;let x0=S,y0=S,x1=0,y1=0;for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=(y*S+x)*4;if(d[i]<230||d[i+1]<230||d[i+2]<230){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}return [x0,y0,x1,y1];}
for(const [k,p] of Object.entries(views)){
  cam.position.set(p[0],p[1]+cy,p[2]); cam.up.set(0,1,0); cam.lookAt(0,cy,0);
  dl.position.set(cam.position.x*0.6 + (k==='left'?0:(k==='back'?1:-1))*2, cy+3, cam.position.z*0.6 + (k==='left'?2:0));
  renderer.render(scene,cam);
  const rimg=await load(renderer.domElement.toDataURL('image/png'));
  const ref=await load('/01-crate/assets/01-crate/'+k+'.png');
  const c=document.createElement('canvas');c.width=S*2;c.height=S;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,2*S,S);x.drawImage(ref,0,0,S,S);x.drawImage(rimg,S,0);
  const c1=document.createElement('canvas');c1.width=S;c1.height=S;const x1=c1.getContext('2d');
  x1.drawImage(ref,0,0,S,S);const rb=bbox(x1);x1.fillStyle='#fff';x1.fillRect(0,0,S,S);x1.drawImage(rimg,0,0);const mb=bbox(x1);
  out[k]={refBBox:rb,renderBBox:mb,img:c.toDataURL('image/png')};
}
window.__out=out;
</script></body></html>`;
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
 if(u==='/index.html'){r.writeHead(200,{'content-type':'text/html'});return r.end(page_html);}
 const f=path.join(ROOT,u); if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 const ct=f.endsWith('.js')?'text/javascript':f.endsWith('.png')?'image/png':'application/octet-stream';
 r.writeHead(200,{'content-type':ct});fs.createReadStream(f).pipe(r);}).listen(8765);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage();pg.on('console',m=>console.log('console:',m.text()));pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('http://localhost:8765/index.html');
await pg.waitForFunction(()=>window.__out,null,{timeout:60000});
const out=await pg.evaluate(()=>window.__out);
console.log('triangles',out.tris);
for(const k of ['front','left','back']){fs.writeFileSync(`r/${tag}-${k}.png`,Buffer.from(out[k].img.split(',')[1],'base64'));console.log(k,'ref',out[k].refBBox,'render',out[k].renderBBox);}
await b.close();srv.close();
