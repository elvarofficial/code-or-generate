// Young green dragon: long upright neck, tan belly plates, small bat wings,
// brown horns and dorsal spikes, long tail swinging to its right side.
// Convention: stands on y = 0, faces +Z, up is +Y, +X is the dragon's left side.
// Units: ~7 units tall. All geometry and materials are procedural.
import * as THREE from 'file:///D:/elvar/cog-runs/node_modules/three/build/three.module.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

const C = {
  green: new THREE.Color('#728532'),
  greenDark: new THREE.Color('#4e5c22'),
  greenLight: new THREE.Color('#8fa144'),
  tan: new THREE.Color('#9a7448'),
  tanDark: new THREE.Color('#6e5232'),
  horn: new THREE.Color('#7a5f3e'),
  claw: new THREE.Color('#6a4f35'),
  membrane: new THREE.Color('#8c6a42'),
  membraneOut: new THREE.Color('#6a7a2c'),
  eyeWhite: new THREE.Color('#e3d4b4'),
  iris: new THREE.Color('#7a4a22'),
  pupil: new THREE.Color('#1a120c'),
  mouth: new THREE.Color('#2e2414'),
};

function hash3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
// cheap smooth-ish value noise for colour variation
function noise3(p, f) {
  const x = p.x * f, y = p.y * f, z = p.z * f;
  return (Math.sin(x * 1.7 + Math.sin(y * 2.3)) + Math.sin(y * 1.9 + Math.sin(z * 2.1)) + Math.sin(z * 1.5 + Math.sin(x * 2.7))) / 6 + 0.5;
}

const matCache = new Map();
function vcMat() {
  if (!matCache.has('vc')) matCache.set('vc', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));
  return matCache.get('vc');
}
function solid(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });
}

// ---------- loft: elliptical cross-sections swept along a Catmull-Rom spine ----------
// prof(s, len) -> { rx, ry } radii along B (sideways) and U (= T x B, "ventral") axes.
// col(info) -> THREE.Color for each vertex. Returns mesh plus frame sampler.
function loft(points, prof, { segL = 40, segR = 16, side = v3(1, 0, 0), col = () => C.green, bump = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const len = curve.getLength();
  const pos = [], colors = [], idx = [];
  const frames = [];
  let B = side.clone();
  for (let i = 0; i <= segL; i++) {
    const t = i / segL;
    const P = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    B = B.clone().addScaledVector(T, -B.dot(T)).normalize();
    const U = new THREE.Vector3().crossVectors(T, B).normalize();
    const s = t * len;
    const { rx, ry } = prof(s, len);
    frames.push({ P, T, B, U, rx, ry, s });
    for (let j = 0; j < segR; j++) {
      const a = (j / segR) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      let k = 1;
      if (bump) k = bump(s, ca, sa);
      const p = P.clone().addScaledVector(B, ca * rx * k).addScaledVector(U, sa * ry * k);
      pos.push(p.x, p.y, p.z);
      const c = col({ s, len, ca, sa, p, t });
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segR; j++) {
      const a = i * segR + j, b = i * segR + ((j + 1) % segR);
      const c = (i + 1) * segR + j, d = (i + 1) * segR + ((j + 1) % segR);
      idx.push(a, b, c, b, d, c);
    }
  }
  // caps
  const capCol = (f) => col({ s: f.s, len, ca: 0, sa: -1, p: f.P, t: f.s / len });
  const f0 = frames[0], f1 = frames[segL];
  const c0 = pos.length / 3; pos.push(f0.P.x, f0.P.y, f0.P.z); { const c = capCol(f0); colors.push(c.r, c.g, c.b); }
  for (let j = 0; j < segR; j++) idx.push(c0, (j + 1) % segR, j);
  const c1 = pos.length / 3; pos.push(f1.P.x, f1.P.y, f1.P.z); { const c = capCol(f1); colors.push(c.r, c.g, c.b); }
  for (let j = 0; j < segR; j++) idx.push(c1, segL * segR + j, segL * segR + ((j + 1) % segR));

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, vcMat());
  return { mesh, frames, curve, len };
}

// piecewise-linear interpolation over [[s, rx, ry], ...]
function table(rows) {
  return (s) => {
    if (s <= rows[0][0]) return { rx: rows[0][1], ry: rows[0][2] };
    for (let i = 1; i < rows.length; i++) {
      if (s <= rows[i][0]) {
        const a = rows[i - 1], b = rows[i];
        let u = (s - a[0]) / (b[0] - a[0]);
        u = u * u * (3 - 2 * u);
        return { rx: a[1] + (b[1] - a[1]) * u, ry: a[2] + (b[2] - a[2]) * u };
      }
    }
    const l = rows[rows.length - 1];
    return { rx: l[1], ry: l[2] };
  };
}

function greenAt(p) {
  const n = noise3(p, 2.2);
  const c = C.green.clone().lerp(n > 0.5 ? C.greenLight : C.greenDark, Math.abs(n - 0.5) * 1.2);
  // faint scale speckle
  const h = hash3(Math.floor(p.x * 5), Math.floor(p.y * 5), Math.floor(p.z * 5));
  return c.multiplyScalar(0.94 + h * 0.1);
}

function ellipsoid(center, r, color, seg = [20, 14], rot = null) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  g.scale(r[0], r[1], r[2]);
  if (rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)));
  g.translate(center[0], center[1], center[2]);
  if (color === 'green') {
    const p = g.attributes.position, cols = [];
    const tmp = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i); const c = greenAt(tmp); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    return new THREE.Mesh(g, vcMat());
  }
  return new THREE.Mesh(g, color instanceof THREE.Material ? color : solid(color));
}

// cone spike: base at `at`, pointing along `dir`, elongated along `along`
function spike(at, dir, height, radius, mat, along = null, stretch = 1, seg = 8) {
  const g = new THREE.ConeGeometry(radius, height, seg, 1);
  g.translate(0, height / 2, 0);
  const Y = dir.clone().normalize();
  let X = along ? new THREE.Vector3().crossVectors(Y, along).normalize() : new THREE.Vector3(1, 0, 0);
  if (X.lengthSq() < 1e-6 || Math.abs(X.dot(Y)) > 0.99) X = new THREE.Vector3(0, 0, 1).cross(Y).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
  X = new THREE.Vector3().crossVectors(Y, Z).normalize();
  g.scale(1, 1, 1);
  const m = new THREE.Matrix4().makeBasis(X, Y, Z);
  if (stretch !== 1) g.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, stretch));
  g.applyMatrix4(m);
  g.translate(at.x, at.y, at.z);
  return new THREE.Mesh(g, mat);
}

// ---------- horn: tapered curved loft ----------
function horn(pts, r0, mat, segL = 10, segR = 8) {
  const { mesh } = loft(pts, (s, len) => {
    const u = s / len; const r = r0 * Math.pow(1 - u, 0.9) + 0.01;
    return { rx: r, ry: r };
  }, { segL, segR, col: () => C.horn });
  mesh.material = mat;
  mesh.geometry.deleteAttribute('color');
  return mesh;
}

// point on ellipsoid surface at given x,y (front hemisphere, +Z)
function onEllipsoid(c, r, x, y, sgnZ = 1) {
  const dx = (x - c[0]) / r[0], dy = (y - c[1]) / r[1];
  const q = Math.max(0, 1 - dx * dx - dy * dy);
  return v3(x, y, c[2] + sgnZ * r[2] * Math.sqrt(q));
}

export function createDragon() {
  const root = new THREE.Group();
  root.name = 'Dragon';
  const hornMat = solid(C.horn, { roughness: 0.6 });
  const clawMat = solid(C.claw, { roughness: 0.55 });

  // ===== neck + torso + tail (one continuous loft) =====
  const spine = [
    v3(0, 5.75, 1.95), v3(0, 5.0, 1.8), v3(0, 4.2, 1.8), v3(0, 3.35, 1.75),
    v3(0, 2.9, 0.7), v3(0, 2.85, -0.4), v3(-0.1, 2.55, -1.4), v3(-0.45, 1.75, -2.4),
    v3(-1.1, 1.05, -3.3), v3(-2.1, 0.85, -3.9), v3(-3.1, 0.7, -4.3), v3(-3.9, 0.6, -4.35),
    v3(-4.3, 0.45, -3.95), v3(-4.0, 0.35, -3.5), v3(-3.45, 0.32, -3.4),
  ];
  const bodyProf = table([
    [0, 0.48, 0.55], [1.2, 0.5, 0.58], [2.2, 0.68, 0.78], [2.9, 1.05, 1.12],
    [3.8, 1.3, 1.2], [4.8, 1.32, 1.15], [5.8, 1.1, 1.0], [6.8, 0.66, 0.58],
    [8.2, 0.44, 0.4], [10.0, 0.34, 0.3], [11.5, 0.27, 0.24], [12.6, 0.2, 0.18], [13.2, 0.12, 0.11], [13.5, 0.04, 0.04],
  ]);
  const plate = 0.36;
  const body = loft(spine, bodyProf, {
    segL: 120, segR: 18,
    col: ({ s, sa, p }) => {
      const bellyLimit = s < 6.2 ? 0.45 : 0.62;
      if (sa > bellyLimit) {
        const f = (s / plate) % 1;
        const c = C.tan.clone();
        if (f < 0.13 && s < 6.6) c.lerp(C.tanDark, 0.85);
        else c.multiplyScalar(0.95 + 0.1 * (1 - Math.abs(f - 0.55)));
        return c;
      }
      if (sa > bellyLimit - 0.08) return C.tanDark.clone().lerp(C.greenDark, 0.4);
      return greenAt(p);
    },
    bump: (s, ca, sa) => {
      if (sa > 0.45 && s < 6.6) { const f = (s / plate) % 1; return 1 + 0.035 * Math.sin(f * Math.PI); }
      return 1;
    },
  });
  body.mesh.name = 'Body';
  root.add(body.mesh);

  // dorsal spikes along spine (neck back to tail tip)
  for (let s = 0.55; s < body.len - 0.35; s += 0.42) {
    const t = s / body.len;
    const i = Math.round(t * (body.frames.length - 1));
    const f = body.frames[i];
    const at = f.P.clone().addScaledVector(f.U, -f.ry * 0.93);
    const dir = f.U.clone().negate().addScaledVector(f.T, 0.55).normalize();
    let h = 0.24; let r = 0.09;
    if (s > 5.5) { h = 0.3 * Math.max(0.45, 1 - (s - 6) / 9); r = 0.11 * Math.max(0.5, 1 - (s - 6) / 9); }
    root.add(spike(at, dir, h, r, hornMat, f.T, 2.0, 6));
  }

  // chest / shoulder bulk
  root.add(ellipsoid([0.8, 2.7, 1.35], [0.48, 0.8, 0.62], 'green', [16, 12]));
  root.add(ellipsoid([-0.8, 2.7, 1.35], [0.48, 0.8, 0.62], 'green', [16, 12]));

  // ===== head =====
  const head = new THREE.Group(); head.name = 'Head';
  const cran = [0, 6.12, 2.3], cranR = [0.93, 0.7, 0.78];
  const snout = [0, 5.6, 3.15], snoutR = [0.6, 0.47, 0.78];
  // forehead-to-muzzle bridge
  head.add(ellipsoid([0, 5.95, 2.85], [0.62, 0.5, 0.75], 'green', [18, 12], [-0.35, 0, 0]));
  head.add(ellipsoid(cran, cranR, 'green', [26, 18]));
  head.add(ellipsoid(snout, snoutR, 'green', [22, 14]));
  // cheeks (widen lower face)
  head.add(ellipsoid([0.5, 5.75, 2.4], [0.4, 0.38, 0.55], 'green', [16, 10]));
  head.add(ellipsoid([-0.5, 5.75, 2.4], [0.4, 0.38, 0.55], 'green', [16, 10]));
  // tan lower jaw / chin
  head.add(ellipsoid([0, 5.3, 2.95], [0.52, 0.27, 0.78], C.tan, [20, 12]));
  // brow ridges
  head.add(ellipsoid([0.48, 6.35, 2.78], [0.32, 0.13, 0.26], 'green', [14, 8], [0, 0, -0.25]));
  head.add(ellipsoid([-0.48, 6.35, 2.78], [0.32, 0.13, 0.26], 'green', [14, 8], [0, 0, 0.25]));
  // nostrils
  for (const sx of [1, -1]) {
    const p = onEllipsoid(snout, snoutR, sx * 0.17, 5.8);
    head.add(ellipsoid([p.x, p.y, p.z - 0.02], [0.07, 0.045, 0.05], C.mouth, [10, 6]));
    // nostril ridge
    head.add(ellipsoid([p.x * 1.15, p.y + 0.06, p.z - 0.08], [0.13, 0.08, 0.12], 'green', [10, 6]));
  }
  // smile line wrapping round the muzzle
  {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16 * 2 - 1; // -1..1
      const phi = u * 1.5;
      const y = 5.36 + 0.14 * Math.pow(Math.abs(u), 1.5) - 0.02;
      const dy = (y - snout[1]) / snoutR[1];
      const sc = Math.sqrt(Math.max(0, 1 - dy * dy)) * 1.03;
      pts.push(v3(snout[0] + snoutR[0] * sc * Math.sin(phi) * (1 + 0.25 * Math.abs(u)), y, snout[2] + snoutR[2] * sc * Math.cos(phi)));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 5, false);
    head.add(new THREE.Mesh(g, solid(C.mouth)));
  }
  // eyes
  for (const sx of [1, -1]) {
    const c = v3(sx * 0.5, 6.02, 2.93);
    const look = v3(sx * 0.42, 0.05, 1).normalize();
    head.add(ellipsoid([c.x, c.y, c.z], [0.25, 0.25, 0.22], C.eyeWhite, [16, 12]));
    const ir = c.clone().addScaledVector(look, 0.09);
    head.add(ellipsoid([ir.x, ir.y, ir.z], [0.2, 0.2, 0.17], C.iris, [16, 12]));
    const pu = c.clone().addScaledVector(look, 0.17);
    head.add(ellipsoid([pu.x, pu.y, pu.z], [0.1, 0.12, 0.1], C.pupil, [12, 10]));
    const hl = c.clone().addScaledVector(look, 0.22).add(v3(sx * 0.05, 0.07, 0));
    head.add(ellipsoid([hl.x, hl.y, hl.z], [0.04, 0.04, 0.04], new THREE.Color('#fff8ea'), [8, 6]));
    // dark eyelid rim
    const lid = c.clone().addScaledVector(look, 0.02).add(v3(0, 0.17, -0.02));
    head.add(ellipsoid([lid.x, lid.y, lid.z], [0.27, 0.1, 0.2], 'green', [12, 6]));
  }
  // main horns
  for (const sx of [1, -1]) {
    head.add(horn([v3(sx * 0.55, 6.55, 2.0), v3(sx * 0.68, 6.95, 1.78), v3(sx * 0.82, 7.2, 1.45)], 0.21, hornMat));
    // side spikes (upper and lower)
    head.add(horn([v3(sx * 0.85, 6.3, 1.85), v3(sx * 1.08, 6.32, 1.6), v3(sx * 1.2, 6.35, 1.35)], 0.11, hornMat, 6, 6));
    head.add(horn([v3(sx * 0.85, 5.85, 1.85), v3(sx * 1.08, 5.82, 1.6), v3(sx * 1.18, 5.8, 1.35)], 0.1, hornMat, 6, 6));
    head.add(horn([v3(sx * 0.6, 5.45, 1.8), v3(sx * 0.75, 5.35, 1.55), v3(sx * 0.82, 5.3, 1.35)], 0.08, hornMat, 6, 6));
  }
  // centre forehead spike
  head.add(spike(v3(0, 6.78, 2.45), v3(0, 1, -0.35), 0.28, 0.09, hornMat, v3(0, 0, 1), 2.0, 6));
  root.add(head);

  // ===== legs =====
  const legCol = ({ p }) => greenAt(p);
  function paw(at, yaw, pitch, mirror, wide = 1) {
    const g = new THREE.Group();
    g.add(ellipsoid([0, 0, 0], [0.3 * wide, 0.17, 0.38], 'green', [16, 10]));
    for (let k = -1; k <= 1; k++) {
      const base = v3(k * 0.16 * wide, -0.05, 0.3 - Math.abs(k) * 0.05);
      g.add(ellipsoid([base.x, base.y + 0.02, base.z - 0.02], [0.09, 0.09, 0.12], 'green', [8, 5]));
      g.add(spike(base.clone().add(v3(0, -0.02, 0.06)), v3(k * 0.15, -0.55, 1), 0.2, 0.06, clawMat, null, 1, 6));
    }
    // outer dew claw
    g.add(spike(v3(mirror * 0.27 * wide, -0.05, 0.05), v3(mirror * 1, -0.6, 0.6), 0.14, 0.05, clawMat, null, 1, 6));
    g.rotation.set(pitch, yaw, 0, 'YXZ');
    g.position.copy(at);
    return g;
  }
  function leg(pts, radii, pawAt, pawPitch, mirror, wide) {
    const prof = table(radii);
    const { mesh } = loft(pts, prof, { segL: 20, segR: 14, col: legCol });
    root.add(mesh);
    root.add(paw(pawAt, 0, pawPitch, mirror, wide));
  }
  // front legs: left (+X) mid-step with paw lifted slightly, right planted
  leg([v3(0.85, 3.1, 1.55), v3(0.92, 2.0, 1.7), v3(0.92, 1.0, 2.05), v3(0.92, 0.55, 2.2)],
    [[0, 0.5, 0.55], [1.0, 0.36, 0.4], [2.0, 0.27, 0.3], [2.8, 0.25, 0.26]], v3(0.92, 0.42, 2.35), 0.55, 1, 1);
  leg([v3(-0.85, 3.1, 1.5), v3(-0.88, 1.9, 1.35), v3(-0.85, 0.75, 1.5), v3(-0.85, 0.3, 1.6)],
    [[0, 0.5, 0.55], [1.1, 0.36, 0.4], [2.2, 0.28, 0.3], [2.9, 0.26, 0.27]], v3(-0.85, 0.17, 1.8), 0, -1, 1);
  // hind legs: big thighs
  for (const sx of [1, -1]) root.add(ellipsoid([sx * 1.02, 2.25, -0.6], [0.58, 0.95, 0.88], 'green', [20, 14], [0.25, 0, sx * 0.1]));
  leg([v3(1.05, 2.0, -0.6), v3(1.15, 1.35, -0.2), v3(1.15, 0.55, -0.2), v3(1.15, 0.28, -0.05)],
    [[0, 0.5, 0.5], [0.8, 0.4, 0.42], [1.7, 0.3, 0.32], [2.2, 0.28, 0.28]], v3(1.15, 0.17, 0.15), 0, 1, 1.05);
  leg([v3(-1.05, 2.0, -0.7), v3(-1.15, 1.3, -1.05), v3(-1.15, 0.55, -1.35), v3(-1.15, 0.28, -1.3)],
    [[0, 0.5, 0.5], [0.8, 0.4, 0.42], [1.7, 0.3, 0.32], [2.2, 0.28, 0.28]], v3(-1.15, 0.17, -1.1), 0, -1, 1.05);

  // ===== wings =====
  function wing(sx) {
    const g = new THREE.Group(); g.name = sx > 0 ? 'WingL' : 'WingR';
    const P = (x, y, z) => v3(sx * x, y, z);
    const rootF = P(0.55, 4.35, 1.05), rootB = P(0.6, 3.75, 0.05);
    const wrist = P(1.4, 6.05, 0.75);
    const tips = [P(2.2, 4.4, -2.3), P(1.95, 2.9, -1.6), P(1.35, 3.0, -0.4)];
    const outline = [wrist];
    let prev = tips[0];
    outline.push(tips[0]);
    const scallop = (a, b, depth) => {
      const mid = a.clone().lerp(b, 0.5).lerp(wrist, depth);
      const out = [];
      for (let i = 1; i <= 4; i++) {
        const u = i / 5;
        const p = a.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(b, u * u);
        out.push(p);
      }
      return out;
    };
    outline.push(...scallop(tips[0], tips[1], 0.28), tips[1]);
    outline.push(...scallop(tips[1], tips[2], 0.3), tips[2]);
    outline.push(...scallop(tips[2], rootB, 0.25), rootB, rootF);
    // fan from wrist; billow membrane slightly toward the body side
    const pos = [], idx = [];
    const n = outline.length;
    const centroid = new THREE.Vector3(); outline.forEach(p => centroid.add(p)); centroid.divideScalar(n);
    const mids = [];
    for (const p of outline) pos.push(p.x, p.y, p.z);
    for (let i = 1; i < n - 1; i++) idx.push(0, i, i + 1);
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    // subdivide once for billow: tessellate fan triangles via midpoint along radial
    geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    // orientation: front face should look outward/backward (green side)
    const a = outline[0], b = outline[1], c = outline[2];
    const nrm = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const outward = v3(sx * 1, 0.2, -1).normalize().negate();
    const flip = nrm.dot(outward) < 0;
    if (flip) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        const tx = p.getX(i + 1), ty = p.getY(i + 1), tz = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, tx, ty, tz);
      }
      geo.computeVertexNormals();
    }
    g.add(new THREE.Mesh(geo, solid(C.membraneOut, { side: THREE.FrontSide, roughness: 0.9 })));
    {
      const p = geo.attributes.position, cols = [];
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const k = THREE.MathUtils.smoothstep(y, 4.6, 5.9);
        const c = C.membrane.clone().lerp(C.membraneOut, k * 0.8);
        cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    }
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.BackSide, roughness: 0.9 })));
    // bones
    const boneMat = vcMat();
    const bone = (pts, r0, r1) => {
      const { mesh } = loft(pts, (s, len) => { const u = s / len; const r = r0 + (r1 - r0) * u; return { rx: r, ry: r }; },
        { segL: 10, segR: 7, col: ({ p }) => greenAt(p).multiplyScalar(0.95) });
      g.add(mesh);
    };
    bone([rootF, P(0.95, 5.2, 0.95), wrist], 0.13, 0.1);
    for (const tp of tips) bone([wrist, wrist.clone().lerp(tp, 0.5).add(v3(0, 0.1, 0)), tp], 0.07, 0.025);
    // thumb claw at wrist
    g.add(spike(wrist.clone().add(v3(0, 0.05, 0)), v3(sx * 0.1, 1, 0.25), 0.3, 0.085, hornMat, null, 1, 6));
    g.add(ellipsoid([wrist.x, wrist.y, wrist.z], [0.13, 0.13, 0.13], 'green', [10, 8]));
    return g;
  }
  root.add(wing(1));
  root.add(wing(-1));

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

export default createDragon;
