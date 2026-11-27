// Stylised spirit wolf with glowing cyan markings.
// Convention: stands on y = 0, faces +Z, up is +Y, +X is the wolf's left side.
// All geometry and materials are procedural; no external assets.
import * as THREE from 'three';

// ---------- small deterministic helpers ----------
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
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

const COL = {
  fur: new THREE.Color('#978873'),
  furDark: new THREE.Color('#6a6156'),
  furLight: new THREE.Color('#c9bfae'),
  cream: new THREE.Color('#ddd4c4'),
  leg: new THREE.Color('#928672'),
  tail: new THREE.Color('#a59b8b'),
  nose: new THREE.Color('#1d1a19'),
  innerEar: new THREE.Color('#5e544c'),
  glow: new THREE.Color('#58d6ff'),
};

// ---------- fur blob: ellipsoid with jagged clumps ----------
// Displacement is a pure function of the unit direction so other parts
// (glow markings, tufts) can sit exactly on the displaced surface.
function makeFurField(seed, amp, freq) {
  const r = rng(seed);
  const waves = [];
  for (let i = 0; i < 6; i++) {
    const k = v3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(freq * (0.7 + r() * 0.8));
    waves.push({ k, p: r() * Math.PI * 2 });
  }
  return (d) => {
    let n = 0;
    for (const w of waves) n += Math.sin(w.k.dot(d) + w.p);
    n /= waves.length;
    return amp * Math.pow(Math.max(0, n + 0.15), 1.4);
  };
}

class FurBlob {
  constructor({ center, radii, rot = [0, 0, 0], seed = 1, amp = 0.08, freq = 9, segs = [22, 14], color, colorFn, taper = 0 }) {
    this.taper = taper;
    this.c = center.clone();
    this.r = radii.clone();
    this.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot));
    this.qi = this.q.clone().invert();
    this.f = makeFurField(seed, amp, freq);
    const g = new THREE.SphereGeometry(1, segs[0], segs[1]);
    const pos = g.attributes.position;
    const cols = [];
    const d = new THREE.Vector3();
    const rand = rng(seed * 7 + 3);
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      const w = this.surface(d);
      pos.setXYZ(i, w.x, w.y, w.z);
      const c = (colorFn ? colorFn(w, d) : color).clone();
      c.offsetHSL(0, 0, (rand() - 0.5) * 0.06);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    this.geometry = g;
  }
  // world-space point on displaced surface for a local unit direction
  surface(d, extra = 0) {
    const s = 1 + this.f(d) + extra;
    const tp = 1 - this.taper * Math.max(0, d.z);
    return v3(d.x * this.r.x * s * tp, d.y * this.r.y * s * tp, d.z * this.r.z * s).applyQuaternion(this.q).add(this.c);
  }
  // project a world-space point onto the surface along the ray from the centre
  project(p, extra = 0) {
    const l = p.clone().sub(this.c).applyQuaternion(this.qi);
    const d = v3(l.x / this.r.x, l.y / this.r.y, l.z / this.r.z).normalize();
    return this.surface(d, extra);
  }
  normalAt(p) {
    const l = p.clone().sub(this.c).applyQuaternion(this.qi);
    return v3(l.x / (this.r.x * this.r.x), l.y / (this.r.y * this.r.y), l.z / (this.r.z * this.r.z))
      .applyQuaternion(this.q).normalize();
  }
}

// colour gradient: lighter underneath / at front, darker on top
function shade(base, opts = {}) {
  const { light = COL.furLight, dark = COL.furDark, yTop = 1.0, yBot = 0.45, front = null } = opts;
  return (w, d) => {
    const c = base.clone();
    const t = THREE.MathUtils.clamp((w.y - yBot) / (yTop - yBot), 0, 1);
    if (d.y < -0.1) c.lerp(light, Math.min(1, -d.y * 0.9));
    if (d.y > 0.4) c.lerp(dark, (d.y - 0.4) * 0.6 * t);
    if (front !== null && d.z > front) c.lerp(light, (d.z - front) / (1 - front) * 0.7);
    return c;
  };
}

// ---------- tapered limb segment ----------
function limbGeo(a, b, ra, rb, radial = 10) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(rb, ra, len, radial, 3, true);
  // slightly jagged rim for a furry look
  const pos = g.attributes.position;
  const r = rng(Math.floor(a.x * 1000 + a.y * 777 + b.z * 313) + 99);
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (r() - 0.5) * 0.12;
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  g.translate(0, len / 2, 0);
  const dir = b.clone().sub(a).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir));
  g.translate(a.x, a.y, a.z);
  return g;
}

function ellipsoidGeo(c, r, segs = [12, 8], rot = [0, 0, 0]) {
  const g = new THREE.SphereGeometry(1, segs[0], segs[1]);
  g.scale(r.x, r.y, r.z);
  g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)));
  g.translate(c.x, c.y, c.z);
  return g;
}

function colorize(g, color) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = color.r; a[i * 3 + 1] = color.g; a[i * 3 + 2] = color.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// fur tuft: a thin flattened cone growing from p in direction dir
function tuftGeo(p, dir, len, rad, color) {
  const g = new THREE.ConeGeometry(rad, len, 4, 1, true);
  g.scale(1, 1, 0.45);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir.clone().normalize()));
  g.translate(p.x, p.y, p.z);
  return colorize(g, color);
}

// scatter tufts over a blob, pointing along normal blended with a flow direction
function scatterTufts(blob, n, { seed = 5, len = 0.08, rad = 0.025, flow = v3(0, -0.3, -1), bias = 0.6, filter = () => true, color, colorFn } = {}) {
  const r = rng(seed);
  const out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 20) {
    const d = v3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (d.lengthSq() > 1 || d.lengthSq() < 0.01) continue;
    d.normalize();
    const p = blob.surface(d, -0.02);
    if (!filter(p, d)) continue;
    const nrm = blob.normalAt(p);
    const fl = flow.clone().addScaledVector(nrm, -flow.dot(nrm) * 0.5);
    const dir = nrm.clone().multiplyScalar(1 - bias).add(fl.normalize().multiplyScalar(bias)).normalize();
    if (dir.dot(nrm) < 0.1) dir.add(nrm.clone().multiplyScalar(0.4)).normalize();
    const l = len * (0.6 + r() * 0.8);
    const c = (colorFn ? colorFn(p, d) : color).clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
    out.push(tuftGeo(p, dir, l, rad * (0.7 + r() * 0.6), c));
  }
  return out;
}

// glowing stroke following a curve of surface points
function strokeGeo(points, radius = 0.009, segs = 24) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return new THREE.TubeGeometry(curve, segs, radius, 4, false);
}
function projStroke(blob, pts, extra = 0.015, mirrorX = false) {
  return pts.map(([x, y, z]) => blob.project(v3(mirrorX ? -x : x, y, z), extra));
}

// merge helper (non-indexed, position/normal/color only)
function merge(geos) {
  const prepared = geos.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    if (!ng.attributes.normal) ng.computeVertexNormals();
    return ng;
  });
  let total = 0;
  for (const g of prepared) total += g.attributes.position.count;
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3), C = new Float32Array(total * 3);
  let o = 0;
  for (const g of prepared) {
    const n = g.attributes.position.count;
    P.set(g.attributes.position.array.subarray(0, n * 3), o * 3);
    N.set(g.attributes.normal.array.subarray(0, n * 3), o * 3);
    if (g.attributes.color) C.set(g.attributes.color.array.subarray(0, n * 3), o * 3);
    else C.fill(1, o * 3, (o + n) * 3);
    o += n;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  m.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return m;
}

// ---------- the wolf ----------
export function createWolf() {
  const group = new THREE.Group();
  group.name = 'SpiritWolf';

  const furParts = [];   // vertex-coloured fur geometry
  const glowParts = [];  // cyan markings
  const blobs = {};

  const addBlob = (name, opts) => {
    const b = new FurBlob(opts);
    blobs[name] = b;
    furParts.push(b.geometry);
    return b;
  };

  // --- torso ---
  addBlob('hips', {
    center: v3(0, 0.66, -0.37), radii: v3(0.2, 0.19, 0.2), rot: [-0.25, 0, 0], seed: 11, amp: 0.07,
    colorFn: shade(COL.fur, { yTop: 0.86, yBot: 0.5 }),
  });
  addBlob('mid', {
    center: v3(0, 0.725, -0.07), radii: v3(0.19, 0.21, 0.36), seed: 12, amp: 0.07,
    colorFn: shade(COL.fur, { yTop: 0.9, yBot: 0.52 }),
  });
  addBlob('chest', {
    center: v3(0, 0.69, 0.27), radii: v3(0.23, 0.205, 0.25), seed: 13, amp: 0.09,
    colorFn: shade(COL.fur, { yTop: 0.9, yBot: 0.5, front: 0.4 }),
  });
  addBlob('mane', {
    center: v3(0, 0.85, 0.36), radii: v3(0.255, 0.27, 0.22), rot: [-0.5, 0, 0], seed: 14, amp: 0.12, freq: 11, segs: [26, 16],
    colorFn: shade(COL.fur, { yTop: 1.15, yBot: 0.6, front: 0.3 }),
  });

  // --- head ---
  addBlob('skull', {
    center: v3(0, 1.055, 0.575), radii: v3(0.135, 0.12, 0.135), seed: 21, amp: 0.03,
    colorFn: shade(COL.fur, { yTop: 1.16, yBot: 0.95, front: 0.5, light: COL.furLight }),
  });
  addBlob('cheeks', {
    center: v3(0, 1.0, 0.55), radii: v3(0.2, 0.13, 0.11), seed: 22, amp: 0.16, freq: 12,
    colorFn: shade(COL.furLight, { yTop: 1.1, yBot: 0.9, light: COL.cream, dark: COL.fur }),
  });
  addBlob('muzzle', {
    center: v3(0, 0.955, 0.745), radii: v3(0.078, 0.072, 0.15), rot: [0.22, 0, 0], seed: 23, amp: 0.01, segs: [16, 10], taper: 0.6,
    colorFn: (w, d) => (d.y > 0.5 ? COL.fur.clone().lerp(COL.furLight, 0.4) : COL.cream.clone()),
  });
  addBlob('jaw', {
    center: v3(0, 0.895, 0.715), radii: v3(0.05, 0.03, 0.1), rot: [0.1, 0, 0], seed: 24, amp: 0.02, segs: [12, 8],
    color: COL.cream,
  });
  furParts.push(colorize(ellipsoidGeo(v3(0, 0.935, 0.88), v3(0.03, 0.022, 0.025), [10, 6]), COL.nose));
  // mouth line
  furParts.push(colorize(ellipsoidGeo(v3(0, 0.915, 0.78), v3(0.052, 0.006, 0.1), [10, 4]), COL.furDark));

  // ears
  for (const s of [-1, 1]) {
    const base = v3(0.125 * s, 1.13, 0.6);
    const tip = v3(0.15 * s, 1.3, 0.64);
    const g = new THREE.ConeGeometry(0.095, base.distanceTo(tip), 6, 1, false);
    g.scale(1, 1, 0.6);
    g.translate(0, base.distanceTo(tip) / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), tip.clone().sub(base).normalize()));
    g.translate(base.x, base.y, base.z);
    furParts.push(colorize(g, COL.fur));
    const gi = new THREE.ConeGeometry(0.045, base.distanceTo(tip) * 0.8, 5, 1, false);
    gi.scale(1, 1, 0.3);
    gi.translate(0, base.distanceTo(tip) * 0.4, 0);
    gi.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), tip.clone().sub(base).normalize()));
    gi.translate(base.x, base.y + 0.005, base.z + 0.022);
    furParts.push(colorize(gi, COL.innerEar));
  }

  // eyes (glowing)
  for (const s of [-1, 1]) {
    const e = blobs.skull.project(v3(0.075 * s, 1.04, 0.7), 0.0);
    glowParts.push(ellipsoidGeo(e, v3(0.022, 0.013, 0.014), [10, 6], [0, 0.5 * s, -0.25 * s]));
  }

  // --- legs ---
  const legs = [
    // [side x, top, elbow/stifle, hock/wrist, foot, paw centre]
    { x: 0.08, xb: 0.1, pts: [v3(0, 0.62, 0.27), v3(0, 0.4, 0.22), v3(0, 0.12, 0.24), v3(0, 0.05, 0.26)], paw: 0.31, r: [0.08, 0.06, 0.048, 0.044] },
    { x: -0.08, xb: -0.1, pts: [v3(0, 0.62, 0.36), v3(0, 0.4, 0.33), v3(0, 0.12, 0.35), v3(0, 0.05, 0.37)], paw: 0.42, r: [0.08, 0.06, 0.048, 0.044] },
    { x: 0.12, xb: 0.155, pts: [v3(0, 0.6, -0.46), v3(0, 0.42, -0.4), v3(0, 0.23, -0.52), v3(0, 0.05, -0.5)], paw: -0.45, r: [0.1, 0.07, 0.05, 0.045], hind: true },
    { x: -0.12, xb: -0.155, pts: [v3(0, 0.6, -0.35), v3(0, 0.43, -0.25), v3(0, 0.24, -0.28), v3(0, 0.05, -0.17)], paw: -0.12, r: [0.1, 0.07, 0.05, 0.045], hind: true },
  ];
  legs.forEach((L, li) => {
    const P = L.pts.map((p, i) => v3(L.x + (L.xb - L.x) * (i / 3), p.y, p.z));
    for (let i = 0; i < 3; i++) {
      const g = limbGeo(P[i], P[i + 1], L.r[i], L.r[i + 1]);
      colorize(g, i === 0 ? COL.fur : COL.leg.clone().lerp(COL.furLight, i * 0.12));
      furParts.push(g);
      furParts.push(colorize(ellipsoidGeo(P[i + 1], v3(L.r[i + 1], L.r[i + 1], L.r[i + 1])), COL.leg));
    }
    // upper leg mass (shoulder / thigh)
    const thigh = addBlob('thigh' + li, {
      center: L.hind ? v3(L.x * 1.05, 0.52, (P[0].z + P[1].z) / 2 - 0.03) : v3(L.x, 0.5, P[0].z - 0.01),
      radii: L.hind ? v3(0.1, 0.2, 0.14) : v3(0.09, 0.16, 0.1),
      rot: L.hind ? [0.35, 0, 0] : [0, 0, 0],
      seed: 40 + li, amp: 0.12, freq: 10, segs: [16, 12],
      colorFn: shade(COL.fur, { yTop: 0.75, yBot: 0.4 }),
    });
    // feathering tufts on the back of the upper leg
    furParts.push(...scatterTufts(thigh, 10, {
      seed: 60 + li, len: 0.06, rad: 0.022, flow: v3(0, -1, -0.4), bias: 0.7,
      filter: (p, d) => d.z < 0.2 && d.y < 0.3, color: COL.fur,
    }));
    // paw
    const pc = v3(L.xb, 0.035, L.paw);
    furParts.push(colorize(ellipsoidGeo(pc, v3(0.055, 0.035, 0.07), [12, 8]), COL.furLight));
    for (let t = 0; t < 4; t++) {
      const tx = L.xb + (t - 1.5) * 0.026;
      const tz = L.paw + 0.055 - Math.abs(t - 1.5) * 0.012;
      furParts.push(colorize(ellipsoidGeo(v3(tx, 0.022, tz), v3(0.016, 0.02, 0.022), [8, 6]), COL.furLight));
      furParts.push(colorize(ellipsoidGeo(v3(tx, 0.012, tz + 0.02), v3(0.006, 0.006, 0.012), [5, 4]), COL.nose));
    }
  });

  // --- tail: chain of fuzzy blobs along a curve, curling up and to the wolf's left ---
  const tailCurve = new THREE.CatmullRomCurve3([
    v3(0.0, 0.78, -0.53), v3(0.06, 0.64, -0.62), v3(0.15, 0.5, -0.7), v3(0.26, 0.42, -0.78),
    v3(0.36, 0.46, -0.85), v3(0.42, 0.6, -0.87), v3(0.45, 0.75, -0.82),
  ]);
  const tailN = 9;
  for (let i = 0; i < tailN; i++) {
    const t = i / (tailN - 1);
    const p = tailCurve.getPoint(t);
    const tan = tailCurve.getTangent(t);
    const rad = 0.055 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 0.06 + (t < 0.1 ? 0 : 0) - t * 0.02;
    const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 0, 1), tan);
    const e = new THREE.Euler().setFromQuaternion(q);
    const b = addBlob('tail' + i, {
      center: p, radii: v3(rad, rad, rad * 1.5), rot: [e.x, e.y, e.z], seed: 80 + i, amp: 0.25, freq: 10, segs: [14, 10],
      colorFn: (w, d) => COL.tail.clone().lerp(COL.furLight, t * 0.5).lerp(COL.furDark, d.y > 0.5 && t < 0.4 ? 0.3 : 0),
    });
    furParts.push(...scatterTufts(b, 5, {
      seed: 100 + i, len: 0.07 + rad * 0.4, rad: 0.025, flow: tan.clone(), bias: 0.8, color: COL.tail.clone().lerp(COL.furLight, t * 0.5),
    }));
  }
  // tail tip
  {
    const p = tailCurve.getPoint(1), tan = tailCurve.getTangent(1);
    furParts.push(tuftGeo(p, tan, 0.1, 0.04, COL.furLight));
  }

  // --- shaggy tufts on mane, chest, back and cheeks ---
  furParts.push(...scatterTufts(blobs.mane, 70, {
    seed: 201, len: 0.08, rad: 0.04, flow: v3(0, -0.4, -1), bias: 0.8,
    colorFn: shade(COL.fur, { yTop: 1.15, yBot: 0.6, front: 0.3 }),
  }));
  furParts.push(...scatterTufts(blobs.chest, 30, {
    seed: 202, len: 0.09, rad: 0.03, flow: v3(0, -1, 0.2), bias: 0.8,
    filter: (p, d) => d.y < 0.2, colorFn: shade(COL.fur, { yTop: 0.9, yBot: 0.5, front: 0.4 }),
  }));
  furParts.push(...scatterTufts(blobs.mid, 30, {
    seed: 203, len: 0.07, rad: 0.03, flow: v3(0, -0.5, -1), bias: 0.8,
    colorFn: shade(COL.fur, { yTop: 0.9, yBot: 0.52 }),
  }));
  furParts.push(...scatterTufts(blobs.hips, 16, {
    seed: 204, len: 0.07, rad: 0.03, flow: v3(0, -0.5, -1), bias: 0.8,
    colorFn: shade(COL.fur, { yTop: 0.86, yBot: 0.5 }),
  }));
  furParts.push(...scatterTufts(blobs.cheeks, 22, {
    seed: 205, len: 0.07, rad: 0.025, flow: v3(0, -0.4, -0.6), bias: 0.8,
    filter: (p, d) => Math.abs(d.x) > 0.4, color: COL.furLight,
  }));
  furParts.push(...scatterTufts(blobs.skull, 10, {
    seed: 206, len: 0.05, rad: 0.022, flow: v3(0, 0.2, -1), bias: 0.8,
    filter: (p, d) => d.z < 0 && d.y > 0, color: COL.fur,
  }));

  // --- glowing markings ---
  const S = blobs.skull;
  // forehead central flame
  glowParts.push(strokeGeo(projStroke(S, [[0, 1.16, 0.62], [0, 1.12, 0.68], [0, 1.08, 0.7]], 0.02)));
  for (const m of [false, true]) {
    glowParts.push(strokeGeo(projStroke(S, [[0.035, 1.14, 0.68], [0.02, 1.1, 0.7], [0.0, 1.075, 0.7]], 0.02, m), 0.007, 10));
    // brow arc
    glowParts.push(strokeGeo(projStroke(S, [[0.035, 1.12, 0.7], [0.075, 1.125, 0.68], [0.11, 1.1, 0.64], [0.13, 1.08, 0.6]], 0.02, m), 0.008, 16));
    // under-eye sweep going back along the cheek
    glowParts.push(strokeGeo(projStroke(S, [[0.05, 1.015, 0.7], [0.09, 1.0, 0.66], [0.12, 1.01, 0.6], [0.13, 1.03, 0.53]], 0.025, m), 0.008, 16));
  }
  // shoulder spirals (on chest blob), both sides
  const C = blobs.chest;
  for (const m of [false, true]) {
    const sp = [
      [0.25, 0.85, 0.22], [0.25, 0.78, 0.3], [0.25, 0.7, 0.35], [0.25, 0.62, 0.34], [0.25, 0.57, 0.28],
      [0.25, 0.6, 0.22], [0.25, 0.665, 0.23], [0.25, 0.665, 0.29], [0.25, 0.625, 0.285],
    ];
    glowParts.push(strokeGeo(projStroke(C, sp, 0.03, m), 0.011, 40));
    glowParts.push(strokeGeo(projStroke(C, [[0.25, 0.56, 0.36], [0.25, 0.53, 0.32], [0.25, 0.52, 0.27]], 0.03, m), 0.009, 10));
  }
  // flank stripes (mid body)
  const M = blobs.mid;
  for (const m of [false, true]) {
    glowParts.push(strokeGeo(projStroke(M, [[0.2, 0.85, 0.15], [0.2, 0.82, 0.07], [0.2, 0.86, -0.02], [0.2, 0.875, -0.12], [0.2, 0.885, -0.2]], 0.03, m), 0.011, 30));
    glowParts.push(strokeGeo(projStroke(M, [[0.2, 0.765, 0.12], [0.2, 0.76, 0.04], [0.2, 0.8, -0.02]], 0.03, m), 0.009, 14));
    glowParts.push(strokeGeo(projStroke(M, [[0.2, 0.88, -0.22], [0.2, 0.87, -0.28]], 0.03, m), 0.009, 6));
  }
  // marks across the back of the shoulders (seen from behind)
  const Mn = blobs.mane;
  for (const m of [false, true]) {
    glowParts.push(strokeGeo(projStroke(Mn, [[0.03, 1.0, 0.2], [0.09, 1.02, 0.22], [0.14, 0.98, 0.25]], 0.04, m), 0.009, 12));
    glowParts.push(strokeGeo(projStroke(M, [[0.08, 0.92, 0.22], [0.14, 0.9, 0.18], [0.17, 0.86, 0.2]], 0.03, m), 0.01, 12));
  }

  const furMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true, side: THREE.DoubleSide });
  const glowMat = new THREE.MeshBasicMaterial({ color: COL.glow });

  const fur = new THREE.Mesh(merge(furParts), furMat);
  fur.name = 'fur';
  const glow = new THREE.Mesh(merge(glowParts), glowMat);
  glow.name = 'glow';
  group.add(fur, glow);
  return group;
}

export default createWolf;
