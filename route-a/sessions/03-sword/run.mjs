import { chromium } from 'playwright'; import { serve } from './server.mjs'; import fs from 'fs';
const tag = process.argv[2] || 'r0'; const OUT = process.argv[3];
const s = await serve(); const b = await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const p = await b.newPage();
p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto('http://localhost:8765/03-sword/_tmp_render.html');
await p.waitForFunction(() => window.__out, null, {timeout: 60000});
const out = await p.evaluate(() => window.__out);
console.log('triangles', out.tris);
// composite: for each view ref | render | overlay outline diff
const comp = await p.evaluate(async (out) => {
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const c = document.createElement('canvas'); c.width = 6*304; c.height = 940+30; const x = c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.font='20px sans-serif'; x.fillStyle='#000';
  let i=0; const stats={};
  for (const v of ['front','left','back']) {
    const ref = await load('/03-sword/assets/03-sword/'+v+'.png'); const ren = await load(out[v]);
    x.drawImage(ref, 360,40,304,940, i*608, 30, 304, 940); x.drawImage(ren, 360,40,304,940, i*608+304, 30, 304, 940);
    x.fillText(v+' ref', i*608+10, 22); x.fillText(v+' render', i*608+314, 22);
    // silhouette IoU at full res
    const m = (img)=>{ const cc=document.createElement('canvas'); cc.width=1024; cc.height=1024; const cx=cc.getContext('2d'); cx.drawImage(img,0,0); const d=cx.getImageData(0,0,1024,1024).data; const a=new Uint8Array(1024*1024); for(let k=0;k<a.length;k++) a[k]= (d[k*4]+d[k*4+1]+d[k*4+2]<690)?1:0; return a; };
    const A=m(ref), B=m(ren); let I=0,U=0; for(let k=0;k<A.length;k++){ if(A[k]&&B[k])I++; if(A[k]||B[k])U++; }
    stats[v]=(I/U).toFixed(3); i++;
  }
  return {url:c.toDataURL('image/png'), stats};
}, out);
console.log('IoU', JSON.stringify(comp.stats));
fs.writeFileSync(`${OUT}/compare-${tag}.png`, Buffer.from(comp.url.split(',')[1], 'base64'));
for (const v of ['front','left','back']) fs.writeFileSync(`${OUT}/${tag}-${v}.png`, Buffer.from(out[v].split(',')[1], 'base64'));
await b.close(); s.close();
