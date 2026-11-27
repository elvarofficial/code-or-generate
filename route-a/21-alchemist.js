// Alchemist diorama: hooded wizard with flask, floating armillary sphere,
// green dragon clinging to his back, two cluttered tables, round carved plinth.
// Stands on y = 0, faces +Z, up is +Y. ~1 unit = 1/6.5 of the plinth diameter.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- materials ----------
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...opts }));
  }
  return matCache.get(key);
}

function runeTexture(vertical, bg = '#26428a') {
  if (typeof document === 'undefined') return null;
  const W = vertical ? 64 : 512, H = vertical ? 512 : 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#d9a93c';
  // gold border along the long edges
  if (vertical) { g.fillRect(0, 0, 8, H); g.fillRect(W - 8, 0, 8, H); }
  else { g.fillRect(0, 0, W, 8); g.fillRect(0, H - 8, W, 8); }
  g.strokeStyle = '#ffd25a'; g.lineWidth = 4; g.lineCap = 'round';
  let seed = vertical ? 7 : 13;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const cx = vertical ? W / 2 : (i + 0.5) * W / n;
    const cy = vertical ? (i + 0.5) * H / n : H / 2;
    const s = 14;
    g.beginPath();
    const strokes = 2 + Math.floor(rnd() * 2);
    for (let k = 0; k < strokes; k++) {
      g.moveTo(cx + (rnd() - 0.5) * 2 * s, cy + (rnd() - 0.5) * 2 * s);
      g.lineTo(cx + (rnd() - 0.5) * 2 * s, cy + (rnd() - 0.5) * 2 * s);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- helpers ----------
function mesh(geo, m, pos, rot, scale) {
  const o = new THREE.Mesh(geo, m);
  if (pos) o.position.copy(pos);
  if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) o.scale.set(scale[0], scale[1], scale[2]);
  return o;
}

// cylinder from a to b (radius ra at a, rb at b)
function limb(a, b, ra, rb, m, seg = 10, open = false) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, open);
  const o = new THREE.Mesh(geo, m);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return o;
}

// tube along a curve with a radius function r(t)
function taperTube(points, rFn, tubSeg, radSeg, m) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(tubSeg, false);
  const pos = [], idx = [];
  for (let i = 0; i <= tubSeg; i++) {
    const t = i / tubSeg;
    const p = curve.getPointAt(t);
    const r = rFn(t);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radSeg; j++) {
      const a = (j / radSeg) * Math.PI * 2;
      const cx = Math.cos(a), sx = Math.sin(a);
      pos.push(p.x + r * (cx * N.x + sx * B.x), p.y + r * (cx * N.y + sx * B.y), p.z + r * (cx * N.z + sx * B.z));
    }
  }
  for (let i = 0; i < tubSeg; i++) for (let j = 0; j < radSeg; j++) {
    const a = i * (radSeg + 1) + j, b = a + radSeg + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, m);
}

// flat polygon in 3D, triangulated as a fan from the first point
function fanPoly(pts, m) {
  const pos = [];
  for (let i = 1; i < pts.length - 1; i++) pos.push(...pts[0].toArray(), ...pts[i].toArray(), ...pts[i + 1].toArray());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, m);
}

function crystal(h, r, color, pos, tilt = [0, 0, 0]) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.2, metalness: 0.1, emissive: color, emissiveIntensity: 0.25, flatShading: true });
  g.add(mesh(new THREE.CylinderGeometry(r, r, h * 0.7, 6), m, V(0, h * 0.35, 0)));
  g.add(mesh(new THREE.ConeGeometry(r, h * 0.3, 6), m, V(0, h * 0.85, 0)));
  g.position.copy(pos);
  g.rotation.set(tilt[0], tilt[1], tilt[2]);
  return g;
}

function candle(pos, h, r = 0.1) {
  const g = new THREE.Group();
  const wax = mat('#ead9b0', { roughness: 0.6 });
  g.add(mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 8), wax, V(0, h / 2, 0)));
  // drips
  g.add(mesh(new THREE.SphereGeometry(r * 1.15, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), wax, V(0, h - 0.02, 0), null, [1, 0.5, 1]));
  g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), mat('#222'), V(0, h + 0.03, 0)));
  const fl = mat('#ffb030', { emissive: '#ff9a20', emissiveIntensity: 1.6 });
  g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), fl, V(0, h + 0.1, 0), null, [1, 2.2, 1]));
  g.position.copy(pos);
  return g;
}

function book(w, h, d, color, pos, ry = 0) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(color), V(0, h / 2, 0)));
  g.add(mesh(new THREE.BoxGeometry(w - 0.06, h - 0.04, d - 0.02), mat('#efe3c4'), V(0.04, h / 2, 0)));
  g.add(mesh(new THREE.BoxGeometry(0.03, h + 0.01, d * 0.9), mat('#c9a040', { metalness: 0.5, roughness: 0.4 }), V(-w / 2 + 0.12, h / 2, 0)));
  g.position.copy(pos);
  g.rotation.y = ry;
  return g;
}

function hand(skin) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(1, 10, 8), skin, V(0, 0, 0), null, [0.13, 0.06, 0.15]));
  for (let i = 0; i < 4; i++) {
    const f = mesh(new THREE.CapsuleGeometry(0.03, 0.12, 1, 5), skin, V(-0.075 + i * 0.05, 0.03, 0.17), [Math.PI / 2 - 0.5, 0, 0]);
    g.add(f);
  }
  g.add(mesh(new THREE.CapsuleGeometry(0.035, 0.1, 1, 5), skin, V(0.13, 0.04, 0.05), [0, 0, -0.9]));
  return g;
}

// ---------- parts ----------
function buildPlinth() {
  const g = new THREE.Group();
  const stone = mat('#9a9283', { roughness: 0.95 });
  const stoneD = mat('#7b7468', { roughness: 0.95 });
  const stoneL = mat('#aaa293', { roughness: 0.95 });
  const S = 64;
  const P = [[0, 0], [3.3, 0], [3.38, 0.06], [3.38, 0.22], [3.3, 0.29], [3.14, 0.31], [3.13, 1.05], [3.24, 1.09], [3.3, 1.19], [3.25, 1.29], [3.08, 1.33], [3.1, 1.45], [3.08, 1.6], [2.98, 1.65], [2.8, 1.68], [2.82, 1.8], [2.78, 1.92], [2.7, 1.95], [0, 1.95]];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(P.map(p => new THREE.Vector2(p[0], p[1])), 48), stone));
  void stoneD; void stoneL; void S;
  // carved scroll band: two interlaced wavy ribbons
  const carve = mat('#8a8274', { roughness: 0.95 });
  for (let k = 0; k < 2; k++) {
    const pts = [];
    const N = 160;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const y = 0.68 + 0.24 * Math.sin(a * 12 + k * Math.PI);
      pts.push(V(Math.sin(a) * 3.14, y, Math.cos(a) * 3.14));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 144, 0.065, 4, true), carve));
  }
  // small round knots in the scrolls
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    g.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), carve, V(Math.sin(a) * 3.12, 0.68, Math.cos(a) * 3.12)));
  }
  // flagstone seams on the floor and steps
  const seam = mat('#6d675c');
  g.add(mesh(new THREE.TorusGeometry(1.7, 0.02, 3, 48), seam, V(0, 1.955, 0), [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const r0 = i % 2 ? 0.9 : 1.7, r1 = 2.74;
    const b = mesh(new THREE.BoxGeometry(0.04, 0.02, r1 - r0), seam, V(Math.sin(a) * (r0 + r1) / 2, 1.955, Math.cos(a) * (r0 + r1) / 2), [0, a, 0]);
    g.add(b);
  }
  return g;
}

function buildWizard() {
  const g = new THREE.Group();
  const robe = mat('#2b4a92', { roughness: 0.85 });
  const robeIn = mat('#1b2f60', { roughness: 0.9, side: THREE.DoubleSide });
  const gold = mat('#d6a83e', { metalness: 0.6, roughness: 0.35 });
  const skin = mat('#dcaa86', { roughness: 0.7 });
  const hair = mat('#d8d8d2', { roughness: 0.9 });
  const vTex = runeTexture(true);
  const hTex = runeTexture(false);
  const strip = vTex ? new THREE.MeshStandardMaterial({ map: vTex, roughness: 0.6, emissive: '#ffffff', emissiveMap: vTex, emissiveIntensity: 0.15 }) : gold;
  let bandTex = null;
  if (hTex) { bandTex = hTex.clone(); bandTex.repeat.set(5, 1); bandTex.needsUpdate = true; }
  const band = bandTex ? new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.6, emissive: '#ffffff', emissiveMap: bandTex, emissiveIntensity: 0.15, side: THREE.DoubleSide }) : gold;

  // robe body as a lathe, squashed in depth
  const body = new THREE.Group();
  body.position.set(0.1, 0, 0.2);
  body.scale.set(1, 1, 0.7);
  const prof = [[1.45, 1.96], [1.43, 2.2], [1.25, 3.0], [1.0, 4.0], [0.76, 4.8], [0.62, 5.2], [0.66, 5.5], [0.8, 6.0], [0.93, 6.4], [0.97, 6.65], [0.82, 6.88], [0.45, 7.02], [0.28, 7.08]];
  body.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 40), robe));
  // front opening trims (rune strips)
  const stripProf = prof.slice(0, 11).map(p => new THREE.Vector2(p[0] * 1.012 + 0.012, p[1]));
  for (const s of [-1, 1]) {
    body.add(new THREE.Mesh(new THREE.LatheGeometry(stripProf, 2, s > 0 ? 0.2 : -0.2 - 0.3, 0.3), strip));
  }
  // hem band
  body.add(mesh(new THREE.CylinderGeometry(1.445, 1.475, 0.24, 40, 1, true), band, V(0, 2.08, 0)));
  // belt
  body.add(mesh(new THREE.CylinderGeometry(0.66, 0.64, 0.24, 32), mat('#6b4a2e'), V(0, 5.25, 0)));
  // collar
  body.add(mesh(new THREE.TorusGeometry(0.62, 0.07, 6, 32), gold, V(0, 6.9, 0.0), [Math.PI / 2 + 0.25, 0, 0]));
  g.add(body);

  // shoulders
  g.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), robe, V(-0.68, 6.5, 0.15), null, [1, 0.9, 0.8]));
  g.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), robe, V(0.88, 6.5, 0.15), null, [1, 0.9, 0.8]));

  // head
  const hx = 0.1, hy = 7.55, hz = 0.5;
  g.add(mesh(new THREE.SphereGeometry(0.34, 12, 10), skin, V(hx, hy, hz + 0.05), null, [1, 1.1, 1]));
  g.add(mesh(new THREE.ConeGeometry(0.07, 0.2, 6), skin, V(hx, hy - 0.02, hz + 0.4), [Math.PI / 2 + 0.3, 0, 0]));
  const eye = mat('#1a1a1a');
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.04, 6, 6), eye, V(hx + s * 0.12, hy + 0.08, hz + 0.33)));
    g.add(mesh(new THREE.BoxGeometry(0.17, 0.05, 0.06), hair, V(hx + s * 0.13, hy + 0.15, hz + 0.33), [0, 0, s * -0.3]));
    // mustache
    g.add(mesh(new THREE.CapsuleGeometry(0.06, 0.22, 2, 6), hair, V(hx + s * 0.12, hy - 0.18, hz + 0.33), [0, 0, s * 1.1]));
  }
  // beard: long tapering wedge
  const bp = [[0.0, -0.8], [0.12, -0.6], [0.26, -0.25], [0.38, 0.2], [0.44, 0.5], [0.4, 0.68], [0.25, 0.78], [0.0, 0.8]].map(p => new THREE.Vector2(p[0], p[1]));
  g.add(mesh(new THREE.LatheGeometry(bp, 14), hair, V(hx, 6.45, 0.95), [-0.15, 0, 0], [1, 1, 0.45]));
  g.add(mesh(new THREE.SphereGeometry(0.36, 12, 8), hair, V(hx, hy - 0.32, hz + 0.18), null, [1, 0.75, 0.75]));

  // hood: sphere with a front opening + peak + gold rim
  const hood = new THREE.Group();
  hood.position.set(hx, hy + 0.05, hz - 0.2);
  const open = 0.85, hr = 0.58;
  hood.add(mesh(new THREE.SphereGeometry(hr, 16, 10, Math.PI / 2 + open, Math.PI * 2 - 2 * open), mat('#2b4a92', { roughness: 0.85, side: THREE.FrontSide }), V(0, 0, 0), null, [1.08, 1.05, 1.1]));
  hood.add(mesh(new THREE.SphereGeometry(hr, 16, 10, Math.PI / 2 + open, Math.PI * 2 - 2 * open), mat('#101a36', { roughness: 1, side: THREE.BackSide }), V(0, 0, 0), null, [1.08, 1.05, 1.1]));
  hood.add(mesh(new THREE.ConeGeometry(0.2, 0.3, 10), robe, V(0, 0.5, -0.38), [-1.0, 0, 0]));
  hood.add(mesh(new THREE.TorusGeometry(0.5, 0.055, 6, 28), gold, V(0, -0.02, hr * Math.cos(open) * 1.1), null, [hr * Math.sin(open) * 1.08 / 0.5, hr * 1.05 / 0.5, 1]));
  // hood drapes down the back
  hood.add(mesh(new THREE.ConeGeometry(0.6, 1.0, 14), robe, V(0, -0.55, -0.35), [0.15, 0, 0], [1, 1, 0.6]));
  g.add(hood);

  // ---- right arm (character right = -X): holds flask
  const sh = V(-0.82, 6.55, 0.15), el = V(-1.05, 5.75, 0.5), wr = V(-0.78, 5.92, 1.05);
  g.add(limb(sh, el, 0.3, 0.3, robe, 12));
  g.add(limb(el, wr, 0.3, 0.42, robeIn, 14, true));
  g.add(limb(el, wr.clone().lerp(el, 0.05), 0.3, 0.41, robe, 14, true));
  g.add(limb(wr.clone().lerp(el, 0.18), wr, 0.4, 0.44, band, 16, true));
  g.add(mesh(new THREE.SphereGeometry(0.31, 8, 6), robe, el));
  // hanging drape of the bell sleeve
  g.add(limb(V(-1.05, 5.75, 0.6), V(-1.15, 4.7, 0.8), 0.32, 0.36, robe, 12));
  g.add(limb(V(-1.12, 4.95, 0.78), V(-1.15, 4.7, 0.8), 0.35, 0.37, band, 14, true));
  const hR = hand(skin);
  hR.position.set(-0.66, 5.98, 1.18);
  hR.rotation.set(0, 0.4, Math.PI / 2);
  hR.scale.setScalar(1.4);
  g.add(hR);
  // flask
  const glass = mat('#bfe8c8', { transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1 });
  const potion = mat('#6ee06a', { emissive: '#40c040', emissiveIntensity: 0.7, roughness: 0.3 });
  const fl = new THREE.Group();
  fl.position.set(-0.62, 5.38, 1.32);
  fl.add(mesh(new THREE.SphereGeometry(0.34, 14, 10), glass));
  fl.add(mesh(new THREE.SphereGeometry(0.3, 14, 6, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6), potion));
  fl.add(mesh(new THREE.CircleGeometry(0.29, 18), potion, V(0, 0.09, 0), [-Math.PI / 2, 0, 0]));
  fl.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.62, 10), glass, V(0, 0.6, 0)));
  fl.add(mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), glass, V(0, 0.9, 0), [Math.PI / 2, 0, 0]));
  g.add(fl);

  // ---- left arm (+X): raised open palm under the armillary sphere
  const sh2 = V(0.98, 6.55, 0.15), el2 = V(1.42, 5.85, 0.55), wr2 = V(1.72, 6.05, 1.1);
  g.add(limb(sh2, el2, 0.3, 0.3, robe, 12));
  g.add(limb(el2, wr2, 0.3, 0.42, robeIn, 14, true));
  g.add(limb(el2, wr2.clone().lerp(el2, 0.05), 0.3, 0.41, robe, 14, true));
  g.add(limb(wr2.clone().lerp(el2, 0.18), wr2, 0.4, 0.44, band, 16, true));
  g.add(mesh(new THREE.SphereGeometry(0.31, 8, 6), robe, el2));
  g.add(limb(V(1.45, 5.8, 0.65), V(1.6, 4.8, 0.8), 0.32, 0.36, robe, 12));
  g.add(limb(V(1.58, 5.05, 0.78), V(1.6, 4.8, 0.8), 0.35, 0.37, band, 14, true));
  g.add(limb(wr2.clone().lerp(el2, 0.3), V(1.92, 6.22, 1.35), 0.1, 0.09, skin, 8));
  const hL = hand(skin);
  hL.position.set(1.98, 6.3, 1.42);
  hL.rotation.set(-1.0, 0.5, 0.3);
  hL.scale.setScalar(1.5);
  g.add(hL);
  return g;
}

function buildArmillary() {
  const g = new THREE.Group();
  g.position.set(2.0, 7.6, 1.6);
  g.rotation.set(0.35, 0.6, 0.25);
  const gold = mat('#d9a636', { metalness: 0.75, roughness: 0.3 });
  const R = 0.72;
  g.add(mesh(new THREE.TorusGeometry(R, 0.06, 6, 32), gold, null, [Math.PI / 2, 0, 0], [1, 1, 1]));
  g.add(mesh(new THREE.TorusGeometry(R * 0.98, 0.045, 6, 32), gold, null, [0, 0, 0]));
  g.add(mesh(new THREE.TorusGeometry(R * 0.96, 0.045, 6, 32), gold, null, [0.5, 0.9, 0.3]));
  g.add(mesh(new THREE.TorusGeometry(R * 0.94, 0.04, 6, 32), gold, null, [Math.PI / 2 - 0.45, 0, 0.5]));
  g.add(mesh(new THREE.TorusGeometry(R * 1.05, 0.03, 6, 48), gold, null, [Math.PI / 2 + 0.3, 0, -0.2]));
  g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), gold));
  g.add(mesh(new THREE.SphereGeometry(R * 0.9, 12, 8), mat('#d8f0d0', { transparent: true, opacity: 0.15, depthWrite: false, emissive: '#c0f0b0', emissiveIntensity: 0.3 })));
  return g;
}

function buildDragon() {
  const g = new THREE.Group();
  const skin = mat('#4c8f3a', { roughness: 0.75 });
  const belly = mat('#b6b26a', { roughness: 0.8 });
  const memb = mat('#7ca852', { roughness: 0.85, side: THREE.DoubleSide });
  const horn = mat('#4a3f30', { roughness: 0.6 });
  const claw = mat('#2b2620');

  // spine: from neck top to tail tip
  const spine = [
    V(-1.32, 7.75, -0.25), V(-1.3, 7.3, -0.42), V(-1.15, 6.85, -0.65), V(-0.98, 6.25, -0.95),
    V(-0.85, 5.6, -1.25), V(-0.78, 5.0, -1.5), V(-0.68, 4.2, -1.72), V(-0.5, 3.3, -1.85),
    V(-0.2, 2.45, -1.7), V(0.25, 2.12, -1.35), V(0.75, 2.1, -1.05), V(1.0, 2.15, -0.75),
  ];
  const rFn = t => {
    if (t < 0.1) return 0.16 + t * 0.8;
    if (t < 0.4) return 0.24 + 0.12 * Math.sin(((t - 0.1) / 0.3) * Math.PI);
    return Math.max(0.03, 0.24 * (1 - (t - 0.4) / 0.6) ** 1.2);
  };
  g.add(taperTube(spine, rFn, 72, 9, skin));
  // belly plates along the neck/chest (front side)
  const neckBelly = [V(-1.28, 7.7, -0.1), V(-1.25, 7.25, -0.25), V(-1.1, 6.8, -0.45), V(-0.95, 6.3, -0.72)];
  g.add(taperTube(neckBelly, t => 0.1 + 0.1 * t, 20, 8, belly));
  // dorsal spikes
  const curve = new THREE.CatmullRomCurve3(spine);
  for (let i = 1; i < 16; i++) {
    const t = i / 17;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const out = V(0.25, 0.2, -1).normalize();
    const s = mesh(new THREE.ConeGeometry(0.05, 0.16, 4), skin, p.clone().addScaledVector(out, rFn(t) * 0.9));
    s.quaternion.setFromUnitVectors(V(0, 1, 0), out.clone().addScaledVector(tan, -0.3).normalize());
    g.add(s);
  }

  // head
  const head = new THREE.Group();
  head.position.set(-1.33, 7.92, -0.15);
  head.rotation.set(0.15, 0.45, 0);
  head.scale.setScalar(1.45);
  head.add(mesh(new THREE.SphereGeometry(0.22, 14, 10), skin, null, null, [0.95, 0.9, 1.1]));
  head.add(mesh(new THREE.BoxGeometry(0.26, 0.17, 0.42), skin, V(0, -0.04, 0.3)));
  head.add(mesh(new THREE.BoxGeometry(0.22, 0.07, 0.36), skin, V(0, -0.15, 0.25), [0.15, 0, 0]));
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat('#f2d23a', { emissive: '#d0a020', emissiveIntensity: 0.6 }), V(s * 0.12, 0.06, 0.16)));
    head.add(mesh(new THREE.BoxGeometry(0.06, 0.04, 0.14), skin, V(s * 0.12, 0.11, 0.15), [0.3, 0, 0]));
    // horns sweep back and up
    const h1 = mesh(new THREE.ConeGeometry(0.055, 0.42, 8), horn, V(s * 0.1, 0.25, -0.2), [-0.85, 0, s * -0.25]);
    head.add(h1);
    const h2 = mesh(new THREE.ConeGeometry(0.04, 0.3, 6), horn, V(s * 0.17, 0.13, -0.25), [-1.3, 0, s * -0.4]);
    head.add(h2);
  }
  g.add(head);

  // front legs gripping the wizard's shoulder
  for (const [a, b] of [[V(-1.12, 6.8, -0.5), V(-0.78, 6.75, -0.05)], [V(-1.05, 6.7, -0.75), V(-0.45, 6.95, -0.35)]]) {
    g.add(limb(a, b, 0.09, 0.06, skin, 8));
    for (let k = -1; k <= 1; k++) g.add(mesh(new THREE.ConeGeometry(0.025, 0.1, 5), claw, b.clone().add(V(k * 0.04, -0.05, 0.03)), [Math.PI, 0, 0]));
  }
  // hind legs
  for (const s of [-1, 1]) {
    const hip = V(-0.8 + s * 0.15, 4.95, -1.45);
    const knee = V(-0.8 + s * 0.3, 4.8, -1.15);
    const foot = V(-0.8 + s * 0.25, 4.35, -1.25);
    g.add(limb(hip, knee, 0.15, 0.11, skin, 8));
    g.add(limb(knee, foot, 0.09, 0.07, skin, 8));
    for (let k = -1; k <= 1; k++) g.add(mesh(new THREE.ConeGeometry(0.025, 0.1, 5), claw, foot.clone().add(V(k * 0.04, -0.06, 0.04)), [Math.PI, 0, 0]));
  }

  // big wing (dragon's right) spreading out to -X and back
  const R = V(-1.15, 7.0, -0.85), K = V(-2.5, 8.6, -1.0);
  const T = [V(-4.25, 5.1, -2.6), V(-3.45, 4.85, -2.2), V(-2.75, 5.45, -1.65), V(-1.85, 6.1, -1.15)];
  const Sc = [V(-3.8, 5.45, -2.3), V(-3.05, 5.55, -1.85), V(-2.25, 5.85, -1.4)];
  g.add(fanPoly([K, R, T[3], Sc[2], T[2], Sc[1], T[1], Sc[0], T[0], V(-3.6, 7.2, -2.0)], memb));
  g.add(limb(R, K, 0.09, 0.06, skin, 8));
  for (const t of T) g.add(limb(K, t, 0.045, 0.02, skin, 6));
  g.add(mesh(new THREE.ConeGeometry(0.05, 0.25, 6), horn, K.clone().add(V(0.05, 0.12, 0)), [0, 0, 0.4]));

  // second wing (dragon's left) raised, folded behind the hood
  const R2 = V(-0.75, 7.05, -0.95), K2 = V(-0.35, 8.85, -0.75);
  g.add(fanPoly([K2, R2, V(-0.15, 6.9, -0.6), V(-0.25, 7.4, -0.55), V(-0.05, 7.3, -0.35), V(-0.2, 8.0, -0.5)], memb));
  g.add(limb(R2, K2, 0.07, 0.05, skin, 8));
  g.add(mesh(new THREE.ConeGeometry(0.045, 0.22, 6), horn, K2.clone().add(V(-0.03, 0.12, 0)), [0, 0, 0.3]));
  return g;
}

function table(cx, cz, w, d, topY) {
  const g = new THREE.Group();
  const wood = mat('#7a5233', { roughness: 0.85 });
  const woodD = mat('#5c3c24', { roughness: 0.9 });
  g.add(mesh(new THREE.BoxGeometry(w, 0.2, d), wood, V(cx, topY - 0.1, cz)));
  const lh = topY - 0.2 - 1.95;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.22, lh, 0.22), woodD, V(cx + sx * (w / 2 - 0.18), 1.95 + lh / 2, cz + sz * (d / 2 - 0.15))));
  }
  for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(w - 0.3, 0.16, 0.1), woodD, V(cx, topY - 0.25, cz + sz * (d / 2 - 0.15))));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.1, d - 0.3), woodD, V(cx + sx * (w / 2 - 0.18), 2.35, cz)));
  return g;
}

function cloth(x, z, topY, w, d, hang) {
  // a runner across the table (along Z) that hangs down front and back
  const g = new THREE.Group();
  const m = mat('#6a3c8e', { roughness: 0.9, side: THREE.DoubleSide });
  g.add(mesh(new THREE.BoxGeometry(w, 0.03, d), m, V(x, topY + 0.015, z)));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(w, hang, 0.03), m, V(x, topY - hang / 2, z + s * (d / 2 + 0.015))));
  const gm = mat('#c9a040', { metalness: 0.5, roughness: 0.4 });
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(w, 0.04, 0.04), gm, V(x, topY - hang, z + s * (d / 2 + 0.02))));
  return g;
}

function buildSkull(pos, ry) {
  const g = new THREE.Group();
  const bone = mat('#e6d9bc', { roughness: 0.7 });
  const dark = mat('#2a2420');
  g.add(mesh(new THREE.SphereGeometry(0.24, 12, 8), bone, V(0, 0.24, 0), null, [1, 0.95, 1.1]));
  g.add(mesh(new THREE.BoxGeometry(0.28, 0.14, 0.22), bone, V(0, 0.08, 0.1)));
  for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.065, 8, 6), dark, V(s * 0.09, 0.2, 0.22)));
  g.add(mesh(new THREE.ConeGeometry(0.035, 0.08, 4), dark, V(0, 0.1, 0.25), [Math.PI, 0, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.18, 0.025, 0.02), dark, V(0, 0.04, 0.21)));
  g.position.copy(pos);
  g.rotation.y = ry;
  return g;
}

function buildCauldron(pos) {
  const g = new THREE.Group();
  const iron = mat('#4a5452', { roughness: 0.6, metalness: 0.1 });
  g.add(mesh(new THREE.SphereGeometry(0.58, 18, 10, 0, Math.PI * 2, Math.PI * 0.22, Math.PI * 0.78), iron, V(0, 0.48, 0), null, [1, 0.85, 1]));
  g.add(mesh(new THREE.TorusGeometry(0.46, 0.06, 8, 28), iron, V(0, 0.88, 0), [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.CircleGeometry(0.45, 24), mat('#6be04e', { emissive: '#3ed030', emissiveIntensity: 0.9 }), V(0, 0.85, 0), [-Math.PI / 2, 0, 0]));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.16, 6), iron, V(Math.sin(a) * 0.32, 0.06, Math.cos(a) * 0.32)));
  }
  for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.11, 0.03, 6, 12), iron, V(s * 0.58, 0.6, 0), [0, Math.PI / 2, 0]));
  // ladle
  const lad = mat('#3a3a3a', { metalness: 0.4, roughness: 0.5 });
  g.add(limb(V(0.05, 0.7, 0.05), V(-0.25, 1.35, 0.1), 0.03, 0.03, lad, 6));
  // steam
  const steam = mat('#dfe3e3', { transparent: true, opacity: 0.35, depthWrite: false });
  for (const [ph, sc] of [[0, 1], [2.2, 0.8]]) {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(V(Math.sin(t * 7 + ph) * 0.15 * sc, 0.95 + t * 1.15 * sc, Math.cos(t * 7 + ph) * 0.06)); }
    g.add(taperTube(pts, t => 0.1 * (1 - t) + 0.025, 24, 6, steam));
  }
  g.position.copy(pos);
  return g;
}

function buildProps() {
  const g = new THREE.Group();
  // ---- left-side table (-X): cauldron, skull, candles
  const yA = 3.38;
  g.add(table(-2.05, -0.4, 2.0, 1.15, yA));
  g.add(cloth(-2.6, -0.4, yA, 0.6, 1.15, 0.62));
  g.add(buildCauldron(V(-2.15, yA, -0.55)));
  g.add(buildSkull(V(-2.2, yA, 0.0), 0.15));
  g.add(candle(V(-2.78, yA, -0.05), 0.42));
  g.add(candle(V(-1.68, yA, 0.05), 0.14, 0.07));
  g.add(crystal(0.42, 0.08, '#3fbf78', V(-1.2, yA, -0.2), [0, 0, -0.15]));
  g.add(crystal(0.28, 0.06, '#3fbf78', V(-1.3, yA, -0.05), [0.2, 0, 0.3]));
  // books under the table
  g.add(book(0.95, 0.14, 0.65, '#3d6b3c', V(-2.05, 1.95, -0.3), 0.05));
  g.add(book(0.85, 0.13, 0.6, '#6b4a2e', V(-2.05, 2.09, -0.3), -0.1));

  // ---- right-side table (+X): books, candles, crystals
  const yB = 3.58;
  g.add(table(2.05, -0.25, 1.65, 1.0, yB));
  g.add(cloth(2.3, -0.25, yB, 0.6, 1.0, 0.5));
  g.add(book(0.95, 0.16, 0.66, '#6e3b2a', V(2.25, yB, -0.25), 0.15));
  g.add(book(0.85, 0.14, 0.6, '#5a3524', V(2.25, yB + 0.16, -0.25), -0.05));
  g.add(candle(V(2.35, yB + 0.3, -0.25), 0.82, 0.12));
  g.add(candle(V(2.02, yB + 0.3, -0.1), 0.42, 0.1));
  g.add(crystal(0.55, 0.09, '#d24fb0', V(1.62, yB, -0.1), [0, 0, 0.15]));
  g.add(crystal(0.32, 0.07, '#4fb0e0', V(1.8, yB, 0.05), [0.2, 0, -0.35]));
  // floor crystal cluster in front of the right table
  g.add(crystal(0.8, 0.12, '#3ec2c0', V(2.35, 1.95, 0.7), [0, 0, 0.05]));
  g.add(crystal(0.55, 0.1, '#4aa0e0', V(2.12, 1.95, 0.8), [0.1, 0, 0.5]));
  g.add(crystal(0.5, 0.1, '#3ec2a0', V(2.6, 1.95, 0.65), [0, 0, -0.5]));
  g.add(crystal(0.35, 0.08, '#8050d0', V(2.45, 1.95, 0.95), [0.5, 0, 0]));

  // ---- back props
  g.add(book(0.95, 0.15, 0.65, '#2f3e5a', V(-1.55, 1.95, -1.95), 0.3));
  g.add(book(0.9, 0.15, 0.6, '#7a5a2a', V(-1.55, 2.1, -1.95), 0.15));
  g.add(book(0.85, 0.14, 0.58, '#6b3a2a', V(-1.55, 2.25, -1.95), 0.4));
  g.add(crystal(0.3, 0.08, '#e04060', V(-1.55, 2.39, -1.95), [0.3, 0, 0.2]));
  g.add(crystal(0.55, 0.1, '#9a50e0', V(1.65, 1.95, -1.6), [0.15, 0, 0.1]));
  g.add(crystal(0.35, 0.08, '#b070f0', V(1.85, 1.95, -1.5), [0.2, 0, -0.5]));
  g.add(book(0.9, 0.3, 0.6, '#3d6b3c', V(2.2, 1.95, -0.85), 0.2));
  return g;
}

export default function createAlchemist() {
  const root = new THREE.Group();
  root.name = 'Alchemist';
  root.add(buildPlinth());
  root.add(buildWizard());
  root.add(buildArmillary());
  root.add(buildDragon());
  root.add(buildProps());
  return root;
}
export { createAlchemist };
