// Article image: one asset, Code on the left, Tripo API on the right, same studio as the live page.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const W = 1920, H = 1080;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const bg = document.createElement("canvas");
bg.width = 4;
bg.height = 512;
const g = bg.getContext("2d").createLinearGradient(0, 0, 0, 512);
g.addColorStop(0, "#050608");
g.addColorStop(0.55, "#15171d");
g.addColorStop(1, "#0b0c10");
bg.getContext("2d").fillStyle = g;
bg.getContext("2d").fillRect(0, 0, 4, 512);
scene.background = new THREE.CanvasTexture(bg);
scene.background.colorSpace = THREE.SRGBColorSpace;
scene.fog = new THREE.Fog(0x0b0c10, 7, 18);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const key = new THREE.DirectionalLight(0xfff3e6, 2.4);
key.position.set(-3.5, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xbcd6ff, 1.7);
rim.position.set(2, 4, -6);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x16120e, 0.4));
const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.92, envMapIntensity: 0.15 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function pool(x) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const rg = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, "rgba(255,255,255,1)");
  rg.addColorStop(0.45, "rgba(255,255,255,0.45)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshBasicMaterial({ map: tex, color: 0xffe6c4, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.002, 0);
  scene.add(m);
}

const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 60);
camera.position.set(0, 1.45, 6.4);
camera.lookAt(0, 0.68, 0);

// fit inside height x maxWidth as seen by the camera (after the yaw turn)
function fit(obj, height, maxWidth, yaw) {
  const holder = new THREE.Group();
  const spin = new THREE.Group();
  spin.rotation.y = yaw;
  holder.add(spin);
  spin.add(obj);
  holder.updateMatrixWorld(true);
  // center in world space after the turn
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  spin.position.set(-ctr.x, -box.min.y, -ctr.z);
  holder.scale.setScalar(Math.min(height / size.y, maxWidth / size.x));
  holder.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  return holder;
}

window.setup = async ({ asset, codeFile, yaw = 0.35, height = 1.35, maxWidth = 1.2, gap = 1.05, w = W, h = H, center = null, targetY = 0.68 }) => {
  renderer.setSize(w, h);
  camera.lookAt(0, targetY, 0);
  if (center) {
    // put the scene's center at pixel `center` instead of w / 2
    camera.aspect = (2 * center) / h;
    camera.setViewOffset(2 * center, h, 0, 0, w, h);
  } else camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const mod = await import(`/${codeFile}?t=${Date.now()}`);
  const fn = typeof mod.default === "function" ? mod.default : Object.values(mod).find((v) => typeof v === "function");
  let code = await fn();
  if (!code?.isObject3D) code = await fn(THREE);
  const gltf = await new GLTFLoader().loadAsync(`/route-b/${asset}.glb`);
  gltf.scene.rotation.y = -Math.PI / 2;
  const tripo = new THREE.Group();
  tripo.add(gltf.scene);
  for (const [obj, x] of [[code, -gap], [tripo, gap]]) {
    const holder = fit(obj, height, maxWidth, yaw);
    holder.position.x = x;
    scene.add(holder);
    pool(x);
  }
  renderer.render(scene, camera);
  const xs = [-gap, gap].map((x) => ((new THREE.Vector3(x, 0, 0).project(camera).x + 1) / 2) * w);
  return { png: renderer.domElement.toDataURL("image/png"), xs };
};
window.ready = true;
