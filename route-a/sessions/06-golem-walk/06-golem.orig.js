// Stone golem in rune-etched iron armour.
// Built in "reference pixel" units (1 unit = 1 px of the 1024px turnaround sheet),
// then scaled so the whole figure is ~2 units tall. Stands on y = 0, faces +Z, up +Y.
import * as THREE from 'three';

export function createGolem() {
  const root = new THREE.Group();
  root.name = 'Golem';
  const body = new THREE.Group();
  body.scale.setScalar(1 / 450);
  root.add(body);

  // ---------- materials ----------
  const M = {
    stone: new THREE.MeshStandardMaterial({ color: 0x8f8c72, roughness: 0.95, flatShading: true }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x74715c, roughness: 0.95, flatShading: true }),
    metal: new THREE.MeshStandardMaterial({ color: 0x77727b, roughness: 0.55, metalness: 0.45, flatShading: true }),
    metalLight: new THREE.MeshStandardMaterial({ color: 0x9a959e, roughness: 0.5, metalness: 0.45, flatShading: true }),
    leather: new THREE.MeshStandardMaterial({ color: 0x6f4429, roughness: 0.85, flatShading: true }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x7a4d2c, roughness: 0.9, side: THREE.DoubleSide, flatShading: true }),
    clothDark: new THREE.MeshStandardMaterial({ color: 0x3e2a20, roughness: 0.9, side: THREE.DoubleSide }),
    glow: new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffa63a, emissiveIntensity: 1.3, roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 1 }),
  };

  // ---------- helpers ----------
  const add = (parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...p); m.rotation.set(...r); m.scale.set(...s);
    parent.add(m);
    return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const blob = (detail = 1) => new THREE.IcosahedronGeometry(1, detail);
  const sph = (ws = 10, hs = 8) => new THREE.SphereGeometry(1, ws, hs);
  const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const hexPlate = (r, d) => { const g = new THREE.CylinderGeometry(r, r, d, 6); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 6); return g; };
  const group = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); parent.add(g); return g; };

  // Rune: list of strokes [x1,y1,x2,y2] in a local plane (XY), glowing, facing +Z.
  const rune = (parent, strokes, p, r = [0, 0, 0], w = 7, depth = 4) => {
    const g = group(parent, p, r);
    for (const [x1, y1, x2, y2] of strokes) {
      const len = Math.hypot(x2 - x1, y2 - y1) + w;
      const m = add(g, box(len, w, depth), M.glow, [(x1 + x2) / 2, (y1 + y2) / 2, 0]);
      m.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    }
    return g;
  };
  const R_RUNE = [[-12, -22, -12, 22], [-12, 22, 10, 14], [10, 14, -8, 0], [-8, 0, 12, -22]];
  const ANGLE_RUNE = [[-16, -14, 0, 16], [0, 16, 16, -14], [16, -14, -6, -14]];
  const ZIG_RUNE = [[-10, 20, 10, 6], [10, 6, -10, -6], [-10, -6, 10, -20]];
  const SPIRAL_RUNE = [[-22, 22, 22, 22], [22, 22, 22, -22], [22, -22, -14, -22], [-14, -22, -14, 10], [-14, 10, 10, 10], [10, 10, 10, -10], [10, -10, 0, -10]];

  // ================= TORSO =================
  const torso = group(body);
  // rib cage / chest mass
  add(torso, sph(12, 9), M.stone, [0, 640, 10], [0, 0, 0], [180, 165, 150]);
  // abdomen
  add(torso, sph(10, 7), M.stone, [0, 500, 5], [0, 0, 0], [125, 100, 112]);
  // pectoral slabs
  for (const s of [-1, 1]) {
    add(torso, blob(1), M.stone, [s * 85, 640, 112], [0.1, s * 0.25, s * 0.08], [92, 72, 45]);
    // lateral rib plates
    add(torso, blob(1), M.stoneDark, [s * 120, 560, 70], [0, s * 0.5, 0], [55, 55, 50]);
    // abs
    for (let i = 0; i < 2; i++) add(torso, blob(0), M.stone, [s * 42, 540 - i * 50, 118 - i * 4], [0, 0, 0], [42, 26, 22]);
    // shoulder bolts
    add(torso, cyl(18, 18, 10, 8), M.leather, [s * 120, 668, 135], [Math.PI / 2 - 0.2, 0, 0]);
    add(torso, sph(6, 4), M.metal, [s * 120, 668, 141], [0, 0, 0], [7, 7, 7]);
  }
  // chest rune plate
  add(torso, hexPlate(42, 18), M.stone, [0, 610, 150], [-0.1, 0, 0]);
  rune(torso, R_RUNE, [0, 610, 160], [-0.1, 0, 0], 8, 4);
  // back plates
  add(torso, blob(1), M.stone, [0, 610, -120], [0, 0, 0], [80, 120, 45]);
  for (const s of [-1, 1]) {
    add(torso, blob(1), M.stoneDark, [s * 95, 580, -105], [0, s * 0.4, 0], [60, 90, 45]);
    // back leather straps from shoulders
    add(torso, box(150, 34, 12), M.leather, [s * 95, 715, -120], [0.25, s * -0.15, s * -0.55]);
    add(torso, sph(6, 4), M.metal, [s * 85, 700, -132], [0, 0, 0], [7, 7, 7]);
  }
  // neck collar ring
  add(torso, new THREE.TorusGeometry(88, 24, 6, 14), M.stone, [0, 775, 25], [-1.25, 0, 0], [1, 1, 1]);
  add(torso, cyl(60, 70, 70, 8), M.stoneDark, [0, 770, 40]);

  // ================= HEAD =================
  const head = group(body, [0, 812, 100]);
  add(head, box(108, 120, 105), M.stone, [0, 0, 0]);
  add(head, sph(8, 6), M.stone, [0, 50, -5], [0, 0, 0], [56, 40, 54]);
  add(head, box(112, 18, 22), M.stone, [0, 18, 52]); // brow
  add(head, box(26, 50, 22), M.stone, [0, 50, 50]); // forehead ridge
  add(head, box(80, 45, 70), M.stone, [0, -55, 22]); // jaw
  add(head, box(56, 6, 6), M.dark, [0, -40, 57]); // mouth
  add(head, box(16, 14, 6), M.dark, [0, -10, 57]); // nose shadow
  add(head, box(30, 22, 20), M.stone, [0, -12, 55]); // nose
  for (const s of [-1, 1]) {
    add(head, box(22, 8, 6), M.glow, [s * 24, 5, 54], [0, 0, s * -0.15]); // eyes
    add(head, box(20, 70, 90), M.stoneDark, [s * 52, -10, 0]); // cheeks
  }
  rune(head, [[0, -8, 0, 8]], [0, 55, 62], [0, 0, 0], 5, 3);

  // ================= PAULDRONS / ARMS =================
  for (const s of [-1, 1]) {
    const sh = group(body, [s * 240, 745, -25]);
    // dome, axis tilted up-and-outward
    const dg = group(sh, [s * -22, -35, -5], [0, 0, s * -0.5]);
    const dome = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    add(dg, dome, M.metal, [0, 0, 0], [0, 0, 0], [100, 150, 160]);
    // base rim of the dome
    add(dg, new THREE.TorusGeometry(1, 0.12, 4, 20), M.metalLight, [0, -22, 0], [Math.PI / 2, 0, 0], [102, 162, 150]);
    // arc bands along dome
    for (const [dy, sc] of [[60, 0.92], [105, 0.7]]) {
      const t = new THREE.TorusGeometry(1, 0.08, 4, 18, Math.PI);
      add(dg, t, M.metalLight, [0, dy * 0.45, 0], [0, Math.PI / 2, s * 0], [1, 150 * sc, 164 * sc]);
    }
    // high inner rim plate next to head
    add(sh, box(50, 205, 110), M.metalLight, [s * -80, 60, 25], [0, 0, s * -0.2]);
    // runes on outer face and front face
    rune(sh, ANGLE_RUNE, [s * 112, 20, 20], [0, s * Math.PI / 2, s * -0.2], 7, 4);
    rune(sh, [[-30, 0, -14, 0], [-4, 10, 10, -10], [-4, -10, 10, 10], [24, 10, 34, -10]], [s * 88, 95, 30], [0, s * Math.PI / 2, s * -0.75], 5, 4);
    rune(sh, ANGLE_RUNE, [s * 20, 15, 150], [0, s * 0.35, 0], 7, 4);
    // back triangle rune
    rune(sh, [[-14, 12, 14, 12], [14, 12, 0, -14], [0, -14, -14, 12]], [s * -5, 40, -140], [0, Math.PI + s * -0.3, 0], 6, 40);

    // upper arm
    add(body, sph(10, 8), M.stone, [s * 255, 585, -40], [0, 0, s * 0.15], [72, 115, 108]);
    add(body, blob(1), M.stoneDark, [s * 285, 510, -20], [0, 0, 0], [60, 50, 80]); // elbow
    add(body, blob(1), M.stone, [s * 150, 540, -10], [0, 0, 0], [40, 80, 75]); // lat

    // forearm + bracer
    const fa = group(body, [s * 322, 435, -15], [0, 0, s * 0.14]);
    add(fa, cyl(70, 60, 250, 10), M.stone, [0, -10, 0]);
    add(fa, cyl(0.82, 1, 255, 8), M.metal, [0, 0, 0], [0, 0, 0], [92, 1, 120]); // shell
    add(fa, cyl(1, 1, 24, 8), M.metalLight, [0, 122, 0], [0, 0, 0], [82, 1, 106]); // top rim
    add(fa, cyl(1, 1, 52, 8), M.leather, [0, 0, 0], [0, 0, 0], [98, 1, 126]); // leather wrap
    add(fa, cyl(1, 1, 26, 8), M.metalLight, [0, -60, 0], [0, 0, 0], [100, 1, 128]); // lower band
    add(fa, cyl(1, 1, 30, 8), M.metal, [0, -125, 0], [0, 0, 0], [96, 1, 124]); // cuff
    // outer raised plate
    add(fa, box(22, 220, 150), M.metalLight, [s * 90, -5, -5]);
    rune(fa, ZIG_RUNE, [s * 104, 45, 0], [0, s * Math.PI / 2, 0], 8, 4);
    rune(fa, SPIRAL_RUNE, [s * 104, -30, 20], [0, s * Math.PI / 2, 0], 6, 4);
    rune(fa, ZIG_RUNE, [s * 40, 50, 118], [0, s * 0.45, 0], 7, 4);

    // hand
    const hd = group(body, [s * 352, 312, 85]);
    add(hd, blob(1), M.stone, [0, 0, 0], [0, 0, 0], [62, 72, 88]); // palm
    for (let i = 0; i < 4; i++) {
      const z = 70 - i * 44;
      const f = group(hd, [s * 32, -50, z], [0.12 - i * 0.08, 0, s * -0.12]);
      add(f, box(40, 62, 38), M.stone, [0, -22, 0]);
      add(f, box(37, 48, 35), M.stoneDark, [s * -6, -68, 2], [0.15, 0, s * 0.2]);
    }
    const th = group(hd, [s * -55, 20, 50], [0.3, 0, s * 0.35]);
    add(th, box(36, 62, 38), M.stone, [0, -22, 0]);
    add(th, box(34, 40, 34), M.stoneDark, [0, -62, 4], [0.2, 0, 0]);
  }

  // ================= PELVIS / BELT =================
  add(body, sph(10, 7), M.stone, [0, 405, 0], [0, 0, 0], [128, 85, 105]);
  add(body, cyl(1, 1, 62, 12), M.leather, [0, 452, 5], [0, 0, 0], [132, 1, 112]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(body, sph(5, 4), M.metal, [Math.sin(a) * 134, 452, 5 + Math.cos(a) * 114], [0, 0, 0], [6, 6, 6]);
  }
  add(body, hexPlate(40, 20), M.metal, [0, 455, 118]);
  add(body, hexPlate(31, 22), M.stone, [0, 455, 121]);
  rune(body, R_RUNE.map(a => a.map(v => v * 0.8)), [0, 455, 133], [0, 0, 0], 6, 3);
  // loincloth (front)
  const lc = new THREE.Shape();
  lc.moveTo(-62, 0); lc.lineTo(62, 0); lc.lineTo(48, -190); lc.lineTo(0, -218); lc.lineTo(-48, -190); lc.closePath();
  const lcg = new THREE.ExtrudeGeometry(lc, { depth: 8, bevelEnabled: false });
  add(body, lcg, M.cloth, [0, 425, 105], [0.06, 0, 0]);
  rune(body, [[-30, -60, 0, -110], [0, -110, 30, -60]].map(a => a), [0, 425, 114.5], [0.06, 0, 0], 4, 2).children.forEach(c => { c.material = M.leather; c.scale.z = 1; });
  // loincloth (back, dark)
  const lb = new THREE.Shape();
  lb.moveTo(-45, 0); lb.lineTo(45, 0); lb.lineTo(40, -150); lb.lineTo(0, -165); lb.lineTo(-40, -150); lb.closePath();
  add(body, new THREE.ExtrudeGeometry(lb, { depth: 6, bevelEnabled: false }), M.clothDark, [0, 360, -95], [-0.05, 0, 0]);

  // ================= LEGS =================
  for (const s of [-1, 1]) {
    // tasset
    add(body, box(80, 135, 16), M.metal, [s * 150, 385, 55], [0, s * 0.6, s * 0.3]);
    add(body, box(56, 105, 18), M.stone, [s * 150, 385, 57], [0, s * 0.6, s * 0.3]);
    // thigh
    add(body, sph(10, 8), M.stone, [s * 132, 320, 0], [0, 0, s * -0.1], [70, 115, 88]);
    // knee pad
    add(body, hexPlate(58, 28), M.metal, [s * 150, 235, 62], [-0.1, 0, 0]);
    add(body, hexPlate(42, 32), M.metalLight, [s * 150, 235, 64], [-0.1, 0, 0]);
    // shin / boot
    add(body, cyl(1, 1, 170, 9), M.stone, [s * 155, 160, -15], [0, 0, 0], [80, 1, 80]);
    add(body, cyl(1, 1, 22, 9), M.metal, [s * 155, 205, -15], [0, 0, 0], [94, 1, 88]);
    add(body, cyl(1, 1, 22, 9), M.metal, [s * 155, 95, -15], [0, 0, 0], [96, 1, 90]);
    // swirl ornament on outer shin
    add(body, new THREE.TorusGeometry(16, 5, 4, 10, Math.PI * 1.6), M.metal, [s * 245, 125, -40], [0, Math.PI / 2, 0]);
    // foot
    add(body, box(196, 70, 240), M.stone, [s * 158, 35, -8]);
    add(body, box(170, 55, 40), M.stone, [s * 158, 30, 105], [0.3, 0, 0]); // toe
    add(body, box(190, 26, 40), M.metal, [s * 158, 62, 45], [0.25, 0, 0]); // strap
  }

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

export default createGolem;
