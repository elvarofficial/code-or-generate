// One-off check before any model runs: which side does Tripo call "left"?
// Sends the wolf's front view to image-to-multiview and saves the four views it returns.
// The task result is logged to route-b/tasks.json like every other task.
// Run: node --env-file=.env check_left_view.js

import fs from "node:fs";

const BASE = "https://openapi.tripo3d.ai/v3";
const AUTH = { Authorization: `Bearer ${process.env.TRIPO_API_KEY}` };
const TASKS = "route-b/tasks.json";
const OUT = "route-b/left-view-check";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync("assets/05-wolf/front.png")], { type: "image/png" }), "front.png");
  const up = await (await fetch(`${BASE}/files`, { method: "POST", headers: AUTH, body: form })).json();
  if (up.code !== 0) throw new Error(JSON.stringify(up));

  const body = { input: up.data.file_token, ...JSON.parse(process.argv[2] || "{}") };
  console.log("Request body:", JSON.stringify(body));
  const startedAt = new Date();
  const res = await (await fetch(`${BASE}/generation/image-to-multiview`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })).json();
  if (res.code !== 0) throw new Error(JSON.stringify(res));

  let task;
  while (true) {
    await sleep(5000);
    task = (await (await fetch(`${BASE}/tasks/${res.data.task_id}`, { headers: AUTH })).json()).data;
    console.log(`  ${task.status} ${task.progress ?? 0}%`);
    if (!["queued", "running"].includes(task.status)) break;
  }
  const endedAt = new Date();

  fs.mkdirSync(OUT, { recursive: true });
  for (const [k, url] of Object.entries(task.output || {})) {
    if (typeof url === "string" && url.startsWith("http")) {
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      fs.writeFileSync(`${OUT}/${k}.png`, buf);
      console.log(`saved ${OUT}/${k}.png`);
    }
  }
  const log = fs.existsSync(TASKS) ? JSON.parse(fs.readFileSync(TASKS, "utf8")) : [];
  log.push({
    asset: "00-left-view-check",
    purpose: "which side Tripo calls the left view; not part of the 12 results",
    request: body,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    seconds_waited: Math.round((endedAt - startedAt) / 1000),
    task,
  });
  fs.writeFileSync(TASKS, JSON.stringify(log, null, 2));
  console.log(`status ${task.status}, credits ${task.credits_consumed}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
