// Moss-covered cracked boulder. Stands on y = 0, faces +Z, up is +Y.
// All geometry and the colour texture are generated procedurally in code.
import * as THREE from 'three';

// ---------- deterministic helpers ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w
  ) * 2 - 1;
}
function fbm(x, y, z, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- silhouette profile ----------
// t = height fraction (0 bottom .. 1 top), wf = half width (X), ws = half depth (Z),
// in reference-image pixels; the object is 895 px tall in the turnaround.
const PROFILE = [
  [0.000, 0, 0],
  [0.000, 300, 195],
  [0.030, 392, 255],
  [0.090, 424, 285],
  [0.220, 433, 304],
  [0.380, 430, 312],
  [0.470, 412, 308],
  [0.560, 382, 295],
  [0.660, 322, 258],
  [0.750, 288, 236],
  [0.850, 250, 205],
  [0.910, 215, 170],
  [0.960, 170, 125],
  [0.992, 100, 70],
  [1.000, 0, 0],
];
const HEIGHT = 1.8;
const PX = HEIGHT / 895;

// Arc-length parameterisation of the profile -> polar angle theta.
const PROF_THETA = (() => {
  const d = [0];
  for (let i = 1; i < PROFILE.length; i++) {
    const a = PROFILE[i - 1], b = PROFILE[i];
    d.push(d[i - 1] + Math.hypot((b[0] - a[0]) * 895, b[1] - a[1]) + 1e-3);
  }
  const L = d[d.length - 1];
  return d.map((x) => Math.PI * (1 - x / L)); // bottom -> theta = PI, top -> 0
})();

function profileAt(theta) {
  for (let i = 1; i < PROFILE.length; i++) {
    const t0 = PROF_THETA[i - 1], t1 = PROF_THETA[i];
    if (theta <= t0 && theta >= t1) {
      const k = (t0 - theta) / (t0 - t1 || 1);
      const a = PROFILE[i - 1], b = PROFILE[i];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
  }
  return theta < 0.5 ? PROFILE[PROFILE.length - 1] : PROFILE[0];
}

// Base surface (smooth shape + broad lumps), from spherical angles.
function basePos(theta, phi, out) {
  const [t, wf, ws] = profileAt(theta);
  const dx = -Math.cos(phi), dz = Math.sin(phi);
  const sx = -Math.cos(phi) * Math.sin(theta), sy = Math.cos(theta), sz = Math.sin(phi) * Math.sin(theta);
  // broad lumpy deformation, weaker near the flat base
  const lump = 1 + 0.04 * fbm(sx * 1.6 + 3.1, sy * 1.6, sz * 1.6, 3) * smooth(0.0, 0.12, t);
  out.x = dx * wf * PX * lump;
  out.z = dz * ws * PX * lump;
  out.y = t * HEIGHT;
  // lobe: front-left shoulder step (seen at ~y 0.55 on left in the front view)
  return out;
}

// ---------- stone plates (Voronoi on the base surface) ----------
function makeSeeds() {
  const r = rng(1717);
  const seeds = [];
  const N = 42;
  const tmp = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < N; i++) {
    // fibonacci sphere with jitter
    const y = 1 - (2 * (i + 0.5)) / N + (r() - 0.5) * 0.03;
    const th = Math.acos(Math.max(-1, Math.min(1, y)));
    const ph = i * 2.39996 + (r() - 0.5) * 0.5;
    basePos(th, ph, tmp);
    seeds.push([tmp.x, tmp.y, tmp.z, r()]);
  }
  return seeds;
}

function cellInfo(seeds, x, y, z) {
  // warp the lookup a little for irregular, wobbly crack lines
  const wx = x + 0.05 * vnoise(x * 4, y * 4, z * 4);
  const wy = y + 0.05 * vnoise(x * 4 + 7, y * 4, z * 4);
  const wz = z + 0.05 * vnoise(x * 4, y * 4 + 9, z * 4);
  let d1 = 1e9, d2 = 1e9, i1 = 0;
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    const dx = wx - s[0], dy = wy - s[1], dz = wz - s[2];
    const d = dx * dx + dy * dy + dz * dz;
    if (d < d1) { d2 = d1; d1 = d; i1 = i; } else if (d < d2) d2 = d;
  }
  const a = Math.sqrt(d1), b = Math.sqrt(d2);
  return { edge: (b - a) * 0.5, centre: a, id: i1 };
}

// ---------- full surface ----------
function surface(seeds, theta, phi, out) {
  basePos(theta, phi, out);
  const ci = cellInfo(seeds, out.x, out.y, out.z);
  const t = out.y / HEIGHT;
  const fade = smooth(0.0, 0.06, t) * smooth(1.0, 0.95, t); // no relief on the flat bottom
  // plates bulge outward, cracks cut inward
  const bulge = 0.012 * smooth(0.0, 0.14, ci.edge) - 0.022 * (1 - smooth(0.0, 0.05, ci.edge));
  const r = Math.hypot(out.x, out.z) || 1;
  const k = (bulge * fade) / r;
  out.x += out.x * k * 1.0;
  out.z += out.z * k * 1.0;
  out.y += bulge * fade * Math.cos(theta) * 0.6;
  out.edge = ci.edge;
  out.id = ci.id;
  return out;
}

// ---------- colour texture ----------
const C = {
  stone: [128, 128, 108], stoneDark: [92, 92, 76], stoneLight: [170, 170, 146],
  moss: [92, 106, 34], mossLight: [138, 150, 50], mossDark: [44, 54, 20],
  brown: [118, 84, 44], crack: [40, 34, 18], crackGold: [112, 80, 22],
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function colourAt(seeds, theta, phi, p) {
  surface(seeds, theta, phi, p);
  const sx = -Math.cos(phi) * Math.sin(theta), sy = Math.cos(theta), sz = Math.sin(phi) * Math.sin(theta);
  const t = p.y / HEIGHT;
  const cellR = hash3(p.id, 3, 11);
  // stone base with per-plate tint and painterly streaks
  let col = mix(C.stoneDark, C.stone, 0.55 + 0.45 * cellR);
  col = mix(col, C.stoneLight, smooth(0.04, 0.09, p.edge) * (1 - smooth(0.09, 0.16, p.edge)) * 0.55);
  col = mix(col, C.stoneDark, Math.max(0, fbm(p.x * 6, p.y * 6, p.z * 6, 3)) * 0.6);

  // moss coverage: stone is exposed in two painted regions (front centre, back upper-left)
  const blob = (bx, by, bz, rad) => {
    const l = Math.hypot(bx, by, bz);
    const d = Math.acos(Math.max(-1, Math.min(1, (sx * bx + sy * by + sz * bz) / l)));
    return 1 - smooth(rad * 0.45, rad, d);
  };
  const stoneZone = (0.8 + 0.35 * fbm(p.x * 5 + 2, p.y * 5, p.z * 5, 3)) * Math.max(blob(0.12, 0.2, 1, 0.95), blob(0.45, 0.3, -1, 1.0));
  let m = fbm(p.x * 3.4 + 11, p.y * 3.4, p.z * 3.4, 5) * 1.25
    + 0.45 - 1.05 * stoneZone
    + 0.3 * smooth(0.6, 1.0, sy)
    + 0.4 * (1 - smooth(0.05, 0.22, t))
    - 0.2 * smooth(0.02, 0.15, p.edge) * (cellR > 0.4 ? 1 : 0.3)
    + (cellR < 0.2 ? 0.3 : 0);
  const mossA = smooth(-0.02, 0.12, m);
  const fine = fbm(p.x * 22, p.y * 22, p.z * 22, 3);
  let moss = mix(C.moss, C.mossLight, smooth(-0.1, 0.55, fine + 0.3 * sy) * 0.7);
  moss = mix(moss, C.mossDark, smooth(0.05, 0.5, -fine) * 0.5);
  const br = fbm(p.x * 3 + 40, p.y * 3, p.z * 3, 3);
  moss = mix(moss, C.brown, smooth(0.15, 0.4, br) * 0.6);
  // darken toward the base (ambient occlusion feel)
  moss = mix(moss, C.mossDark, (1 - smooth(0.0, 0.3, t)) * 0.5);
  col = mix(col, moss, mossA);
  // baked occlusion: darker toward the base and on the underside
  col = mix(col, [34, 40, 18], (1 - smooth(0.0, 0.35, t)) * 0.35 + Math.max(0, -sy) * 0.3);

  // cracks: dark lines with a golden-brown core, partly hidden by thick moss
  const crack = 1 - smooth(0.006, 0.022, p.edge);
  const core = 1 - smooth(0.0, 0.006, p.edge);
  const vis = (1 - mossA * 0.7) * smooth(0.0, 0.05, t) * smooth(1.0, 0.94, t);
  col = mix(col, C.crack, crack * vis);
  col = mix(col, C.crackGold, core * vis * 0.6);
  return col;
}

function buildTexture(seeds, W = 1024, H = 512) {
  const data = new Uint8Array(W * H * 4);
  const p = { x: 0, y: 0, z: 0 };
  for (let j = 0; j < H; j++) {
    const v = (j + 0.5) / H;
    const theta = (1 - v) * Math.PI;
    for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W;
      const phi = u * Math.PI * 2;
      const c = colourAt(seeds, theta, phi, p);
      const o = (j * W + i) * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ---------- geometry ----------
function buildGeometry(seeds, WS = 128, HS = 72) {
  const geo = new THREE.SphereGeometry(1, WS, HS);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const nrm = geo.attributes.normal;
  const p = { x: 0, y: 0, z: 0 }, a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 };
  const e = 1e-3;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const phi = uv.getX(i) * Math.PI * 2;
    const theta = (1 - uv.getY(i)) * Math.PI;
    surface(seeds, theta, phi, p);
    pos.setXYZ(i, p.x, p.y, p.z);
    // analytic-ish normal by finite differences (seam-free)
    const th = Math.min(Math.PI - 2 * e, Math.max(2 * e, theta));
    surface(seeds, th + e, phi, a); surface(seeds, th - e, phi, b);
    A.set(a.x - b.x, a.y - b.y, a.z - b.z);
    surface(seeds, th, phi + e, a); surface(seeds, th, phi - e, b);
    B.set(a.x - b.x, a.y - b.y, a.z - b.z);
    N.crossVectors(A, B);
    if (N.lengthSq() < 1e-14) N.set(0, theta < 1.5 ? 1 : -1, 0);
    N.normalize();
    nrm.setXYZ(i, N.x, N.y, N.z);
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function createBoulder() {
  const seeds = makeSeeds();
  const geo = buildGeometry(seeds);
  const map = buildTexture(seeds);
  const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0.0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'boulder';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = '17-boulder';
  group.add(mesh);
  return group;
}

export default createBoulder;
