// Put labels over the Blender frame sequences and encode the article / quote videos.
//   node compose_video.js walk   -> clips/06-golem-walk-blender.mp4   (renders/blender/walk)
//   node compose_video.js reel   -> clips/reel-turntable.mp4          (renders/blender/turn/<asset>, 6 segments, crossfades)
// Labels are drawn once as transparent PNGs in Chromium (Inter / JetBrains Mono), then overlaid by ffmpeg.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const mode = process.argv[2] || "walk";
const LIST = JSON.parse(fs.readFileSync("assets.json", "utf8"));
const NAMES = Object.fromEntries(LIST.map((a) => [a.id, [a.name, a.tests.replace(", and it walks", "")]]));
const POS = Object.fromEntries(LIST.map((a, i) => [a.id, String(i + 1).padStart(2, "0")]));
const SEG_FRAMES = Number(process.env.SEG_FRAMES || 60);
const [head, ...lines] = fs.readFileSync("results.csv", "utf8").trim().split(/\r?\n/);
const cols = head.split(",");
const rows = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));
const row = (a, r) => rows.find((x) => x.asset === a && x.route === r);
const mean = (x) => ((+x.iou_front + +x.iou_left + +x.iou_back) / 3).toFixed(2);

const CSS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>html,body{margin:0;width:1920px;height:1080px;background:transparent;font-family:Inter,sans-serif;color:#f1efe9;-webkit-font-smoothing:antialiased}
.k{position:absolute;top:70px;left:84px;font:500 21px "JetBrains Mono",monospace;letter-spacing:.16em;color:#8a877f;text-transform:uppercase}
.t{position:absolute;top:104px;left:84px;font-size:58px;font-weight:700;letter-spacing:-.035em}
.l{position:absolute;bottom:40px;transform:translateX(-50%);text-align:center;white-space:nowrap}
.l b{display:block;font-size:38px;font-weight:700;letter-spacing:-.02em}
.l i{display:inline-block;margin:12px 0 12px;width:54px;height:4px;border-radius:2px}
.l small{display:block;font:500 21px "JetBrains Mono",monospace;color:#a7a49c}</style>`;

async function overlay(page, html, file) {
  await page.setContent(`<!doctype html><html><head>${CSS}</head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: file, omitBackground: true });
}
// walk.py and turntable.py use the hero camera; older json files carry a stale x, so fall back to the hero render's
const HERO_X = JSON.parse(fs.readFileSync("renders/blender/hero-06-golem.json", "utf8")).label_x;
const xs = (meta) => (Math.abs(meta.label_x[0] - meta.label_x[1]) < 50 ? HERO_X : meta.label_x);
const label = (x, name, color, small) => `<div class="l" style="left:${x}px"><b>${name}</b><i style="background:${color}"></i><small>${small}</small></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
fs.mkdirSync("clips", { recursive: true });
fs.mkdirSync("renders/blender/overlays", { recursive: true });

if (mode === "walk") {
  const meta = JSON.parse(fs.readFileSync("renders/blender/walk/walk.json", "utf8"));
  const notes = JSON.parse(fs.readFileSync("route-a/notes.json", "utf8"))["06-golem-walk"];
  const tasks = JSON.parse(fs.readFileSync("route-b/tasks.json", "utf8")).filter((e) => e.asset === "06-golem" && e.step);
  const sec = tasks.reduce((s, e) => s + e.seconds_waited, 0), cr = tasks.reduce((s, e) => s + Number(e.task.credits_consumed || 0), 0);
  await overlay(page,
    `<div class="k">making it walk · same side-on camera</div><div class="t">Golem boss</div>` +
    label(xs(meta)[0], "Code", "#c97f1e", `coded joints · ${notes.minutes.toFixed(1)} min · $${notes.llm_cost_usd.toFixed(2)}`) +
    label(xs(meta)[1], "Tripo API", "#4499e0", `3 API calls · ${sec} s · $${(cr / 100).toFixed(2)} (${cr} credits)`),
    "renders/blender/overlays/walk.png");
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", "30", "-i", "renders/blender/walk/%04d.png", "-i", "renders/blender/overlays/walk.png",
    "-filter_complex", "[0:v][1:v]overlay=0:0,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-movflags", "+faststart", "clips/06-golem-walk-blender.mp4"]);
  console.log("clips/06-golem-walk-blender.mp4");
}

if (mode === "reel") {
  const segs = [];
  for (const [asset, [name, tests]] of Object.entries(NAMES)) {
    const dir = `renders/blender/turn/${asset}`;
    if (!fs.existsSync(`${dir}/turn.json`)) { console.log(`${asset}: no frames, skip`); continue; }
    const meta = JSON.parse(fs.readFileSync(`${dir}/turn.json`, "utf8"));
    const c = row(asset, "Code"), t = row(asset, "Tripo API");
    const ov = `renders/blender/overlays/turn-${asset}.png`;
    await overlay(page,
      `<div class="k">${POS[asset]} / ${LIST.length} · ${tests}</div><div class="t">${name}</div>` +
      label(xs(meta)[0], "Code", "#c97f1e", `match ${mean(c)} · ${(+c.minutes).toFixed(1)} min · $${(+c.llm_cost_usd).toFixed(2)}`) +
      label(xs(meta)[1], "Tripo API", "#4499e0", `match ${mean(t)} · ${(+t.minutes).toFixed(1)} min · $${(t.tripo_credits / 100).toFixed(2)} (${t.tripo_credits} credits)`),
      ov);
    const seg = `renders/blender/overlays/seg-${asset}.mp4`;
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", "30", "-i", `${dir}/%04d.png`, "-i", ov,
      "-filter_complex", "[0:v][1:v]overlay=0:0,format=yuv420p", "-frames:v", String(SEG_FRAMES), "-c:v", "libx264", "-crf", "15", seg]);
    segs.push({ seg, frames: Math.min(SEG_FRAMES, meta.frames) });
  }
  // crossfade the segments, 0.4 s each
  const XF = 0.4;
  const args = ["-y", "-loglevel", "error"];
  segs.forEach((s) => args.push("-i", s.seg));
  let chain = "", last = "[0:v]", offset = 0;
  for (let i = 1; i < segs.length; i++) {
    offset += segs[i - 1].frames / 30 - XF;
    chain += `${last}[${i}:v]xfade=transition=fade:duration=${XF}:offset=${offset.toFixed(3)}[x${i}];`;
    last = `[x${i}]`;
  }
  args.push("-filter_complex", chain.replace(/;$/, ""), "-map", last, "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "clips/reel-turntable.mp4");
  execFileSync(FFMPEG, args);
  console.log("clips/reel-turntable.mp4");
}
await browser.close();
