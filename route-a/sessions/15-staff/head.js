import * as THREE from 'three';

// Gnarled druid staff: twisted wooden shaft, a head of curling claw-branches
// cradling a glowing crystal. Stands on y = 0, faces +Z, up +Y.
// Units: ~1.8 tall.

const BARK = new THREE.Color(0x80603f);
const MOSS = new THREE.Color(0x8fbf2a);
const BARK_DARK = new THREE.Color(0x553b26);
const TEAL = new THREE.Color(0x2f8a86);
const CRYSTAL_Y = 1.57;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Tapered tube along a Catmull-Rom curve, with closed rounded ends and vertex colors.
// radius: function(t) -> r ; teal: if true, faces pointing toward the crystal axis get tinted.
function branch(points, radius, opts = {}) {
  const { radial = 8, segs = 24, teal = false, seed = 1, wobble = 0.12, moss = true } = opts;
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const frames = curve.computeFrenetFrames(segs, false);
  const rand = rng(seed);
  const phase = rand() * 10;
  const pos = [], col = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P);
    let r = radius(t);
    // round the ends
    const endT = Math.min(t, 1 - t) * segs;
    if (i === 0 || i === segs) r *= 0.35;
    else if (endT < 1.01) r *= 0.8;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const w = 1 + wobble * Math.sin(a * 3 + t * 17 + phase) * Math.sin(t * 9 + phase);
      N.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(P.x + N.x * r * w, P.y + N.y * r * w, P.z + N.z * r * w);
      // vertex color: streaky bark
      const streak = 0.5 + 0.5 * Math.sin(a * 4 + phase + t * 3);
      c.copy(BARK).lerp(BARK_DARK, streak * 0.55);
      if (teal) {
        const toAxis = new THREE.Vector3(-P.x, 0, -P.z);
        const l = toAxis.length();
        let f = 0;
        if (l > 1e-4) f = Math.max(0, N.dot(toAxis.divideScalar(l)));
        const hy = THREE.MathUtils.smoothstep(P.y, 1.3, 1.5);
        c.lerp(TEAL, f * hy * 0.9);
        if (f * hy > 0.3) { col.push(c.r, c.g, c.b); continue; }
      }
      // moss patches: blotchy noise, only on outward / upward-ish faces
      const px = P.x + N.x * r, py = P.y + N.y * r, pz = P.z + N.z * r;
      const mn = Math.sin(px * 47 + 1.3) * Math.sin(py * 29 + pz * 13) * Math.sin(pz * 41 + py * 7 + 0.7);
      if (moss && mn > 0.32 && py > 0.25) c.lerp(MOSS, Math.min(1, (mn - 0.32) * 6));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const lerp = (a, b, t) => a + (b - a) * t;

// helix points around Y axis
function helix(y0, y1, r0, r1, turns, phase, n = 10, cx = 0, cz = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = phase + t * turns * Math.PI * 2;
    const r = lerp(r0, r1, t);
    pts.push([cx + Math.cos(a) * r, lerp(y0, y1, t), cz + Math.sin(a) * r]);
  }
  return pts;
}

