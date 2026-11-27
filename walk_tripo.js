// Step 6, route B: make the golem walk with three Tripo API calls.
// 1. rig-check   2. rig (v3.0-20260909, biped, glb)   3. retarget (preset:idle, preset:walk)
// Every task result goes into route-b/tasks.json. The walk is retargeted in place
// (animate_in_place) so it stays on the turntable on the live page.
// Run: node --env-file=.env walk_tripo.js

import fs from "node:fs";

const BASE = "https://openapi.tripo3d.ai/v3";
const AUTH = { Authorization: `Bearer ${process.env.TRIPO_API_KEY}` };
const TASKS = "route-b/tasks.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function run(step, url, body) {
  console.log(`\n${step}, request body:`);
  console.log(JSON.stringify(body, null, 2));
  const startedAt = new Date();
  const { task_id } = await api("POST", url, body);
  let task;
  while (true) {
    await sleep(5000);
    task = await api("GET", `/tasks/${task_id}`);
    if (!["queued", "running"].includes(task.status)) break;
  }
  const endedAt = new Date();
  const entry = {
    asset: "06-golem",
    step,
    request: body,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    seconds_waited: Math.round((endedAt - startedAt) / 1000),
    task,
  };
  const log = JSON.parse(fs.readFileSync(TASKS, "utf8"));
  log.push(entry);
  fs.writeFileSync(TASKS, JSON.stringify(log, null, 2));
  console.log(`${step}: ${task.status}, ${entry.seconds_waited} s, ${task.credits_consumed} credits`);
  if (task.status !== "success") throw new Error(`${step} ended ${task.status}: ${JSON.stringify(task)}`);
  return task;
}

const download = async (url, file) => fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));

async function main() {
  const log = JSON.parse(fs.readFileSync(TASKS, "utf8"));
  const golem = log.find((e) => e.asset === "06-golem" && e.task.type === "multiview_to_model" && e.task.status === "success");
  if (!golem) throw new Error("no successful golem model in tasks.json");
  const modelTask = golem.task.task_id;

  const check = await run("rig-check", "/animations/rig-check", { input: modelTask });
  console.log("rig-check output:", JSON.stringify(check.output));

  const rig = await run("rig", "/animations/rig", { input: modelTask, model: "v3.0-20260909", rig_type: "biped", out_format: "glb" });
  await download(rig.output.model_url, "route-b/06-golem-rigged.glb");

  const retarget = await run("retarget", "/animations/retarget", {
    input: rig.task_id,
    animations: ["preset:idle", "preset:walk"],
    out_format: "glb",
    animate_in_place: true,
  });
  const out = retarget.output || {};
  if (out.model_url) await download(out.model_url, "route-b/06-golem-walk.glb");
  const urls = out.model_urls || {};
  for (const [name, url] of Object.entries(Array.isArray(urls) ? Object.fromEntries(urls.map((u, i) => [i, u])) : urls)) {
    const file = `route-b/06-golem-anim-${String(name).replace(/[^a-z0-9]+/gi, "_")}.glb`;
    await download(typeof url === "string" ? url : url.url, file);
    console.log("saved", file);
  }

  const steps = JSON.parse(fs.readFileSync(TASKS, "utf8")).filter((e) => e.asset === "06-golem" && e.step);
  const seconds = steps.slice(-3).reduce((s, e) => s + e.seconds_waited, 0);
  const credits = steps.slice(-3).reduce((s, e) => s + Number(e.task.credits_consumed || 0), 0);
  console.log(`\nwalk, 3 calls: ${seconds} s, ${credits} credits`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
