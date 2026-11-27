// Wooden crate with iron corner brackets, keyhole plate (front), drop handle (sides)
// and name plate (back). Stands on y = 0, faces +Z, up +Y. Size ~1 unit.
import * as THREE from 'three';

// Reference sheets are 1024px; the crate is ~847px tall. Helpers convert pixel
// coordinates of a face view into face-local (u, v) units centred on the face.
const PX = 1 / 847;
const pu = (x) => (x - 512) * PX;          // image x -> local u
const pv = (y) => (511.5 - y) * PX;        // image y -> local v (face centre at world y = 0.5)

const H = 0.482;      // half extent of wood body in v (y) — top at y≈0.982
const W = 0.496;      // half extent of wood body in u / depth
const FRAME = 0.142;  // frame plank width
const FRAME_D = 0.05; // frame plank thickness (sits proud of panel)
const PANEL_D = 0.028;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function makeMaterials() {
  const woodTones = ['#c8793a', '#bb6d32', '#d0843f', '#b5662e', '#c47636'];
  const wood = woodTones.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }));
  return {
    wood,
    woodLight: new THREE.MeshStandardMaterial({ color: '#e3a05a', roughness: 0.8 }),
    gap: new THREE.MeshStandardMaterial({ color: '#4a2410', roughness: 1 }),
    grain: new THREE.MeshStandardMaterial({ color: '#7a3c18', roughness: 0.9 }),
    iron: new THREE.MeshStandardMaterial({ color: '#86837f', roughness: 0.6, metalness: 0.2 }),
    ironDark: new THREE.MeshStandardMaterial({ color: '#45403c', roughness: 0.55, metalness: 0.2 }),
    rivet: new THREE.MeshStandardMaterial({ color: '#6e6560', roughness: 0.45, metalness: 0.25 }),
    brace: new THREE.MeshStandardMaterial({ color: '#d68b45', roughness: 0.8 }),
    hole: new THREE.MeshBasicMaterial({ color: '#120c08' }),
  };
}

function bevelBox(w, h, d, b = 0.006) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + b, -h / 2 + b); s.lineTo(w / 2 - b, -h / 2 + b); s.lineTo(w / 2 - b, h / 2 - b); s.lineTo(-w / 2 + b, h / 2 - b);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1 });
  g.translate(0, 0, -d / 2 + b);
  return g;
}

// Plank box with a few thin grain streaks on its outer face.
function plank(mats, rand, w, h, d, vertical, group, x, y, z) {
  const m = mats.wood[Math.floor(rand() * mats.wood.length)];
  const mesh = new THREE.Mesh(bevelBox(w, h, d), m);
  mesh.position.set(x, y, z);
  group.add(mesh);
  const n = 2;
  for (let i = 0; i < n; i++) {
    const t = (rand() - 0.5) * 0.7;
    const len = (0.35 + rand() * 0.5) * (vertical ? h : w);
    const off = (rand() - 0.5) * ((vertical ? h : w) - len);
    const g = new THREE.Mesh(
      vertical ? new THREE.BoxGeometry(0.004, len, 0.002) : new THREE.BoxGeometry(len, 0.004, 0.002),
      rand() < 0.5 ? mats.grain : mats.woodLight,
    );
    g.position.set(
      x + (vertical ? t * w : off),
      y + (vertical ? off : t * h),
      z + d / 2 + 0.001,
    );
    group.add(g);
  }
}

// Sutherland–Hodgman clip of polygon against axis-aligned rect.
function clipRect(poly, x0, y0, x1, y1) {
  const edges = [
    (p) => p.x >= x0, (p) => p.x <= x1, (p) => p.y >= y0, (p) => p.y <= y1,
  ];
  const inter = [
    (a, b) => a.clone().lerp(b, (x0 - a.x) / (b.x - a.x)),
    (a, b) => a.clone().lerp(b, (x1 - a.x) / (b.x - a.x)),
    (a, b) => a.clone().lerp(b, (y0 - a.y) / (b.y - a.y)),
    (a, b) => a.clone().lerp(b, (y1 - a.y) / (b.y - a.y)),
  ];
  let out = poly;
  for (let e = 0; e < 4; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length];
      const ia = edges[e](a), ib = edges[e](b);
      if (ia && ib) out.push(b);
      else if (ia && !ib) out.push(inter[e](a, b));
      else if (!ia && ib) { out.push(inter[e](a, b)); out.push(b); }
    }
  }
  return out;
}

function extrude(points, depth, holes = [], bevel = 0) {
  const s = new THREE.Shape(points);
  holes.forEach((h) => s.holes.push(h));
  const geo = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 10,
  });
  return geo;
}

// Dark rim behind a flat piece: same outline grown by `grow` (via bevel), set just behind.
function rim(points, holes, mat, grow, z) {
  const m = new THREE.Mesh(extrude(points, 0.004, holes, grow), mat);
  m.position.z = z;
  return m;
}

// Diagonal brace across panel rect from (ax,ay) to (bx,by), clipped to rect.
function brace(mats, rand, rect, a, b, halfW, z, depth, group) {
  const dir = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
  const n = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(halfW);
  const ext = dir.clone().multiplyScalar(0.5);
  const A = a.clone().sub(ext), B = b.clone().add(ext);
  const poly = [A.clone().add(n), B.clone().add(n), B.clone().sub(n), A.clone().sub(n)];
  const clipped = clipRect(poly, rect[0], rect[1], rect[2], rect[3]);
  const m = new THREE.Mesh(extrude(clipped, depth), mats.brace);
  m.position.z = z;
  group.add(m);
  group.add(rim(clipped, [], mats.gap, 0.007, z - 0.004));
  // grain streaks along the brace
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.4 + rand() * 0.3, 0.004, 0.002), i ? mats.grain : mats.woodLight);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const off = (rand() - 0.5) * halfW * 1.2;
    g.position.set(mid.x + n.x / halfW * off, mid.y + n.y / halfW * off, z + depth + 0.001);
    g.rotation.z = Math.atan2(dir.y, dir.x);
    group.add(g);
  }
}

function rivet(mats, group, x, y, z, r = 0.024) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.rivet);
  m.rotation.x = Math.PI / 2;
  m.scale.set(1, 0.7, 1);
  m.position.set(x, y, z);
  group.add(m);
}

// Wood frame (rails + stiles) and inner panel planks for one face.
// Face-local: u = x, v = y, outward = +z, face surface at z = W.
function woodFace(mats, rand, kind) {
  const g = new THREE.Group();
  const zf = W - FRAME_D / 2;
  // rails full width
  plank(mats, rand, 2 * W, FRAME - 0.01, FRAME_D, false, g, 0, H - FRAME / 2, zf);
  plank(mats, rand, 2 * W, FRAME - 0.01, FRAME_D, false, g, 0, -H + FRAME / 2, zf);
  // stiles between rails
  const sh = 2 * H - 2 * FRAME;
  plank(mats, rand, FRAME - 0.01, sh - 0.006, FRAME_D, true, g, -W + FRAME / 2, 0, zf);
  plank(mats, rand, FRAME - 0.01, sh - 0.006, FRAME_D, true, g, W - FRAME / 2, 0, zf);
  // dark backing visible in seams
  const back = new THREE.Mesh(new THREE.BoxGeometry(2 * W - 0.01, 2 * H - 0.01, 0.01), mats.gap);
  back.position.z = W - FRAME_D - PANEL_D - 0.004;
  g.add(back);

  const iu = W - FRAME, iv = H - FRAME;
  const zp = W - FRAME_D - PANEL_D / 2 + 0.002;
  const gap = 0.012;
  if (kind === 'vertical') {
    const n = 5, pw = (2 * iu) / n;
    for (let i = 0; i < n; i++) plank(mats, rand, pw - gap, 2 * iv, PANEL_D, true, g, -iu + pw * (i + 0.5), 0, zp);
  } else {
    const n = 4, ph = (2 * iv) / n;
    for (let i = 0; i < n; i++) plank(mats, rand, 2 * iu, ph - gap, PANEL_D, false, g, 0, -iv + ph * (i + 0.5), zp);
  }
  return g;
}

// L-shaped iron bracket on a face corner (corner at +u,+v; mirrored by sx, sy).
function cornerL(mats, sx, sy) {
  const g = new THREE.Group();
  const L = 0.268, A = 0.13, c = 0.03; // leg length, arm width, inner chamfer
  const pts = [
    [0, 0], [-L, 0], [-L, -A + 0.01], [-A - c, -A], [-A, -A - c], [-A + 0.01, -L], [0, -L],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = extrude(pts, 0.016, [], 0.004);
  const m = new THREE.Mesh(geo, mats.iron);
  const ox = W + 0.012, oy = H + 0.012;
  m.position.set(0, 0, W);
  g.add(m);
  g.add(rim(pts, [], mats.ironDark, 0.006, W - 0.002));
  // rivets (pixel layout from reference, relative to outer corner)
  [[57, 61], [172, 60], [60, 175]].forEach(([dx, dy]) => rivet(mats, g, -dx * PX, -dy * PX, W + 0.022));
  g.children.forEach((ch) => { ch.position.x += ox; ch.position.y += oy; });
  g.scale.set(sx, sy, 1);
  return g;
}

// Narrow strap of the bracket that wraps onto a side face (rectangle), corner at +u,+v.
function cornerStrap(mats, sx, sy) {
  const g = new THREE.Group();
  const L = 0.268, A = 0.118;
  const pts = [[0, 0], [-A, 0], [-A, -L + 0.02], [-A + 0.02, -L], [0, -L]].map(([x, y]) => new THREE.Vector2(x, y));
  const m = new THREE.Mesh(extrude(pts, 0.012, [], 0.004), mats.iron);
  m.position.set(W + 0.012, H + 0.012, W);
  g.add(m);
  const rs = rim(pts, [], mats.ironDark, 0.006, W - 0.002);
  rs.position.x = W + 0.012; rs.position.y = H + 0.012;
  g.add(rs);
  g.scale.set(sx, sy, 1);
  return g;
}

function keyholePlate(mats) {
  const g = new THREE.Group();
  // shield outline from pixels: x 410..615, y 150..340
  const P = (x, y) => new THREE.Vector2(pu(x), pv(y));
  const outline = [P(412, 152), P(512, 158), P(613, 150), P(608, 300), P(560, 330), P(512, 342), P(462, 330), P(416, 302)];
  const hole = new THREE.Path();
  const cx = pu(511), cy = pv(213), r = 24 * PX;
  hole.moveTo(cx - 9 * PX, cy - 18 * PX);
  hole.absarc(cx, cy, r, -Math.PI / 2 - 0.38, Math.PI * 1.5 + 0.38, true);
  hole.lineTo(cx + 9 * PX, cy - 18 * PX);
  hole.lineTo(cx + 20 * PX, pv(287));
  hole.lineTo(cx - 20 * PX, pv(287));
  hole.closePath();
  const plate = new THREE.Mesh(extrude(outline, 0.016, [hole], 0.005), mats.iron);
  plate.position.z = W;
  g.add(plate);
  g.add(rim(outline, [], mats.ironDark, 0.009, W - 0.002));
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(70 * PX, 110 * PX), mats.hole);
  dark.position.set(cx, pv(245), W + 0.013);
  g.add(dark);
  [[441, 183], [580, 182], [442, 293], [578, 292]].forEach(([x, y]) => rivet(mats, g, pu(x), pv(y), W + 0.024, 0.018));
  return g;
}

function backPlate(mats) {
  const g = new THREE.Group();
  const P = (x, y) => new THREE.Vector2(pu(x), pv(y));
  const outline = [P(387, 440), P(512, 444), P(638, 438), P(640, 588), P(512, 584), P(386, 590)];
  const m = new THREE.Mesh(extrude(outline, 0.014, [], 0.005), mats.iron);
  m.position.z = W - FRAME_D + 0.004;
  g.add(m);
  g.add(rim(outline, [], mats.ironDark, 0.009, W - FRAME_D + 0.002));
  [[415, 468], [605, 468], [415, 560], [605, 560]].forEach(([x, y]) => rivet(mats, g, pu(x), pv(y), W - FRAME_D + 0.026, 0.017));
  return g;
}

function handle(mats) {
  const g = new THREE.Group();
  const P = (x, y) => new THREE.Vector2(pu(x), pv(y));
  const z0 = W - FRAME_D + 0.004;
  const bp = [P(347, 335), P(490, 333), P(512, 342), P(534, 333), P(678, 333), P(680, 422), P(345, 424)];
  const plate = new THREE.Mesh(extrude(bp, 0.022, [], 0.005), mats.ironDark);
  plate.position.z = z0;
  g.add(plate);
  // lugs
  [428, 592].forEach((x) => {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(44 * PX, 56 * PX, 0.034), mats.iron);
    lug.position.set(pu(x), pv(378), z0 + 0.036);
    g.add(lug);
  });
  const x0 = pu(375), x1 = pu(645), y0 = pv(385), y1 = pv(515);
  return { g, x0, x1, y0, y1, z0 };
}

function buildHandle(mats) {
  const { g, x0, x1, y0, y1, z0 } = handle(mats);
  const r = 0.05;
  const V = (x, y) => new THREE.Vector3(x, y, 0);
  const pts = [];
  const addArc = (cx, cy, a0, a1) => { for (let i = 0; i <= 5; i++) { const a = a0 + (a1 - a0) * (i / 5); pts.push(V(cx + r * Math.cos(a), cy + r * Math.sin(a))); } };
  addArc(x1 - r, y0 - r, Math.PI / 2, 0);
  addArc(x1 - r, y1 + r, 0, -Math.PI / 2);
  addArc(x0 + r, y1 + r, -Math.PI / 2, -Math.PI);
  addArc(x0 + r, y0 - r, Math.PI, Math.PI / 2);
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.1);
  const ring = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.02, 8, true), mats.iron);
  // ring hangs from the lugs, tilted slightly outward at the bottom
  const pivot = new THREE.Group();
  pivot.position.set(0, y0, z0 + 0.035);
  ring.position.y = -y0;
  pivot.add(ring);
  pivot.rotation.x = 0.12;
  g.add(pivot);
  return g;
}

export function createCrate() {
  const mats = makeMaterials();
  const rand = rng(7);
  const crate = new THREE.Group();
  crate.name = 'crate';
  const body = new THREE.Group();
  body.position.y = 0.5;
  crate.add(body);

  // hidden core so there is no see-through at corners
  const core = new THREE.Mesh(new THREE.BoxGeometry(2 * (W - 0.09), 2 * (H - 0.09), 2 * (W - 0.09)), mats.gap);
  body.add(core);

  // faces: [rotation setter, panel kind, extras]
  const faces = [
    { rot: (o) => {}, kind: 'vertical', extra: (f) => {
      // X braces: BL->TR on top, TL->BR underneath
      const iu = W - FRAME, iv = H - FRAME;
      const rect = [-iu, -iv, iu, iv];
      const zb = W - FRAME_D;
      brace(mats, rand, rect, new THREE.Vector2(-iu, iv), new THREE.Vector2(iu, -iv), 0.058, zb - 0.002, 0.034, f);
      brace(mats, rand, rect, new THREE.Vector2(-iu, -iv), new THREE.Vector2(iu, iv), 0.06, zb + 0.01, 0.038, f);
      f.add(keyholePlate(mats));
    } },
    { rot: (o) => { o.rotation.y = Math.PI / 2; }, kind: 'vertical', extra: (f) => f.add(buildHandle(mats)) },
    { rot: (o) => { o.rotation.y = Math.PI; }, kind: 'horizontal', extra: (f) => f.add(backPlate(mats)) },
    { rot: (o) => { o.rotation.y = -Math.PI / 2; }, kind: 'vertical', extra: (f) => f.add(buildHandle(mats)) },
  ];

  faces.forEach((F, i) => {
    const f = woodFace(mats, rand, F.kind);
    F.rot(f);
    F.extra(f);
    // front/back get L brackets, sides get straps
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      f.add(i % 2 === 0 ? cornerL(mats, sx, sy) : cornerStrap(mats, sx, sy));
    }
    body.add(f);
  });

  // top & bottom: frame + planks (no hardware)
  const top = woodFace(mats, rand, 'horizontal');
  top.rotation.x = -Math.PI / 2;
  top.scale.set(1, W / H, (H) / W); // fit square top: local v spans depth
  top.position.y = 0; // face plane at local z=W -> world y=W*scale
  body.add(top);
  const bottom = woodFace(mats, rand, 'horizontal');
  bottom.rotation.x = Math.PI / 2;
  bottom.scale.set(1, W / H, H / W);
  body.add(bottom);

  return crate;
}

export default createCrate;
