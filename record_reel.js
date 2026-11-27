// Reel for the quote posts: the live page in ?reel mode, each asset close up, Code then the scan into Tripo API.
// Frame-exact on a virtual clock, 30 fps. Run: node record_reel.js [url]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

const FPS = 30, W = 1920, H = 1080, PER = 2.0, FLIP_AT = 0.7;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const OUT = "clips/frames-reel";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const local = process.argv[2] ? null : await serve(path.resolve("dist"));
// each asset opens on Code and scans into Tripo API, so the page starts on Code; ?hq keeps the resolution fixed
const url = (process.argv[2] || `${local.url}/`) + "?reel&route=code&hq";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.clock.install({ time: 0 });
await page.goto(url);
for (let i = 0; i < 600; i++) {
  await page.clock.runFor(100);
  await page.waitForTimeout(60);
  if (await page.evaluate(() => document.getElementById("loader")?.classList.contains("done") && window.__dbg?.state.tripoReady)) break;
}
await page.evaluate(() => window.__reel.focus(0));
await page.clock.runFor(2200); // lights come up, camera settles on the crate

const N = await page.evaluate(() => window.__dbg.slots.length);
const END = N * PER + 0.4;
for (let f = 0; f < END * FPS; f++) {
  const t = f / FPS;
  const i = Math.min(N - 1, Math.floor(t / PER));
  const local_t = t - i * PER;
  if (Math.abs(local_t) < 0.5 / FPS && i > 0) await page.evaluate((k) => (window.__reel.route("code", false), window.__reel.focus(k)), i);
  if (Math.abs(local_t - FLIP_AT) < 0.5 / FPS) await page.evaluate(() => window.__reel.route("tripo"));
  await page.clock.runFor(1000 / FPS);
  await page.screenshot({ path: `${OUT}/${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 });
}
await browser.close();
local?.close();
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${OUT}/%04d.jpg`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart", "clips/reel-code-to-tripo.mp4"]);
fs.rmSync(OUT, { recursive: true, force: true });
console.log("clips/reel-code-to-tripo.mp4");
