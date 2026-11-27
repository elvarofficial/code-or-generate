// Export every Code module (route-a) to a .glb, so both routes can be rendered in the same Blender studio.
// Geometry and materials are exported as three.js built them; nothing is changed.
// Run: node export_code_glb.js   -> route-a/glb/NN-name.glb
import fs from "node:fs";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

fs.mkdirSync("route-a/glb", { recursive: true });
fs.writeFileSync(
  "lib/export.html",
  fs.readFileSync("lib/measure.html", "utf8")
    .replace('<script type="module" src="/lib/measure-page.js"></script>', `<script type="module">
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
window.exportGlb = async (file) => {
  const mod = await import("/" + file);
  const fn = typeof mod.default === "function" ? mod.default : Object.values(mod).find((v) => typeof v === "function");
  let obj = await fn();
  if (!obj?.isObject3D) obj = await fn(THREE);
  obj.updateMatrixWorld(true);
  // glTF has no custom shaders. A ShaderMaterial becomes an unlit material in its first colour uniform
  // (the shaders in route-a output colour without lighting); transparent ones stay see-through.
  let swapped = 0;
  obj.traverse((o) => {
    if (!o.isMesh || !o.material?.isShaderMaterial) return;
    const m = o.material;
    const color = Object.values(m.uniforms || {}).map((u) => u.value).find((v) => v?.isColor) || new THREE.Color(0xffffff);
    o.material = new THREE.MeshBasicMaterial({ color, transparent: m.transparent, opacity: m.transparent ? 0.18 : 1, side: m.side, depthWrite: !m.transparent });
    swapped++;
  });
  if (swapped) console.log(file + ": " + swapped + " shader materials swapped for the export");
  let tris = 0;
  obj.traverse((o) => { if (o.isMesh) tris += ((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1); });
  const buf = await new GLTFExporter().parseAsync(obj, { binary: true, onlyVisible: true });
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { b64: btoa(s), tris };
};
window.ready = true;
</script>`)
    .replace("<title>measure</title>", "<title>export</title>")
);

const { url, close } = await serve(process.cwd());
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
page.on("console", (m) => m.type() === "error" && console.error(m.text()));
await page.goto(`${url}/lib/export.html`);
await page.waitForFunction(() => window.ready === true);
for (const f of fs.readdirSync("route-a").filter((f) => /^\d\d-[a-z]+\.js$/.test(f)).sort()) {
  const asset = f.replace(".js", "");
  const file = fs.existsSync(`route-a/${asset}.step3.js`) ? `route-a/${asset}.step3.js` : `route-a/${f}`;
  const { b64, tris } = await page.evaluate((x) => window.exportGlb(x), file);
  fs.writeFileSync(`route-a/glb/${asset}.glb`, Buffer.from(b64, "base64"));
  console.log(`${asset}: ${file} -> route-a/glb/${asset}.glb (${tris} triangles)`);
}
await browser.close();
close();
