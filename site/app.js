// Live page: 25 assets on a stepped showroom, one switch between the Code and the Tripo API version.
// Same camera, same light for both routes. Click an asset for its row from results.csv.
// Tripo API is the default view. ?route=code starts on Code, ?hq pins the resolution (screen recordings), ?reel is the
// recording mode with no UI.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// 25 assets, simple to hard, in the order of assets.json
const ASSETS = await (await fetch("assets.json")).json();
const ROUTES = { code: "Code", tripo: "Tripo API" };
const TABLE_R = 0.56, TABLE_H = 0.07, FIT_H = 1.2, FIT_R = 0.54;
// a stepped showroom: 5 tiers of 5, simplest at the front, each tier higher than the one before
const COLS = 5, SPACING = 1.72, DEPTH = 2.05, RISE = 0.56;
const ROWS = Math.ceil(ASSETS.length / COLS);
const ACCENT = { code: new THREE.Color("#ffb24a"), tripo: new THREE.Color("#74c6ff") };
const SWAP_MS = 1150, STAGGER_MS = 42;
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0), OPEN = 1e4; // a clipping plane that cuts nothing

const Q = new URLSearchParams(location.search);
const isMobile = () => innerWidth <= 820;
// position on the showroom, simple to hard (the ids keep the order the brief added them in)
const pos = (s) => String(s.i + 1).padStart(2, "0");
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tick = () => new Promise((r) => setTimeout(r));

// ---------- renderer, scene, light ----------

// The frame is drawn into the composer's multisampled target, so the canvas itself needs no antialiasing.
// Without MSAA there the thin lit rims and step edges break into crawling 1 px dashes whenever the camera drifts.
const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.has("nobloom"), powerPreference: "high-performance" });
// resolution: up to 1.5x on dense screens (recordings keep the scale they ask for); a slow GPU steps it down on its
// own (see adaptQuality)
const DPR_MAX = Q.has("hq") ? devicePixelRatio : Math.min(devicePixelRatio, 1.5);
let dpr = DPR_MAX;
renderer.setPixelRatio(dpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = !Q.has("noshadow");
renderer.shadowMap.type = THREE.PCFShadowMap; // three swaps PCFSoft for this on its first shadow render anyway
renderer.localClippingEnabled = true;
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = gradientTexture();
scene.fog = new THREE.Fog(0x08090c, 22, 48);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;

const key = new THREE.DirectionalLight(0xfff3e6, 2.1);
key.position.set(-4.5, 7.5, 6);
key.castShadow = true;
key.shadow.mapSize.set(isMobile() ? 2048 : 4096, isMobile() ? 2048 : 4096);
key.shadow.camera.left = -8;
key.shadow.camera.right = 8;
key.shadow.camera.top = 9;
key.shadow.camera.bottom = -9;
key.shadow.camera.near = 1;
key.shadow.camera.far = 30;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xbcd6ff, 1.0);
rim.position.set(2, 4, -7);
scene.add(rim);
// two cool strip lights behind the row draw the silhouettes, like the studio renders
RectAreaLightUniformsLib.init();
for (const x of [-3.2, 3.2]) {
  const strip = new THREE.RectAreaLight(0xb8d2ff, 3.5, 0.35, 3.2);
  strip.position.set(x, 2.2, -2.6);
  strip.lookAt(x * 0.4, 0.8, 0);
  scene.add(strip);
}
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x16120e, 0.35));

// glossy black floor: a mirror underneath, a dark translucent layer on top that takes the shadows.
// The mirror sits under an 86% glaze, so half the screen's CSS resolution is plenty and reads as a softer gloss.
const MIRROR = isMobile() ? 0.4 : 0.5;
const mirror = new Reflector(new THREE.CircleGeometry(30, 96), {
  textureWidth: Math.round(innerWidth * MIRROR),
  textureHeight: Math.round(innerHeight * MIRROR),
  color: 0x70747c,
});
mirror.rotation.x = -Math.PI / 2;
mirror.position.y = -0.001;
scene.add(mirror);
// the floor takes no light: black glaze over the mirror, shadows on their own layer, light only from the pools
const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshBasicMaterial({ color: 0x040506, transparent: true, opacity: 0.86 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const shadowFloor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.ShadowMaterial({ opacity: 0.6 }));
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.position.y = 0.0005;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

// near 0.5, not 0.1: the camera never comes closer than 3 units to a model, and the depth buffer gets 5x the precision
// at the overview distance (the floor layers and the pools sit 0.5 to 2 mm apart)
const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.5, 100);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(dpr);
composer.addPass(new RenderPass(scene, camera));
// Glossy PBR highlights can overflow the half-float target (Inf), and the bloom blur would smear the
// resulting NaN over the whole frame. Clamp and clean before bloom.
composer.addPass(
  new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb = clamp(c.rgb, 0.0, 24.0); if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0); gl_FragColor = c; }",
  })
);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function radialTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function gradientTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const g = c.getContext("2d").createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#020203");
  g.addColorStop(0.55, "#0d0e12");
  g.addColorStop(1, "#08090c");
  const ctx = c.getContext("2d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- turntables ----------

const tableMat = new THREE.MeshPhysicalMaterial({ color: 0x141519, metalness: 0.35, roughness: 0.42, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.28 });
const poolTex = radialTexture();
const tableGeo = new THREE.LatheGeometry(
  [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(TABLE_R - 0.03, 0),
    new THREE.Vector2(TABLE_R, 0.02),
    new THREE.Vector2(TABLE_R, TABLE_H - 0.02),
    new THREE.Vector2(TABLE_R - 0.025, TABLE_H),
    new THREE.Vector2(0, TABLE_H),
  ],
  128
);
// the lit lines stay at least ~2 px wide on the overview, so the multisampling keeps them solid
const rimGeo = new THREE.TorusGeometry(TABLE_R + 0.004, 0.006, 8, 192);
const scanGeo = new THREE.TorusGeometry(FIT_R + 0.06, 0.007, 8, 192);

// the steps: one long dark block per tier behind the first, with a faint light line on each front edge
const stepMat = new THREE.MeshStandardMaterial({ color: 0x060709, metalness: 0, roughness: 0.75, envMapIntensity: 0.04 });
const edgeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2bd).multiplyScalar(0.42), toneMapped: false });
const stepW = COLS * SPACING + 1.0;
for (let r = 1; r < ROWS; r++) {
  const h = r * RISE, z0 = -r * DEPTH + DEPTH / 2;
  const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, h, DEPTH * (ROWS - r) + 0.02), stepMat);
  step.position.set(0, h / 2, z0 - (DEPTH * (ROWS - r)) / 2);
  step.castShadow = step.receiveShadow = true;
  scene.add(step);
  // the light line is a thin strip standing 1.5 mm proud of the riser (front face at z0 + 0.01), flush with the top.
  // It used to sit half a millimetre inside the step, inside the depth buffer's precision at this distance, so the
  // step's faces and the line took turns winning and the line flickered as the camera drifted.
  const edge = new THREE.Mesh(new THREE.BoxGeometry(stepW, 0.012, 0.004), edgeMat);
  edge.position.set(0, h - 0.006, z0 + 0.01 + 0.0015 + 0.002);
  scene.add(edge);
}

// The mirror only ever shows the front tier: everything standing on the steps is hidden from it behind the steps'
// own reflection. So the upper tiers live on layer 1, which the frame and the shadows see and the mirror does not,
// and the mirror pass draws a fifth of the models. Lights stay on layer 0: a light the mirror could not see would
// change its light count and give every material a second program.
const UPPER = 1;
camera.layers.enable(UPPER);
mirror.getReflectionCamera(camera).layers.set(0);
const upperTier = (root) => root.traverse((o) => !o.isLight && o.layers.set(UPPER));

const state = {
  route: Q.get("route") === "code" ? "code" : "tripo",
  focus: -1, mobileIndex: 0, pointer: new THREE.Vector2(), hover: -1, wire: false,
  introStart: 0, shown: false, tripoReady: false, codeReady: false, reel: Q.has("reel"),
};

const slots = ASSETS.map((a, i) => {
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = (col - (COLS - 1) / 2) * SPACING, y = row * RISE, z = -row * DEPTH;
  const base = new THREE.Group();
  base.position.set(x, y, z);
  scene.add(base);

  // soft pool of light on the floor under each turntable
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 64),
    new THREE.MeshBasicMaterial({ map: poolTex, color: 0xffe2bd, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.002;
  base.add(pool);

  const table = new THREE.Mesh(tableGeo, tableMat);
  table.castShadow = table.receiveShadow = true;
  base.add(table);

  const rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x000000), toneMapped: false });
  const rimRing = new THREE.Mesh(rimGeo, rimMat);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = TABLE_H * 0.5;
  base.add(rimRing);

  const scanMat = new THREE.MeshBasicMaterial({ color: ACCENT.code.clone().multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 });
  const scan = new THREE.Mesh(scanGeo, scanMat);
  scan.rotation.x = Math.PI / 2;
  scan.visible = false;
  base.add(scan);

  const spin = new THREE.Group();
  spin.position.y = TABLE_H;
  spin.rotation.y = -0.5 + i * 0.35;
  base.add(spin);

  const hit = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_R + 0.05, TABLE_R + 0.05, 1.5, 16), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.75;
  hit.userData.index = i;
  base.add(hit);
  if (row > 0) upperTier(base);

  return { ...a, i, x, y, z, row, base, spin, rimMat, poolMat: pool.material, scan, scanMat, hit, models: {}, height: 1, swap: null, light: 0, hoverK: 0, show: 1, rimTarget: ACCENT[state.route] };
});

// ---------- models ----------

// meshopt geometry decodes in workers, so a model landing mid-animation costs the main thread nothing
if (MeshoptDecoder.useWorkers) MeshoptDecoder.useWorkers(2);
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
// The loader waits for the room, the 25 Code modules (400 KB) and the first Tripo model. The rest (15 MB) stream in behind
// it in showroom order, and each one scans onto its turntable once its textures and shaders are on the GPU.
const N = ASSETS.length;
let codeLoaded = 0, tripoLoaded = 0;
const loaderTitle = document.querySelector(".loader-title");
loaderTitle.textContent = `Loading ${N} models · 0 / ${N}`;
const tripoBtn = document.querySelector('.switch button[data-route="tripo"]');
const tripoProg = document.createElement("span");
tripoProg.className = "prog";
tripoBtn.appendChild(tripoProg);

// Code modules build a model from tens to hundreds of small meshes (the blacksmith alone has 581), and every one is
// a draw call in the shadow, the mirror and the frame. Static models get their meshes merged per material: the same
// triangles and materials, about a tenth of the draw calls. Animated models (the golem) stay as built.
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.material.transparent) return;
    if (Object.keys(o.geometry.morphAttributes).length || o.geometry.drawRange.count !== Infinity) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const k = `${o.material.uuid}|${o.renderOrder}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  });
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    // plain float attributes, the union of what the group carries; a mirrored part gets its triangles turned back
    const geos = meshes.map((m) => {
      const src = m.geometry, g = new THREE.BufferGeometry();
      if (!src.attributes.normal) src.computeVertexNormals();
      for (const [name, a] of Object.entries(src.attributes)) {
        const arr = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(i, c);
        g.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
      }
      const n = g.attributes.position.count;
      const idx = src.index ? Array.from(src.index.array) : Array.from({ length: n }, (_, i) => i);
      const mat = inv.clone().multiply(m.matrixWorld);
      if (mat.determinant() < 0) for (let i = 0; i + 2 < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
      g.setIndex(idx);
      g.applyMatrix4(mat);
      return g;
    });
    const sizes = new Map();
    let clash = false;
    for (const g of geos) for (const [name, a] of Object.entries(g.attributes)) {
      if (sizes.has(name) && sizes.get(name) !== a.itemSize) clash = true;
      sizes.set(name, a.itemSize);
    }
    if (clash) continue;
    for (const g of geos) for (const [name, size] of sizes) if (!g.attributes[name]) {
      const arr = new Float32Array(g.attributes.position.count * size);
      if (name === "color") arr.fill(1);
      g.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, meshes[0].material);
    mesh.renderOrder = meshes[0].renderOrder;
    root.add(mesh);
    for (const m of meshes) {
      for (const c of [...m.children]) m.parent.attach(c);
      m.removeFromParent();
    }
  }
}

function prepare(obj) {
  const materials = new Set();
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.receiveShadow = true;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && materials.add(m));
    }
  });
  materials.forEach((m) => {
    m.clipShadows = true;
    // sharper painted textures where the turntable tilts away from the camera
    for (const v of Object.values(m)) if (v?.isTexture) v.anisotropy = ANISO;
  });
  return [...materials];
}

// fit inside the turntable: at most FIT_H tall, at most FIT_R from the spin axis
function fit(obj) {
  const holder = new THREE.Group();
  holder.add(obj);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.hypot(size.x, size.z) / 2;
  const s = Math.min(FIT_H / size.y, FIT_R / radius);
  obj.position.set(-center.x, -box.min.y, -center.z);
  holder.scale.setScalar(s);
  return { holder, height: size.y * s };
}

async function loadCode(id) {
  const mod = await import(`../route-a/${STANDING.has(id) ? `${id}.step3` : id}.js`);
  const fn = typeof mod.default === "function" ? mod.default : Object.values(mod).find((v) => typeof v === "function");
  let obj = await fn();
  if (!obj?.isObject3D) obj = await fn(THREE);
  const update = obj.userData?.update;
  if (typeof obj.userData?.play === "function") obj.userData.play("walk");
  return { obj, tick: typeof update === "function" ? (dt, t) => update(dt, t) : null };
}

// The golem walks on both routes (the brief's walk test). The wolf and the dragon got the same test later
// (animate_tripo.js, sessions 05-wolf-walk and 20-dragon-walk), and the page shows them standing: the measured build
// on Code, the static model on Tripo API. The tree and the slime cannot be rigged (rig-check: riggable false), so the
// page moves them the same way on both routes (see ambient).
const WALKS = new Set(["06-golem"]);
const STANDING = new Set(["05-wolf", "20-dragon"]);

async function loadTripo(id) {
  // a walking asset loads its rigged, animated version; the static one is the fallback
  const walk = WALKS.has(id);
  const gltf = walk
    ? await gltfLoader.loadAsync(`route-b/${id}-walk.glb`).catch(() => gltfLoader.loadAsync(`route-b/${id}.glb`))
    : await gltfLoader.loadAsync(`route-b/${id}.glb`);
  gltf.scene.rotation.y = -Math.PI / 2; // Tripo exports X-forward
  const obj = new THREE.Group();
  obj.add(gltf.scene);
  let tick = null;
  if (walk && gltf.animations.length) {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const clip = gltf.animations.find((c) => /walk/i.test(c.name)) || gltf.animations[0];
    mixer.clipAction(clip).play();
    tick = (dt) => mixer.update(dt);
  }
  return { obj, tick };
}

// Wind for the tree, the same on both routes: every vertex bends with the square of its height above the roots, so
// the trunk stays planted and the crown sways. One shared clock uniform; the program is its own ("wind").
const WIND = { value: 0 };
function addWind(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const { min, max } = o.geometry.boundingBox;
    const span = { value: new THREE.Vector2(min.y, Math.max(1e-6, max.y - min.y)) };
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      m.customProgramCacheKey = () => "wind";
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uWindT = WIND;
        sh.uniforms.uWindSpan = span;
        sh.vertexShader = "uniform float uWindT;\nuniform vec2 uWindSpan;\n" + sh.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float windK = clamp((transformed.y - uWindSpan.x) / uWindSpan.y, 0.0, 1.0);
          windK *= windK * uWindSpan.y;
          transformed.x += windK * (0.028 * sin(uWindT * 1.15) + 0.009 * sin(uWindT * 2.9 + transformed.y * 6.0));
          transformed.z += windK * (0.018 * sin(uWindT * 0.9 + 1.7) + 0.007 * sin(uWindT * 3.4 + transformed.x * 6.0));`
        );
      };
    }
  });
}

// the slime breathes on its plinth: a slow squash and stretch around its base, the same on both routes
function ambient(s, t) {
  if (s.id === "19-slime") {
    const b = Math.sin(t * 2.2 + 0.6);
    s.spin.scale.set(1 + 0.03 * b, 1 - 0.055 * b, 1 + 0.03 * b);
  }
}

// builds the model onto its turntable, hidden; the caller decides when it is ready to show
async function load(slot, route) {
  try {
    const { obj, tick } = route === "code" ? await loadCode(slot.id) : await loadTripo(slot.id);
    // A light a model carries (the staff's crystal) moves onto the turntable and stays in the scene for good; only its
    // intensity follows the route. A light that comes and goes with the model changes the light count, and three
    // rebuilds every shader on the page when that count changes.
    const lights = [];
    obj.traverse((o) => o.isLight && lights.push(o));
    if (route === "code" && !tick) mergeStatic(obj);
    if (slot.id === "04-tree") addWind(obj);
    const { holder, height } = fit(obj);
    const materials = prepare(holder);
    // one clipping plane per model for good, opened all the way when idle: the scan only moves it, so a swap never
    // changes a program (a plane that comes and goes would)
    const plane = new THREE.Plane(UP.clone(), OPEN);
    materials.forEach((m) => (m.clippingPlanes = [plane]));
    holder.visible = false;
    slot.spin.add(holder);
    if (slot.row > 0) upperTier(holder);
    slot.base.updateMatrixWorld(true);
    for (const l of lights) {
      slot.base.attach(l);
      l.userData.full = l.intensity;
      l.intensity = 0;
    }
    // mesh view: one blueprint material per model, in the route's colour
    const wireMat = new THREE.MeshBasicMaterial({ color: ACCENT[route].clone().multiplyScalar(1.1), wireframe: true, transparent: true, opacity: 0.5, toneMapped: false });
    wireMat.clippingPlanes = [plane];
    wireMat.clipShadows = true; // the mesh view's shadow follows the scan like the solid one
    const meshes = [];
    holder.traverse((o) => o.isMesh && (o.userData.orig = o.material) && meshes.push(o));
    const model = { holder, materials, tick, height, wireMat, meshes, plane, lights };
    applyWire(model, state.wire);
    return model;
  } catch (e) {
    console.warn(`${slot.id} ${route}:`, e.message);
    return null;
  }
}

// A model that arrives after the loader: its textures go to the GPU and its programs compile in parallel, solid and
// mesh view, against the target the frame draws into. Only then does it go on show, so an arrival never stalls a frame.
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
async function makeReady(model) {
  // one texture per frame: a 1024 px upload with its mips is a few ms, three in one frame is a visible hitch
  for (const mat of model.materials) for (const v of Object.values(mat)) if (v?.isTexture) {
    renderer.initTexture(v);
    await nextFrame();
  }
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(composer.renderTarget1);
  const jobs = [];
  for (const wire of [false, true]) {
    applyWire(model, wire);
    jobs.push(renderer.compileAsync(model.holder, camera, scene));
  }
  applyWire(model, state.wire);
  renderer.setRenderTarget(prevTarget);
  await Promise.all(jobs);
  // A model with a skeleton needs its own shadow-pass programs, and only a real frame compiles those. Draw one, solid
  // and in mesh view, with the model in place but cut away whole by its own plane, so nothing shows and the first
  // click on it compiles nothing.
  if (model.meshes.some((m) => m.isSkinnedMesh)) {
    model.plane.normal.copy(UP);
    model.plane.constant = -OPEN;
    model.holder.visible = true;
    for (const wire of [false, true]) {
      applyWire(model, wire);
      renderer.shadowMap.needsUpdate = true;
      composer.render();
      await nextFrame();
    }
    applyWire(model, state.wire);
    model.holder.visible = false;
    model.plane.constant = OPEN;
  }
}

// Tripo models in showroom order: the first alone so it lands fast on a slow line, then three at a time
async function streamTripo(onModel) {
  let next = 1;
  const one = async (s) => {
    const model = await load(s, "tripo");
    tripoLoaded++;
    tripoProg.textContent = tripoLoaded < N ? ` ${Math.round((tripoLoaded / N) * 100)}%` : "";
    await onModel(s, model);
  };
  await one(slots[0]);
  await Promise.all([0, 1, 2].map(async () => { while (next < N) await one(slots[next++]); }));
}

const allModels = () => slots.flatMap((s) => [s.models.code, s.models.tripo]).filter(Boolean);

// Everything the first frames will need goes to the GPU behind the loader: every texture, and every program in the
// exact variant the frame asks for (each model with its clipping plane, solid and in mesh view, the shadow pass,
// the mirror and the post passes). After this, no click compiles anything.
async function warm() {
  loaderTitle.textContent = "Preparing the showroom";
  performance.mark("warm:start");
  camera.position.copy(cam.pos);
  camera.lookAt(cam.target);
  camera.updateMatrixWorld();
  const textures = new Set();
  for (const m of allModels()) for (const mat of [...m.materials, m.wireMat]) for (const v of Object.values(mat)) if (v?.isTexture) textures.add(v);
  let n = 0;
  for (const t of textures) {
    renderer.initTexture(t);
    if (++n % 6 === 0) await tick();
  }

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(composer.renderTarget1);
  // the room without the models
  slots.forEach((s) => s.base.remove(s.spin));
  const jobs = [renderer.compileAsync(scene, camera)];
  slots.forEach((s) => s.base.add(s.spin));
  // the models, solid and in mesh view (compile() counts each material's own clipping plane, as the frame will)
  for (const wire of [false, true]) {
    allModels().forEach((m) => applyWire(m, wire));
    for (const s of slots) jobs.push(renderer.compileAsync(s.spin, camera, scene));
  }
  allModels().forEach((m) => applyWire(m, state.wire));
  renderer.setRenderTarget(prevTarget);
  performance.mark("warm:textures+compile-sync");
  await Promise.all(jobs);
  performance.mark("warm:compiled");
  document.getElementById("bar").style.width = "97%";
  await tick();

  // two real frames with both routes in view, solid then mesh: the shadow-pass variants and the post passes
  allModels().forEach((m) => (m.holder.visible = true));
  for (const wire of [true, false]) {
    allModels().forEach((m) => applyWire(m, wire));
    composer.render();
    performance.mark(`warm:frame-${wire ? "mesh" : "solid"}`);
    await tick();
  }
  allModels().forEach((m) => applyWire(m, state.wire));
  for (const s of slots) for (const r of ["code", "tripo"]) if (s.models[r]) s.models[r].holder.visible = r === state.route;
  for (const s of slots) setLights(s.models[state.route], true);
  // from here the shadow map redraws every other frame (see frame): the turntables turn 0.24 rad a second, so a
  // shadow one frame old is out by a quarter of a degree, and the shadow pass is a third of the draw calls
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  document.getElementById("bar").style.width = "100%";
}

// ---------- data ----------

const results = {};
fetch("results.csv")
  .then((r) => r.text())
  .then((text) => {
    const [head, ...rows] = text.trim().split(/\r?\n/);
    const cols = head.split(",");
    for (const line of rows) {
      const v = line.split(",");
      const row = Object.fromEntries(cols.map((c, i) => [c, v[i]]));
      results[`${row.asset}|${row.route}`] = row;
    }
    updateLabels();
  })
  .catch(() => {});

const mean = (row) => (row ? ((+row.iou_front + +row.iou_left + +row.iou_back) / 3).toFixed(2) : null);

// ---------- labels, card, dots ----------

const labelsEl = document.getElementById("labels");
for (const s of slots) {
  s.label = document.createElement("div");
  s.label.className = "label";
  s.label.innerHTML = `<span class="n">${pos(s)}</span><span class="name">${s.name}</span><span class="iou"></span>`;
  s.labelPos = "";
  labelsEl.appendChild(s.label);
}

function updateLabels() {
  for (const s of slots) {
    const row = results[`${s.id}|${ROUTES[state.route]}`];
    const m = mean(row);
    s.label.querySelector(".iou").textContent =
      s.models[state.route] === null ? "not built" : state.wire && row ? `${(+row.triangles).toLocaleString("en-US")} triangles` : m ? `match ${m}` : "";
  }
}

function fmtRow(row, route) {
  if (!row) return `<dt>status</dt><dd>not measured</dd>`;
  const cost = route === "code" ? `$${(+row.llm_cost_usd).toFixed(2)}` : `${row.tripo_credits} cr`;
  return [
    ["time", `${(+row.minutes).toFixed(1)} min`],
    ["cost", cost],
    route === "code" ? ["fix rounds", Math.max(0, +row.attempts - 1)] : ["attempts", row.attempts],
    ["triangles", (+row.triangles).toLocaleString("en-US")],
    ["match front", (+row.iou_front).toFixed(3)],
    ["match left", (+row.iou_left).toFixed(3)],
    ["match back", (+row.iou_back).toFixed(3)],
  ]
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join("");
}

function fillCard(s) {
  document.getElementById("card-num").textContent = `${pos(s)} / ${slots.length}`;
  document.getElementById("card-name").textContent = s.name;
  document.getElementById("card-tests").textContent = s.tests;
  for (const route of ["code", "tripo"])
    document.querySelector(`.col[data-col="${route}"] dl`).innerHTML = fmtRow(results[`${s.id}|${ROUTES[route]}`], route);
  document.getElementById("card-ref").innerHTML = ["front", "left", "back"]
    .map((v) => `<figure><img src="assets/${s.id}/${v}.png" decoding="async" alt="${s.name}, ${v} reference"><figcaption>${v}</figcaption></figure>`)
    .join("");
  document.getElementById("card-studio").innerHTML =
    `<img src="site/studio/${s.id}.jpg" decoding="async" alt="${s.name}: Code and Tripo API in the studio"><figcaption><span>Code</span><span>Tripo API</span></figcaption>`;
}

const dotsEl = document.getElementById("dots");
slots.forEach((s) => {
  const b = document.createElement("button");
  b.setAttribute("aria-label", s.name);
  b.onclick = () => focusSlot(s.i, false);
  dotsEl.appendChild(b);
});

// ---------- state and camera ----------

if (state.reel) document.body.classList.add("reel");
const cam = { pos: new THREE.Vector3(), target: new THREE.Vector3(), wantPos: new THREE.Vector3(), wantTarget: new THREE.Vector3(), wantFov: 24 };

function overviewPose() {
  // look down the steps from above, so every tier clears the one in front of it
  // a long lens: the tiers keep a similar size front to back, like a display case
  cam.wantFov = 12;
  const width = COLS * SPACING + 1.2;
  const halfH = THREE.MathUtils.degToRad(cam.wantFov / 2);
  // fit the width, and fit the height of the steps as seen from the camera (5 tiers run taller than wide);
  // the top ~15% of the frame stays free for the title
  const fitW = width / 2 / (Math.tan(halfH) * camera.aspect);
  const span = (ROWS - 1) * (DEPTH * 0.37 + RISE * 0.93) + 1.9;
  const fitH = span / 2 / Math.tan(halfH) / 0.8;
  const dist = Math.max(fitW + 7.5, fitH, 24.5);
  const cz = -((ROWS - 1) * DEPTH) / 2, cy = ((ROWS - 1) * RISE) / 2 + 0.45;
  const lift = Math.tan(halfH) * dist * 0.1; // centre the steps in the band under the title
  // the fog fades the far floor: keep it the same distance behind the steps however far the camera sits
  scene.fog.near = dist - 11.7;
  scene.fog.far = dist + 14.3;
  cam.wantTarget.set(0, cy - 0.3 + lift, cz + 0.3);
  cam.wantPos.set(0, cy + lift + dist * 0.37, cz + dist * 0.93);
}

function focusPose(i, withCard, reel = false) {
  const s = slots[i];
  cam.wantFov = isMobile() && !reel ? 34 : 24;
  const mobile = isMobile() && !reel;
  // reel: far enough that a full-height model (a lance, a staff) clears the top edge of the frame
  const dist = reel ? 3.65 : mobile ? 4.3 / Math.max(camera.aspect, 0.45) : 4.1;
  const shift = withCard && !mobile ? 0.42 : 0;
  const lift = withCard && mobile ? -0.62 : 0;
  cam.wantTarget.set(s.x + shift, s.y + (reel ? 0.6 : 0.66) + lift, s.z);
  cam.wantPos.set(s.x + shift, s.y + 0.95 + lift + dist * 0.16, s.z + dist);
}

function applyPose() {
  if (state.reel) return focusPose(state.mobileIndex, false, true);
  if (isMobile()) focusPose(state.mobileIndex, state.focus >= 0);
  else if (state.focus >= 0) focusPose(state.focus, true);
  else overviewPose();
  dotsEl.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === state.mobileIndex));
  slots.forEach((s) => s.label.classList.toggle("current", s.i === state.mobileIndex));
}

function focusSlot(i, withCard = true) {
  if (isMobile()) {
    state.mobileIndex = i;
    state.focus = withCard ? i : -1;
  } else state.focus = i;
  document.body.classList.toggle("focused", state.focus >= 0);
  if (state.focus >= 0) fillCard(slots[state.focus]);
  applyPose();
}

function unfocus() {
  state.focus = -1;
  document.body.classList.remove("focused");
  applyPose();
}

// ---------- the switch ----------

function syncSwitch() {
  document.body.classList.toggle("tripo", state.route === "tripo");
  document.querySelectorAll(".switch button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.route === state.route)));
}
syncSwitch();

function setRoute(route, animated = true) {
  if (route === state.route) return;
  const from = state.route;
  state.route = route;
  syncSwitch();
  const now = performance.now();
  slots.forEach((s) => {
    const delay = state.focus >= 0 ? 0 : s.i * STAGGER_MS;
    startSwap(s, from, route, now + delay, animated && (state.focus < 0 || s.i === state.focus));
  });
  updateLabels();
  updateReel();
}

function applyWire(model, on) {
  model.meshes.forEach((m) => (m.material = on ? model.wireMat : m.userData.orig));
}

function setWire(on) {
  state.wire = on;
  document.body.classList.toggle("wire", on);
  document.getElementById("mesh").setAttribute("aria-pressed", String(on));
  for (const m of allModels()) applyWire(m, on);
  updateLabels();
}

// ?reel: no UI, one asset at a time, for recording
const reelEl = document.getElementById("reel");
function updateReel() {
  if (!state.reel) return;
  const s = slots[state.mobileIndex];
  reelEl.querySelector(".rn").textContent = `${pos(s)} / ${slots.length}`;
  reelEl.querySelector(".rt").textContent = s.name;
  reelEl.querySelectorAll(".rr span").forEach((e) => e.classList.toggle("on", e.dataset.r === state.route));
}
window.__reel = {
  focus: (i) => {
    state.mobileIndex = i;
    state.focus = i; // only the asset in frame plays the scan; the card stays hidden in reel mode
    slots.forEach((s) => (s.spin.visible = s.i === i)); // the tiers behind stay, their models step out of the shot
    focusPose(i, false, true);
    updateReel();
  },
  route: (r, animated = true) => setRoute(r, animated),
};

const setLights = (model, on) => model?.lights.forEach((l) => (l.intensity = on ? l.userData.full : 0));

// from: the route on show before (null when a model arrives onto an empty turntable), to: the route to show
function startSwap(s, from, to, start, animate) {
  if (s.swap) finishSwap(s);
  const a = (from && s.models[from]) || null, b = s.models[to] || null;
  s.rimTarget = ACCENT[to];
  // nothing to show yet (a Tripo model still on its way): the turntable empties and its ring waits for it
  if (!b) {
    if (a) a.holder.visible = false;
    setLights(a, false);
    return;
  }
  setLights(b, true);
  if (Q.has("noclip") || !animate) {
    if (a) a.holder.visible = false;
    setLights(a, false);
    b.holder.visible = true;
    return;
  }
  // the scan line rises through the model: the old one keeps what is above it, the new one what is below.
  // The planes are in world space, so they ride on the turntable's own height on the steps.
  const floorY = s.y + TABLE_H - 0.02;
  if (a) {
    a.plane.normal.copy(UP);
    a.plane.constant = -floorY;
  }
  b.plane.normal.copy(DOWN);
  b.plane.constant = floorY;
  b.holder.visible = true;
  s.scanMat.color.copy(ACCENT[to]).multiplyScalar(3);
  s.scan.visible = true;
  s.swap = { a, b, start, top: TABLE_H + Math.max(a ? a.height : 0, b.height) + 0.04 };
}

function finishSwap(s) {
  const { a, b } = s.swap;
  if (a) a.holder.visible = false;
  b.holder.visible = true;
  setLights(a, false);
  for (const m of [a, b]) {
    if (!m) continue;
    m.plane.normal.copy(UP);
    m.plane.constant = OPEN;
  }
  s.scan.visible = false;
  s.swap = null;
}

function tickSwap(s, now) {
  const w = s.swap;
  if (!w) return;
  const t = THREE.MathUtils.clamp((now - w.start) / SWAP_MS, 0, 1);
  const h = TABLE_H - 0.02 + ease(t) * (w.top - TABLE_H + 0.04);
  if (w.a) w.a.plane.constant = -(s.y + h);
  w.b.plane.constant = s.y + h;
  s.scan.position.y = h;
  s.scanMat.opacity = t <= 0 ? 0 : Math.sin(Math.PI * Math.min(t * 1.08, 1)) * 0.95 + 0.05;
  if (t >= 1) finishSwap(s);
}

// a turntable whose model for the current route has not arrived: the ring rests on the plinth and breathes
function tickWaiting(s, t) {
  if (s.swap) return;
  const waiting = state.shown && s.models[state.route] === undefined;
  if (!waiting) {
    if (s.waiting) (s.scan.visible = false), (s.waiting = false);
    return;
  }
  s.waiting = true;
  s.scan.visible = true;
  s.scan.position.y = TABLE_H + 0.015;
  s.scanMat.color.copy(ACCENT[state.route]).multiplyScalar(2);
  s.scanMat.opacity = s.light * s.show * (0.32 + 0.22 * Math.sin(t * 2.6 - s.i * 0.45));
}

// One asset on show: when its card opens, every other model sinks into its plinth from the top down (its own
// clipping plane, so no program changes) and comes back up when the card closes. The asset stands alone in the
// studio and nothing from the tiers behind it ends up under the title.
function tickFocus(s, dt) {
  if (state.reel) return; // the reel hides the other models itself
  const target = state.focus >= 0 && s.i !== state.focus ? 0 : 1;
  if (s.show === target) return;
  s.show += (target - s.show) * (1 - Math.pow(0.0004, dt));
  if (Math.abs(s.show - target) < 0.003) s.show = target;
  s.spin.visible = s.show > 0;
  if (s.swap) return; // the scan owns the planes until it finishes; this picks up again on the next frame
  for (const r of ["code", "tripo"]) {
    const m = s.models[r];
    if (!m) continue;
    if (s.show === 1) {
      m.plane.normal.copy(UP);
      m.plane.constant = OPEN;
    } else {
      m.plane.normal.copy(DOWN);
      m.plane.constant = s.y + TABLE_H - 0.01 + (m.height + 0.05) * ease(s.show);
    }
  }
}

// ---------- input ----------

document.querySelectorAll(".switch button").forEach((b) => (b.onclick = () => setRoute(b.dataset.route)));
document.getElementById("mesh").onclick = () => setWire(!state.wire);
document.getElementById("close").onclick = unfocus;
const LAST = ASSETS.length - 1;
addEventListener("keydown", (e) => {
  const cur = state.focus >= 0 ? state.focus : state.mobileIndex;
  if (e.key === "Escape") unfocus();
  if (e.key === "ArrowRight") focusSlot(Math.min(cur + 1, LAST), !isMobile() || state.focus >= 0);
  if (e.key === "ArrowLeft") focusSlot(Math.max(cur - 1, 0), !isMobile() || state.focus >= 0);
  if (e.key === "c") setRoute("code");
  if (e.key === "t") setRoute("tripo");
});

const raycaster = new THREE.Raycaster();
raycaster.layers.enable(UPPER);
const hits = slots.map((s) => s.hit);
let down = null;
canvas.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
canvas.addEventListener("pointerup", (e) => {
  if (!down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y;
  const swipe = Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4;
  down = null;
  if (swipe) {
    const cur = state.focus >= 0 ? state.focus : state.mobileIndex;
    focusSlot(THREE.MathUtils.clamp(cur + (dx < 0 ? 1 : -1), 0, LAST), state.focus >= 0);
    return;
  }
  const p = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  const hit = raycaster.intersectObjects(hits)[0];
  if (hit) {
    const i = hit.object.userData.index;
    if (state.focus === i) unfocus();
    else focusSlot(i, true);
  } else if (state.focus >= 0) unfocus();
});
addEventListener("pointermove", (e) => {
  state.pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
  let hit = null;
  if (e.target === canvas) {
    raycaster.setFromCamera(new THREE.Vector2(state.pointer.x, -state.pointer.y), camera);
    hit = raycaster.intersectObjects(hits)[0];
  }
  const hover = hit ? hit.object.userData.index : -1;
  if (hover === state.hover) return;
  state.hover = hover;
  canvas.style.cursor = hit ? "pointer" : "";
  slots.forEach((s) => s.label.classList.toggle("hover", s.i === state.hover));
});

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = cam.wantFov;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
  mirror.getRenderTarget().setSize(Math.round(innerWidth * MIRROR), Math.round(innerHeight * MIRROR));
  applyPose();
}
addEventListener("resize", resize);
resize();
cam.pos.copy(cam.wantPos).add(new THREE.Vector3(0, 1.2, 3));
cam.target.copy(cam.wantTarget);

// A GPU that cannot hold the frame rate gets a lower resolution, a quarter step at a time, never under 1x.
// Recording modes (?hq, ?reel) keep the resolution they were given.
const perf = { times: [], on: !state.reel && !Q.has("hq") };
function adaptQuality(rawDt) {
  if (!perf.on || !state.introStart || performance.now() - state.introStart < 3000 || document.hidden) return;
  perf.times.push(rawDt);
  if (perf.times.length < 90) return;
  const median = perf.times.sort((a, b) => a - b)[45];
  perf.times.length = 0;
  if (median > 0.021 && dpr > 1) {
    dpr = Math.max(1, dpr - 0.25);
    renderer.setPixelRatio(dpr);
    composer.setPixelRatio(dpr);
    resize();
  }
}

// ---------- loop ----------

const tmp = new THREE.Vector3();
const tmpColor = new THREE.Color();
let last = performance.now(), elapsed = 0, frameNo = 0;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const rawDt = (now - last) / 1000;
  last = now;
  // the loader covers the canvas: draw nothing until it starts to lift
  if (!state.shown) return;
  // recordings run at 30 fps on a virtual clock and redraw the shadow every frame
  if (!perf.on || ++frameNo % 2 === 0) renderer.shadowMap.needsUpdate = true;
  const dt = Math.min(rawDt, 0.05);
  elapsed += dt;
  const t = elapsed;
  WIND.value = t;
  adaptQuality(rawDt);

  const k = 1 - Math.pow(0.0025, dt);
  cam.pos.lerp(cam.wantPos, k);
  cam.target.lerp(cam.wantTarget, k);
  const sway = isMobile() ? 0 : 1;
  camera.position.set(
    cam.pos.x + (Math.sin(t * 0.21) * 0.08 + state.pointer.x * 0.18) * sway,
    cam.pos.y + (Math.sin(t * 0.17) * 0.04 - state.pointer.y * 0.08) * sway,
    cam.pos.z
  );
  camera.lookAt(cam.target);
  if (Math.abs(camera.fov - cam.wantFov) > 0.01) {
    camera.fov += (cam.wantFov - camera.fov) * k;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();

  for (const s of slots) {
    s.spin.rotation.y += dt * 0.24;
    ambient(s, t);
    // lights come up one turntable after another once the loader closes, hover lifts them
    const intro = state.introStart ? THREE.MathUtils.clamp((now - state.introStart - s.i * 140) / 800, 0, 1) : 0;
    s.light = ease(intro);
    s.hoverK += ((s.i === state.hover || s.i === state.focus ? 1 : 0) - s.hoverK) * (1 - Math.pow(0.001, dt));
    tickFocus(s, dt);
    const quiet = 0.3 + 0.7 * s.show; // a plinth whose model has stepped back goes quiet too
    s.poolMat.opacity = s.light * (0.2 + 0.06 * s.hoverK) * quiet;
    const target = tmpColor.copy(s.rimTarget).multiplyScalar((2.2 + 0.9 * s.hoverK) * s.light * quiet);
    s.rimMat.color.lerp(target, 1 - Math.pow(0.02, dt));
    tickSwap(s, now);
    tickWaiting(s, t);
    for (const route of ["code", "tripo"]) {
      const m = s.models[route];
      if (m?.tick && m.holder.visible) m.tick(dt, t);
    }
    // label under the front edge of the turntable: moved on the compositor (transform), never through layout
    tmp.set(s.x, s.y, s.z + TABLE_R + 0.2).project(camera);
    const p = tmp.z < 1 ? `translate3d(${((tmp.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px,${((-tmp.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px,0) translateX(-50%)` : "translate3d(-999px,-999px,0)";
    if (p !== s.labelPos) s.label.style.transform = s.labelPos = p;
  }

  if (Q.has("nobloom")) renderer.render(scene, camera);
  else composer.render();
}

// The Code modules and the room behind the loader, every shader and texture warmed, then the lights come up.
// The Tripo models start streaming at once; any that land before the warm-up get warmed with the rest, the later
// ones get ready on their own and scan onto their turntable.
// The loader also waits for the first Tripo model (the crate, 0.6 MB, streaming beside the Code modules): the first
// draw of a meshopt-quantized mesh makes ANGLE build its vertex-format variants, a 100 ms stall that belongs behind
// the loader, and every later Tripo model reuses them.
(async () => {
  let warmed = false, firstTripo;
  const firstLanded = new Promise((r) => (firstTripo = r));
  const tripoDone = streamTripo(async (s, model) => {
    if (!warmed) return void ((s.models.tripo = model), firstTripo());
    if (model) await makeReady(model);
    s.models.tripo = model;
    if (state.route === "tripo") startSwap(s, null, "tripo", performance.now(), true);
    updateLabels();
  });
  await Promise.all(
    slots.map(async (s) => {
      s.models.code = await load(s, "code");
      codeLoaded++;
      document.getElementById("bar").style.width = `${(codeLoaded / N) * 90}%`;
      loaderTitle.textContent = `Loading ${N} models · ${codeLoaded} / ${N}`;
    })
  );
  state.codeReady = true;
  await firstLanded;
  warmed = true;
  await warm();
  updateLabels();
  performance.mark("shown");
  state.shown = true;
  document.getElementById("loader").classList.add("done");
  state.introStart = performance.now() + 500;
  await tripoDone;
  state.tripoReady = true;
})();
requestAnimationFrame(frame);
window.__dbg = { renderer, scene, slots, state, camera, composer, THREE };
