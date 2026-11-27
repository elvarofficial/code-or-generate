// Route B animation for the tier 5 statues, the same three calls the golem got:
// 1. rig-check (free)   2. rig (v3.0-20260909, the rig type rig-check reports, glb)   3. retarget (one preset, in place)
// Every task goes into route-b/tasks.json with its asset and step.
// Run: node --env-file=.env animate_tripo.js check 21-alchemist 22-blacksmith ...   (rig-check only)
//      node --env-file=.env animate_tripo.js full  21-alchemist ...                (all three calls)

import fs from "node:fs";

const BASE = "https://openapi.tripo3d.ai/v3";
const AUTH = { Authorization: `Bearer ${process.env.TRIPO_API_KEY}` };
const TASKS = "route-b/tasks.json";
const RIG_MODEL = "v3.0-20260909";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [mode, ...assets] = process.argv.slice(2);

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

async function run(asset, step, url, body) {
  const startedAt = new Date();
  const { task_id } = await api("POST", url, body);
  let task;
  while (true) {
    await sleep(4000);
    task = await api("GET", `/tasks/${task_id}`);
    if (!["queued", "running"].includes(task.status)) break;
  }
  const endedAt = new Date();
  const entry = { asset, step, request: body, started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), seconds_waited: Math.round((endedAt - startedAt) / 1000), task };
  const log = JSON.parse(fs.readFileSync(TASKS, "utf8"));
  log.push(entry);
  fs.writeFileSync(TASKS, JSON.stringify(log, null, 2));
  console.log(`${asset} ${step}: ${task.status}, ${entry.seconds_waited} s, ${task.credits_consumed ?? 0} credits`);
  if (task.status !== "success") throw new Error(`${asset} ${step} ended ${task.status}: ${JSON.stringify(task)}`);
  return task;
}

const download = async (url, file) => fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));

async function animate(asset) {
  const log = JSON.parse(fs.readFileSync(TASKS, "utf8"));
  const model = log.find((e) => e.asset === asset && e.task.type === "multiview_to_model" && e.task.status === "success");
  if (!model) throw new Error(`no successful model for ${asset} in tasks.json`);
  const input = model.task.task_id;

  const check = await run(asset, "rig-check", "/animations/rig-check", { input });
  console.log(`${asset} rig-check output:`, JSON.stringify(check.output));
  if (mode !== "full") return;
  if (!check.output?.riggable) throw new Error(`${asset}: rig-check says not riggable`);

  const rigType = check.output.rig_type || "biped";
  // a rig that already succeeded is reused, so a retry never pays for it twice
  const done = JSON.parse(fs.readFileSync(TASKS, "utf8")).findLast((e) => e.asset === asset && e.step === "rig" && e.task.status === "success");
  const rig = done ? done.task : await run(asset, "rig", "/animations/rig", { input, model: RIG_MODEL, rig_type: rigType, out_format: "glb" });
  if (!done) await download(rig.output.model_url, `route-b/${asset}-rigged.glb`);
  // the walk preset that matches the rig: the golem got the biped one, four legs get the quadruped one
  const animations = process.env.ANIMS ? process.env.ANIMS.split(",") : rigType === "quadruped" ? ["preset:quadruped:walk"] : ["preset:idle", "preset:walk"];
  const retarget = await run(asset, "retarget", "/animations/retarget", { input: rig.task_id, animations, out_format: "glb", animate_in_place: true });
  const out = retarget.output || {};
  if (out.model_url) await download(out.model_url, `route-b/${asset}-walk.glb`);
  console.log(`${asset}: saved route-b/${asset}-walk.glb`);
}

for (const asset of assets) {
  try {
    await animate(asset);
  } catch (e) {
    console.error(e.message);
  }
}
