// Step 6 clips: 5 seconds of the golem walking, same side-on camera, both routes.
// Frames are rendered on a virtual clock (fixed 1/30 s steps), then encoded with ffmpeg,
// and stacked side by side with the route names.
// Run: node walk_clip.js [code|tripo|both]   (FFMPEG env var or ffmpeg on PATH)

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

const FPS = 30, SECONDS = 5;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const which = process.argv[2] || "both";
const routes = which === "both" ? ["code", "tripo"] : [which];
fs.mkdirSync("clips", { recursive: true });

const { url, close } = await serve(process.cwd());
const browser = await chromium.launch({
  args: ["--use-angle=d3d11", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--enable-webgl"],
});

for (const route of routes) {
  const file = route === "code" ? "route-a/06-golem.js" : "route-b/06-golem-walk.glb";
  if (!fs.existsSync(file)) {
    console.log(`${route}: ${file} missing, skip`);
    continue;
  }
  const dir = `clips/frames-${route}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(`${url}/lib/clip.html`);
  await page.waitForFunction(() => window.ready === true);
  await page.evaluate((r) => window.setup(r), route);
  for (let i = 0; i < FPS * SECONDS; i++) {
    const jpg = await page.evaluate((dt) => window.frame(dt), i === 0 ? 0 : 1 / FPS);
    fs.writeFileSync(`${dir}/${String(i).padStart(4, "0")}.jpg`, Buffer.from(jpg.split(",")[1], "base64"));
  }
  await page.close();
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${dir}/%04d.jpg`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", `clips/06-golem-walk-${route}.mp4`]);
  console.log(`clips/06-golem-walk-${route}.mp4`);
}
await browser.close();
close();

if (fs.existsSync("clips/06-golem-walk-code.mp4") && fs.existsSync("clips/06-golem-walk-tripo.mp4")) {
  const font = "C\\:/Windows/Fonts/segoeuib.ttf";
  const label = (t) => `drawtext=fontfile='${font}':text='${t}':fontcolor=white@0.92:fontsize=46:x=56:y=56`;
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error",
    "-i", "clips/06-golem-walk-code.mp4",
    "-i", "clips/06-golem-walk-tripo.mp4",
    "-filter_complex", `[0:v]${label("Code")}[a];[1:v]${label("Tripo API")}[b];[a]pad=iw+16:ih:0:0:color=0x101116[a2];[a2][b]hstack=inputs=2[v]`,
    "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17",
    "clips/06-golem-walk-side-by-side.mp4",
  ]);
  console.log("clips/06-golem-walk-side-by-side.mp4");
}
