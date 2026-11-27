// Bake the Code golem's walk (a procedural animation in route-a/06-golem.js) into a glTF animation,
// so Blender can render it next to the Tripo walk. The module is stepped with the same update(dt)
// the live page calls, 30 times a second; every node's transform is sampled per frame.
// Run: node bake_code_walk.js [seconds]   -> route-a/glb/06-golem-walk.glb
import fs from "node:fs";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

const SECONDS = Number(process.argv[2] || 5.2);
fs.mkdirSync("route-a/glb", { recursive: true });
fs.writeFileSync(
  "lib/bake.html",
  fs.readFileSync("lib/measure.html", "utf8")
    .replace('<script type="module" src="/lib/measure-page.js"></script>', `<script type="module">
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
window.bake = async (seconds, fps) => {
  const mod = await import("/route-a/06-golem.js");
  const fn = typeof mod.default === "function" ? mod.default : Object.values(mod).find((v) => typeof v === "function");
  const root = await fn();
  root.userData.play("walk");
  // run into the walk so the idle-to-walk blend is over before sampling
  for (let i = 0; i < 60; i++) root.userData.update(1 / fps);
  const nodes = [];
  root.traverse((o) => { if (!o.isMesh || o.children.length) nodes.push(o); else nodes.push(o); });
  nodes.forEach((o, i) => { if (!o.name) o.name = "n" + i; });
  const names = new Set();
  nodes.forEach((o, i) => { if (names.has(o.name)) o.name = o.name + "_" + i; names.add(o.name); });
  const n = Math.round(seconds * fps);
  const times = [], tracks = nodes.map(() => ({ p: [], q: [], s: [] }));
  for (let f = 0; f <= n; f++) {
    if (f) root.userData.update(1 / fps);
    times.push(f / fps);
    nodes.forEach((o, i) => { tracks[i].p.push(...o.position.toArray()); tracks[i].q.push(...o.quaternion.toArray()); tracks[i].s.push(...o.scale.toArray()); });
  }
  const kt = [];
  const moved = (arr, k) => arr.some((v, j) => Math.abs(v - arr[j % k]) > 1e-6);
  nodes.forEach((o, i) => {
    const t = tracks[i];
    if (moved(t.p, 3)) kt.push(new THREE.VectorKeyframeTrack(o.name + ".position", times, t.p));
    if (moved(t.q, 4)) kt.push(new THREE.QuaternionKeyframeTrack(o.name + ".quaternion", times, t.q));
    if (moved(t.s, 3)) kt.push(new THREE.VectorKeyframeTrack(o.name + ".scale", times, t.s));
  });
  const clip = new THREE.AnimationClip("walk", seconds, kt);
  const buf = await new GLTFExporter().parseAsync(root, { binary: true, animations: [clip] });
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { b64: btoa(s), tracks: kt.length, frames: n + 1 };
};
window.ready = true;
</script>`)
    .replace("<title>measure</title>", "<title>bake</title>")
);
const { url, close } = await serve(process.cwd());
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(`${url}/lib/bake.html`);
await page.waitForFunction(() => window.ready === true);
const { b64, tracks, frames } = await page.evaluate((s) => window.bake(s, 30), SECONDS);
fs.writeFileSync("route-a/glb/06-golem-walk.glb", Buffer.from(b64, "base64"));
console.log(`route-a/glb/06-golem-walk.glb: ${tracks} tracks, ${frames} frames`);
await browser.close();
close();
