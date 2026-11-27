// Route B: every asset in assets/ through the Tripo API (multiview to model, P series).
// Same settings for all six. An asset with a successful task in route-b/tasks.json is skipped.
// A failed task is retried with model_seed + 1, at most 2 retries. Every attempt is logged.
//
// Run:            node --env-file=.env tripo.js
// Manual retry:   node --env-file=.env tripo.js --retry 05-wolf "why it is clearly broken"
//                 (only for a clearly broken model: missing half, hole through the body)
// Docs: https://developers.tripo3d.com/en/docs (Quick Start, File Upload, Multiview to 3D Model (P Series), Task Query)

import fs from "node:fs";
import path from "node:path";

const BASE = "https://openapi.tripo3d.ai/v3";
const KEY = process.env.TRIPO_API_KEY;
if (!KEY) throw new Error("TRIPO_API_KEY is not set");
const AUTH = { Authorization: `Bearer ${KEY}` };

const VIEWS = ["front", "left", "back"];
const SETTINGS = {
  model: "P2-20260801",
  face_limit: 20000,
  texture: true,
  pbr: true,
  model_seed: 42,
};
const MAX_RETRIES = 2;
const TASKS = "route-b/tasks.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readLog = () => (fs.existsSync(TASKS) ? JSON.parse(fs.readFileSync(TASKS, "utf8")) : []);
const writeLog = (log) => fs.writeFileSync(TASKS, JSON.stringify(log, null, 2));

async function api(method, url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: body ? { ...AUTH, "Content-Type": "application/json" } : AUTH,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

async function upload(file) {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)], { type: "image/png" }), path.basename(file));
  const res = await fetch(`${BASE}/files`, { method: "POST", headers: AUTH, body: form });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`upload ${file} -> ${res.status} ${JSON.stringify(json)}`);
  return json.data.file_token;
}

async function attempt(asset, n, seed, reason) {
  const inputs = [];
  for (const view of VIEWS) inputs.push({ [view]: await upload(`assets/${asset}/${view}.png`) });
  const body = { ...SETTINGS, model_seed: seed, inputs };
  console.log(`\n${asset}, attempt ${n}, request body:`);
  console.log(JSON.stringify(body, null, 2));

  const startedAt = new Date();
  const { task_id } = await api("POST", "/generation/multiview-to-model", body);
  console.log(`task ${task_id}`);
  let task;
  while (true) {
    await sleep(5000);
    task = await api("GET", `/tasks/${task_id}`);
    if (!["queued", "running"].includes(task.status)) break;
  }
  const endedAt = new Date();

  if (task.status === "success") {
    // model URLs expire after 5 minutes, download right away
    const glb = Buffer.from(await (await fetch(task.output.model_url)).arrayBuffer());
    fs.writeFileSync(`route-b/${asset}.glb`, glb);
  }
  const entry = {
    asset,
    attempt: n,
    ...(reason ? { retry_reason: reason } : {}),
    request: body,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    seconds_waited: Math.round((endedAt - startedAt) / 1000),
    task,
  };
  const log = readLog();
  log.push(entry);
  writeLog(log);
  console.log(`${asset}: ${task.status}, ${entry.seconds_waited} s, ${task.credits_consumed} credits`);
  return entry;
}

function summary() {
  const log = readLog().filter((e) => /^\d\d-/.test(e.asset));
  const rows = {};
  for (const e of log) {
    const r = (rows[e.asset] ||= { asset: e.asset, attempts: 0, seconds_waited: 0, credits_consumed: 0, output: "" });
    r.attempts += 1;
    r.seconds_waited += e.seconds_waited;
    r.credits_consumed += Number(e.task.credits_consumed || 0);
    if (e.task.status === "success") r.output = `route-b/${e.asset}.glb`;
  }
  console.log("");
  console.table(Object.values(rows));
}

async function main() {
  const retryIdx = process.argv.indexOf("--retry");
  if (retryIdx > -1) {
    const asset = process.argv[retryIdx + 1];
    const reason = process.argv[retryIdx + 2];
    if (!reason) throw new Error("a manual retry needs a reason");
    const tries = readLog().filter((e) => e.asset === asset);
    if (tries.length > MAX_RETRIES) throw new Error(`${asset}: no retries left`);
    await attempt(asset, tries.length + 1, SETTINGS.model_seed + tries.length, reason);
    return summary();
  }

  const assets = fs.readdirSync("assets").filter((d) => /^\d\d-/.test(d)).sort();
  for (const asset of assets) {
    const tries = readLog().filter((e) => e.asset === asset);
    if (tries.some((e) => e.task.status === "success")) {
      console.log(`${asset}: already has a successful task, skip`);
      continue;
    }
    for (let n = tries.length + 1; n <= 1 + MAX_RETRIES; n++) {
      const entry = await attempt(asset, n, SETTINGS.model_seed + (n - 1), n > 1 ? "previous task failed" : undefined);
      if (entry.task.status === "success") break;
    }
  }
  summary();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
