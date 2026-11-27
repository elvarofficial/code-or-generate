import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
import fs from 'fs';
const b = await chromium.launch(); const pg = await b.newPage();
const f = process.argv[2];
const data = fs.readFileSync(f).toString('base64');
const res = await pg.evaluate(async (d) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + d; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const out = [];
  for (const off of [0, 1024]) for (let y = 40; y < 1000; y += 20) {
    const row = x.getImageData(off, y, 1024, 1).data; let l = -1, r = -1;
    for (let i = 0; i < 1024; i++) { const s = row[i*4] + row[i*4+1] + row[i*4+2]; if (s < 600) { if (l < 0) l = i; r = i; } }
    out.push([off ? 'R' : 'ref', y, l, r]);
  }
  return out;
}, data);
const ref = res.filter(r => r[0] === 'ref'), ren = res.filter(r => r[0] === 'R');
for (let i = 0; i < ref.length; i++) console.log(ref[i][1], 'ref', ref[i][2], ref[i][3], ' mine', ren[i][2], ren[i][3]);
await b.close();
