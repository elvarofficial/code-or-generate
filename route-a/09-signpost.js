// Mossy wooden signpost: gnarled trunk, two crooked branches, two hanging arrow signs on ropes.
// Stands on y = 0, faces +Z, up is +Y. Units: roughly 1 unit = 1/9 of the post height.
import * as THREE from 'three';

// ---------- small deterministic noise ----------
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}
function noise2(x, y) {
  return noise1(x + noise1(y * 1.7) * 7.3 + y * 13.1);
}

const C = {
  bark: new THREE.Color(0x8a6238),
  barkDark: new THREE.Color(0x4a2f19),
  barkLight: new THREE.Color(0xa8804e),
  moss: new THREE.Color(0x7f9a2e),
  mossDark: new THREE.Color(0x56702a),
};

// Tube with per-ring radius (elliptical), built along a curve.
// opts: radius(t) -> [rNormal, rBinormal], disp(t, a) -> extra radial scale, color(t, a, p) -> Color
function organicTube(curve, opts) {
  const { segs = 40, radial = 16, radius, disp, color, capStart = false, capEnd = true, up = new THREE.Vector3(0, 1, 0) } = opts;
  const pos = [], col = [], idx = [];
  const frames = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    // binormal-ish: side axis perpendicular to tangent and "up" reference
    let side = new THREE.Vector3().crossVectors(T, up);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const N = new THREE.Vector3().crossVectors(side, T).normalize();
    frames.push({ p, N, side });
    const [rn, rs] = radius(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const d = disp ? disp(t, a) : 1;
      const v = p.clone()
        .addScaledVector(N, Math.cos(a) * rn * d)
        .addScaledVector(side, Math.sin(a) * rs * d);
      pos.push(v.x, v.y, v.z);
      const c = color(t, a, v, d);
      col.push(c.r, c.g, c.b);
    }
  }
  const row = radial + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * row + j, b = (i + 1) * row + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const addCap = (i, flip, cc) => {
    const f = frames[i];
    const center = pos.length / 3;
    pos.push(f.p.x, f.p.y, f.p.z);
    col.push(cc.r, cc.g, cc.b);
    for (let j = 0; j < radial; j++) {
      const a = i * row + j;
      if (flip) idx.push(center, a, a + 1); else idx.push(center, a + 1, a);
    }
  };
  const capC = new THREE.Color(0xb08350);
  if (capEnd) addCap(segs, true, capC);
  if (capStart) addCap(0, false, capC);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function barkColor(seed, mossAmount) {
  return (t, a, v, d) => {
    const c = C.bark.clone();
    const groove = d < 0.97 ? 1 : 0;
    const n = noise2(a * 3 + seed, t * 6);
    c.lerp(C.barkLight, Math.max(0, n - 0.5) * 0.8);
    if (groove) c.lerp(C.barkDark, 0.6);
    const m = mossAmount(t, a, v);
    if (m > 0) c.lerp(noise2(v.x * 5, v.y * 5) > 0.5 ? C.moss : C.mossDark, Math.min(1, m));
    return c;
  };
}

function buildTrunk(barkMat) {
  const H = 8.9;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0, 0),
    new THREE.Vector3(0.02, 2.2, 0),
    new THREE.Vector3(-0.03, 4.5, 0),
    new THREE.Vector3(0.0, 6.8, 0),
    new THREE.Vector3(0.02, H, 0),
  ]);
  const profile = (y) => {
    // half-width vs height, from the front view
    const pts = [[0, 0.92], [0.4, 0.75], [1.0, 0.6], [2.5, 0.5], [4.5, 0.45], [6.5, 0.5], [7.8, 0.6], [8.9, 0.66]];
    for (let i = 0; i < pts.length - 1; i++) {
      if (y <= pts[i + 1][0]) {
        const k = (y - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
        return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k;
      }
    }
    return pts[pts.length - 1][1];
  };
  // Trunk tube: up reference must not be parallel to the tangent, use +Z so side = X-ish
  const ridges = (t, a) => {
    const y = t * H;
    const r = Math.sin(a * 9 + noise1(y * 0.8) * 3 + y * 0.15);
    let d = 1 + 0.05 * r - (r < -0.6 ? 0.05 : 0);
    d += (noise2(a * 2, y * 0.6) - 0.5) * 0.12;
    return d;
  };
  const moss = (t, a, v) => {
    // moss streaks down front-left and back-right, plus a patch at the base
    const y = v.y;
    let m = 0;
    const front = v.z > 0.1, back = v.z < -0.1;
    if (v.x < -0.15 && front && y > 1 && y < 6.6) m = noise2(v.y * 2, a * 3) > 0.45 ? 0.9 : 0;
    if (v.x > 0.2 && back && y > 1 && y < 6.8) m = noise2(v.y * 2 + 9, a * 3) > 0.5 ? 0.9 : 0;
    if (y < 0.9 && noise2(a * 4, y * 3) > 0.55) m = 0.85;
    if (y > 5.8 && y < 6.9 && v.x > 0.2 && front) m = 0.8;
    return m;
  };
  const g = organicTube(curve, {
    segs: 64, radial: 32,
    up: new THREE.Vector3(0, 0, 1),
    radius: (t) => { const r = profile(t * H); return [r * 0.95, r]; },
    disp: ridges,
    color: barkColor(1.3, moss),
    capEnd: false,
  });
  // jagged broken top: push top rings up/down by angle
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > H - 0.6) {
      const x = p.getX(i), z = p.getZ(i);
      const k = (y - (H - 0.6)) / 0.6;
      const a = Math.atan2(z, x);
      // higher on +X side, splintered
      const jag = 0.4 * (x / 0.7) + 0.08 * Math.sin(a * 3) + 0.1 * Math.max(0, Math.sin(a * 7 + 1));
      p.setY(i, y + k * jag - k * 0.15);
    }
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, barkMat);

  // top cap (splintered end, lighter wood)
  const capG = new THREE.CircleGeometry(0.6, 20);
  capG.rotateX(-Math.PI / 2);
  const cp = capG.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getZ(i);
    const a = Math.atan2(z, x);
    cp.setY(i, H - 0.3 + 0.38 * (x / 0.7) + 0.05 * Math.sin(a * 3));
  }
  capG.computeVertexNormals();
  const cap = new THREE.Mesh(capG, new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9, side: THREE.DoubleSide }));
  const grp = new THREE.Group();
  grp.add(mesh, cap);
  return { group: grp, profile };
}

function buildBranch(points, barkMat, rBase, rTip, seed, mossFn) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = organicTube(curve, {
    segs: 36, radial: 14,
    radius: (t) => {
      let r = rBase + (rTip - rBase) * t;
      r *= 1 + 0.25 * Math.max(0, 1 - t * 6); // flare where it meets the trunk
      if (t > 0.86) r *= 1 + (t - 0.86) * 1.8; // splayed broken tip
      return [r, r * 0.72];
    },
    disp: (t, a) => 1 + 0.06 * Math.sin(a * 6 + t * 10 + seed) + (noise2(t * 8 + seed, a) - 0.5) * 0.1,
    color: barkColor(seed, mossFn),
  });
  return new THREE.Mesh(g, barkMat);
}

// Arrow sign made of two planks. dir = +1 points +X, -1 points -X.
function buildSign(x0, x1, yTop, yBot, tipLen, dir, z, mats) {
  const grp = new THREE.Group();
  const yMid = (yTop + yBot) / 2;
  const gap = 0.012;
  const depth = 0.2;
  // build pointing +X from 0..L then mirror if needed
  const L = x1 - x0;
  const sh = L - tipLen;
  const H = yTop - yBot;
  const planks = [
    // upper plank: top edge to mid, slanted to tip
    [[0.02, H], [sh, H - 0.02], [L, H / 2 + gap], [0, H / 2 + gap]],
    [[0, H / 2 - gap], [L, H / 2 - gap], [sh - 0.03, 0.02], [0.04, 0]],
  ];
  planks.forEach((pts, k) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    // ragged back edge
    s.lineTo(pts[0][0] + (k ? 0.04 : -0.02), (pts[0][1] + pts[pts.length - 1][1]) / 2);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.035, bevelSegments: 1, steps: 1 });
    g.translate(0, 0, -depth / 2);
    const m = new THREE.Mesh(g, mats.sign);
    grp.add(m);
  });
  const seam = new THREE.Mesh(new THREE.BoxGeometry(L - 0.15, 0.12, depth * 0.8), mats.signDark);
  seam.position.set((L - 0.15) / 2, H / 2, 0);
  grp.add(seam);
  // a few grain lines on both faces
  for (let i = 0; i < 4; i++) {
    const yy = H * (0.15 + i * 0.23) + (i === 1 || i === 2 ? (i === 1 ? 0.05 : -0.05) : 0);
    const len = sh * (0.5 + 0.4 * hash(i + x0));
    const off = sh * 0.08 * hash(i * 3 + x0);
    const g = new THREE.BoxGeometry(len, 0.025, depth + 0.075);
    const m = new THREE.Mesh(g, mats.signDark);
    m.position.set(off + len / 2, yy, 0);
    if (Math.abs(yy - H / 2) > 0.08) grp.add(m);
  }
  // rope holes
  if (dir < 0) grp.scale.x = -1;
  grp.position.set(dir > 0 ? x0 : x1, yBot, z);
  return grp;
}

function buildRope(x, yArm, armR, yHole, z, ropeMat, knotMat) {
  const grp = new THREE.Group();
  // coils wrapped around the branch
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(armR * 1.02, 0.06, 6, 18), ropeMat);
    t.rotation.y = Math.PI / 2;
    t.rotation.x = (i - 1) * 0.18;
    t.scale.set(1, 1, 0.75);
    t.position.set(x + (i - 1) * 0.09, yArm, z);
    grp.add(t);
  }
  // hanging strand
  const len = yArm - armR - yHole;
  const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, len, 6), ropeMat);
  strand.position.set(x, yHole + len / 2, z);
  grp.add(strand);
  // knot
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), knotMat);
  knot.scale.set(1.3, 0.9, 1);
  knot.position.set(x, yHole + 0.2, z);
  grp.add(knot);
  const knot2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), knotMat);
  knot2.scale.set(1.2, 1, 1);
  knot2.position.set(x, yArm - armR - 0.12, z);
  grp.add(knot2);
  // loop through the sign hole
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.035, 6, 12), ropeMat);
  loop.position.set(x, yHole - 0.02, z);
  loop.rotation.y = Math.PI / 2;
  grp.add(loop);
  return grp;
}

// thin dark carved line laid onto a surface
function carving(points, mat, r = 0.03) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 5, false), mat);
}

export function createSignpost() {
  const root = new THREE.Group();
  root.name = 'Signpost';

  const barkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const mats = {
    sign: new THREE.MeshStandardMaterial({ color: 0xa8743f, roughness: 0.85 }),
    signDark: new THREE.MeshStandardMaterial({ color: 0x6e4724, roughness: 0.9 }),
  };
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc09a68, roughness: 0.95 });
  const knotMat = new THREE.MeshStandardMaterial({ color: 0xa8814f, roughness: 0.95 });
  const carveMat = new THREE.MeshStandardMaterial({ color: 0x3e2614, roughness: 1 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x7a9530, roughness: 1 });

  // ---- trunk ----
  const trunk = buildTrunk(barkMat);
  root.add(trunk.group);

  const armZ = -0.15;
  const noMoss = (t, a, v) => (t < 0.2 && Math.cos(a) > 0.3 && noise2(a * 3, t * 20) > 0.35 ? 0.75 : 0);

  // ---- right branch (+X), higher ----
  root.add(buildBranch([
    [0.1, 7.05, armZ], [0.9, 7.2, armZ], [1.9, 7.35, armZ], [2.8, 7.25, armZ], [3.6, 7.3, armZ], [4.2, 7.65, armZ],
  ], barkMat, 0.5, 0.38, 2.1, noMoss));
  // ---- left branch (-X), lower ----
  root.add(buildBranch([
    [-0.1, 6.0, armZ], [-1.0, 6.28, armZ], [-2.0, 6.3, armZ], [-2.85, 6.12, armZ], [-3.55, 6.1, armZ], [-4.05, 6.45, armZ],
  ], barkMat, 0.5, 0.38, 5.7, noMoss));

  // ---- signs ----
  const signZ = armZ;
  root.add(buildSign(0.8, 4.4, 6.05, 4.6, 0.75, +1, signZ, mats));
  root.add(buildSign(-4.25, -0.68, 4.9, 3.45, 0.7, -1, signZ, mats));

  // ---- ropes ----
  const armYRight = (x) => (x < 2.3 ? 7.33 : 7.25);
  root.add(buildRope(1.55, armYRight(1.55), 0.48, 5.85, signZ, ropeMat, knotMat));
  root.add(buildRope(3.17, armYRight(3.17), 0.44, 5.85, signZ, ropeMat, knotMat));
  root.add(buildRope(-1.45, 6.3, 0.48, 4.7, signZ, ropeMat, knotMat));
  root.add(buildRope(-3.08, 6.1, 0.44, 4.7, signZ, ropeMat, knotMat));

  // ---- broken side stub on -X, low ----
  const stubCurve = [[-0.15, 1.9, 0.05], [-0.5, 2.6, 0.08], [-0.72, 3.2, 0.1]];
  root.add(buildBranch(stubCurve, barkMat, 0.3, 0.24, 8.1, () => 0));

  // ---- moss clumps where branches join the trunk ----
  const clump = (x, y, z, s) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), mossMat);
    m.position.set(x, y, z);
    m.scale.set(1.2, 0.35, 0.9);
    root.add(m);
  };
  clump(-0.55, 6.45, 0.15, 0.25); clump(-0.85, 6.6, 0.05, 0.2);
  clump(0.55, 7.55, 0.1, 0.22); clump(0.8, 7.5, -0.05, 0.18);
  clump(-0.45, 5.2, 0.3, 0.12); clump(0.55, 6.6, -0.3, 0.15);

  // ---- carvings on the front face of the trunk ----
  const zf = (y, x = 0) => {
    // approximate trunk surface z at height y for small x
    const r = trunk.profile(y) * 0.95;
    return Math.sqrt(Math.max(0.01, r * r - x * x)) + 0.01;
  };
  // spiral near the top
  const sp = [];
  for (let i = 0; i <= 20; i++) {
    const a = i * 0.55, rr = 0.03 + i * 0.012;
    const x = 0.05 + Math.cos(a) * rr, y = 7.55 + Math.sin(a) * rr * 1.4;
    sp.push([x, y, zf(y, x)]);
  }
  root.add(carving(sp, carveMat, 0.025));
  // almond "eye" carvings down the middle
  const eye = (cx, cy, w, h) => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const sa = Math.sin(a);
      const x = cx + w * sa * Math.abs(sa);
      const y = cy + Math.cos(a) * h;
      pts.push([x, y, zf(y, x)]);
    }
    return carving(pts, carveMat, 0.03);
  };
  root.add(eye(0.05, 4.0, 0.32, 0.95));
  root.add(eye(0.05, 4.0, 0.15, 0.55));
  root.add(eye(0.05, 5.4, 0.2, 0.45));
  // spirals on branches (front faces)
  const bspiral = (cx, cy, z) => {
    const p = [];
    for (let i = 0; i <= 14; i++) { const a = i * 0.6, rr = 0.02 + i * 0.012; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z]); }
    return carving(p, carveMat, 0.02);
  };
  root.add(bspiral(0.95, 7.15, armZ + 0.32));
  root.add(bspiral(2.35, 7.25, armZ + 0.3));
  root.add(bspiral(-0.75, 6.0, armZ + 0.32));
  root.add(bspiral(-2.3, 6.25, armZ + 0.3));

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

export default createSignpost;
