// Runs inside headless Chromium, driven by measure.js.
// One model at a time: load, scale to height 1, center, render front / left / back
// with the same orthographic camera, build silhouette masks, compare with the reference.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const SIZE = 1024;
const VIEWS = {
  front: new THREE.Vector3(0, 0, 1),
  left: new THREE.Vector3(1, 0, 0), // the asset's own left: it faces +Z, its left is +X
  back: new THREE.Vector3(0, 0, -1),
};

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(SIZE, SIZE);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });

// ---------- loading ----------

async function loadModel(asset, route) {
  if (route === "code") {
    const mod = await import(`/${window.codeFile || `route-a/${asset}.js`}?t=${Date.now()}`);
    const fn = typeof mod.default === "function" ? mod.default : Object.values(mod).find((v) => typeof v === "function");
    if (!fn) throw new Error(`route-a/${asset}.js exports no function`);
    let obj = await fn();
    if (!obj?.isObject3D) obj = await fn(THREE);
    if (!obj?.isObject3D) throw new Error(`route-a/${asset}.js did not return an Object3D`);
    return obj;
  }
  const gltf = await new GLTFLoader().loadAsync(`/route-b/${asset}.glb`);
  // Tripo exports X-forward; turn it to face +Z like the code route
  gltf.scene.rotation.y = -Math.PI / 2;
  const holder = new THREE.Group();
  holder.add(gltf.scene);
  return holder;
}

function countTriangles(obj) {
  let tris = 0;
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    let n = g.index ? g.index.count : g.attributes.position.count;
    if (Number.isFinite(g.drawRange?.count)) n = Math.min(n, g.drawRange.count);
    tris += (n / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(tris);
}

// height 1, centered on the origin
function normalize(obj) {
  const pivot = new THREE.Group();
  pivot.add(obj);
  pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  obj.position.sub(box.getCenter(new THREE.Vector3()));
  pivot.scale.setScalar(1 / size.y);
  pivot.updateMatrixWorld(true);
  const extent = Math.max(size.x, size.y, size.z) / size.y;
  return { pivot, extent };
}

// ---------- rendering ----------

// Neutral studio light, the same for both routes: no tone mapping (painted colors stay as authored),
// a low environment so PBR metal is not black, hemisphere fill and one key light that turns with the camera.
const LIGHT = { tone: THREE.NoToneMapping, env: 0.35, hemi: 1.2, key: 1.8 };
window.setLight = (l) => Object.assign(LIGHT, l);

function makeScene(model) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.environment = envTexture;
  scene.environmentIntensity = LIGHT.env;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, LIGHT.hemi));
  const key = new THREE.DirectionalLight(0xffffff, LIGHT.key);
  scene.add(key);
  scene.userData.key = key;
  scene.add(model);
  return scene;
}

function camera(view, extent) {
  const half = (extent / 2) * 1.12;
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 100);
  cam.position.copy(VIEWS[view]).multiplyScalar(10);
  cam.up.set(0, 1, 0);
  cam.lookAt(0, 0, 0);
  return cam;
}

function snapshot() {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  c.getContext("2d").drawImage(renderer.domElement, 0, 0);
  return c;
}

function renderView(scene, view, extent) {
  const cam = camera(view, extent);
  renderer.toneMapping = LIGHT.tone;
  // key light from the camera side, up and to the left, so every view is lit the same way
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), VIEWS[view]);
  scene.userData.key.position.copy(VIEWS[view]).multiplyScalar(3).addScaledVector(side, -1.6).add(new THREE.Vector3(0, 2.4, 0));
  scene.overrideMaterial = null;
  renderer.render(scene, cam);
  const color = snapshot();
  scene.overrideMaterial = black;
  renderer.render(scene, cam);
  const silhouette = snapshot();
  scene.overrideMaterial = null;
  return { color, silhouette };
}

// ---------- masks ----------

function pixels(canvas) {
  return canvas.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
}

// object = every pixel that is not background connected to the border
function maskFrom(data, isBackgroundCandidate) {
  const n = SIZE * SIZE;
  const bg = new Uint8Array(n);
  const stack = [];
  const push = (i) => {
    if (!bg[i] && isBackgroundCandidate(data, i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < SIZE; x++) {
    push(x);
    push((SIZE - 1) * SIZE + x);
  }
  for (let y = 0; y < SIZE; y++) {
    push(y * SIZE);
    push(y * SIZE + SIZE - 1);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % SIZE;
    if (x > 0) push(i - 1);
    if (x < SIZE - 1) push(i + 1);
    if (i >= SIZE) push(i - SIZE);
    if (i < n - SIZE) push(i + SIZE);
  }
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = bg[i] ? 0 : 1;
  return mask;
}

const lum = (d, i) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
const referenceBackground = (d, i) => lum(d, i) >= 250;
const renderBackground = (d, i) => lum(d, i) >= 128;

function bbox(mask) {
  let x0 = SIZE, y0 = SIZE, x1 = -1, y1 = -1;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (mask[y * SIZE + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

async function loadImage(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  c.getContext("2d").drawImage(img, 0, 0, SIZE, SIZE);
  return c;
}

// map the render onto the reference frame: same height, same bbox center
function alignment(ref, ren) {
  const s = ref.h / ren.h;
  return { s, dx: ref.cx - s * ren.cx, dy: ref.cy - s * ren.cy };
}

function iou(refMask, renMask, a) {
  let inter = 0, union = 0;
  const aligned = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const v = Math.round((y - a.dy) / a.s);
    for (let x = 0; x < SIZE; x++) {
      const u = Math.round((x - a.dx) / a.s);
      const m = u >= 0 && u < SIZE && v >= 0 && v < SIZE ? renMask[v * SIZE + u] : 0;
      const i = y * SIZE + x;
      aligned[i] = m;
      const r = refMask[i];
      if (r && m) inter++;
      if (r || m) union++;
    }
  }
  return { value: union ? inter / union : 0, aligned };
}

function drawAligned(canvas, a) {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.setTransform(a.s, 0, 0, a.s, a.dx, a.dy);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0);
  return c;
}

// both = ink, reference only = amber, model only = blue
function overlay(refMask, aligned) {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = refMask[i], m = aligned[i];
    const rgb = r && m ? [38, 38, 42] : r ? [232, 160, 48] : m ? [64, 128, 232] : [255, 255, 255];
    img.data.set([...rgb, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------- entry points ----------

window.measure = async (asset, route) => {
  const model = await loadModel(asset, route);
  const triangles = countTriangles(model);
  const { pivot, extent } = normalize(model);
  const scene = makeScene(pivot);
  const out = { asset, route, triangles, views: {} };
  for (const view of Object.keys(VIEWS)) {
    const refCanvas = await loadImage(`/assets/${asset}/${view}.png`);
    const refMask = maskFrom(pixels(refCanvas), referenceBackground);
    const { color, silhouette } = renderView(scene, view, extent);
    const renMask = maskFrom(pixels(silhouette), renderBackground);
    const a = alignment(bbox(refMask), bbox(renMask));
    const { value, aligned } = iou(refMask, renMask, a);
    out.views[view] = {
      iou: value,
      render: drawAligned(color, a).toDataURL("image/png"),
      overlay: overlay(refMask, aligned).toDataURL("image/png"),
    };
  }
  return out;
};

// reference | Code | Tripo API, one view
window.sideBySide = async (asset, view, panels) => {
  const PAD = 48, TITLE = 104, LABEL = 96, W = SIZE * 3 + PAD * 4, H = TITLE + LABEL + SIZE + PAD;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4f2ee";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#16161a";
  ctx.font = "600 44px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(`${asset.replace(/^\d+-/, "")} · ${view}`, PAD, 72);
  for (let i = 0; i < 3; i++) {
    const p = panels[i];
    const x = PAD + i * (SIZE + PAD), y = TITLE + LABEL;
    ctx.fillStyle = "#16161a";
    ctx.font = "600 36px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(p.label, x, TITLE + 34);
    if (p.note) {
      ctx.font = "400 30px 'Segoe UI', Arial, sans-serif";
      ctx.fillStyle = "#5a5a63";
      ctx.fillText(p.note, x, TITLE + 76);
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, SIZE, SIZE);
    if (p.url) ctx.drawImage(await loadImage(p.url), x, y, SIZE, SIZE);
  }
  return c.toDataURL("image/png");
};

window.ready = true;
