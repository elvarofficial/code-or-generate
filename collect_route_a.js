// Step 3 notes: pull minutes, LLM cost and fix rounds out of each fresh Claude Code session.
// Each asset ran as its own headless session (claude -p, see route-a/README.md) in a clean folder.
// The session's result JSON carries duration_ms and total_cost_usd (list price, tokens included).
//
// Run: node collect_route_a.js [runs folder]

import fs from "node:fs";
import path from "node:path";

const RUNS = process.argv[2] || process.env.COG_RUNS || "cog-runs"; // one folder per session, see route-a/run.sh
const notes = fs.existsSync("route-a/notes.json") ? JSON.parse(fs.readFileSync("route-a/notes.json", "utf8")) : {};

for (const asset of fs.readdirSync(RUNS).filter((d) => /^\d\d-/.test(d)).sort()) {
  const dir = path.join(RUNS, asset);
  const resultFile = path.join(dir, "result.json");
  // the walk session (step 6) extends route-a/06-golem.js; the step 3 build is kept as 06-golem.step3.js
  const isWalk = asset.endsWith("-walk");
  const base = asset.replace(/-walk$/, "");
  const moduleFile = path.join(dir, "route-a", `${base}.js`);
  const target = isWalk ? `route-a/${base}.js` : fs.existsSync(path.join(RUNS, `${base}-walk`)) ? `route-a/${base}.step3.js` : `route-a/${base}.js`;
  if (!fs.existsSync(resultFile) || !fs.statSync(resultFile).size) {
    console.log(`${asset}: session still running or no result`);
    continue;
  }
  const r = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  const text = String(r.result || "");
  // the session reports its rounds in its final message ("Round 3", "3 fix rounds", ...)
  const rounds = [...text.matchAll(/round\s*(\d)|(\d)\s*(?:fix|compare)[- ]?(?:and[- ]fix\s*)?rounds?/gi)]
    .map((m) => Number(m[1] || m[2]))
    .filter((n) => n >= 0 && n <= 3);
  const WORDS = { one: 1, two: 2, three: 3 };
  for (const m of text.matchAll(/\b(one|two|three)\s+(?:allowed\s+)?(?:compare-and-fix|fix)\s+rounds?/gi)) rounds.push(WORDS[m[1].toLowerCase()]);
  notes[asset] = {
    ...(notes[asset] || {}),
    minutes: r.duration_ms / 60000,
    llm_cost_usd: r.total_cost_usd,
    num_turns: r.num_turns,
    session_id: r.session_id,
    started_at: fs.readFileSync(path.join(dir, "started_at.txt"), "utf8").trim(),
    ended_at: fs.existsSync(path.join(dir, "ended_at.txt")) ? fs.readFileSync(path.join(dir, "ended_at.txt"), "utf8").trim() : null,
    fix_rounds: notes[asset]?.fix_rounds_checked ? notes[asset].fix_rounds : rounds.length ? Math.max(...rounds) : null,
    usage: r.usage,
    model_usage: r.modelUsage,
  };
  if (fs.existsSync(moduleFile)) fs.copyFileSync(moduleFile, target);
  // the session's own render script and round-by-round comparisons live in its scratchpad
  const tmp = path.join(process.env.LOCALAPPDATA || "", "Temp", "claude");
  const pad = fs.existsSync(tmp)
    ? fs.readdirSync(tmp).map((d) => path.join(tmp, d, r.session_id, "scratchpad")).find((p) => fs.existsSync(p))
    : null;
  const sessionDir = `route-a/sessions/${asset}`;
  fs.mkdirSync(sessionDir, { recursive: true });
  if (pad) fs.cpSync(pad, sessionDir, { recursive: true, filter: (src) => !/node_modules/.test(src) });
  fs.writeFileSync(`${sessionDir}/final_message.md`, text);
  const n = notes[asset];
  console.log(`${asset}: ${n.minutes.toFixed(1)} min, $${n.llm_cost_usd.toFixed(2)}, fix rounds ${n.fix_rounds}, module ${fs.existsSync(moduleFile) ? "copied" : "MISSING"}`);
}
fs.writeFileSync("route-a/notes.json", JSON.stringify(notes, null, 2));
