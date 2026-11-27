// Frame-time probe for the live page: load, idle on the overview, flip the route, flip back.
// Run: node perf.js [query] [dpr]   e.g. node perf.js "" 1   or   node perf.js "?nobloom" 2
// Prints load time and the warm-up marks, then p50 / p95 / worst frame and the count of frames over 25 ms for each phase.
// Runs with vsync off, so the numbers are what the GPU could do, not the display rate.
import path from "node:path";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

const query = process.argv[2] || "";
const dpr = +(process.argv[3] || 1);
const local = await serve(path.resolve("dist"));
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--enable-webgl", "--disable-frame-rate-limit", "--disable-gpu-vsync"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dpr });
page.on("console", (m) => m.type() === "warning" || m.type() === "error" ? console.log("  page:", m.text()) : 0);
const t0 = Date.now();
await page.goto(`${local.url}/${query}`);
await page.waitForFunction(() => document.getElementById("loader")?.classList.contains("done"), null, { timeout: 120000 });
const tLoader = Date.now() - t0;
await page.waitForFunction(() => window.__dbg?.state.tripoReady && window.__dbg?.state.codeReady !== false, null, { timeout: 120000 }).catch(() => {});
const tAll = Date.now() - t0;

// frame recorder inside the page
await page.evaluate(() => {
  window.__ft = [];
  let last = performance.now();
  const loop = (t) => { window.__ft.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});
const phase = async (name, ms, action) => {
  await page.evaluate(() => (window.__ft.length = 0));
  if (action) await action();
  await page.waitForTimeout(ms);
  const ft = await page.evaluate(() => window.__ft.slice(1));
  const s = [...ft].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]?.toFixed(1);
  // the program count must not grow after the loader: a new program is a shader compiled mid-click
  const info = await page.evaluate(() => `${window.__dbg.renderer.info.programs.length} programs`);
  console.log(`${name.padEnd(14)} ${String(ft.length).padStart(4)} frames  p50 ${q(0.5)}  p95 ${q(0.95)}  worst ${s.at(-1)?.toFixed(1)}  >25ms ${ft.filter((x) => x > 25).length}   ${info}`);
};
console.log(`query "${query}" dpr ${dpr}: loader ${tLoader} ms, everything ${tAll} ms`);
// where the loader time went: models loaded, then textures, programs and the two warm frames
console.log(" ", await page.evaluate(() => performance.getEntriesByType("mark").filter((m) => m.name.startsWith("warm")).map((m) => `${m.name} ${m.startTime.toFixed(0)}`).join(" | ")));
const other = await page.evaluate(() => (window.__dbg.state.route === "code" ? "tripo" : "code"));
const first = await page.evaluate(() => window.__dbg.state.route);
await phase("idle", 5000);
await phase(`-> ${other}`, 2500, () => page.click(`.switch button[data-route="${other}"]`));
await phase(`-> ${first}`, 2500, () => page.click(`.switch button[data-route="${first}"]`));
await phase(`-> ${other} 2`, 2500, () => page.click(`.switch button[data-route="${other}"]`));
await phase("idle 2", 4000);
await phase("mesh", 2500, () => page.click("#mesh"));
await browser.close();
local.close();
