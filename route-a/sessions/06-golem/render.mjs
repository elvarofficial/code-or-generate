// Usage: node render.mjs <outdir>
import { chromium } from 'file:///D:/elvar/cog-runs/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2] || '.';
const ROOT = 'D:/elvar/cog-runs';
const MOD = ROOT + '/06-golem/route-a/06-golem.js';
const ASSET = ROOT + '/06-golem/assets/06-golem/';

const html = `<!doctype html><html><body style="margin:0;background:#fff">
<script type="importmap">{"imports":{"three":"http://x/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import * as M from 'http://x/golem.js?${Date.now()}';
const fn = M.default || Object.values(M).find(v => typeof v === 'function');
const g = fn();
let tris = 0;
g.updateMatrixWorld(true);
g.traverse(o => { if (o.isMesh) { const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } });
const box = new THREE.Box3().setFromObject(g);
window.info = { tris, box: [box.min.toArray(), box.max.toArray()] };
const S = 1024;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(S, S); r.setClearColor(0xffffff, 1);
r.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
scene.add(g);
scene.add(new THREE.HemisphereLight(0xffffff, 0x777766, 1.6));
const d1 = new THREE.DirectionalLight(0xffffff, 1.6); d1.position.set(1, 2, 3); scene.add(d1);
const d2 = new THREE.DirectionalLight(0xffffff, 0.8); d2.position.set(-2, 1, -2); scene.add(d2);
// px-space framing: model unit = 1/450 px ; image 1024px; feet at py=955
const k = 1 / 450, H = 1024 * k, cy = (955 - 512) * k;
const ZC = 510; // left-view pixel of z=0
const cam = new THREE.OrthographicCamera(-H/2, H/2, H/2, -H/2, 0.01, 100);
const views = {
  front: [new THREE.Vector3(0, cy, 20), new THREE.Vector3(0, cy, 0), 0],
  left:  [new THREE.Vector3(20, cy, (ZC - 512) * k), new THREE.Vector3(0, cy, (ZC - 512) * k), 0],
  back:  [new THREE.Vector3(0, cy, -20), new THREE.Vector3(0, cy, 0), 0],
};
window.shots = {};
for (const [n, [p, t]] of Object.entries(views)) {
  cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(t); cam.updateProjectionMatrix();
  r.render(scene, cam);
  window.shots[n] = r.domElement.toDataURL('image/png');
}
// composites
async function load(src) { const i = new Image(); i.src = src; await i.decode(); return i; }
window.comps = {};
for (const n of Object.keys(views)) {
  const ref = await load('http://page/ref/' + n + '.png');
  const ren = await load(window.shots[n]);
  const c = document.createElement('canvas'); c.width = S * 3; c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(ref, 0, 0, S, S); x.drawImage(ren, S, 0, S, S);
  // silhouette overlay
  const a = document.createElement('canvas'); a.width = a.height = S; const ax = a.getContext('2d');
  ax.drawImage(ref, 0, 0, S, S); const A = ax.getImageData(0, 0, S, S).data;
  ax.clearRect(0,0,S,S); ax.drawImage(ren, 0, 0, S, S); const B = ax.getImageData(0, 0, S, S).data;
  const o = ax.createImageData(S, S); let inter = 0, uni = 0;
  for (let i = 0; i < S * S; i++) {
    const ma = (A[i*4] + A[i*4+1] + A[i*4+2]) < 3 * 235, mb = (B[i*4] + B[i*4+1] + B[i*4+2]) < 3 * 245;
    let c4 = [255,255,255];
    if (ma && mb) { c4 = [150,150,150]; inter++; } else if (ma) { c4 = [230,60,60]; } else if (mb) { c4 = [60,90,230]; }
    if (ma || mb) uni++;
    o.data.set([...c4, 255], i * 4);
  }
  ax.putImageData(o, 0, 0);
  x.drawImage(a, S * 2, 0);
  x.fillStyle = '#000'; x.font = '28px sans-serif';
  x.fillText(n + ' ref | render | red=ref only, blue=render only  IoU=' + (inter/uni).toFixed(3), 10, 30);
  window.comps[n] = c.toDataURL('image/png');
  window.info['iou_' + n] = +(inter/uni).toFixed(3);
}
window.done = true;
</script></body></html>`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', m => console.log('console:', m.text()));
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.route('http://x/**', async route => {
  const u = new URL(route.request().url());
  let f;
  if (u.pathname === '/three.module.js') f = ROOT + '/node_modules/three/build/three.module.js';
  else if (u.pathname === '/three.core.js') f = ROOT + '/node_modules/three/build/three.core.js';
  else if (u.pathname === '/golem.js') f = MOD;
  else if (u.pathname.startsWith('/ref/')) f = ASSET + path.basename(u.pathname);
  if (!f) return route.fulfill({ status: 404 });
  const ct = f.endsWith('.png') ? 'image/png' : 'text/javascript';
  route.fulfill({ status: 200, contentType: ct, body: fs.readFileSync(f), headers: { 'Access-Control-Allow-Origin': '*' } });
});
await page.route('http://page/**', r => { const u = new URL(r.request().url()); if (u.pathname.startsWith('/ref/')) return r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(ASSET + path.basename(u.pathname)) }); return r.fulfill({ status: 200, contentType: 'text/html', body: html }); });
await page.goto('http://page/');
await page.waitForFunction(() => window.done, null, { timeout: 120000 });
const info = await page.evaluate(() => window.info);
console.log(JSON.stringify(info));
const data = await page.evaluate(() => ({ shots: window.shots, comps: window.comps }));
fs.mkdirSync(OUT, { recursive: true });
for (const [k, v] of Object.entries(data.shots)) fs.writeFileSync(path.join(OUT, 'render_' + k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
for (const [k, v] of Object.entries(data.comps)) fs.writeFileSync(path.join(OUT, 'compare_' + k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
await browser.close();
