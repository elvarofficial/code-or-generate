// Usage: node render.mjs <outPrefix>
import http from 'http'; import fs from 'fs'; import path from 'path';
import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
const ROOT = 'D:/elvar/cog-runs';
const OUT = process.argv[2] || 'C:/Users/user_/AppData/Local/Temp/claude/a588671ab0a8e38a/616fb780-477a-46ee-a2ef-0e37bbe4c92b/scratchpad/r';
const html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const mod = await import('/22-blacksmith/route-a/22-blacksmith.js?'+Date.now());
const fn = mod.default || Object.values(mod).find(v=>typeof v==='function');
const obj = fn();
let tris=0; obj.updateMatrixWorld(true);
obj.traverse(o=>{ if(o.isMesh){ const g=o.geometry; tris += (g.index? g.index.count : g.attributes.position.count)/3; }});
const S=1024;
const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(S,S); renderer.setClearColor(0xffffff,1); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.add(obj);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7d70, 1.6));
const dl = new THREE.DirectionalLight(0xffffff, 2.2); scene.add(dl); scene.add(dl.target);
const box = new THREE.Box3().setFromObject(obj); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
const views = { front:[0,0,1], left:[1,0,0], back:[0,0,-1] };
function loadImg(src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=src; }); }
function contentBox(src, w, h){ const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const cx=cv.getContext('2d'); cx.drawImage(src,0,0,w,h);
  const d=cx.getImageData(0,0,w,h).data; let x0=w,y0=h,x1=0,y1=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4; if(d[i]<232||d[i+1]<232||d[i+2]<232){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }}
  return [x0,y0,x1-x0+1,y1-y0+1]; }
const out = {tris, size:[sz.x,sz.y,sz.z], min:box.min.toArray(), max:box.max.toArray()};
const P=512;
const comb=document.createElement('canvas'); comb.width=P*2; comb.height=P*3; const cc=comb.getContext('2d'); cc.fillStyle='#fff'; cc.fillRect(0,0,P*2,P*3);
let row=0;
for(const [name,d] of Object.entries(views)){
  const half = Math.max(sz.x,sz.y,sz.z)/2*1.15;
  const cam = new THREE.OrthographicCamera(-half,half,half,-half,0.01,100);
  cam.position.set(c.x+d[0]*20, c.y, c.z+d[2]*20); cam.lookAt(c);
  dl.position.set(c.x+d[0]*6 + (d[2]? d[2]*2.5 : 0)*0 + 2*(d[2]||0)*0, c.y+6, c.z+d[2]*6);
  // light from camera side, up and slightly to the left of the camera
  const right = new THREE.Vector3(); cam.getWorldDirection(right); right.cross(new THREE.Vector3(0,1,0));
  dl.position.set(cam.position.x - right.x*8, c.y+10, cam.position.z - right.z*8); dl.target.position.copy(c);
  renderer.render(scene, cam);
  const img = await loadImg(renderer.domElement.toDataURL('image/png'));
  const ref = await loadImg('/22-blacksmith/assets/22-blacksmith/'+name+'.png');
  out[name+'_render'] = renderer.domElement.toDataURL('image/png');
  const pair=document.createElement('canvas'); pair.width=P*2; pair.height=P; const pc=pair.getContext('2d'); pc.fillStyle='#fff'; pc.fillRect(0,0,P*2,P);
  for(const [k,im] of [[0,ref],[1,img]]){ const b=contentBox(im,im.width,im.height); const s=Math.min((P-20)/b[2],(P-20)/b[3]);
    const w=b[2]*s,h=b[3]*s; pc.drawImage(im,b[0],b[1],b[2],b[3],k*P+(P-w)/2,P-10-h,w,h); }
  pc.fillStyle='#c00'; pc.font='20px sans-serif'; pc.fillText(name+' ref',8,24); pc.fillText(name+' render',P+8,24);
  out[name] = pair.toDataURL('image/png'); cc.drawImage(pair,0,row*P); row++;
}
out.all = comb.toDataURL('image/png');
window.__out = out;
</script></body></html>`;
const srv = http.createServer((q, res) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { res.writeHead(200, {'Content-Type':'text/html'}); res.end(html); return; }
  const p = path.join(ROOT, u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type': p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':'application/octet-stream'}); res.end(d); });
});
await new Promise(r => srv.listen(0, r));
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', m => console.log('console:', m.text()));
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto('http://localhost:'+srv.address().port+'/');
await page.waitForFunction(() => window.__out, null, { timeout: 120000 });
const out = await page.evaluate(() => window.__out);
for (const k of ['front','left','back','all','front_render','left_render','back_render']) fs.writeFileSync(`${OUT}_${k}.png`, Buffer.from(out[k].split(',')[1], 'base64'));
console.log('tris', out.tris, 'size', out.size.map(v=>v.toFixed(2)).join(' '), 'min', out.min.map(v=>v.toFixed(2)).join(' '), 'max', out.max.map(v=>v.toFixed(2)).join(' '));
await browser.close(); srv.close();
