// Screen recording of the live page for the article: frame-exact on a virtual clock, 30 fps, with a cursor.
// Run: node record_switch.js [url]   (default: local server on dist/)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

const FPS = 30, W = 1920, H = 1080;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const OUT = "clips/frames-switch";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const local = process.argv[2] ? null : await serve(path.resolve("dist"));
// ?hq keeps the resolution fixed (no adaptive step-down on the virtual clock)
const url = process.argv[2] || `${local.url}/?hq`;
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.clock.install({ time: 0 });
await page.goto(url);
// models load over the network in real time; advance the page clock while they do
for (let i = 0; i < 600; i++) {
  await page.clock.runFor(100);
  await page.waitForTimeout(60);
  if (await page.evaluate(() => document.getElementById("loader")?.classList.contains("done") && window.__dbg?.state.tripoReady)) break;
}
// start right as the loader closes, so the turntables light up on camera

// cursor overlay
await page.addStyleTag({ content: "#cur{position:fixed;left:0;top:0;width:28px;height:28px;z-index:99;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}" });
await page.evaluate(() => {
  const d = document.createElement("div");
  d.id = "cur";
  d.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 2l7.5 19 2.6-7.9L21 10.6z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(d);
});

const box = async (sel) => {
  const b = await page.locator(sel).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const tripoBtn = await box('.switch button[data-route="tripo"]');
const codeBtn = await box('.switch button[data-route="code"]');
const meshBtn = await box("#mesh");
// the golem closes tier 4 (right end of that row): find it by id and project its centre to the screen
const golemPt = await page.evaluate(({ W, H }) => {
  const { slots, camera, THREE } = window.__dbg;
  const s = slots.find((x) => x.id === "06-golem");
  const v = new THREE.Vector3(s.x, s.y + 0.55, s.z).project(camera);
  return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H };
}, { W, H });

// timeline in seconds: [time, target point, click?]
// the page opens on Tripo API: flip to Code and back, the mesh view on both, then the golem walking on both
const moves = [
  [0.0, { x: W * 0.55, y: H * 0.78 }, false],
  [3.4, codeBtn, true],
  [6.2, meshBtn, true],
  [8.4, tripoBtn, true],
  [10.6, meshBtn, true],
  [13.2, golemPt, true],
  [15.4, codeBtn, true],
  [17.6, tripoBtn, true],
  [19.8, { x: W * 0.6, y: H * 0.8 }, false],
];
const END = 20.4;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let pos = moves[0][1], clicked = new Set();

for (let f = 0; f < END * FPS; f++) {
  const t = f / FPS;
  // move toward the next target over the 0.9 s before it
  for (let i = 1; i < moves.length; i++) {
    const [ti, p] = moves[i], [, p0] = moves[i - 1];
    if (t >= ti - 0.9 && t <= ti) {
      const k = ease((t - (ti - 0.9)) / 0.9);
      pos = { x: p0.x + (p.x - p0.x) * k, y: p0.y + (p.y - p0.y) * k };
    }
    if (t > ti) pos = p;
  }
  await page.evaluate(({ x, y }) => (document.getElementById("cur").style.transform = `translate(${x - 4}px, ${y - 2}px)`), pos);
  for (let i = 1; i < moves.length; i++) {
    const [ti, p, click] = moves[i];
    if (click && t >= ti && !clicked.has(i)) {
      clicked.add(i);
      await page.mouse.click(p.x, p.y);
    }
  }
  await page.clock.runFor(1000 / FPS);
  await page.screenshot({ path: `${OUT}/${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 });
}
await browser.close();
local?.close();
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${OUT}/%04d.jpg`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart", "clips/live-page-switch.mp4"]);
console.log("clips/live-page-switch.mp4");
