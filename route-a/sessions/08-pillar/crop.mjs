// crop top region of renders & refs side by side: node crop.mjs dir
import { createRequire } from 'module';
const require = createRequire('D:/elvar/cog-runs/package.json');
const { chromium } = require('playwright');
import fs from 'fs';
const dir = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage();
const img = k => 'data:image/png;base64,' + fs.readFileSync(k).toString('base64');
const srcs = [];
for (const k of ['front','left']) { srcs.push(img(`D:/elvar/cog-runs/08-pillar/assets/08-pillar/${k}.png`)); srcs.push(img(`${dir}/${k}.png`)); }
const data = await p.evaluate(async (srcs) => {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 300; const x = c.getContext('2d');
  for (let i = 0; i < srcs.length; i++) { const im = new Image(); im.src = srcs[i]; await im.decode(); x.drawImage(im, 300, 40, 400, 300, i * 300, 0, 400*0.75, 300*0.75*1.333); }
  return c.toDataURL();
}, srcs);
fs.writeFileSync(`${dir}/crop.png`, Buffer.from(data.split(',')[1], 'base64'));
await b.close();
