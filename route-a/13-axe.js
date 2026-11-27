import * as THREE from 'three';

// Double-bladed rune axe. Stands on y = 0, faces +Z, up +Y.
// Built from the 1024px turnaround: 1 px = 0.001 units, ground at pixel row 930,
// handle centre at pixel column 512.
const PX = (px, py) => [(px - 512) / 1000, (930 - py) / 1000];

const COL = {
  metal: 0x686c70,
  metalDark: 0x5a5e62,
  metalPanel: 0x44484c,
  metalLight: 0x8e9296,
  groove: 0x303336,
  rune: 0x26282a,
  wood: 0x7b5c35,
  woodEnd: 0x9d7a45,
  leather: 0x48291b,
  leatherLight: 0x5c3423,
  strap: 0x6e3b25,
};

function dbl(m) { m.side = THREE.DoubleSide; return m; }

function mat(color, rough = 0.6, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: false });
}

// Blade thickness (full, along Z) as a function of world x (abs) and y.
const BLADE_YC = 0.62;
function bladeThick(x, y) {
  const u = THREE.MathUtils.clamp((Math.abs(x) - 0.04) / 0.22, 0, 1);
  const v = THREE.MathUtils.clamp(Math.abs(y - BLADE_YC) / 0.225, 0, 1);
  return 0.004 + 0.05 * (1 - u) * (1 - Math.pow(v, 1.6));
}

// Extrude a pixel-space outline into a plate whose thickness follows bladeThick + extra.
function bladePlate(pixelPts, extra, material, mirror) {
  const shape = new THREE.Shape();
  pixelPts.forEach(([px, py], i) => {
    const [x, y] = PX(px, py);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 4 });
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = bladeThick(x, y) + extra;
    pos.setZ(i, (z - 0.5) * t);
    if (mirror) pos.setX(i, -x);
  }
  if (mirror) geo.index ? geo.index.array.reverse() : reverseWinding(geo);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function reverseWinding(geo) {
  const pos = geo.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < pos.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = (i + 1) * 3 + k, b = (i + 2) * 3 + k;
      const t = arr[a]; arr[a] = arr[b]; arr[b] = t;
    }
  }
  const uv = geo.attributes.uv;
  if (uv) {
    const u = uv.array;
    for (let i = 0; i < uv.count; i += 3) {
      for (let k = 0; k < 2; k++) {
        const a = (i + 1) * 2 + k, b = (i + 2) * 2 + k;
        const t = u[a]; u[a] = u[b]; u[b] = t;
      }
    }
  }
}

// Smooth a polyline by Catmull-Rom sampling (closed).
function smoothClosed(pts, perSeg = 4) {
  const v = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const curve = new THREE.SplineCurve([...v, v[0]]);
  return curve.getPoints(pts.length * perSeg).slice(0, -1).map((p) => [p.x, p.y]);
}

function scaleAbout(pts, k) {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.map(([x, y]) => [x < 552 ? x : cx + (x - cx) * k, cy + (y - cy) * k]);
}

// Right blade outline (front-image pixels), clockwise from socket top.
const BLADE_OUTLINE = [
  [548, 228], [575, 222], [598, 208], [616, 184], [627, 150], [633, 98],
  [662, 112], [698, 140], [728, 178], [748, 228], [758, 285], [760, 335],
  [752, 392], [734, 440], [705, 480], [672, 506], [640, 526],
  [630, 478], [615, 432], [596, 400], [572, 380], [548, 372],
];
// Raised rune band (inside the bright cutting-edge bevel).
const BAND_OUTLINE = [
  [550, 240], [585, 232], [612, 214], [632, 188], [645, 152],
  [680, 172], [708, 205], [726, 250], [733, 305], [730, 360],
  [716, 410], [694, 448], [662, 478], [645, 440], [624, 408],
  [600, 385], [550, 372],
];
// Recessed inner panel near the socket.
const PANEL_OUTLINE = [
  [550, 252], [590, 246], [620, 236], [648, 220], [665, 250], [668, 300],
  [662, 345], [645, 365], [620, 352], [590, 340], [550, 336],
];
// Raised "anvil" emboss in the panel.
const EMBOSS_OUTLINE = [
  [575, 262], [622, 262], [640, 248], [650, 262], [646, 290], [650, 322],
  [636, 330], [620, 318], [600, 318], [588, 300], [575, 300],
];

// Rune glyph layout along the band: [px, py, rotation, glyph type]
const RUNES = [
  [676, 218, -0.75, 0], [692, 243, -0.55, 1], [703, 272, -0.3, 2],
  [708, 304, -0.05, 3], [706, 334, 0.2, 1], [699, 358, 0.45, 0],
];
const GLYPHS = [
  // each stroke: [x, y, length, angle]  (units: px, relative to glyph centre)
  [[-4, 0, 26, 0], [3, 6, 12, 0.7], [3, -2, 12, 0.7]],      // F-like
  [[-5, 0, 26, 0], [5, 0, 26, 0], [0, 6, 14, -0.9]],        // M-like
  [[-4, 0, 26, 0], [3, 7, 12, -0.8], [3, -3, 12, 0.8]],     // R-like
  [[0, 0, 26, 0], [0, 4, 16, 0.9], [0, 4, 16, -0.9]],       // ᛉ-like
];

function buildBlade(group, mirror, mats) {
  const s = mirror ? -1 : 1;
  const outline = smoothClosed(BLADE_OUTLINE, 4);
  group.add(bladePlate(outline, 0, mats.metalLight, mirror));
  group.add(bladePlate(smoothClosed(scaleAbout(BAND_OUTLINE, 1.045), 4), 0.003, mats.groove, mirror));
  group.add(bladePlate(smoothClosed(BAND_OUTLINE, 4), 0.004, mats.metal, mirror));
  group.add(bladePlate(smoothClosed(scaleAbout(PANEL_OUTLINE, 1.06), 3), 0.0015, mats.groove, mirror));
  group.add(bladePlate(smoothClosed(PANEL_OUTLINE, 3), 0.002, mats.metalPanel, mirror));
  group.add(bladePlate(smoothClosed(EMBOSS_OUTLINE, 3), 0.006, mats.metalDark, mirror));

  // Engraved runes on both faces.
  const strokeGeo = new THREE.BoxGeometry(0.0045, 1, 0.0016);
  for (const [px, py, rot, g] of RUNES) {
    const [cx, cy] = PX(px, py);
    const zTop = (bladeThick(cx, cy) + 0.004) / 2;
    for (const face of [1, -1]) {
      for (const [sx, sy, len, ang] of GLYPHS[g]) {
        const m = new THREE.Mesh(strokeGeo, mats.rune);
        // glyphs on the back face are read mirrored relative to the front
        const lx = sx * face * s / 1000, ly = sy / 1000;
        const c = Math.cos(rot * s * face), sn = Math.sin(rot * s * face);
        m.position.set(s * cx + (lx * c - ly * sn), cy + (lx * sn + ly * c), face * zTop);
        m.scale.y = len / 1000;
        m.rotation.z = (rot + ang) * s * face;
        group.add(m);
      }
    }
  }
}

function buildHandle(mats) {
  const g = new THREE.Group();
  const yBot = 0.0, yTop = 0.76;
  const radial = 16, hSeg = 40;
  const geo = new THREE.CylinderGeometry(1, 1, 1, radial, hSeg, false);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  // centre offset (x) and radii by world height
  const cx = (y) => {
    if (y < 0.4) return -0.03 * Math.pow(1 - y / 0.4, 1.5);
    return 0.003 * Math.min(1, (y - 0.35) / 0.15);
  };
  const rx = (y) => {
    if (y < 0.03) return 0.05 - (0.012 * y) / 0.03;
    if (y < 0.35) return 0.04 - (0.012 * (y - 0.03)) / 0.32;
    return 0.028;
  };
  const rz = (y) => {
    if (y < 0.03) return 0.036;
    if (y < 0.35) return 0.034 - (0.006 * (y - 0.03)) / 0.32;
    return 0.028;
  };
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i);
    const y = yBot + t * (yTop - yBot);
    pos.setXYZ(i, cx(y) + pos.getX(i) * rx(y), y, pos.getZ(i) * rz(y));
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, mats.wood));

  // Flared, slanted butt knob below the wrap
  const knob = new THREE.Mesh(new THREE.SphereGeometry(1, radial, 8), mats.wood);
  knob.scale.set(0.056, 0.032, 0.04);
  knob.position.set(-0.028, 0.028, 0);
  knob.rotation.z = -0.35;
  g.add(knob);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(1, radial), mats.woodEnd);
  cap.rotation.set(Math.PI / 2, 0, -0.35, 'ZXY');
  cap.scale.set(0.046, 0.034, 1);
  cap.position.set(-0.03, 0.004, 0);
  g.add(cap);

  // Leather grip: underlay + overlapping tilted bands
  const yA = 0.03, yB = 0.345;
  const under = new THREE.CylinderGeometry(1, 1, yB - yA, radial, 12, true);
  const up = under.attributes.position;
  for (let i = 0; i < up.count; i++) {
    const y = up.getY(i) + (yA + yB) / 2;
    up.setXYZ(i, cx(y) + up.getX(i) * (rx(y) + 0.008), y, up.getZ(i) * (rz(y) + 0.007));
  }
  under.computeVertexNormals();
  g.add(new THREE.Mesh(under, mats.leather));

  const nBands = 9;
  for (let k = 0; k < nBands; k++) {
    const y = yA + 0.017 + (k * (yB - yA - 0.034)) / (nBands - 1);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.03, radial, 1, true), k % 2 ? mats.leather : mats.leatherLight);
    band.scale.set(rx(y) + 0.011, 1, rz(y) + 0.009);
    band.position.set(cx(y), y, 0);
    band.rotation.z = (k % 2 ? 1 : -1) * 0.22;
    band.material = k % 2 ? mats.leather : mats.leatherLight;
    g.add(band);
  }
  return g;
}

function buildHead(mats) {
  const g = new THREE.Group();
  // Socket block (rounded box)
  const W = 0.086, H = 0.17, D = 0.078;
  const sh = new THREE.Shape();
  const r = 0.008;
  sh.moveTo(-W / 2 + r, -H / 2);
  sh.lineTo(W / 2 - r, -H / 2); sh.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
  sh.lineTo(W / 2, H / 2 - r); sh.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2);
  sh.lineTo(-W / 2 + r, H / 2); sh.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - r);
  sh.lineTo(-W / 2, -H / 2 + r); sh.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
  const sock = new THREE.ExtrudeGeometry(sh, { depth: D - 0.01, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.004, bevelSegments: 2, curveSegments: 3 });
  sock.translate(0, 0, -(D - 0.01) / 2);
  const socket = new THREE.Mesh(sock, mats.metal);
  const yc = (930 - 288) / 1000;
  socket.position.set(0, yc, 0);
  g.add(socket);

  // Collars top and bottom of socket
  const [, yTopBand] = PX(0, 212);
  const [, yBotBand] = PX(0, 362);
  for (const [y, h] of [[yTopBand, 0.024], [yBotBand, 0.028]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(W + 0.01, h, D + 0.01), mats.metalDark);
    c.position.set(0, y, 0);
    g.add(c);
  }

  // Wooden end of the haft poking through the top
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.022, 16), mats.wood);
  plug.position.set(0, PX(0, 190)[1], 0);
  g.add(plug);

  // Top spike (faceted)
  const [, spikeBase] = PX(0, 180);
  const [, spikeTip] = PX(0, 65);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.029, spikeTip - spikeBase, 8), mats.metalLight);
  spike.position.set(0, (spikeBase + spikeTip) / 2, 0);
  g.add(spike);
  const spikeCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.027, 0.014, 8), mats.metalDark);
  spikeCollar.position.set(0, spikeBase + 0.004, 0);
  g.add(spikeCollar);

  // Crossed leather straps on front and back of socket
  const [ax, ay] = PX(472, 218), [bx, by] = PX(552, 352);
  const len = Math.hypot(bx - ax, by - ay) + 0.01;
  const ang = Math.atan2(by - ay, bx - ax);
  for (const face of [1, -1]) {
    for (const sgn of [1, -1]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.014, 0.006), mats.strap);
      s.position.set(0, yc, face * (D / 2 + 0.006));
      s.rotation.z = sgn * ang;
      g.add(s);
    }
    // straps wrap round the sides
    for (const side of [1, -1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.12, 0.014), mats.strap);
      w.position.set(side * (W / 2 + 0.005), yc, face * 0.022);
      g.add(w);
    }
  }
  return g;
}

export function createAxe() {
  const mats = {
    metal: mat(COL.metal, 0.5, 0.35),
    metalDark: mat(COL.metalDark, 0.5, 0.35),
    metalPanel: mat(COL.metalPanel, 0.6, 0.3),
    metalLight: mat(COL.metalLight, 0.4, 0.35),
    rune: mat(COL.rune, 0.8, 0.2),
    groove: mat(COL.groove, 0.7, 0.3),
    wood: mat(COL.wood, 0.85),
    woodEnd: mat(COL.woodEnd, 0.9),
    leather: dbl(mat(COL.leather, 0.75)),
    leatherLight: dbl(mat(COL.leatherLight, 0.75)),
    strap: mat(COL.strap, 0.7),
  };
  const axe = new THREE.Group();
  axe.name = 'RuneAxe';
  axe.add(buildHandle(mats));
  axe.add(buildHead(mats));
  const blades = new THREE.Group();
  buildBlade(blades, false, mats);
  buildBlade(blades, true, mats);
  axe.add(blades);
  return axe;
}

export default createAxe;
