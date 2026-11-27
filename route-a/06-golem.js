// Stone golem in rune-etched iron armour.
// Built in "reference pixel" units (1 unit = 1 px of the 1024px turnaround sheet),
// then scaled so the whole figure is ~2 units tall. Stands on y = 0, faces +Z, up +Y.
//
// The figure is jointed (pelvis, waist, neck, shoulders, elbows, hips, knees, ankles)
// and animated procedurally:
//   group.userData.play('idle' | 'walk')   — choose animation (cross-fades)
//   group.userData.update(dt)              — advance by dt seconds
// The walk stays in place (walk on the spot); legs are driven by 2-bone IK so the
// stance foot stays planted on y = 0.
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
  // Joints ("pivots") remember their absolute rest position in body units (userData.abs),
  // so parts can still be placed with absolute body coordinates when parented to a joint.
  const off = (parent, p) => {
    const a = parent.userData.abs;
    return a ? [p[0] - a[0], p[1] - a[1], p[2] - a[2]] : p;
  };
  const add = (parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...off(parent, p)); m.rotation.set(...r); m.scale.set(...s);
    parent.add(m);
    return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const blob = (detail = 1) => new THREE.IcosahedronGeometry(1, detail);
  const sph = (ws = 10, hs = 8) => new THREE.SphereGeometry(1, ws, hs);
  const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const hexPlate = (r, d) => { const g = new THREE.CylinderGeometry(r, r, d, 6); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 6); return g; };
  const group = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...off(parent, p)); g.rotation.set(...r); parent.add(g); return g; };
  const pivot = (parent, abs, name) => { const g = group(parent, abs); g.userData.abs = abs; g.name = name; return g; };

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

  // ================= SKELETON =================
  // pelvisRoot: translates only (bob). Legs hang from it so IK stays in a fixed frame.
  // hips: yaw/roll of the pelvis; carries the waist -> chest -> neck/shoulders chain.
  const HIP_Y = 400;
  const pelvisRoot = pivot(body, [0, HIP_Y, 0], 'pelvisRoot');
  const hips = pivot(pelvisRoot, [0, HIP_Y, 0], 'hips');
  const chest = pivot(hips, [0, 470, 0], 'chest');
  const neck = pivot(chest, [0, 780, 40], 'neck');
  const J = { shoulder: {}, elbow: {}, hip: {}, knee: {}, ankle: {} };
  for (const s of [-1, 1]) {
    J.shoulder[s] = pivot(chest, [s * 245, 680, -35], 'shoulder' + s);
    J.elbow[s] = pivot(J.shoulder[s], [s * 290, 540, -20], 'elbow' + s);
    J.hip[s] = pivot(pelvisRoot, [s * 140, HIP_Y, 0], 'hip' + s);
    J.knee[s] = pivot(J.hip[s], [s * 150, 235, -5], 'knee' + s);
    J.ankle[s] = pivot(J.knee[s], [s * 158, 60, -8], 'ankle' + s);
  }

  // ================= TORSO =================
  const torso = chest;
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
  const head = group(neck, [0, 812, 100]);
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
    // pauldron rides on the chest; the arm swings underneath it
    const sh = group(chest, [s * 240, 745, -25]);
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
    const shoulder = J.shoulder[s], elbow = J.elbow[s];
    add(shoulder, sph(10, 8), M.stone, [s * 255, 585, -40], [0, 0, s * 0.15], [72, 115, 108]);
    add(elbow, blob(1), M.stoneDark, [s * 285, 510, -20], [0, 0, 0], [60, 50, 80]); // elbow
    add(chest, blob(1), M.stone, [s * 150, 540, -10], [0, 0, 0], [40, 80, 75]); // lat

    // forearm + bracer
    const fa = group(elbow, [s * 322, 435, -15], [0, 0, s * 0.14]);
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
    const hd = group(elbow, [s * 352, 312, 85]);
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
  add(hips, sph(10, 7), M.stone, [0, 405, 0], [0, 0, 0], [128, 85, 105]);
  add(hips, cyl(1, 1, 62, 12), M.leather, [0, 452, 5], [0, 0, 0], [132, 1, 112]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(hips, sph(5, 4), M.metal, [Math.sin(a) * 134, 452, 5 + Math.cos(a) * 114], [0, 0, 0], [6, 6, 6]);
  }
  add(hips, hexPlate(40, 20), M.metal, [0, 455, 118]);
  add(hips, hexPlate(31, 22), M.stone, [0, 455, 121]);
  rune(hips, R_RUNE.map(a => a.map(v => v * 0.8)), [0, 455, 133], [0, 0, 0], 6, 3);
  // loincloth (front) — hung from its top edge so it can sway
  const lcPivot = group(hips, [0, 425, 105]);
  const lc = new THREE.Shape();
  lc.moveTo(-62, 0); lc.lineTo(62, 0); lc.lineTo(48, -190); lc.lineTo(0, -218); lc.lineTo(-48, -190); lc.closePath();
  const lcg = new THREE.ExtrudeGeometry(lc, { depth: 8, bevelEnabled: false });
  add(lcPivot, lcg, M.cloth, [0, 0, 0], [0.06, 0, 0]);
  rune(lcPivot, [[-30, -60, 0, -110], [0, -110, 30, -60]].map(a => a), [0, 0, 9.5], [0.06, 0, 0], 4, 2).children.forEach(c => { c.material = M.leather; c.scale.z = 1; });
  // loincloth (back, dark)
  const lbPivot = group(hips, [0, 360, -95]);
  const lb = new THREE.Shape();
  lb.moveTo(-45, 0); lb.lineTo(45, 0); lb.lineTo(40, -150); lb.lineTo(0, -165); lb.lineTo(-40, -150); lb.closePath();
  add(lbPivot, new THREE.ExtrudeGeometry(lb, { depth: 6, bevelEnabled: false }), M.clothDark, [0, 0, 0], [-0.05, 0, 0]);

  // ================= LEGS =================
  for (const s of [-1, 1]) {
    const hip = J.hip[s], knee = J.knee[s], ankle = J.ankle[s];
    // tasset (hangs from the belt)
    add(hips, box(80, 135, 16), M.metal, [s * 150, 385, 55], [0, s * 0.6, s * 0.3]);
    add(hips, box(56, 105, 18), M.stone, [s * 150, 385, 57], [0, s * 0.6, s * 0.3]);
    // thigh
    add(hip, sph(10, 8), M.stone, [s * 132, 320, 0], [0, 0, s * -0.1], [70, 115, 88]);
    // knee pad
    add(knee, hexPlate(58, 28), M.metal, [s * 150, 235, 62], [-0.1, 0, 0]);
    add(knee, hexPlate(42, 32), M.metalLight, [s * 150, 235, 64], [-0.1, 0, 0]);
    // shin / boot
    add(knee, cyl(1, 1, 170, 9), M.stone, [s * 155, 160, -15], [0, 0, 0], [80, 1, 80]);
    add(knee, cyl(1, 1, 22, 9), M.metal, [s * 155, 205, -15], [0, 0, 0], [94, 1, 88]);
    add(knee, cyl(1, 1, 22, 9), M.metal, [s * 155, 95, -15], [0, 0, 0], [96, 1, 90]);
    // swirl ornament on outer shin
    add(knee, new THREE.TorusGeometry(16, 5, 4, 10, Math.PI * 1.6), M.metal, [s * 245, 125, -40], [0, Math.PI / 2, 0]);
    // foot
    add(ankle, box(196, 70, 240), M.stone, [s * 158, 35, -8]);
    add(ankle, box(170, 55, 40), M.stone, [s * 158, 30, 105], [0.3, 0, 0]); // toe
    add(ankle, box(190, 26, 40), M.metal, [s * 158, 62, 45], [0.25, 0, 0]); // strap
  }

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // ================= ANIMATION =================
  // Leg chain lengths / rest angles in the sagittal (YZ) plane.
  const kneeRest = J.knee[1].position, ankleRest = J.ankle[1].position;
  const L1 = Math.hypot(kneeRest.y, kneeRest.z), L2 = Math.hypot(ankleRest.y, ankleRest.z);
  const A1 = Math.atan2(kneeRest.z, -kneeRest.y), A2 = Math.atan2(ankleRest.z, -ankleRest.y);
  const ANKLE_Y = 60, ANKLE_Z = -8;          // rest ankle (abs body units)
  const HEEL = 128, TOE = 128, SOLE = 60;    // foot extents from ankle joint
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (u) => u * u * (3 - 2 * u);
  const lerp = THREE.MathUtils.lerp;

  // Lowest ankle height that keeps the sole above ground for a given pitch.
  const clearance = (p) => SOLE * Math.cos(p) + (p >= 0 ? TOE : HEEL) * Math.abs(Math.sin(p));

  // 2-bone IK: put ankle s at (zT, yT) (abs body units) with foot pitch p.
  const solveLeg = (s, zT, yT, p, bobY) => {
    const dy = yT - (HIP_Y + bobY), dz = zT;
    const d = clamp(Math.hypot(dy, dz), 60, (L1 + L2) * 0.999);
    const alpha = Math.atan2(dz, -dy);
    const beta = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const bend = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const phi1 = alpha + beta, phi2 = phi1 - bend; // forward angles from straight down
    const t1 = A1 - phi1, t2 = A2 - phi2 - t1;
    J.hip[s].rotation.x = t1;
    J.knee[s].rotation.x = t2;
    J.ankle[s].rotation.x = -(t1 + t2) + p;
  };

  // A pose is a flat set of numbers so idle and walk can be cross-faded.
  const POSE_KEYS = ['bob', 'hipYaw', 'hipRoll', 'chestX', 'chestY', 'chestZ', 'neckX', 'neckY', 'neckZ',
    'armX-1', 'armZ-1', 'elbow-1', 'armX1', 'armZ1', 'elbow1',
    'footZ-1', 'footY-1', 'footP-1', 'footZ1', 'footY1', 'footP1', 'cloth', 'glow'];

  const idlePose = (t) => {
    const br = Math.sin(t * 2 * Math.PI / 3.6);           // slow breath
    const sway = Math.sin(t * 2 * Math.PI / 7.0);         // weight shift
    const look = Math.sin(t * 2 * Math.PI / 9.0) + 0.4 * Math.sin(t * 2 * Math.PI / 4.1);
    const P = {
      bob: -14 - 4 * br, hipYaw: 0.02 * sway, hipRoll: 0.025 * sway,
      chestX: 0.04 + 0.025 * br, chestY: -0.03 * sway, chestZ: -0.03 * sway,
      neckX: -0.02 - 0.02 * br + 0.03 * Math.sin(t * 2 * Math.PI / 6.3), neckY: 0.18 * look, neckZ: 0.01 * sway,
      cloth: 0.02 * Math.sin(t * 1.3), glow: 1.3 + 0.25 * (0.5 + 0.5 * br),
    };
    for (const s of [-1, 1]) {
      P['armX' + s] = 0.03 * br + 0.03 * Math.sin(t * 1.1 + s);
      P['armZ' + s] = s * (0.03 + 0.03 * br);
      P['elbow' + s] = -0.12 - 0.04 * br;
      P['footZ' + s] = ANKLE_Z; P['footY' + s] = ANKLE_Y; P['footP' + s] = 0;
    }
    return P;
  };

  const WALK_PERIOD = 1.3;     // seconds per full stride (two steps)
  const STRIDE = 105;          // half stride length (body units)
  const STANCE = 0.6;          // fraction of cycle a foot is on the ground
  const LIFT = 55;

  // Foot trajectory for one leg at phase q in [0,1); q = 0 is heel strike.
  const footAt = (q) => {
    let z, y, p;
    if (q < STANCE) {
      const u = q / STANCE;
      z = ANKLE_Z + STRIDE * (1 - 2 * u);             // slides back under the body
      p = u < 0.15 ? lerp(-0.22, 0, smooth(u / 0.15))  // heel strike -> flat
        : u > 0.7 ? 0.38 * smooth((u - 0.7) / 0.3)     // heel off
          : 0;
      y = 0;
    } else {
      const u = (q - STANCE) / (1 - STANCE);
      // Hermite from back to front with end tangents matching the stance slide speed.
      const m = -2 * STRIDE * (1 - STANCE) / STANCE;
      const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u;
      const h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
      z = ANKLE_Z + h00 * -STRIDE + h10 * m + h01 * STRIDE + h11 * m;
      p = lerp(0.38, -0.22, smooth(u));
      y = LIFT * Math.sin(Math.PI * u) ** 1.3;
    }
    return { z, y: Math.max(ANKLE_Y + y, clearance(p) + (q < STANCE ? 0 : y)), p };
  };

  const walkPose = (ph) => {
    const w = 2 * Math.PI * ph;
    const P = {
      bob: -30 - 9 * Math.cos(2 * w),                    // lowest at each heel strike
      hipYaw: -0.09 * Math.cos(w), hipRoll: 0.04 * Math.sin(w),
      chestX: 0.09 + 0.02 * Math.cos(2 * w), chestY: 0.16 * Math.cos(w), chestZ: -0.05 * Math.sin(w),
      neckX: -0.06 - 0.02 * Math.cos(2 * w), neckY: -0.06 * Math.cos(w), neckZ: 0.04 * Math.sin(w),
      cloth: 0.12 * Math.sin(w), glow: 1.45 + 0.2 * (0.5 + 0.5 * Math.cos(2 * w)),
    };
    for (const s of [-1, 1]) {
      const q = (ph + (s > 0 ? 0 : 0.5)) % 1;
      const f = footAt(q);
      P['footZ' + s] = f.z; P['footY' + s] = f.y; P['footP' + s] = f.p;
      const legFwd = Math.cos(2 * Math.PI * q);         // +1 when this leg is forward
      P['armX' + s] = 0.32 * legFwd;                    // arm swings opposite its leg
      P['armZ' + s] = s * 0.05;
      P['elbow' + s] = -0.22 - 0.18 * Math.max(0, -legFwd);
    }
    return P;
  };

  const apply = (P) => {
    pelvisRoot.position.y = HIP_Y + P.bob;
    hips.rotation.set(0, P.hipYaw, P.hipRoll, 'YXZ');
    chest.rotation.set(P.chestX, P.chestY, P.chestZ, 'YXZ');
    neck.rotation.set(P.neckX, P.neckY, P.neckZ, 'YXZ');
    for (const s of [-1, 1]) {
      J.shoulder[s].rotation.set(P['armX' + s], 0, P['armZ' + s]);
      J.elbow[s].rotation.x = P['elbow' + s];
      solveLeg(s, P['footZ' + s], P['footY' + s], P['footP' + s], P.bob);
    }
    lcPivot.rotation.x = -0.6 * Math.abs(P.cloth);  // thigh pushes the front flap forward
    lbPivot.rotation.x = 0.5 * Math.abs(P.cloth);   // and the back flap backward
    M.glow.emissiveIntensity = P.glow;
  };

  const state = { clip: 'idle', time: 0, walkPhase: 0, weight: 0 }; // weight: 0 = idle, 1 = walk
  const BLEND = 0.35;

  root.userData.play = (name) => {
    if (name === 'idle' || name === 'walk') state.clip = name;
  };
  root.userData.update = (dt) => {
    dt = clamp(dt || 0, 0, 0.1);
    state.time += dt;
    state.walkPhase = (state.walkPhase + dt / WALK_PERIOD) % 1;
    const target = state.clip === 'walk' ? 1 : 0;
    const step = dt / BLEND;
    state.weight = target > state.weight ? Math.min(target, state.weight + step) : Math.max(target, state.weight - step);
    const k = smooth(state.weight);
    const A = idlePose(state.time);
    if (k <= 0) return apply(A);
    const B = walkPose(state.walkPhase);
    if (k >= 1) return apply(B);
    const P = {};
    for (const key of POSE_KEYS) P[key] = lerp(A[key], B[key], k);
    apply(P);
  };
  root.userData.update(0);

  return root;
}

export default createGolem;
