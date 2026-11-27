import * as THREE from 'three';

// Round red potion flask with a cork stopper.
// Units: ~1 unit = 1000 px of the reference sheet. Stands on y = 0, faces +Z.
// The side reference shows a flattened body: nearly flat on the front (+Z),
// rounded and deeper toward the back (-Z). Neck/cork axis sits at x = z = 0.

const BODY_R = 0.318;
const BODY_CY = 0.305;
const BODY_RY = 0.305;
const NECK_R = 0.075;
const FRONT_Z = 0.13;   // flat front face depth
const BACK_Z = 0.245;   // back bulge depth

function smoothMax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

// Outer glass radius as function of height (front view silhouette)
function bodyRadius(y) {
  const d = (y - BODY_CY) / BODY_RY;
  const rs = d * d < 1 ? BODY_R * Math.sqrt(1 - d * d) : 0;
  return smoothMax(rs, NECK_R, 0.1);
}

// Squash z of a lathe vertex: flat front, deep rounded back.
function squashZ(z, scale = 1) {
  const u = z / (BODY_R * scale);
  if (u >= 0) {
    const t = Math.min(u, 1);
    return FRONT_Z * scale * (1 - Math.pow(1 - t, 3.2));
  }
  return -BACK_Z * scale * Math.min(-u, 1);
}

function deformBody(geo, scale, keepAbove) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const z = p.getZ(i);
    // blend toward undeformed in the neck so it stays round
    const w = THREE.MathUtils.smoothstep(y, keepAbove - 0.05, keepAbove);
    p.setZ(i, THREE.MathUtils.lerp(squashZ(z, scale), z, w));
  }
  geo.computeVertexNormals();
  return geo;
}

function glassProfile() {
  const pts = [];
  pts.push(new THREE.Vector2(0.0, 0.012));
  pts.push(new THREE.Vector2(0.06, 0.008));
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const y = 0.012 + (0.68 - 0.012) * (i / N);
    pts.push(new THREE.Vector2(Math.max(bodyRadius(y), 0.07), y));
  }
  // lip
  pts.push(new THREE.Vector2(0.1, 0.686));
  pts.push(new THREE.Vector2(0.118, 0.693));
  pts.push(new THREE.Vector2(0.127, 0.705));
  pts.push(new THREE.Vector2(0.131, 0.725));
  pts.push(new THREE.Vector2(0.131, 0.755));
  pts.push(new THREE.Vector2(0.127, 0.775));
  pts.push(new THREE.Vector2(0.117, 0.786));
  pts.push(new THREE.Vector2(0.1, 0.789));
  pts.push(new THREE.Vector2(0.092, 0.784));
  return pts;
}

function liquidProfile(level) {
  const s = 0.95;
  const pts = [new THREE.Vector2(0, 0.022)];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const y = 0.024 + (level - 0.024) * (i / N);
    const d = (y - BODY_CY) / (BODY_RY * s);
    const r = BODY_R * s * Math.sqrt(Math.max(1 - d * d, 0));
    pts.push(new THREE.Vector2(Math.max(r, 0.07), y));
  }
  pts.push(new THREE.Vector2(0, level));
  return pts;
}

// cheap value noise for the cork surface
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeCork(mat) {
  const geo = new THREE.CylinderGeometry(0.097, 0.086, 0.24, 32, 10, false);
  geo.translate(0, 0.645 + 0.12, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    let f = 1 + (hash(Math.round(x * 60), Math.round(y * 60), Math.round(z * 60)) - 0.5) * 0.04;
    // round top edge
    if (y > 0.87 && r > 0.07) f *= 1 - (y - 0.87) * 3.5;
    if (r > 1e-4) { p.setX(i, x * f); p.setZ(i, z * f); }
    if (y > 0.88) p.setY(i, y + (hash(x * 50, 1, z * 50) - 0.5) * 0.008 - (r / 0.1) * 0.006);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  return m;
}

// Glass: mostly clear in the middle, grey toward grazing angles (fresnel rim).
function makeGlassMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { tint: { value: new THREE.Color(0x8e97a3) }, hi: { value: new THREE.Color(0xf4f7fa) } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal);
        vV = isOrthographic ? vec3(0.0,0.0,1.0) : normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 tint; uniform vec3 hi; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
        float f = 1.0 - abs(dot(n, vV));
        float rim = pow(f, 2.5);
        float spec = pow(max(dot(n, normalize(vec3(-0.5,0.6,0.62))),0.0), 60.0);
        vec3 c = mix(tint, hi, spec);
        float a = 0.035 + 0.7*rim + 0.6*spec;
        gl_FragColor = vec4(c, clamp(a,0.0,0.9)); }`,
  });
}

// Liquid: glowing bright red core, darker crimson toward the silhouette.
function makeLiquidMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { core: { value: new THREE.Color(0xf01a28) }, edge: { value: new THREE.Color(0x9c0a18) } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
        vN = normalize(normalMatrix * normal);
        vV = isOrthographic ? vec3(0.0,0.0,1.0) : normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 core; uniform vec3 edge; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 n = normalize(vN);
        float f = abs(dot(n, vV));
        vec3 c = mix(edge, core, smoothstep(0.15, 0.95, f));
        float spec = pow(max(dot(n, normalize(vec3(-0.45,0.5,0.75))),0.0), 40.0);
        c += vec3(0.35,0.2,0.2) * spec;
        gl_FragColor = vec4(c, 1.0); }`,
  });
}

export function createPotion() {
  const group = new THREE.Group();
  group.name = 'Potion';

  const glassMat = makeGlassMaterial();
  const liquidMat = makeLiquidMaterial();
  const liquidTopMat = new THREE.MeshStandardMaterial({
    color: 0xff4a4a, emissive: 0x9a1818, roughness: 0.3,
  });
  const corkMat = new THREE.MeshStandardMaterial({ color: 0xa86b3c, roughness: 0.95 });

  // Liquid (opaque, drawn first)
  const level = 0.43;
  const liqGeo = deformBody(new THREE.LatheGeometry(liquidProfile(level), 64), 0.95, 10);
  const liquid = new THREE.Mesh(liqGeo, liquidMat);
  liquid.name = 'Liquid';
  group.add(liquid);
  // surface disc (slightly lighter)
  const dd = (level - BODY_CY) / (BODY_RY * 0.95);
  const surfR = BODY_R * 0.95 * Math.sqrt(1 - dd * dd);
  const topGeo = new THREE.CircleGeometry(surfR, 64);
  topGeo.rotateX(-Math.PI / 2);
  deformBody(topGeo, 0.95, 10);
  topGeo.translate(0, level + 0.001, 0);
  const top = new THREE.Mesh(topGeo, liquidTopMat);
  top.name = 'LiquidSurface';
  group.add(top);

  // Meniscus band: lighter strip just under the surface
  const band = [];
  for (let i = 0; i <= 4; i++) {
    const y = level - 0.016 + 0.016 * (i / 4);
    const dy = (y - BODY_CY) / (BODY_RY * 0.95);
    band.push(new THREE.Vector2(BODY_R * 0.953 * Math.sqrt(1 - dy * dy), y));
  }
  const bandGeo = deformBody(new THREE.LatheGeometry(band, 64), 0.953, 10);
  const meniscus = new THREE.Mesh(bandGeo, liquidTopMat);
  meniscus.name = 'Meniscus';
  group.add(meniscus);

  // Cork
  const cork = makeCork(corkMat);
  cork.name = 'Cork';
  group.add(cork);

  // Glass flask
  const glassGeo = deformBody(new THREE.LatheGeometry(glassProfile(), 64), 1, 0.62);
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.name = 'Glass';
  glass.renderOrder = 2;
  group.add(glass);


  return group;
}

export default createPotion;
