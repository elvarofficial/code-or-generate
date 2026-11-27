// Article images, same studio as the live page.
//   article/hero-06-golem.png  section 1: the golem, Code on the left, Tripo API on the right
//   article/asset-NN-name.png  section 4: reference | Code | Tripo API with the numbers from results.csv
// Run: node hero.js
import fs from "node:fs";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

const LIST = JSON.parse(fs.readFileSync("assets.json", "utf8"));
const ASSETS = Object.fromEntries(LIST.map((a) => [a.id, [a.name, a.tests.replace(", and it walks", "")]]));
const POS = Object.fromEntries(LIST.map((a, i) => [a.id, String(i + 1).padStart(2, "0")]));
const [head, ...lines] = fs.readFileSync("results.csv", "utf8").trim().split(/\r?\n/);
const cols = head.split(",");
const rows = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));
const row = (a, r) => rows.find((x) => x.asset === a && x.route === r);
const mean = (x) => ((+x.iou_front + +x.iou_left + +x.iou_back) / 3).toFixed(2);

fs.mkdirSync("article", { recursive: true });
fs.writeFileSync(
  "lib/hero.html",
  fs.readFileSync("lib/measure.html", "utf8").replace("/lib/measure-page.js", "/lib/hero-page.js").replace("<title>measure</title>", "<title>hero</title>")
);
const { url, close } = await serve(process.cwd());
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">`;
const BASE_CSS = `body{margin:0;width:1920px;height:1080px;position:relative;overflow:hidden;font-family:Inter,sans-serif;color:#f1efe9;background:#0b0c10;-webkit-font-smoothing:antialiased}
  .k{font:500 21px "JetBrains Mono",monospace;letter-spacing:.16em;color:#8a877f;text-transform:uppercase}
  .l{position:absolute;bottom:36px;transform:translateX(-50%);text-align:center;white-space:nowrap}
  .l b{display:block;font-size:38px;font-weight:700;letter-spacing:-.02em}
  .l i{display:inline-block;margin:12px 0 14px;width:54px;height:4px;border-radius:2px}
  .l em{display:block;font:500 34px "JetBrains Mono",monospace;font-style:normal;color:#f1efe9}
  .l small{display:block;margin-top:6px;font:500 19px "JetBrains Mono",monospace;color:#9a978f}`;

// Blender Cycles renders (blender/studio.py) win over the three.js fallback when they exist
function blender(mode, asset) {
  const png = `renders/blender/${mode}-${asset}.png`;
  if (!fs.existsSync(png)) return null;
  const meta = JSON.parse(fs.readFileSync(png.replace(".png", ".json"), "utf8"));
  return { png: `data:image/png;base64,${fs.readFileSync(png).toString("base64")}`, xs: meta.label_x };
}

async function render(page, opts) {
  await page.goto(`${url}/lib/hero.html`);
  await page.waitForFunction(() => window.ready === true);
  return page.evaluate((o) => window.setup(o), opts);
}
const codeFile = (a) => (fs.existsSync(`route-a/${a}.step3.js`) ? `route-a/${a}.step3.js` : `route-a/${a}.js`);
const label = (x, name, color, r, tripo) =>
  `<div class="l" style="left:${x}px"><b>${name}</b><i style="background:${color}"></i>` +
  (r ? `<em>match ${mean(r)}</em><small>${(+r.triangles).toLocaleString("en-US")} tris · ${(+r.minutes).toFixed(1)} min · ${tripo ? `${r.tripo_credits} credits` : `$${(+r.llm_cost_usd).toFixed(2)}`}</small>` : "") +
  `</div>`;

// section 1 hero
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const { png, xs } = blender("hero", "06-golem") || (await render(page, { asset: "06-golem", codeFile: codeFile("06-golem") }));
  await page.setContent(`<!doctype html><html><head>${FONTS}<style>${BASE_CSS} img{position:absolute;inset:0}</style></head><body>
    <img src="${png}"><div class="k" style="position:absolute;top:64px;left:80px">same concept sheet · same camera · same light</div>
    ${label(xs[0], "Code", "#c97f1e")}${label(xs[1], "Tripo API", "#4499e0")}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "article/hero-06-golem.png" });
  console.log("article/hero-06-golem.png");
  await page.close();
}
// tier 5: one hero frame per statue that has a Blender hero render, with its numbers under each side
for (const asset of LIST.slice(20).map((a) => a.id)) {
  const b = blender("hero", asset);
  if (!b) continue;
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent(`<!doctype html><html><head>${FONTS}<style>${BASE_CSS} img{position:absolute;inset:0}
    .t{position:absolute;top:96px;left:80px;font-size:56px;font-weight:700;letter-spacing:-.035em}</style></head><body>
    <img src="${b.png}"><div class="k" style="position:absolute;top:64px;left:80px">tier 5 · ${POS[asset]} · same sheet, camera, light</div>
    <div class="t">${ASSETS[asset][0]}</div>
    ${label(b.xs[0], "Code", "#c97f1e", row(asset, "Code"), false)}${label(b.xs[1], "Tripo API", "#4499e0", row(asset, "Tripo API"), true)}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `article/hero-${asset}.png` });
  console.log(`article/hero-${asset}.png`);
  await page.close();
}

// section 4 asset cards
for (const [asset, [name, tests]] of Object.entries(ASSETS)) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  const RW = 1380;
  const { png, xs } = blender("card", asset) || (await render(page, { asset, codeFile: codeFile(asset), w: 1920, h: 1080, center: 1920 - RW / 2, height: 1.22, maxWidth: 1.15, gap: 1.0, targetY: 0.5 }));
  const ref = `data:image/png;base64,${fs.readFileSync(`assets/${asset}/front.png`).toString("base64")}`;
  await page.setContent(`<!doctype html><html><head>${FONTS}<style>${BASE_CSS}
    .r3d{position:absolute;inset:0;width:1920px;height:1080px}
    .left{position:absolute;top:0;left:0;width:${1920 - RW}px;height:1080px;padding:84px 64px;box-sizing:border-box;background:linear-gradient(90deg,rgba(8,9,12,.72) 55%,rgba(8,9,12,0))}
    h2{margin:18px 0 6px;font-size:58px;letter-spacing:-.035em;line-height:1.02}
    p{margin:0;color:#9a978f;font-size:24px}
    .ref{margin-top:56px;width:400px;height:400px;border-radius:22px;background:#fff;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.5)}
    .ref img{width:100%;height:100%;object-fit:contain}
    .cap{margin-top:18px;font:500 18px "JetBrains Mono",monospace;color:#7d7a73;letter-spacing:.08em;text-transform:uppercase}
    </style></head><body>
    <img class="r3d" src="${png}">
    <div class="left"><div class="k">${POS[asset]} / ${LIST.length}</div><h2>${name}</h2><p>${tests}</p>
      <div class="ref"><img src="${ref}"></div><div class="cap">Reference · front view</div></div>
    ${label(xs[0], "Code", "#c97f1e", row(asset, "Code"), false)}
    ${label(xs[1], "Tripo API", "#4499e0", row(asset, "Tripo API"), true)}
    </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `article/asset-${asset}.png` });
  console.log(`article/asset-${asset}.png`);
  await page.close();
}
await browser.close();
close();
