import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module';
const require = createRequire('D:/elvar/cog-runs/package.json');
const { chromium } = require('playwright');
const SCR = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const COG = 'D:/elvar/cog-runs';
const types = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png' };
const srv = http.createServer((q, res) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  const p = u.startsWith('/cog/') ? path.join(COG, u.slice(5)) : path.join(SCR, u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise(r => srv.listen(8791, r));
const tag = process.argv[2] || 'r0';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage();
pg.on('console', m => console.log('console:', m.text())); pg.on('pageerror', e => console.log('err:', e.message));
await pg.goto('http://localhost:8791/view.html');
await pg.waitForFunction(() => window.done, null, { timeout: 60000 });
console.log('triangles', await pg.evaluate(() => window.tris));
// compose side by side
for (const k of ['front', 'left', 'back']) {
  const shot = await pg.evaluate(k => window.shots[k], k);
  const ref = 'data:image/png;base64,' + fs.readFileSync(`${COG}/07-chest/assets/07-chest/${k}.png`).toString('base64');
  const out = await pg.evaluate(async ([a, r]) => {
    const load = s => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
    const [ia, ir] = await Promise.all([load(a), load(r)]);
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
    const x = c.getContext('2d'); x.drawImage(ir, 0, 0, 1024, 1024); x.drawImage(ia, 1024, 0);
    x.strokeStyle = 'rgba(255,0,0,0.4)'; for (const y of [830, 495, 195]) { x.beginPath(); x.moveTo(0, y); x.lineTo(2048, y); x.stroke(); }
    return c.toDataURL('image/png');
  }, [shot, ref]);
  fs.writeFileSync(`${SCR}/${tag}-${k}.png`, Buffer.from(out.split(',')[1], 'base64'));
}
await b.close(); srv.close();
