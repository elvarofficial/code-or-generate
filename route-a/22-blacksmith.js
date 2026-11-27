// Dwarf blacksmith diorama: round rune-carved stone plinth, stone forge with
// chimney and fire, dwarf raising a hammer over an anvil, tool rack, two bellows.
// Asset stands on y = 0, faces +Z, up is +Y. Plinth radius ~1.
import * as THREE from 'three';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBlacksmith() {
  const root = new THREE.Group();
  root.name = 'blacksmith';
  const rand = rng(22);

  // ---------- materials ----------
  const M = (color, o = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.85, metalness: o.m ?? 0, flatShading: o.flat ?? true, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1 });
  const mat = {
    stoneA: M(0x8e8a84), stoneB: M(0x7c7872), stoneC: M(0x9c978e), stoneD: M(0x6e6a65),
    mortar: M(0x3a3430),
    baseStone: M(0x7d7468), baseDark: M(0x625a50), baseLight: M(0x958b7d),
    rune: M(0x3b342d),
    wood: M(0x734a2a), woodDark: M(0x523420), woodLight: M(0x8a5a33),
    leatherBellows: M(0x4f3a2e), leatherBellowsDark: M(0x3d2c22),
    metal: M(0x6c7077, { r: 0.45, m: 0.6 }), metalDark: M(0x45484d, { r: 0.5, m: 0.6 }),
    blade: M(0xa9afb5, { r: 0.3, m: 0.7 }), bladeDark: M(0x7d838a, { r: 0.35, m: 0.7 }),
    skin: M(0xdc9670, { flat: false, r: 0.7 }), skinDark: M(0xbd7656, { flat: false, r: 0.7 }),
    hair: M(0xc4541f, { flat: false, r: 0.8 }), hairDark: M(0xa0401a, { flat: false, r: 0.8 }),
    gold: M(0xc9a24a, { r: 0.4, m: 0.6 }),
    apron: M(0x6e4c33, { flat: false }), apronDark: M(0x56391f, { flat: false }),
    bracer: M(0x5c3a22, { flat: false }), pants: M(0x4d4c45, { flat: false }), boot: M(0x5e3b22, { flat: false }),
    eye: M(0x221a14, { flat: false }),
    coal: M(0x2c2422, { e: 0x401004 }),
    emberGlow: M(0x9a3008, { e: 0xb83a08 }),
    fireO: M(0xff7a1a, { e: 0xff5a00, ei: 1.2 }), fireY: M(0xffd23a, { e: 0xffb000, ei: 1.3 }),
    hotMetal: M(0xff8a2a, { e: 0xff6a10, ei: 1.3 }), hotTip: M(0xffe07a, { e: 0xffc040, ei: 1.3 }),
  };
  const stones = [mat.stoneA, mat.stoneB, mat.stoneC, mat.stoneD];
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  // ---------- helpers ----------
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const box = (p, w, h, d, m, x, y, z) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (p, rt, rb, h, seg, m, x, y, z) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
  const sph = (p, r, m, x, y, z, sx = 1, sy = 1, sz = 1, ws = 10, hs = 7) => {
    const s = add(p, new THREE.SphereGeometry(r, ws, hs), m, x, y, z);
    s.scale.set(sx, sy, sz);
    return s;
  };
  const Y = new THREE.Vector3(0, 1, 0);
  const orient = (mesh, a, b) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(Y, dir.clone().normalize());
    return mesh;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rod = (p, a, b, r, m, seg = 8) => orient(add(p, new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg), m), a, b);
  const limb = (p, a, b, r, m) => orient(add(p, new THREE.CapsuleGeometry(r, Math.max(0.001, a.distanceTo(b)), 3, 10), m), a, b);

  // Stone block covered box: dark core + individual bricks on the faces.
  function stoneMass(parent, cx, y0, cz, w, h, d, opt = {}) {
    const rh = opt.rh ?? 0.12, t = 0.035, gap = 0.014;
    const faces = opt.faces ?? ['front', 'back', 'left', 'right'];
    const holes = opt.holes ?? [];
    box(parent, w - 0.01, h, d - 0.01, mat.mortar, cx, y0 + h / 2, cz);
    if (opt.top) box(parent, w + 0.01, 0.03, d + 0.01, pick(stones), cx, y0 + h + 0.015, cz);
    const rows = Math.max(1, Math.round(h / rh));
    const rH = h / rows;
    for (const f of faces) {
      const along = f === 'front' || f === 'back' ? w + 2 * t : d;
      for (let r = 0; r < rows; r++) {
        let s = -along / 2 - (r % 2 ? 0.07 : 0);
        while (s < along / 2) {
          const len = 0.13 + rand() * 0.1;
          let a = Math.max(s, -along / 2), b = Math.min(s + len, along / 2);
          s += len;
          if (b - a < 0.03) continue;
          const yc = y0 + r * rH + rH / 2;
          const mid = (a + b) / 2;
          // world position of brick center
          let x, z;
          if (f === 'front') { x = cx + mid; z = cz + d / 2 + t / 2; }
          else if (f === 'back') { x = cx - mid; z = cz - d / 2 - t / 2; }
          else if (f === 'right') { x = cx + w / 2 + t / 2; z = cz - mid; }
          else { x = cx - w / 2 - t / 2; z = cz + mid; }
          let skip = false;
          for (const hl of holes) if (hl.face === f && mid > hl.a0 && mid < hl.a1 && yc > hl.y0 && yc < hl.y1) skip = true;
          if (skip) continue;
          const bw = b - a - gap, bh = rH - gap, bt = t + rand() * 0.012;
          const g = f === 'front' || f === 'back' ? new THREE.BoxGeometry(bw, bh, bt) : new THREE.BoxGeometry(bt, bh, bw);
          add(parent, g, pick(stones), x, yc, z);
        }
      }
    }
  }

  // Annular-sector voussoir stone, extruded along Z (front face at z = 0).
  function voussoir(parent, cx, cy, z, r0, r1, a0, a1, depth, m) {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
    s.absarc(0, 0, r1, a0, a1, false);
    s.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
    s.absarc(0, 0, r0, a1, a0, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 3 });
    g.translate(0, 0, -depth);
    add(parent, g, m, cx, cy, z);
  }

  // =====================================================================
  // PLINTH
  // =====================================================================
  const base = new THREE.Group();
  root.add(base);
  cyl(base, 1.0, 1.03, 0.1, 48, mat.baseDark, 0, 0.05, 0);
  cyl(base, 0.95, 0.96, 0.3, 48, mat.baseStone, 0, 0.25, 0);
  cyl(base, 0.985, 0.985, 0.045, 48, mat.baseLight, 0, 0.42, 0);
  cyl(base, 0.97, 0.98, 0.03, 48, mat.baseDark, 0, 0.115, 0);
  // upper ring of blocks + floor
  cyl(base, 0.84, 0.84, 0.16, 32, mat.baseDark, 0, 0.52, 0);
  const nRing = 24;
  for (let i = 0; i < nRing; i++) {
    const a = (i / nRing) * Math.PI * 2 + 0.05;
    const b = box(base, 0.205, 0.15 + rand() * 0.02, 0.14, pick([mat.baseStone, mat.baseLight, mat.stoneB]), Math.sin(a) * 0.865, 0.52, Math.cos(a) * 0.865);
    b.rotation.y = a;
  }
  // flagstones on the floor
  for (let gx = -0.7; gx <= 0.71; gx += 0.235) {
    for (let gz = -0.7; gz <= 0.71; gz += 0.235) {
      const ox = gx + (rand() - 0.5) * 0.04, oz = gz + (rand() - 0.5) * 0.04;
      if (Math.hypot(ox, oz) > 0.72) continue;
      const f = box(base, 0.215, 0.02, 0.215, pick([mat.baseStone, mat.baseLight, mat.stoneA]), ox, 0.605, oz);
      f.rotation.y = (rand() - 0.5) * 0.15;
    }
  }
  // front medallion plate
  box(base, 0.46, 0.36, 0.1, mat.baseLight, 0, 0.27, 0.95);
  box(base, 0.5, 0.04, 0.12, mat.baseStone, 0, 0.47, 0.95);
  const ring = add(base, new THREE.TorusGeometry(0.12, 0.018, 6, 28), mat.rune, 0, 0.27, 1.0);
  const ring2 = add(base, new THREE.TorusGeometry(0.15, 0.008, 4, 28), mat.rune, 0, 0.27, 1.0);

  // runes
  const G = {
    R: [[0, 0, 0, 1], [0, 1, 0.8, 0.75], [0.8, 0.75, 0, 0.5], [0, 0.5, 0.8, 0]],
    F: [[0, 0, 0, 1], [0, 0.75, 0.8, 1], [0, 0.45, 0.8, 0.7]],
    U: [[0, 0, 0, 1], [0, 1, 0.9, 0.7], [0.9, 0.7, 0.9, 0]],
    TH: [[0, 0, 0, 1], [0, 0.75, 0.8, 0.5], [0.8, 0.5, 0, 0.25]],
    K: [[0.9, 1, 0, 0.5], [0, 0.5, 0.9, 0]],
    X: [[0, 0, 1, 1], [0, 1, 1, 0]],
    Z: [[0.5, 0, 0.5, 1], [0.5, 0.6, 0, 1], [0.5, 0.6, 1, 1]],
    T: [[0.5, 0, 0.5, 1], [0.5, 1, 0, 0.7], [0.5, 1, 1, 0.7]],
    H: [[0.2, 0, 0.2, 1], [0.8, 0, 0.8, 1], [0.2, 0.65, 0.8, 0.35]],
    S: [[0.8, 1, 0.2, 0.6], [0.2, 0.6, 0.8, 0.4], [0.8, 0.4, 0.2, 0]],
    NG: [[0.5, 0, 1, 0.5], [1, 0.5, 0.5, 1], [0.5, 1, 0, 0.5], [0, 0.5, 0.5, 0]],
  };
  function rune(parent, glyph, w, h, th, m) {
    const g = new THREE.Group();
    for (const [x1, y1, x2, y2] of G[glyph]) {
      const ax = (x1 - 0.5) * w, ay = (y1 - 0.5) * h, bx = (x2 - 0.5) * w, by = (y2 - 0.5) * h;
      const L = Math.hypot(bx - ax, by - ay);
      const s = box(g, L + th, th, 0.012, m, (ax + bx) / 2, (ay + by) / 2, 0);
      s.rotation.z = Math.atan2(by - ay, bx - ax);
    }
    parent.add(g);
    return g;
  }
  const glyphs = Object.keys(G);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const th = side * (0.34 + i * 0.13);
      const g = rune(base, glyphs[(i * 3 + (side > 0 ? 1 : 5)) % glyphs.length], 0.065, 0.13, 0.017, mat.rune);
      g.position.set(Math.sin(th) * 0.958, 0.26, Math.cos(th) * 0.958);
      g.rotation.y = th;
    }
  }
  const rR = rune(base, 'R', 0.1, 0.16, 0.026, mat.rune);
  rR.position.set(0.01, 0.27, 1.0);

  // =====================================================================
  // FORGE
  // =====================================================================
  const forge = new THREE.Group();
  root.add(forge);
  const FX = -0.49, FZ = -0.5, FW = 0.78, FD = 0.6, FZF = FZ + FD / 2; // front face z
  // lower hearth block with wood store opening
  const woodA0 = 0.06, woodA1 = 0.38; // along front face, relative to FX
  stoneMass(forge, FX, 0.58, FZ, FW, 0.64, FD, {
    rh: 0.13,
    holes: [{ face: 'front', a0: woodA0, a1: woodA1, y0: 0.55, y1: 1.06 }],
  });
  // dark interior of the wood store
  box(forge, woodA1 - woodA0, 0.46, 0.04, mat.eye, FX + (woodA0 + woodA1) / 2, 0.82, FZF + 0.005);
  // arch stones over wood store
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI, a1 = ((i + 1) / 5) * Math.PI - 0.05;
    voussoir(forge, FX + (woodA0 + woodA1) / 2, 0.98, FZF + 0.04, 0.16, 0.22, a0 + 0.02, a1, 0.08, pick(stones));
  }
  // logs
  const logPos = [[-0.07, 0.66], [0.04, 0.66], [0.15, 0.66], [-0.02, 0.75], [0.09, 0.75], [0.03, 0.84]];
  for (const [lx, ly] of logPos) {
    const lg = cyl(forge, 0.05, 0.05, 0.34, 7, rand() > 0.5 ? mat.wood : mat.woodDark, FX + 0.22 + lx * 0.95, ly, FZF - 0.1);
    lg.rotation.x = Math.PI / 2;
    cyl(forge, 0.04, 0.04, 0.005, 7, mat.woodLight, FX + 0.22 + lx * 0.95, ly, FZF + 0.07).rotation.x = Math.PI / 2;
  }
  // ledge slab
  box(forge, FW + 0.1, 0.1, FD + 0.12, mat.stoneC, FX, 1.27, FZ + 0.03);
  // fire chamber: lower box part + half-cylinder dome
  const CY = 1.52, R = 0.39, OX = FX + 0.02;
  stoneMass(forge, FX, 1.32, FZ, FW, 0.2, FD, { rh: 0.1, faces: ['back', 'left', 'right'] });
  const dome = add(forge, new THREE.CylinderGeometry(R, R, FD - 0.2, 20, 1, false, Math.PI / 2, Math.PI), mat.stoneB, FX, CY, FZ - 0.1);
  dome.rotation.x = Math.PI / 2; // theta in [90,270] deg -> upper half after rotation
  // dome brick bands (stones on the curved surface)
  for (let k = 0; k < 4; k++) {
    const zz = FZ - FD / 2 + 0.08 + k * 0.15;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI + (k % 2 ? 0.2 : 0), a1 = a0 + Math.PI / n - 0.04;
      if (a1 > Math.PI) continue;
      voussoir(forge, FX, CY, zz + 0.07, R, R + 0.035, a0, a1, 0.13, pick(stones));
    }
  }
  // front arch rings
  const zf = FZF + 0.03;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI, a1 = ((i + 1) / 8) * Math.PI - 0.045;
    voussoir(forge, OX, CY, zf, 0.2, 0.295, a0 + 0.02, a1, 0.18, pick(stones));
  }
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI, a1 = ((i + 1) / 10) * Math.PI - 0.04;
    voussoir(forge, OX, CY, zf, 0.305, 0.405, a0 + 0.02, a1, 0.18, pick(stones));
  }
  // jambs
  for (const sx of [-1, 1]) {
    box(forge, 0.19, 0.095, 0.18, pick(stones), OX + sx * 0.305, 1.37, zf - 0.09);
    box(forge, 0.19, 0.095, 0.18, pick(stones), OX + sx * 0.3, 1.47, zf - 0.09);
  }
  // fire recess
  box(forge, 0.4, 0.2, 0.02, mat.emberGlow, OX, 1.42, zf - 0.17);
  const rec = add(forge, new THREE.CircleGeometry(0.2, 16, 0, Math.PI), mat.emberGlow, OX, CY, zf - 0.165);
  box(forge, 0.4, 0.04, 0.17, mat.coal, OX, 1.34, zf - 0.09);
  for (let i = 0; i < 12; i++) {
    const c = add(forge, new THREE.DodecahedronGeometry(0.03 + rand() * 0.015), rand() > 0.5 ? mat.fireO : mat.coal, OX + (rand() - 0.5) * 0.34, 1.37 + rand() * 0.02, zf - 0.03 - rand() * 0.12);
    c.rotation.set(rand() * 3, rand() * 3, 0);
  }
  // flames
  const flames = [[0, 0.3, 0.085, mat.fireO], [-0.09, 0.24, 0.07, mat.fireO], [0.1, 0.26, 0.07, mat.fireO], [0.16, 0.16, 0.05, mat.fireO], [-0.15, 0.15, 0.05, mat.fireO],
    [0, 0.22, 0.06, mat.fireY], [-0.07, 0.15, 0.045, mat.fireY], [0.08, 0.17, 0.045, mat.fireY]];
  for (const [fx, fh, fr, fm] of flames) {
    const fl = add(forge, new THREE.ConeGeometry(fr, fh, 7), fm, OX + fx, 1.36 + fh / 2, zf - (fm === mat.fireY ? 0.04 : 0.08));
    fl.rotation.z = -fx * 0.6;
  }
  // chimney + shoulder block
  stoneMass(forge, FX - 0.01, 1.6, FZ - 0.12, 0.6, 0.24, 0.4, { rh: 0.12, faces: ['back', 'left', 'right'] });
  stoneMass(forge, FX - 0.03, 1.84, FZ - 0.1, 0.46, 0.66, 0.4, { rh: 0.13, top: true });

  // =====================================================================
  // ANVIL
  // =====================================================================
  const anvil = new THREE.Group();
  anvil.position.set(0.25, 0.61, 0.5);
  root.add(anvil);
  const ext = (pts, depth, m) => {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
    g.translate(0, 0, -depth / 2);
    return add(anvil, g, m);
  };
  ext([[-0.3, 0], [-0.1, 0], [-0.07, 0.04], [0.07, 0.04], [0.1, 0], [0.3, 0], [0.2, 0.1], [-0.2, 0.1]], 0.4, mat.metalDark);
  ext([[-0.2, 0.1], [0.2, 0.1], [0.12, 0.2], [0.13, 0.3], [-0.13, 0.3], [-0.12, 0.2]], 0.17, mat.metal);
  ext([[-0.28, 0.33], [-0.15, 0.29], [0.3, 0.29], [0.4, 0.33], [0.42, 0.47], [-0.34, 0.47]], 0.28, mat.metal);
  const horn = add(anvil, new THREE.ConeGeometry(0.085, 0.24, 10), mat.metal, -0.45, 0.42, 0);
  horn.rotation.z = Math.PI / 2;
  horn.scale.set(1, 1, 0.9);
  box(anvil, 0.05, 0.01, 0.05, mat.eye, 0.33, 0.481, 0);

  // =====================================================================
  // DWARF
  // =====================================================================
  const dw = new THREE.Group();
  dw.position.set(0.15, 0.61, -0.02);
  root.add(dw);
  // boots
  for (const sx of [-1, 1]) {
    box(dw, 0.17, 0.13, 0.26, mat.boot, sx * 0.13, 0.065, 0.04);
    sph(dw, 0.088, mat.boot, sx * 0.13, 0.09, 0.14, 1, 0.75, 1);
    cyl(dw, 0.105, 0.1, 0.1, 12, mat.boot, sx * 0.13, 0.17, 0);
    cyl(dw, 0.092, 0.1, 0.3, 12, mat.pants, sx * 0.12, 0.34, 0);
  }
  sph(dw, 0.25, mat.pants, 0, 0.5, 0, 1, 0.6, 0.75);
  // torso
  sph(dw, 0.26, mat.skin, 0, 0.7, 0, 1, 0.85, 0.72);
  sph(dw, 0.3, mat.skin, 0, 0.92, -0.01, 1, 0.68, 0.66);
  for (const sx of [-1, 1]) sph(dw, 0.115, mat.skin, sx * 0.3, 0.97, -0.01);
  // belt
  cyl(dw, 0.265, 0.265, 0.07, 18, mat.bracer, 0, 0.56, 0).scale.z = 0.8;
  box(dw, 0.08, 0.07, 0.02, mat.gold, 0, 0.56, 0.22);
  // apron
  const skirt = box(dw, 0.44, 0.38, 0.03, mat.apron, 0, 0.42, 0.22);
  skirt.rotation.x = -0.08;
  box(dw, 0.2, 0.12, 0.012, mat.apronDark, 0, 0.42, 0.245).rotation.x = -0.08;
  box(dw, 0.27, 0.38, 0.03, mat.apron, 0, 0.78, 0.2);
  for (const sx of [-1, 1]) {
    const st = box(dw, 0.05, 0.3, 0.03, mat.apronDark, sx * 0.14, 1.0, 0.13);
    st.rotation.x = -0.6; st.rotation.z = sx * 0.15;
    const bk = box(dw, 0.055, 0.5, 0.02, mat.apronDark, 0, 0.82, -0.2);
    bk.rotation.z = sx * 0.62;
  }
  // back of apron skirt at hips (sides)
  box(dw, 0.5, 0.1, 0.36, mat.apron, 0, 0.5, 0).scale.set(1, 1, 1);
  // head
  const HY = 1.24;
  sph(dw, 0.15, mat.skin, 0, HY, 0.03, 1, 1.05, 1);
  sph(dw, 0.045, mat.skinDark, 0, HY - 0.01, 0.18);
  for (const sx of [-1, 1]) {
    sph(dw, 0.016, mat.eye, sx * 0.055, HY + 0.035, 0.155, 1, 1, 1, 6, 4);
    const brow = box(dw, 0.075, 0.03, 0.04, mat.hair, sx * 0.06, HY + 0.075, 0.14);
    brow.rotation.z = sx * -0.25;
    sph(dw, 0.04, mat.skinDark, sx * 0.15, HY, 0.02, 0.6, 1, 1);
  }
  const cap = add(dw, new THREE.SphereGeometry(0.165, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat.hair, 0, HY + 0.01, 0.01);
  cap.rotation.x = -0.55;
  sph(dw, 0.15, mat.hair, 0, HY - 0.1, -0.08, 1.05, 1.1, 0.7);
  // back braid
  for (let i = 0; i < 6; i++) sph(dw, 0.045 - i * 0.003, i % 2 ? mat.hairDark : mat.hair, 0, HY - 0.2 - i * 0.065, -0.17 - i * 0.008, 1, 1, 1, 8, 6);
  add(dw, new THREE.TorusGeometry(0.03, 0.01, 5, 10), mat.gold, 0, HY - 0.48, -0.21).rotation.x = Math.PI / 2;
  // beard
  sph(dw, 0.17, mat.hair, 0, HY - 0.15, 0.13, 1, 1.05, 0.62);
  for (const sx of [-1, 1]) {
    sph(dw, 0.085, mat.hair, sx * 0.11, HY - 0.06, 0.11);
    const mo = sph(dw, 0.06, mat.hairDark, sx * 0.065, HY - 0.06, 0.18, 1.4, 0.6, 0.7);
    mo.rotation.z = sx * -0.4;
    for (let i = 0; i < 3; i++) sph(dw, 0.035, i % 2 ? mat.hairDark : mat.hair, sx * 0.085, HY - 0.3 - i * 0.055, 0.2, 1, 1, 1, 8, 6);
    add(dw, new THREE.TorusGeometry(0.03, 0.01, 5, 10), mat.gold, sx * 0.085, HY - 0.33, 0.2).rotation.x = Math.PI / 2;
  }
  sph(dw, 0.12, mat.hair, 0, HY - 0.32, 0.2, 1, 0.9, 0.6);
  for (let i = 0; i < 4; i++) sph(dw, 0.045 - i * 0.004, i % 2 ? mat.hairDark : mat.hair, 0, HY - 0.43 - i * 0.06, 0.22, 1, 1, 1, 8, 6);
  add(dw, new THREE.TorusGeometry(0.035, 0.012, 5, 10), mat.gold, 0, HY - 0.47, 0.22).rotation.x = Math.PI / 2;
  // right arm (raised, character's right = -X)
  const rS = V(-0.31, 0.98, 0), rE = V(-0.48, 1.2, 0.1), rF = V(-0.4, 1.46, 0.24);
  limb(dw, rS, rE, 0.115, mat.skin);
  limb(dw, rE, rF, 0.085, mat.skin);
  rod(dw, rE.clone().lerp(rF, 0.45), rE.clone().lerp(rF, 0.85), 0.1, mat.bracer, 12);
  sph(dw, 0.075, mat.skin, rF.x, rF.y, rF.z);
  { const m = rS.clone().lerp(rE, 0.5); sph(dw, 0.13, mat.skin, m.x, m.y, m.z + 0.02, 1, 1, 1); }
  // hammer in raised hand
  const hDir = V(0.27, 0.32, -0.28).normalize();
  const hA = rF.clone().addScaledVector(hDir, -0.14), hB = rF.clone().addScaledVector(hDir, 0.24);
  rod(dw, hA, hB, 0.022, mat.wood);
  const hh = box(dw, 0.11, 0.22, 0.11, mat.metal, hB.x, hB.y, hB.z);
  hh.rotation.z = Math.atan2(hDir.y, hDir.x);
  // left arm (down, holding tongs)
  const lS = V(0.31, 0.98, 0), lE = V(0.46, 0.76, 0.0), lH = V(0.46, 0.56, 0.2);
  limb(dw, lS, lE, 0.115, mat.skin);
  limb(dw, lE, lH, 0.085, mat.skin);
  rod(dw, lE.clone().lerp(lH, 0.2), lE.clone().lerp(lH, 0.65), 0.1, mat.bracer, 12);
  sph(dw, 0.075, mat.skin, lH.x, lH.y, lH.z);
  { const m = lS.clone().lerp(lE, 0.45); sph(dw, 0.13, mat.skin, m.x, m.y, m.z + 0.02, 1, 1, 1); }

  // tongs + hot blade (world space)
  const tH = V(0.62, 1.17, 0.18), tJ = V(0.27, 1.13, 0.5);
  for (const off of [-0.015, 0.015]) rod(root, tH.clone().add(V(0, off, 0)).add(V(0.05, 0, -0.03)), tJ.clone().add(V(0, off * 1.6, 0)), 0.012, mat.metalDark, 6);
  const blade = box(root, 0.3, 0.02, 0.07, mat.hotMetal, 0.12, 1.095, 0.51);
  box(root, 0.12, 0.022, 0.06, mat.hotTip, 0.02, 1.097, 0.51);
  const tipG = add(root, new THREE.ConeGeometry(0.035, 0.08, 4), mat.hotTip, -0.07, 1.096, 0.51);
  tipG.rotation.z = Math.PI / 2; tipG.rotation.x = Math.PI / 4; tipG.scale.set(1, 1, 0.3);

  // =====================================================================
  // TOOL RACK
  // =====================================================================
  const RZ = -0.88;
  box(root, 0.1, 1.77, 0.1, mat.wood, 0.0, 0.6 + 1.77 / 2, RZ);
  box(root, 0.1, 1.47, 0.1, mat.wood, 1.02, 0.9 + 1.47 / 2, RZ);
  box(root, 1.36, 0.1, 0.07, mat.woodLight, 0.5, 2.2, RZ + 0.085);
  for (const px of [0.0, 1.02]) box(root, 0.12, 0.03, 0.12, mat.woodDark, px, 2.38, RZ);
  sph(root, 0.02, mat.metalDark, 1.1, 2.2, RZ + 0.125);
  const TZ = RZ + 0.15;
  // hanging sledge
  rod(root, V(0.11, 1.95, TZ), V(0.11, 2.3, TZ), 0.02, mat.wood);
  box(root, 0.2, 0.08, 0.08, mat.metal, 0.11, 2.29, TZ);
  // tongs on rack
  for (const tx of [0.3, 0.46]) {
    rod(root, V(tx - 0.012, 2.27, TZ), V(tx - 0.035, 1.85, TZ), 0.011, mat.metalDark, 6);
    rod(root, V(tx + 0.012, 2.27, TZ), V(tx + 0.035, 1.85, TZ), 0.011, mat.metalDark, 6);
    const hk = add(root, new THREE.TorusGeometry(0.035, 0.01, 5, 10, Math.PI), mat.metalDark, tx, 2.27, TZ - 0.03);
    hk.rotation.y = Math.PI / 2;
  }
  // swords
  function sword(x, top, L, w, guardW) {
    sph(root, 0.025, mat.metal, x, top, TZ);
    rod(root, V(x, top - 0.02, TZ), V(x, top - 0.16, TZ), 0.018, mat.woodDark);
    box(root, guardW, 0.03, 0.04, mat.metal, x, top - 0.18, TZ);
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, -(L - w)); s.lineTo(0, -L); s.lineTo(-w / 2, -(L - w)); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 });
    g.translate(0, 0, -0.006);
    add(root, g, mat.blade, x, top - 0.195, TZ);
    box(root, w * 0.22, L * 0.7, 0.026, mat.bladeDark, x, top - 0.2 - L * 0.38, TZ);
  }
  sword(0.62, 2.37, 0.5, 0.08, 0.14);
  sword(0.83, 2.38, 0.66, 0.11, 0.22);

  // =====================================================================
  // BELLOWS
  // =====================================================================
  const tear = (sc = 1) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.05 * sc);
    s.bezierCurveTo(-0.15 * sc, 0.09 * sc, -0.33 * sc, 0.2 * sc, -0.48 * sc, 0.19 * sc);
    s.bezierCurveTo(-0.64 * sc, 0.17 * sc, -0.64 * sc, -0.17 * sc, -0.48 * sc, -0.19 * sc);
    s.bezierCurveTo(-0.33 * sc, -0.2 * sc, -0.15 * sc, -0.09 * sc, 0, -0.05 * sc);
    s.closePath();
    return s;
  };
  const slab = (sc, t) => {
    const g = new THREE.ExtrudeGeometry(tear(sc), { depth: t, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(Math.PI / 2);
    g.translate(0, t, 0);
    return g;
  };
  function bellows(scale) {
    const b = new THREE.Group();
    add(b, slab(1, 0.035), mat.wood);
    const N = 5, ang = 0.5;
    for (let i = 0; i < N; i++) {
      const hinge = new THREE.Group();
      hinge.position.y = 0.03;
      hinge.rotation.z = -ang * (i + 0.5) / N;
      add(hinge, slab(i % 2 ? 0.93 : 0.86, 0.04), i % 2 ? mat.leatherBellows : mat.leatherBellowsDark);
      b.add(hinge);
    }
    const top = new THREE.Group();
    top.position.y = 0.035;
    top.rotation.z = -ang;
    b.add(top);
    add(top, slab(1, 0.035), mat.woodLight);
    box(top, 0.3, 0.025, 0.05, mat.wood, -0.72, 0.04, 0);
    for (const [sx, sz] of [[-0.45, 0.12], [-0.45, -0.12], [-0.15, 0.06], [-0.15, -0.06]]) sph(top, 0.014, mat.metalDark, sx, 0.04, sz, 1, 0.6, 1, 6, 4);
    box(b, 0.25, 0.025, 0.05, mat.wood, -0.7, 0.02, 0);
    box(b, 0.1, 0.1, 0.12, mat.metal, 0.02, 0.05, 0);
    const nz = add(b, new THREE.ConeGeometry(0.045, 0.18, 8), mat.metal, 0.15, 0.05, 0);
    nz.rotation.z = -Math.PI / 2;
    b.scale.setScalar(scale);
    return b;
  }
  // plank + stone support helper
  function bellowsStation(nx, nz, bx, bz, y, roll, scale, standX, standZ) {
    const yaw = Math.atan2(-(nz - bz), nx - bx);
    const len = Math.hypot(nx - bx, nz - bz);
    const pl = box(root, len + 0.1, 0.05, 0.3, mat.wood, (nx + bx) / 2, y - 0.025, (nz + bz) / 2);
    pl.rotation.y = yaw;
    const bl = bellows(scale);
    bl.position.set(nx - Math.cos(yaw) * 0.12, y, nz + Math.sin(yaw) * 0.12);
    bl.rotation.set(0, yaw, 0);
    bl.rotateX(roll);
    root.add(bl);
    stoneMass(root, standX, 0.6, standZ, 0.24, y - 0.65, 0.24, { rh: 0.13 });
  }
  bellowsStation(-0.66, 0.08, -1.38, 0.02, 0.9, 0.85, 1.0, -0.86, 0.05);
  bellowsStation(0.62, -0.25, 1.05, -0.98, 0.9, 0, 1.12, 0.78, -0.5);

  return root;
}

export default createBlacksmith;
