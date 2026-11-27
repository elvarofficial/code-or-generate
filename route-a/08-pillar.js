// Rune pillar with a wolf-head capital.
// Asset stands on y = 0, faces +Z, up is +Y. Height ~3 units.
import * as THREE from 'three';

const OCT = Math.PI / 8;          // half sector angle
const COS8 = Math.cos(OCT);

// ---------- deterministic noise ----------
function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf), w = s(zf);
  let r = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const wt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    r += wt * hash3(xi + dx, yi + dy, zi + dz);
  }
  return r;
}
function fbm(x, y, z) {
  return 0.55 * vnoise(x, y, z) + 0.3 * vnoise(x * 2.1, y * 2.1, z * 2.1) + 0.15 * vnoise(x * 4.3, y * 4.3, z * 4.3);
}

// ---------- octagonal beveled block (flat face toward +Z) ----------
// a = apothem (half width across flats), h = height, b = bevel size
function octBlock(a, h, b = 0.025, segW = 4, segH = 4, taper = 0) {
  const prof = [];               // [apothem, y]
  prof.push([0, 0]);
  prof.push([a - b + taper, 0]);
  prof.push([a + taper, b]);
  for (let i = 1; i < segH; i++) {
    const t = i / segH;
    prof.push([a + taper * (1 - t), b + (h - 2 * b) * t]);
  }
  prof.push([a, h - b]);
  prof.push([a - b, h]);
  prof.push([0, h]);

  // ring of unit-apothem points around the octagon, cols = 8*segW
  const ring = [];
  const R = 1 / COS8;
  for (let k = 0; k < 8; k++) {
    const a0 = (k - 0.5) * Math.PI / 4, a1 = (k + 0.5) * Math.PI / 4;
    const p0 = [Math.sin(a0) * R, Math.cos(a0) * R];
    const p1 = [Math.sin(a1) * R, Math.cos(a1) * R];
    for (let j = 0; j < segW; j++) {
      const t = j / segW;
      ring.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
    }
  }
  const cols = ring.length;
  const pos = [];
  const idx = [];
  for (let r = 0; r < prof.length; r++) {
    for (let c = 0; c < cols; c++) {
      const [pa, py] = prof[r];
      let jx = 0, jz = 0, jy = 0;
      if (pa > 0 && r > 0 && r < prof.length - 1) {
        const n = hash3(c * 1.7 + a * 31, r * 2.3 + h * 17, 5.1) - 0.5;
        jx = n * 0.012; jz = n * 0.012;
      }
      pos.push(ring[c][0] * pa * (1 + jx), py + jy, ring[c][1] * pa * (1 + jz));
    }
  }
  for (let r = 0; r < prof.length - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const c1 = (c + 1) % cols;
      const i00 = r * cols + c, i01 = r * cols + c1, i10 = (r + 1) * cols + c, i11 = (r + 1) * cols + c1;
      idx.push(i00, i01, i11, i00, i11, i10);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

// ---------- rune glyphs (segments in a unit box) ----------
const RUNES = {
  R: [[-0.3, -0.5, -0.3, 0.5], [-0.3, 0.5, 0.28, 0.25], [0.28, 0.25, -0.3, 0.02], [-0.3, 0.02, 0.3, -0.5]],
  B: [[-0.3, -0.5, -0.3, 0.5], [-0.3, 0.5, 0.25, 0.25], [0.25, 0.25, -0.3, 0], [-0.3, 0, 0.25, -0.25], [0.25, -0.25, -0.3, -0.5]],
  F: [[-0.3, -0.5, -0.3, 0.5], [-0.3, 0.2, 0.3, 0.5], [-0.3, -0.12, 0.3, 0.18]],
  K: [[0.3, 0.45, -0.3, 0], [-0.3, 0, 0.3, -0.45]],
  TH: [[-0.3, -0.5, -0.3, 0.5], [-0.3, 0.3, 0.28, 0], [0.28, 0, -0.3, -0.3]],
  N: [[-0.25, -0.5, -0.25, 0.5], [0.25, -0.5, 0.25, 0.5], [-0.25, 0.2, 0.25, -0.2]],
  Z: [[0, -0.5, 0, 0.5], [0, 0.1, -0.35, 0.45], [0, 0.1, 0.35, 0.45]],
  X: [[-0.32, 0.5, 0.32, -0.5], [0.32, 0.5, -0.32, -0.5]],
  I: [[0, -0.5, 0, 0.5]],
  L: [[-0.25, -0.5, -0.25, 0.5], [-0.25, 0.5, 0.3, 0.2]],
  O: [[0, 0.5, 0.3, 0.1], [0.3, 0.1, 0, -0.25], [0, -0.25, -0.3, 0.1], [-0.3, 0.1, 0, 0.5], [0, -0.25, -0.3, -0.5], [0, -0.25, 0.3, -0.5]],
  J: [[-0.2, 0.5, -0.2, -0.05], [-0.2, -0.05, 0.3, 0.2], [0.3, 0.5, 0.3, -0.5]],
  G: [[-0.3, 0.5, 0.3, 0.1], [0.3, 0.1, -0.3, -0.3]],
};

function runeMesh(glyph, size, mat, thick = 0.016) {
  const grp = new THREE.Group();
  for (const [x0, y0, x1, y1] of RUNES[glyph]) {
    const dx = (x1 - x0) * size, dy = (y1 - y0) * size;
    const len = Math.hypot(dx, dy) + thick;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, thick, 0.01), mat);
    m.position.set((x0 + x1) / 2 * size, (y0 + y1) / 2 * size, 0.004);
    m.rotation.z = Math.atan2(dy, dx);
    grp.add(m);
  }
  return grp;
}

export function createPillar() {
  const root = new THREE.Group();
  root.name = 'RunePillar';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
  const runeMat = new THREE.MeshStandardMaterial({ color: 0x3a352d, roughness: 1 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x4a453c, roughness: 1 });

  const stoneMeshes = [];
  const addStone = (geo, parent = root) => {
    const m = new THREE.Mesh(geo, stoneMat);
    m.userData.stone = true;
    parent.add(m);
    stoneMeshes.push(m);
    return m;
  };

  // ---- stacked octagonal sections: [bottomY, topY, apothem, bevel] ----
  const sections = [
    [0.00, 0.35, 0.535, 0.04],  // base tier 1
    [0.35, 0.65, 0.445, 0.035], // base tier 2
    [0.65, 0.86, 0.39, 0.03],   // base tier 3
    [0.86, 1.32, 0.335, 0.02],  // shaft lower block
    [1.32, 1.78, 0.335, 0.02],  // shaft upper block
    [1.78, 1.88, 0.372, 0.02],  // ring
    [1.88, 2.17, 0.36, 0.015],  // rune band
    [2.17, 2.30, 0.42, 0.025],  // cap ring
    [2.30, 2.65, 0.375, 0.02],  // head block
    [2.65, 2.77, 0.42, 0.025],  // top slab
  ];
  for (const [y0, y1, a, b] of sections) {
    const segH = Math.max(3, Math.round((y1 - y0) / 0.06));
    const m = addStone(octBlock(a, y1 - y0, b, 4, segH));
    m.position.y = y0;
  }

  // Helper: place a group on octagon face k (0 = front +Z, k increases toward +X), at apothem a.
  const onFace = (k, a, y, obj) => {
    const th = k * Math.PI / 4;
    const holder = new THREE.Group();
    holder.rotation.y = th;
    obj.position.z += a;
    obj.position.y += y;
    holder.add(obj);
    root.add(holder);
    return obj;
  };

  // raised panel (with a bevelled look via two boxes) on a face
  const panel = (k, a, yc, w, h, depth = 0.02) => {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth * 2), stoneMat);
    outer.userData.stone = true;
    stoneMeshes.push(outer);
    g.add(outer);
    onFace(k, a, yc, g);
    return g;
  };
  const rune = (k, a, yc, glyph, size) => {
    const r = runeMesh(glyph, size, runeMat);
    onFace(k, a, yc, r);
  };

  // horizontal block-seam rings & base tier vertical seams
  const seamRing = (y, a) => {
    for (let k = 0; k < 8; k++) {
      const w = 2 * a * Math.tan(OCT);
      const s = new THREE.Mesh(new THREE.BoxGeometry(w * 1.0, 0.008, 0.006), seamMat);
      onFace(k, a + 0.001, y, s);
    }
  };
  seamRing(1.32, 0.335);

  // ---- shaft: tall rune panels on front and front diagonals (both blocks) ----
  const shaftA = 0.335;
  const shaftFace = 2 * shaftA * Math.tan(OCT); // ~0.278
  const shaftRunes = {
    0: [['R', 'B'], ['N', 'J']],
    [-1]: [['X', 'K'], ['O', 'I']],
    1: [['F', 'R'], ['Z', 'K']],
  };
  for (const k of [0, -1, 1]) {
    for (let blk = 0; blk < 2; blk++) {
      const y0 = blk === 0 ? 0.86 : 1.32;
      const yc = y0 + 0.23;
      const pw = k === 0 ? shaftFace * 0.75 : shaftFace * 0.62;
      panel(k, shaftA, yc, pw, 0.4, 0.012);
      const glyphs = shaftRunes[k][1 - blk];
      rune(k, shaftA + 0.013, yc + 0.095, glyphs[0], k === 0 ? 0.13 : 0.11);
      rune(k, shaftA + 0.013, yc - 0.095, glyphs[1], k === 0 ? 0.13 : 0.11);
    }
  }
  // left-side lower shaft: runes continue on front-left diagonal only (seen in left view at front edge)

  // ---- rune band: square panels on all 8 faces, runes on front half ----
  const bandA = 0.36;
  const bandFace = 2 * bandA * Math.tan(OCT);
  const bandRunes = { 0: 'L', [-1]: 'K', 1: 'TH', 2: 'TH', [-2]: 'L' };
  for (let k = -3; k <= 4; k++) {
    panel(k, bandA, 2.025, bandFace * 0.78, 0.22, 0.012);
    if (bandRunes[k] && Math.abs(k) <= 3) rune(k, bandA + 0.013, 2.025, bandRunes[k], 0.12);
  }

  // ---- head block: rune panels on diagonals and sides ----
  const headA = 0.375;
  const headFace = 2 * headA * Math.tan(OCT);
  const headRunes = { [-1]: 'X', 1: 'L', 2: 'L', [-2]: 'F' };
  for (const k of [-1, 1, 2, -2]) {
    panel(k, headA, 2.47, headFace * 0.7, 0.26, 0.012);
    rune(k, headA + 0.013, 2.47, headRunes[k], 0.15);
  }
  // back: plain stone block face (k = 4) gets a slightly raised slab
  panel(4, headA, 2.47, headFace * 0.85, 0.28, 0.01);

  // ---- a few cracks ----
  const crack = (k, a, pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const dx = x1 - x0, dy = y1 - y0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dy) + 0.006, 0.007, 0.006), seamMat);
      m.position.set((x0 + x1) / 2, 0, 0);
      m.rotation.z = Math.atan2(dy, dx);
      const g = new THREE.Group();
      g.add(m);
      onFace(k, a + 0.002, (y0 + y1) / 2, g);
      m.position.y = 0;
    }
  };
  crack(0, 0.335, [[-0.05, 1.55], [-0.02, 1.45], [0.03, 1.38], [0.01, 1.30]]);
  crack(-1, 0.445, [[0.05, 0.62], [0.0, 0.52], [0.04, 0.42], [0.0, 0.36]]);
  crack(-1, 0.535, [[0.08, 0.33], [0.02, 0.22], [0.06, 0.1]]);

  // ---- wolf head ----
  const wolf = new THREE.Group();
  wolf.position.set(0, 2.6, 0.26);
  wolf.scale.setScalar(1.4);
  root.add(wolf);
  const wolfPart = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const m = addStone(geo, wolf);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    return m;
  };
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2d2822, roughness: 1 });
  // ruff / mane behind the face
  wolfPart(new THREE.IcosahedronGeometry(0.15, 1), 0, -0.04, -0.02, 1.5, 1.35, 0.9);
  // jaw muscles / chin fill
  wolfPart(new THREE.SphereGeometry(0.11, 10, 8), 0, -0.09, 0.05, 1.1, 0.9, 1.0);
  // cheek tufts
  wolfPart(new THREE.ConeGeometry(0.065, 0.18, 5), -0.18, -0.1, 0.04, 1, 1, 1, 0, 0, 2.4);
  wolfPart(new THREE.ConeGeometry(0.065, 0.18, 5), 0.18, -0.1, 0.04, 1, 1, 1, 0, 0, -2.4);
  // skull
  wolfPart(new THREE.SphereGeometry(0.16, 14, 10), 0, 0.05, -0.02, 1.0, 0.85, 0.95);
  // brow ridges
  wolfPart(new THREE.BoxGeometry(0.1, 0.035, 0.07), -0.055, 0.1, 0.11, 1, 1, 1, 0.2, 0.3, -0.35);
  wolfPart(new THREE.BoxGeometry(0.1, 0.035, 0.07), 0.055, 0.1, 0.11, 1, 1, 1, 0.2, -0.3, 0.35);
  // snout (upper jaw) + bridge
  wolfPart(new THREE.SphereGeometry(0.1, 12, 8), 0, -0.04, 0.19, 0.7, 0.58, 1.2, -0.08, 0, 0);
  wolfPart(new THREE.BoxGeometry(0.065, 0.045, 0.18), 0, 0.01, 0.17, 1, 1, 1, -0.3, 0, 0);
  // nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), darkMat);
  nose.position.set(0, -0.012, 0.29); nose.scale.set(1.0, 0.7, 0.5);
  wolf.add(nose);
  // mouth cavity between the jaws
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), darkMat);
  mouth.position.set(0, -0.11, 0.19); mouth.scale.set(0.05, 0.04, 0.1);
  wolf.add(mouth);
  // lower jaw (open)
  wolfPart(new THREE.SphereGeometry(0.09, 10, 7), 0, -0.16, 0.16, 0.68, 0.42, 1.2, 0.28, 0, 0);
  // fangs
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xd8d0bd, roughness: 0.8, flatShading: true });
  for (const sx of [-1, 1]) {
    const up = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 5), toothMat);
    up.position.set(sx * 0.038, -0.1, 0.27); up.rotation.x = Math.PI;
    wolf.add(up);
    const lo = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 5), toothMat);
    lo.position.set(sx * 0.033, -0.14, 0.24);
    wolf.add(lo);
  }
  // eyes (sunken, dark)
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), darkMat);
    e.position.set(sx * 0.055, 0.065, 0.11); e.scale.set(1.4, 0.75, 0.6); e.rotation.z = sx * 0.3;
    wolf.add(e);
  }
  // ears
  for (const sx of [-1, 1]) {
    wolfPart(new THREE.ConeGeometry(0.07, 0.18, 5), sx * 0.12, 0.2, -0.03, 1, 1, 1.0, 0, 0, -sx * 0.42);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.11, 4), new THREE.MeshStandardMaterial({ color: 0x6c6456, roughness: 1 }));
    inner.position.set(sx * 0.117, 0.19, 0.01); inner.rotation.z = -sx * 0.42; inner.scale.z = 0.4;
    wolf.add(inner);
  }

  // ---- vertex colours: stone with mottling + moss ----
  root.updateMatrixWorld(true);
  const stoneA = new THREE.Color(0xb3ab95);
  const stoneB = new THREE.Color(0x8f8674);
  const mossA = new THREE.Color(0x6f8f34);
  const mossB = new THREE.Color(0x4f6a2a);
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const tmp = new THREE.Color();
  for (const m of stoneMeshes) {
    if (m.geometry.index) m.geometry = m.geometry.toNonIndexed();
    const g = m.geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal;
    const cols = new Float32Array(P.count * 3);
    nm.getNormalMatrix(m.matrixWorld);
    const isWolf = m.parent === wolf;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
      n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      const t = fbm(v.x * 6 + 3, v.y * 6, v.z * 6);
      tmp.copy(stoneB).lerp(stoneA, THREE.MathUtils.clamp(t * 1.4 - 0.2, 0, 1));
      // moss: more on upward ledges, more low down, patchy
      const mn = fbm(v.x * 3.5 + 11, v.y * 2.2, v.z * 3.5 - 7);
      let moss = (mn - 0.55) * 4;
      moss += Math.max(0, n.y) * 0.9;
      moss += Math.max(0, 0.9 - v.y) * 0.5;
      if (isWolf) moss = (mn - 0.62) * 4 + Math.max(0, n.y) * 0.4;
      moss = THREE.MathUtils.clamp(moss, 0, 1) * 0.85;
      if (moss > 0) {
        tmp.lerp(tmp.clone().copy(mossB).lerp(mossA, mn), moss);
      }
      cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }

  return root;
}

export default createPillar;
