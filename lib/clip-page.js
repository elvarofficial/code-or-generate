// Walk clip renderer, driven frame by frame by walk_clip.js (virtual clock, fixed dt).
// Same side-on camera, same light, same floor for both routes.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const W = 1080, H = 1080;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101116);
scene.fog = new THREE.Fog(0x101116, 6, 14);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;
const key = new THREE.DirectionalLight(0xfff3e6, 2.6);
key.position.set(3, 6, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 1, far: 20 });
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xbcd6ff, 1.5);
rim.position.set(-3, 4, -5);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x16120e, 0.45));
const fill = new THREE.DirectionalLight(0xffffff, 0.9);
fill.position.set(6, 2, 1);
scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(20, 96), new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.92, envMapIntensity: 0.15 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 50);
// side-on: the golem faces +Z, the camera sits on its left (+X), a little above the hip line
camera.position.set(4.3, 1.0, 0.2);
camera.lookAt(0, 0.62, 0);

let tick = null;

function fitToHeight(obj, height = 1.2) {
  const holder = new THREE.Group();
  holder.add(obj);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box.min.y, -c.z);
  holder.scale.setScalar(height / size.y);
  return holder;
}

window.setup = async (route) => {
  let obj;
  if (route === "code") {
    const mod = await import(`/route-a/06-golem.js?t=${Date.now()}`);
    const fn = typeof mod.default === "function" ? mod.default : Object.values(mod).find((v) => typeof v === "function");
    obj = await fn();
    if (!obj?.isObject3D) obj = await fn(THREE);
    obj.userData.play?.("walk");
    tick = (dt) => obj.userData.update?.(dt);
  } else {
    const gltf = await new GLTFLoader().loadAsync("/route-b/06-golem-walk.glb");
    gltf.scene.rotation.y = -Math.PI / 2;
    obj = new THREE.Group();
    obj.add(gltf.scene);
    const mixer = new THREE.AnimationMixer(gltf.scene);
    mixer.clipAction(gltf.animations.find((c) => /walk/i.test(c.name)) || gltf.animations[0]).play();
    tick = (dt) => mixer.update(dt);
  }
  const holder = fitToHeight(obj);
  holder.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  scene.add(holder);
  return true;
};

window.frame = (dt) => {
  if (tick) tick(dt);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL("image/jpeg", 0.94);
};

window.ready = true;
