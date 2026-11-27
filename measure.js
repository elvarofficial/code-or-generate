// Step 5: measure both routes the same way.
// For every asset and both routes: load the model into three.js, scale it to the reference height,
// center it, render front / left / back with the same orthographic camera on white, turn render and
// reference into silhouette masks (every material swapped to black, holes inside the outline filled),
// IoU = overlap / union, count triangles.
// Writes results.csv, measure/results.json, measure/side-by-side/, measure/renders/, measure/masks/.
//
// Run: node measure.js            (all assets)
//      node measure.js 05-wolf    (one asset)

import fs from "node:fs";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

const ASSETS = fs.readdirSync("assets").filter((d) => /^\d\d-/.test(d)).sort();
const VIEWS = ["front", "left", "back"];
const ROUTES = [
  // the step 3 build; the golem module is extended with a walk in step 6, its step 3 copy is kept as .step3.js
  { key: "code", label: "Code", file: (a) => (fs.existsSync(`route-a/${a}.step3.js`) ? `route-a/${a}.step3.js` : `route-a/${a}.js`) },
  { key: "tripo", label: "Tripo API", file: (a) => `route-b/${a}.glb` },
];
const OUT = "measure";

const readJson = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);
const saveDataUrl = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));

// minutes and cost: route A from the session notes (step 3), route B from tasks.json (step 4)
function costs(asset, route) {
  if (route === "code") {
    const n = readJson("route-a/notes.json", {})[asset];
    if (!n) return {};
    return { minutes: n.minutes, llm_cost_usd: n.llm_cost_usd, tripo_credits: 0, attempts: 1 + n.fix_rounds };
  }
  // step 4 generations only; the walk test (rig-check, rig, retarget) is counted separately
  const tries = readJson("route-b/tasks.json", []).filter((e) => e.asset === asset && e.task.type === "multiview_to_model");
  if (!tries.length) return {};
  return {
    minutes: tries.reduce((s, e) => s + e.seconds_waited, 0) / 60,
    llm_cost_usd: 0,
    tripo_credits: tries.reduce((s, e) => s + Number(e.task.credits_consumed || 0), 0),
    attempts: tries.length,
  };
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const assets = only.length ? ASSETS.filter((a) => only.includes(a)) : ASSETS;
  for (const d of ["side-by-side", "renders", "masks"]) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });

  const { url, close } = await serve(process.cwd());
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(`${url}/lib/measure.html`);
  await page.waitForFunction(() => window.ready === true);

  const all = readJson(`${OUT}/results.json`, {});
  for (const asset of assets) {
    const got = {};
    for (const r of ROUTES) {
      if (!fs.existsSync(r.file(asset))) {
        console.log(`${asset} ${r.label}: no model yet, skip`);
        continue;
      }
      try {
        await page.evaluate((f) => (window.codeFile = f), r.key === "code" ? r.file(asset) : null);
        const m = await page.evaluate(([a, k]) => window.measure(a, k), [asset, r.key]);
        got[r.key] = m;
        for (const v of VIEWS) {
          saveDataUrl(`${OUT}/renders/${asset}-${r.key}-${v}.png`, m.views[v].render);
          saveDataUrl(`${OUT}/masks/${asset}-${r.key}-${v}.png`, m.views[v].overlay);
        }
        all[`${asset}|${r.key}`] = {
          asset,
          route: r.label,
          ...costs(asset, r.key),
          triangles: m.triangles,
          iou_front: m.views.front.iou,
          iou_left: m.views.left.iou,
          iou_back: m.views.back.iou,
        };
        const ious = VIEWS.map((v) => m.views[v].iou.toFixed(3)).join(" / ");
        console.log(`${asset} ${r.label}: ${m.triangles} triangles, IoU ${ious}`);
      } catch (e) {
        console.error(`${asset} ${r.label}: ${e.message}`);
      }
    }
    for (const v of VIEWS) {
      const panel = (k, label) => ({
        label,
        url: got[k] ? `/${OUT}/renders/${asset}-${k}-${v}.png` : null,
        note: got[k] ? `silhouette match ${got[k].views[v].iou.toFixed(2)}` : "not built yet",
      });
      const png = await page.evaluate(([a, view, panels]) => window.sideBySide(a, view, panels), [
        asset,
        v,
        [{ label: "Reference", url: `/assets/${asset}/${v}.png` }, panel("code", "Code"), panel("tripo", "Tripo API")],
      ]);
      saveDataUrl(`${OUT}/side-by-side/${asset}-${v}.png`, png);
    }
  }
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(all, null, 2));
  await browser.close();
  close();
  writeCsv(all);
}

function writeCsv(all) {
  const cols = ["asset", "route", "minutes", "llm_cost_usd", "tripo_credits", "attempts", "triangles", "iou_front", "iou_left", "iou_back"];
  const fmt = (k, v) => {
    if (v === undefined || v === null) return "";
    if (k === "minutes") return v.toFixed(1);
    if (k === "llm_cost_usd") return v.toFixed(2);
    if (k.startsWith("iou")) return v.toFixed(3);
    return String(v);
  };
  const rows = [];
  for (const asset of ASSETS)
    for (const r of ROUTES) {
      const row = all[`${asset}|${r.key}`];
      if (row) rows.push(cols.map((c) => fmt(c, row[c])).join(","));
    }
  fs.writeFileSync("results.csv", [cols.join(","), ...rows].join("\n") + "\n");
  console.log(`results.csv: ${rows.length} rows`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
