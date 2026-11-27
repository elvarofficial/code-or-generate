// Rusty hurricane (storm) lantern — procedural three.js asset.
// Stands on y = 0, faces +Z (filler cap at front), up is +Y. Height ≈ 0.30 m.
// Dimensions were measured in reference-sheet pixels (1024² sheet, base at
// y=955px, centre x=512px) and converted with S metres per pixel.
import * as THREE from 'three';

const S = 1 / 3000;               // metres per reference pixel
const Y = (py) => (955 - py) * S; // sheet y (px, down) -> world y
const R = (px) => px * S;         // sheet distance (px) -> metres

// ---------- procedural rust via vertex colours ----------
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    const wt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    r += wt * hash3(xi + dx, yi + dy, zi + dz);
  }
  return r;
}
function fbm(x, y, z) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, y * f, z * f); a *= 0.5; f *= 2.1; }
  return s;
}
const C_METAL = new THREE.Color(0x76655a);  // dark weathered steel
const C_BROWN = new THREE.Color(0x7d5038);  // brown rust
const C_RUST = new THREE.Color(0x96552c);   // bright orange rust
const C_GREY = new THREE.Color(0xa29a93);   // worn grey patches

function rustify(mesh, seed = 0) {
  const g = mesh.geometry;
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const k = 60;
    const n1 = fbm(v.x * k + seed, v.y * k, v.z * k);
    const n2 = fbm(v.x * k * 2.3 + 17, v.y * k * 2.3 + seed, v.z * k * 2.3);
    c.copy(C_METAL).lerp(C_BROWN, THREE.MathUtils.smoothstep(n1, 0.35, 0.6));
    c.lerp(C_RUST, THREE.MathUtils.smoothstep(n2, 0.58, 0.78) * 0.6);
    c.lerp(C_GREY, THREE.MathUtils.smoothstep(n1, 0.55, 0.75) * 0.65);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

export function createLantern() {
  const group = new THREE.Group();
  group.name = 'Lantern';

  const metal = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e1410, roughness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xf4f2ee, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.16,
    side: THREE.DoubleSide, depthWrite: false, emissive: 0xffe6c0, emissiveIntensity: 0.05,
  });
  const flameOuter = new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.85, depthWrite: false });
  const flameMid = new THREE.MeshBasicMaterial({ color: 0xffb640, transparent: true, opacity: 0.9, depthWrite: false });
  const flameInner = new THREE.MeshBasicMaterial({ color: 0xfff0a8 });
  const wickMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });

  const metalParts = [];
  const add = (geo, mat = metal, name) => {
    const m = new THREE.Mesh(geo, mat);
    if (name) m.name = name;
    group.add(m);
    if (mat === metal) metalParts.push(m);
    return m;
  };
  // lathe from [radiusPx, sheetYPx] pairs (listed bottom -> top or top -> bottom)
  const lathe = (pts, seg = 40) =>
    new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(R(r), Y(y))), seg);
  const cyl = (r, yTop, yBot, seg = 32, open = false) => {
    const g = new THREE.CylinderGeometry(R(r), R(r), (yBot - yTop) * S, seg, 1, open);
    g.translate(0, (Y(yTop) + Y(yBot)) / 2, 0);
    return g;
  };
  const tube = (ptsPx, r, seg = 64, closed = false, radial = 8) => {
    const curve = new THREE.CatmullRomCurve3(
      ptsPx.map(([x, y, z = 0]) => new THREE.Vector3(R(x), Y(y), R(z))), closed, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, seg, R(r), radial, closed);
  };

  // ---------- fuel tank / base ----------
  add(lathe([
    [0, 955], [190, 955], [191, 946], [184, 939], [170, 925], [162, 908], [160, 900],
    [158, 862], [152, 850], [135, 830], [108, 810], [82, 796], [68, 791], [66, 788],
    [66, 752], [0, 752],
  ], 48), metal, 'Tank');
  // horizontal seam bands on the tank
  add(new THREE.TorusGeometry(R(161), R(3), 6, 48).rotateX(Math.PI / 2).translate(0, Y(903), 0));
  add(new THREE.TorusGeometry(R(156), R(3), 6, 48).rotateX(Math.PI / 2).translate(0, Y(856), 0));

  // filler cap at the front of the tank shoulder, tilted forward
  {
    const cap = new THREE.Group();
    const knurl = new THREE.CylinderGeometry(R(36), R(36), R(26), 24);
    const top = new THREE.CylinderGeometry(R(30), R(34), R(10), 24).translate(0, R(18), 0);
    const neck = new THREE.CylinderGeometry(R(22), R(24), R(18), 16).translate(0, R(-20), 0);
    for (const g of [knurl, top, neck]) { const m = new THREE.Mesh(g, metal); cap.add(m); metalParts.push(m); }
    cap.position.set(0, Y(796), R(136));
    cap.rotation.x = THREE.MathUtils.degToRad(36);
    group.add(cap);
  }

  // globe base plate (gallery) and burner
  add(cyl(106, 733, 750, 40), metal, 'GalleryPlate');
  add(lathe([[0, 733], [36, 733], [34, 718], [28, 708], [0, 706]], 20), wickMat, 'Burner');

  // ---------- glass globe ----------
  add(lathe([
    [106, 732], [118, 718], [129, 698], [136, 660], [138, 620], [137, 580], [131, 540],
    [120, 505], [106, 480], [100, 468],
  ], 48), glass, 'Globe');

  // flame
  add(lathe([[0, 704], [22, 700], [40, 682], [45, 655], [38, 615], [24, 570], [10, 535], [0, 513]], 24),
    flameOuter, 'Flame');
  add(lathe([[0, 703], [20, 699], [34, 682], [37, 655], [29, 618], [15, 580], [0, 548]], 20), flameMid, 'FlameMid');
  add(lathe([[0, 702], [16, 698], [25, 682], [26, 660], [18, 630], [7, 600], [0, 585]], 20),
    flameInner, 'FlameCore');

  // soft glow around the flame
  add(new THREE.SphereGeometry(R(62), 20, 14).scale(1, 1.45, 1).translate(0, Y(632), 0),
    new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.14, depthWrite: false }), 'FlameGlow');

  // ---------- upper collar, chimney, hood ----------
  add(cyl(106, 455, 470, 40), metal, 'Collar');
  add(lathe([
    [104, 455], [96, 446], [82, 436], [76, 428], [76, 380], [122, 377], [124, 370],
    [122, 361], [100, 356], [98, 300], [103, 296], [103, 287], [98, 283], [98, 250],
    [90, 247], [62, 245],
  ], 40), metal, 'Hood');
  // chimney vent holes
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const h = new THREE.CylinderGeometry(R(9), R(9), R(4), 12).rotateX(Math.PI / 2)
      .translate(0, Y(404), R(75.5)).rotateY(a);
    add(h, dark);
  }
  // top vent: dark inner drum + posts
  add(cyl(60, 214, 247, 24), dark, 'VentInner');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(new THREE.BoxGeometry(R(22), (247 - 214) * S, R(8)).translate(0, Y(230.5), R(72)).rotateY(a));
  }
  add(cyl(78, 240, 247, 32), metal);          // lower vent rim
  add(lathe([[0, 176], [16, 177], [30, 183], [60, 194], [92, 201], [106, 205], [107, 212],
    [100, 215], [60, 215]], 40), metal, 'TopCap');
  add(cyl(16, 166, 182, 16), metal, 'TopKnob');

  // carry ring on top (in XY plane, seen face-on from the front)
  add(tube([
    [-14, 172], [-36, 140], [-50, 102], [-46, 78], [-26, 66], [0, 64], [26, 66], [46, 78],
    [50, 102], [36, 140], [14, 172],
  ], 6, 64, false, 8), metal, 'TopRing');

  // ---------- side frame tubes ----------
  const framePath = [
    [-90, 302], [-140, 298], [-172, 304], [-188, 326], [-192, 380], [-197, 480],
    [-205, 620], [-211, 720], [-207, 775], [-188, 808], [-160, 824], [-130, 826], [-100, 818],
  ];
  for (const side of [-1, 1]) {
    const g = tube(framePath.map(([x, y]) => [x * side, y]), 21, 96, false, 10);
    g.scale(1, 1, 1.3);
    add(g, metal, side < 0 ? 'FrameRight' : 'FrameLeft');
    // pivot loops at the top outer corners (ring axis along X)
    const loop = new THREE.TorusGeometry(R(19), R(5), 6, 20);
    loop.scale(0.55, 1.45, 1);
    loop.translate(R(194 * side), Y(300), 0);
    add(loop);
    // lower wire arms holding the gallery
    add(tube([[-196, 716], [-170, 716], [-150, 726], [-135, 742], [-110, 744]].map(([x, y]) => [x * side, y]),
      5, 24, false, 6));
  }

  // ---------- wire guard: two tilted hoops wrapping the globe ----------
  const globeR = (py) => {
    const prof = [[732, 106], [718, 118], [698, 129], [660, 136], [620, 138], [580, 137], [540, 131]];
    for (let i = 0; i < prof.length - 1; i++) {
      const [y0, r0] = prof[i], [y1, r1] = prof[i + 1];
      if (py <= y0 && py >= y1) return r0 + (r1 - r0) * (y0 - py) / (y0 - y1);
    }
    return 131;
  };
  for (const side of [-1, 1]) {
    const pts = [];
    const a0 = THREE.MathUtils.degToRad(-50), a1 = THREE.MathUtils.degToRad(230);
    const mid = Math.PI / 2;
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const a = a0 + (a1 - a0) * (i / N);
      const t = (a - mid) / (mid - a0);
      const py = 548 + 182 * t * t;
      const r = globeR(py) + 9;
      pts.push([side * r * Math.sin(a), py, r * Math.cos(a)]);
    }
    // feet bending into the gallery plate
    const first = pts[0], last = pts[pts.length - 1];
    pts.unshift([first[0] * 0.92, 744, first[2] * 0.92]);
    pts.push([last[0] * 0.92, 744, last[2] * 0.92]);
    add(tube(pts, 4.5, 140, false, 6), metal, 'GuardWire');
  }

  // ---------- bail handle, folded down behind the lantern ----------
  {
    const dir = new THREE.Vector3(0, -430, -213).normalize(); // in px space (y up)
    const L = 470;
    const uv = [
      [-194, 0], [-192, 0.25], [-182, 0.55], [-150, 0.8], [-90, 0.95], [0, 1.0],
      [90, 0.95], [150, 0.8], [182, 0.55], [192, 0.25], [194, 0],
    ];
    const pts = uv.map(([x, t]) => [x, 300 - dir.y * L * t, dir.z * L * t]);
    add(tube(pts, 4.5, 96, false, 6), metal, 'Bail');
  }

  group.updateMatrixWorld(true);
  for (const m of metalParts) rustify(m, 3);
  return group;
}

export default createLantern;
