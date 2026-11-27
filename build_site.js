// Build the live page into dist/ for deploy.
// The page loads web copies of the Tripo models: textures scaled to 1024 px and re-encoded as WebP, geometry
// meshopt-compressed.
// Nothing is simplified, so triangle counts stay the same. Measurements always use the originals in route-b/.
// Run: node build_site.js   (GLTF_TRANSFORM = path to the gltf-transform CLI, PYTHON = a Python with Pillow + WebP)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const GT = process.env.GLTF_TRANSFORM || "gltf-transform";
const OUT = "dist";
// keep dist/.vercel (the deploy link), clear everything else
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f !== ".vercel") fs.rmSync(path.join(OUT, f), { recursive: true, force: true });

const copy = (src, dst = src) => {
  fs.mkdirSync(path.dirname(path.join(OUT, dst)), { recursive: true });
  fs.cpSync(src, path.join(OUT, dst), { recursive: true });
};

copy("index.html");
copy("site");
copy("results.csv");
copy("assets.json");
for (const a of fs.readdirSync("assets")) for (const v of ["front", "left", "back"]) copy(`assets/${a}/${v}.png`);
// the modules, plus the measured builds of the wolf and the dragon, which the page shows standing
for (const f of fs.readdirSync("route-a").filter((f) => /^\d\d-[a-z]+\.js$|^(05-wolf|20-dragon)\.step3\.js$/.test(f))) copy(`route-a/${f}`);

fs.mkdirSync(`${OUT}/route-b`, { recursive: true });
// the static models, plus the golem's walk (the only walk on the page)
const glbs = fs.readdirSync("route-b").filter((f) => /^\d\d-[a-z]+\.glb$|^06-golem-walk\.glb$/.test(f));
for (const f of glbs) {
  const src = `route-b/${f}`, tmp = `${OUT}/route-b/_${f}`, dst = `${OUT}/route-b/${f}`;
  // web copy: textures scaled to 1024 px and WebP (lib/shrink_glb.py), geometry meshopt-compressed, nothing simplified
  execFileSync(process.env.PYTHON || "python", [path.join("lib", "shrink_glb.py"), src, tmp, "1024", "--webp"], { stdio: "pipe" });
  execFileSync(GT, ["meshopt", tmp, dst, "--level", "medium"], { stdio: "pipe", shell: process.platform === "win32" });
  fs.rmSync(tmp);
  console.log(`${f}: ${(fs.statSync(src).size / 1e6).toFixed(1)} MB -> ${(fs.statSync(dst).size / 1e6).toFixed(1)} MB`);
}
fs.writeFileSync(`${OUT}/robots.txt`, "User-agent: *\nAllow: /\n");
console.log(`dist ready`);
