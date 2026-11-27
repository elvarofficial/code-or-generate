// Gnarled dead tree — built from the 04-tree turnaround (front / left / back).
// Convention: stands on y = 0, faces +Z, up is +Y. Height ≈ 4 units.
import * as THREE from 'three';

// Reference sheets are 1024 px; the tree spans ~880 px of height.
// Authoring is done in "sheet pixels": px = front-image x, py = front-image y,
// pz = depth in pixels (+ toward the front camera, read off left.png).
const S = 4 / 880;
const BASE_PX = 560, GROUND_PY = 945;
const P = (px, py, pz = 0) => new THREE.Vector3((px - BASE_PX) * S, (GROUND_PY - py) * S, pz * S);

// Deterministic pseudo-random
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const BARK_LIGHT = new THREE.Color('#c4bba5');
const BARK_MID = new THREE.Color('#9a917d');
const BARK_DARK = new THREE.Color('#5e574d');

// Tapered tube with optional twisting bark ridges, vertex coloured.
function taperTube(curve, {
  segs = 12, radial = 6, r0, r1, rPow = 1, ridges = 0, ridgeAmp = 0, twist = 0,
  flare = 0, flareLen = 0.15, seed = 1, cap = true, radii = null,
}) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], col = [], idx = [];
  const rand = rng(seed);
  const tint = 0.9 + rand() * 0.2;
  const phase = rand() * 6.28;
  const c = new THREE.Color();
  let rEnd = r1;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPointAt(t);
    const N = frames.normals[i], B = frames.binormals[i];
    let r = r0 + (r1 - r0) * Math.pow(t, rPow);
    if (radii) {
      const f = t * (radii.length - 1), i0 = Math.min(radii.length - 2, Math.floor(f));
      r = THREE.MathUtils.lerp(radii[i0], radii[i0 + 1], f - i0) * S;
    }
    if (flare > 0 && t < flareLen) r *= 1 + flare * Math.pow(1 - t / flareLen, 2);
    rEnd = r;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      let k = 1, g = 0.5;
      if (ridges > 0) {
        const w = Math.sin(a * ridges + t * twist * Math.PI * 2 + phase + Math.sin(a * 3 + t * 9) * 0.7);
        const w2 = Math.sin(a * ridges * 2.3 - t * twist * 4 + phase);
        k = 1 + ridgeAmp * (w * 0.8 + w2 * 0.35);
        g = 0.5 + 0.5 * w;
      }
      const ca = Math.cos(a), sa = Math.sin(a);
      pos.push(
        p.x + r * k * (ca * N.x + sa * B.x),
        p.y + r * k * (ca * N.y + sa * B.y),
        p.z + r * k * (ca * N.z + sa * B.z));
      // colour: ridge tops lighter, grooves darker
      c.copy(BARK_DARK).lerp(BARK_MID, Math.min(1, g * 1.5)).lerp(BARK_LIGHT, Math.max(0, g - 0.6) * 1.8);
      c.multiplyScalar(tint * (0.95 + 0.08 * Math.sin(t * 13 + j * 1.7)));
      col.push(c.r, c.g, c.b);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j, b = (i + 1) * row + j, c2 = (i + 1) * row + j + 1, d = i * row + j + 1;
      idx.push(a, b, d, b, c2, d);
    }
  }
  if (cap) {
    const tip = curve.getPointAt(1);
    const tan = curve.getTangentAt(1);
    const ci = pos.length / 3;
    const tp = tip.clone().addScaledVector(tan, rEnd * 1.2);
    pos.push(tp.x, tp.y, tp.z);
    col.push(BARK_MID.r * tint, BARK_MID.g * tint, BARK_MID.b * tint);
    const last = segs * row;
    for (let j = 0; j < radial; j++) idx.push(last + j, ci, last + j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Insert a jittered midpoint into every span so limbs read as crooked.
function gnarl(points, amount, rand) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const d = b.clone().sub(a);
    const len = d.length();
    const side = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    side.sub(d.clone().multiplyScalar(side.dot(d) / (len * len))).normalize();
    // first span stays straight so the base of a limb stays buried in its parent
    out.push(a.clone().lerp(b, 0.5).addScaledVector(side, i === 1 ? 0 : len * amount * (0.5 + rand())));
    out.push(b);
  }
  return out;
}

// --------------------------------------------------------------------------
// Skeleton (sheet pixels). pts = [[px,py,pz],...], radii in px.
// --------------------------------------------------------------------------
const TRUNK = {
  pts: [[560, 960, -10], [568, 840, -20], [578, 730, -35], [575, 640, -30],
        [548, 560, 0], [515, 490, 25], [490, 430, 25], [480, 400, 20]],
  radii: [100, 86, 82, 82, 84, 84, 74, 56],
};

const LIMBS = [
  { id: 'upL', pts: [[475, 445, 30], [445, 370, 60], [405, 290, 100], [382, 205, 130], [372, 155, 160], [365, 112, 190]], r0: 44, r1: 6 },
  { id: 'farL', pts: [[470, 455, 20], [400, 425, 80], [330, 410, 150], [255, 378, 210], [185, 352, 240], [108, 330, 260]], r0: 36, r1: 5 },
  { id: 'mid', pts: [[495, 430, 10], [462, 350, 10], [446, 290, 5], [430, 250, 0], [418, 230, 0]], r0: 28, r1: 5 },
  { id: 'cR', pts: [[520, 420, 0], [538, 320, -20], [547, 250, -50], [557, 195, -70], [592, 160, -90], [620, 132, -100], [637, 95, -110]], r0: 34, r1: 5 },
  { id: 'R', pts: [[545, 450, 0], [605, 395, -40], [665, 348, -80], [742, 296, -120], [800, 255, -140], [860, 205, -150]], r0: 38, r1: 5 },
  { id: 'lowR', pts: [[580, 525, -10], [625, 497, -60], [702, 472, -120], [800, 455, -170], [915, 430, -195]], r0: 36, r1: 5 },
  { id: 'lowL', pts: [[515, 548, -10], [445, 532, -60], [382, 528, -100], [300, 540, -140], [215, 548, -150]], r0: 30, r1: 5 },
];

const TWIGS = [
  { parent: 'upL', at: 0.62, pts: [[400, 160, 110], [430, 115, 60], [480, 100, -20], [520, 85, -60], [545, 68, -75]], r0: 15, r1: 4 },
  { parent: 'upL', at: 0.55, pts: [[340, 280, 170], [305, 260, 200], [270, 230, 220]], r0: 9, r1: 3 },
  { parent: 'upL', at: 0.25, pts: [[345, 330, 150], [290, 280, 190], [255, 225, 220], [235, 160, 230], [228, 125, 230]], r0: 14, r1: 4 },
  { parent: 'farL', at: 0.55, pts: [[250, 340, 220], [225, 300, 250], [220, 268, 255]], r0: 10, r1: 3 },
  { parent: 'farL', at: 0.72, pts: [[180, 330, 240], [160, 305, 250], [150, 298, 255]], r0: 8, r1: 3 },
  { parent: 'farL', at: 0.35, pts: [[290, 360, 170], [270, 320, 190], [262, 300, 200]], r0: 9, r1: 3 },
  { parent: 'mid', at: 0.75, pts: [[455, 235, 0], [475, 215, -10], [482, 200, -15]], r0: 8, r1: 3 },
  { parent: 'cR', at: 0.55, pts: [[585, 230, -80], [625, 205, -110], [657, 192, -130]], r0: 10, r1: 3 },
  { parent: 'cR', at: 0.25, pts: [[565, 300, -50], [600, 270, -60], [620, 250, -70]], r0: 9, r1: 3 },
  { parent: 'R', at: 0.45, pts: [[690, 280, -110], [700, 230, -130], [692, 185, -140]], r0: 11, r1: 3 },
  { parent: 'R', at: 0.62, pts: [[750, 240, -140], [760, 205, -150], [775, 185, -150]], r0: 10, r1: 3 },
  { parent: 'R', at: 0.25, pts: [[630, 320, -70], [645, 290, -80], [650, 272, -85]], r0: 9, r1: 3 },
  { parent: 'lowR', at: 0.48, pts: [[740, 420, -150], [770, 390, -160], [792, 368, -170]], r0: 10, r1: 3 },
  { parent: 'lowR', at: 0.62, pts: [[800, 420, -170], [835, 400, -180]], r0: 9, r1: 3 },
  { parent: 'lowR', at: 0.55, pts: [[800, 500, -170], [840, 530, -180], [875, 545, -185]], r0: 10, r1: 3 },
  { parent: 'lowL', at: 0.45, pts: [[365, 490, -110], [345, 470, -115]], r0: 9, r1: 3 },
  { parent: 'lowL', at: 0.62, pts: [[300, 515, -130], [265, 497, -135], [250, 493, -140]], r0: 8, r1: 3 },
  { parent: 'lowL', at: 0.55, pts: [[320, 570, -120], [290, 592, -120], [280, 598, -120]], r0: 9, r1: 3 },
];

// Roots: leave the trunk high, hump over, then claw down onto the ground.
const ROOTS = [
  { pts: [[520, 740, 20], [450, 770, 60], [380, 800, 100], [300, 845, 150], [240, 872, 170], [210, 888, 180]], r0: 58, r1: 8 },
  { pts: [[530, 790, 50], [480, 840, 120], [420, 885, 180], [370, 915, 220], [348, 928, 235]], r0: 52, r1: 8 },
  { pts: [[555, 800, 60], [552, 860, 110], [556, 905, 135], [566, 942, 145]], r0: 50, r1: 9 },
  { pts: [[600, 790, 40], [625, 860, 60], [640, 905, 65], [646, 935, 65]], r0: 48, r1: 9 },
  { pts: [[620, 740, -30], [690, 790, -50], [760, 840, -60], [810, 870, -60], [832, 890, -60]], r0: 56, r1: 8 },
  { pts: [[600, 780, -70], [640, 850, -150], [680, 905, -200], [700, 935, -220]], r0: 50, r1: 8 },
  { pts: [[530, 780, -60], [480, 840, -150], [430, 885, -210], [390, 905, -250]], r0: 48, r1: 8 },
  { pts: [[510, 760, -40], [440, 800, -90], [385, 830, -120], [345, 852, -130]], r0: 42, r1: 7 },
];

function curveFrom(pts) {
  return new THREE.CatmullRomCurve3(pts.map(p => P(p[0], p[1], p[2])), false, 'centripetal');
}

export function createTree() {
  const group = new THREE.Group();
  group.name = '04-tree';

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0.0,
  });
  const add = (geo, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  };
  const rand = rng(1234);

  // Tiny forked tip at the end of a branch (the "claw" twigs in the sheet).
  const fork = (curve, r) => {
    const base = curve.getPointAt(0.82);
    const tan = curve.getTangentAt(0.82);
    const side = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).cross(tan).normalize();
    const len = curve.getLength() * (0.2 + rand() * 0.1);
    const dir = tan.clone().multiplyScalar(0.75).addScaledVector(side, 0.65).normalize();
    const mid = base.clone().addScaledVector(dir, len * 0.55);
    const end = base.clone().addScaledVector(dir, len).addScaledVector(tan, len * 0.2);
    const c = new THREE.CatmullRomCurve3([base, mid, end]);
    add(taperTube(c, { segs: 4, radial: 5, r0: r, r1: r * 0.4 }), 'fork');
  };

  // Trunk: thick twisting ridged column with flared base
  const trunkCurve = curveFrom(TRUNK.pts);
  add(taperTube(trunkCurve, {
    segs: 48, radial: 32, radii: TRUNK.radii,
    ridges: 6, ridgeAmp: 0.13, twist: 1.1, flare: 0.15, flareLen: 0.1, seed: 3, cap: true,
  }), 'trunk');

  // point on the trunk axis at a given height (limbs and roots start buried in it)
  const axisAt = (y) => {
    let best = 0, bd = 1e9;
    for (let i = 0; i <= 100; i++) { const d = Math.abs(trunkCurve.getPointAt(i / 100).y - y); if (d < bd) { bd = d; best = i / 100; } }
    return trunkCurve.getPointAt(best);
  };
  const curves = {};
  let seed = 10;
  for (const L of LIMBS) {
    const raw = L.pts.map(p => P(p[0], p[1], p[2]));
    raw[0] = axisAt(raw[0].y);
    const pts = gnarl(raw, 0.12, rand);
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    curves[L.id] = c;
    add(taperTube(c, {
      segs: 26, radial: 10, r0: L.r0 * S, r1: L.r1 * S, rPow: 0.55,
      ridges: 3, ridgeAmp: 0.12, twist: 0.8, seed: seed++,
    }), 'limb_' + L.id);
    fork(c, 4 * S);
  }

  for (const T of TWIGS) {
    const parent = curves[T.parent];
    const start = parent.getPointAt(T.at);
    const pts = gnarl([start, ...T.pts.map(p => P(p[0], p[1], p[2]))], 0.14, rand);
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    add(taperTube(c, {
      segs: 12, radial: 6, r0: T.r0 * S, r1: T.r1 * S, rPow: 0.7, seed: seed++,
    }), 'twig_' + T.parent);
    if (c.getLength() > 60 * S) fork(c, 3 * S);
  }

  for (const R of ROOTS) {
    const raw = R.pts.map(p => P(p[0], p[1], p[2]));
    // start low inside the trunk base; drop the second point so the root hugs the ground
    raw[0] = axisAt(P(0, 835).y);
    raw[1].y = Math.min(raw[1].y, P(0, 850).y);
    raw[raw.length - 1].y -= 6 * S;
    const pts = gnarl(raw, 0.1, rand);
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    add(taperTube(c, {
      segs: 20, radial: 10, r0: R.r0 * 0.9 * S, r1: R.r1 * S, rPow: 0.6,
      ridges: 3, ridgeAmp: 0.14, twist: 0.5, seed: seed++,
    }), 'root');
  }

  return group;
}

export default createTree;
