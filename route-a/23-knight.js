// Mounted knight on a rearing armored horse, standing on a round stone pedestal.
// Asset stands on y = 0, faces +Z, up is +Y. Units: ~1 unit = 1/10 of total height.
import * as THREE from 'three';

const V3 = THREE.Vector3;

// ---------- procedural canvas textures (no downloaded images) ----------
function canvasTex(w, h, draw, repeat) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

const BLUE = '#3d6588', RED = '#a8383a', GOLD = '#e2c27a', GOLD_D = '#a57f32';

function drawLion(g, s) {
  // stylised rampant lion, facing image-left, drawn in a 1x1 box scaled by s
  g.save(); g.scale(s, s);
  g.fillStyle = GOLD; g.strokeStyle = GOLD; g.lineCap = 'round'; g.lineJoin = 'round';
  // body
  g.beginPath(); g.ellipse(0.5, 0.55, 0.13, 0.24, -0.35, 0, Math.PI * 2); g.fill();
  // mane + head
  g.beginPath(); g.arc(0.42, 0.28, 0.13, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0.31, 0.3, 0.08, 0.05, 0.2, 0, Math.PI * 2); g.fill();
  // legs
  g.lineWidth = 0.065;
  g.beginPath(); g.moveTo(0.45, 0.45); g.lineTo(0.26, 0.42); g.lineTo(0.18, 0.33); g.stroke();
  g.beginPath(); g.moveTo(0.45, 0.55); g.lineTo(0.28, 0.6); g.lineTo(0.22, 0.52); g.stroke();
  g.beginPath(); g.moveTo(0.55, 0.72); g.lineTo(0.42, 0.86); g.lineTo(0.3, 0.88); g.stroke();
  g.beginPath(); g.moveTo(0.6, 0.7); g.lineTo(0.66, 0.88); g.lineTo(0.56, 0.93); g.stroke();
  // tail
  g.lineWidth = 0.035;
  g.beginPath(); g.moveTo(0.62, 0.68); g.quadraticCurveTo(0.85, 0.65, 0.78, 0.4); g.quadraticCurveTo(0.74, 0.3, 0.84, 0.25); g.stroke();
  g.restore();
}

function drawGriffin(g, s) {
  g.save(); g.scale(s, s);
  g.fillStyle = '#efe0b8'; g.strokeStyle = '#efe0b8'; g.lineCap = 'round';
  g.beginPath(); g.ellipse(0.5, 0.58, 0.18, 0.12, -0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(0.3, 0.42, 0.08, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(0.24, 0.42); g.lineTo(0.12, 0.47); g.lineTo(0.25, 0.48); g.fill(); // beak
  // wing
  g.beginPath(); g.moveTo(0.45, 0.5); g.lineTo(0.55, 0.15); g.lineTo(0.62, 0.3); g.lineTo(0.72, 0.18);
  g.lineTo(0.7, 0.38); g.lineTo(0.8, 0.32); g.lineTo(0.62, 0.55); g.closePath(); g.fill();
  g.lineWidth = 0.05;
  g.beginPath(); g.moveTo(0.38, 0.6); g.lineTo(0.25, 0.7); g.stroke();
  g.beginPath(); g.moveTo(0.45, 0.66); g.lineTo(0.4, 0.85); g.stroke();
  g.beginPath(); g.moveTo(0.62, 0.66); g.lineTo(0.66, 0.86); g.stroke();
  g.lineWidth = 0.03;
  g.beginPath(); g.moveTo(0.66, 0.6); g.quadraticCurveTo(0.9, 0.62, 0.86, 0.8); g.stroke();
  g.restore();
}

function makeTextures() {
  const cloth = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
    g.strokeStyle = RED; g.lineWidth = 10;
    for (let i = -2; i <= 2; i++) { g.lineWidth = 8;
      g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128 + 256, 256); g.stroke();
      g.beginPath(); g.moveTo(i * 128 + 256, 0); g.lineTo(i * 128, 256); g.stroke();
    }
    // hem (bottom of the texture = v 0)
    g.fillStyle = RED; g.fillRect(0, h - 34, w, 34);
    g.fillStyle = GOLD_D; g.fillRect(0, h - 38, w, 4);
  }, [1, 1]);
  const shield = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
    g.fillStyle = RED; g.fillRect(w * 0.62, 0, w * 0.38, h);
    g.fillRect(0, 0, w * 0.16, h);
    g.translate(w * 0.1, h * 0.16); drawLion(g, w * 0.78);
  });
  const banner = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = BLUE; g.fillRect(0, 0, w, h);
    g.fillStyle = RED;
    g.beginPath(); g.moveTo(0, h * 0.35); g.lineTo(w * 0.45, h); g.lineTo(0, h); g.fill();
    g.beginPath(); g.moveTo(w * 0.42, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.55); g.lineTo(w * 0.62, h * 0.55); g.fill();
    g.fillStyle = GOLD; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.save(); g.translate(w * 0.1, h * 0.05); drawGriffin(g, h * 0.9); g.restore();
  });
  const peytral = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#a9b0ba'; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0.2)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = GOLD_D; g.fillRect(0, h - 16, w, 16); g.fillRect(0, 0, w, 10);
    // rivets
    g.fillStyle = '#8c9096';
    for (let x = 12; x < w; x += 32) { g.beginPath(); g.arc(x, 20, 3, 0, 7); g.fill(); }
    // fleur-de-lis in the centre
    g.save(); g.translate(w / 2, h * 0.5); g.fillStyle = '#d4ac52';
    g.beginPath(); g.moveTo(0, -60); g.quadraticCurveTo(20, -20, 0, 30); g.quadraticCurveTo(-20, -20, 0, -60); g.fill();
    for (const sx of [-1, 1]) {
      g.beginPath(); g.moveTo(0, 10); g.quadraticCurveTo(sx * 60, -40, sx * 44, 10); g.quadraticCurveTo(sx * 30, 0, 0, 25); g.fill();
    }
    g.fillRect(-28, 18, 56, 10);
    g.beginPath(); g.moveTo(-8, 28); g.lineTo(0, 60); g.lineTo(8, 28); g.fill();
    g.restore();
  });
  const cobble = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6e685e'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = 110 + ((x * 37 + y * 53) % 40);
      g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
      const ox = (y % 2) * 16;
      g.fillRect(x * 32 + 3 + ox - 16, y * 32 + 3, 27, 26);
    }
  });
  return { cloth, shield, banner, peytral, cobble };
}

// ---------- geometry helpers ----------
function seg(parent, a, b, r1, r2, mat, radial = 10) {
  const A = new V3(...a), B = new V3(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, radial, 1), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), B.clone().sub(A).normalize());
  parent.add(m);
  return m;
}

function sph(parent, p, r, mat, scale = [1, 1, 1], ws = 10, hs = 7, rot) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
  m.position.set(...p); m.scale.set(...scale);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  return m;
}

// tapered tube along a smooth curve through pts; radii given per control point
function taper(parent, pts, radii, mat, radial = 10, segs = 0, flat = [1, 1]) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(...p)));
  const n = segs || pts.length * 4;
  const fr = curve.computeFrenetFrames(n, false);
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const P = curve.getPointAt(t);
    const f = t * (radii.length - 1), k = Math.min(Math.floor(f), radii.length - 2);
    const r = radii[k] + (radii[k + 1] - radii[k]) * (f - k);
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const nx = Math.cos(a) * flat[0], ny = Math.sin(a) * flat[1];
      pos.push(
        P.x + (fr.normals[i].x * nx + fr.binormals[i].x * ny) * r,
        P.y + (fr.normals[i].y * nx + fr.binormals[i].y * ny) * r,
        P.z + (fr.normals[i].z * nx + fr.binormals[i].z * ny) * r);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
    idx.push(a, c, b, b, c, d);
  }
  // caps
  for (const [ring, pt, flip] of [[0, curve.getPointAt(0), true], [n, curve.getPointAt(1), false]]) {
    const ci = pos.length / 3; pos.push(pt.x, pt.y, pt.z);
    for (let j = 0; j < radial; j++) {
      const a = ring * radial + j, b = ring * radial + (j + 1) % radial;
      if (flip) idx.push(ci, b, a); else idx.push(ci, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  parent.add(m);
  return m;
}

// hanging cloth / plate band around an elliptical vertical axis.
// theta measured from +Z toward +X.  top(z,theta) / bottom(z,theta) give the edge heights.
function skirt(parent, o, mat) {
  const { cx = 0, cz, rx, rz, th0, th1, top, bottom, n = 24, rows = 4, flare = 0 } = o;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const th = th0 + (th1 - th0) * (i / n);
    const sx = Math.sin(th), cz_ = Math.cos(th);
    const z0 = cz + rz * cz_;
    const yt = top(z0, th), yb = bottom(z0, th);
    for (let r = 0; r <= rows; r++) {
      const v = r / rows; // 0 bottom, 1 top
      const f = 1 + flare * (1 - v);
      pos.push(cx + rx * sx * f, yb + (yt - yb) * v, cz + rz * cz_ * f);
      uv.push((i / n) * (o.uRep || 1), v * (o.vRep || 1));
    }
  }
  for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
    const a = i * (rows + 1) + r, b = a + 1, c = a + rows + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  parent.add(m);
  return m;
}

function heaterShape(w, h, inset = 0) {
  const s = new THREE.Shape();
  const hw = w / 2 - inset, top = h / 2 - inset, bot = -h / 2 + inset * 1.4;
  s.moveTo(-hw, top);
  s.lineTo(hw, top);
  s.lineTo(hw, top - h * 0.3);
  s.quadraticCurveTo(hw * 0.95, bot + h * 0.25, 0, bot);
  s.quadraticCurveTo(-hw * 0.95, bot + h * 0.25, -hw, top - h * 0.3);
  s.closePath();
  return s;
}

// ---------- main ----------
export function createKnight() {
  const root = new THREE.Group();
  root.name = 'MountedKnight';
  const T = makeTextures();

  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xaab1bb, metalness: 0.6, roughness: 0.32 }),
    steelD: new THREE.MeshStandardMaterial({ color: 0x8e949c, metalness: 0.55, roughness: 0.4 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd2a447, metalness: 0.6, roughness: 0.35 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x6a4126, roughness: 0.75 }),
    horse: new THREE.MeshStandardMaterial({ color: 0x6b4630, roughness: 0.7 }),
    hoof: new THREE.MeshStandardMaterial({ color: 0x2f2520, roughness: 0.6 }),
    chain: new THREE.MeshStandardMaterial({ color: 0x5d6066, metalness: 0.5, roughness: 0.65 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.8 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x6e665d, roughness: 0.85 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 0.9 }),
    stoneD: new THREE.MeshStandardMaterial({ color: 0x6f685d, roughness: 0.9 }),
    cobble: new THREE.MeshStandardMaterial({ color: 0x857d70, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.7 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9a3233, roughness: 0.7 }),
    cloth: new THREE.MeshStandardMaterial({ color: T.cloth ? 0xffffff : 0x3d6588, map: T.cloth, roughness: 0.85, side: THREE.DoubleSide }),
    shieldFace: new THREE.MeshStandardMaterial({ color: T.shield ? 0xffffff : 0x3d6588, map: T.shield, roughness: 0.55, metalness: 0.1 }),
    banner: new THREE.MeshStandardMaterial({ color: T.banner ? 0xffffff : 0x3d6588, map: T.banner, roughness: 0.8, side: THREE.DoubleSide }),
    peytral: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.peytral, metalness: 0.5, roughness: 0.32, side: THREE.DoubleSide }),
    cobbleTop: new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.cobble, roughness: 0.95 }),
  };

  buildPedestal(root, M);
  buildHorse(root, M);
  buildKnight(root, M);
  buildLance(root, M);
  buildShield(root, M);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}

export default createKnight;

// ---------- pedestal ----------
function buildPedestal(root, M) {
  const g = new THREE.Group(); g.name = 'Pedestal'; root.add(g);
  const prof = [[0, 0], [1.7, 0], [1.74, 0.05], [1.73, 0.13], [1.66, 0.2], [1.57, 0.24], [1.55, 0.3], [1.6, 0.48], [1.62, 0.62], [1.6, 0.78],
    [1.56, 0.92], [1.6, 0.96], [1.63, 1.04], [1.62, 1.12], [1.56, 1.17], [1.52, 1.22], [1.5, 1.26], [0, 1.26]];
  const lathe = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 40);
  g.add(new THREE.Mesh(lathe, M.stone));
  // top disc with cobble pattern
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), M.cobbleTop);
  top.rotation.x = -Math.PI / 2; top.position.y = 1.262; g.add(top);
  // scroll reliefs on the drum
  const R = 1.615;
  const nOrn = 6;
  for (let k = 0; k < nOrn; k++) {
    const thc = (k / nOrn) * Math.PI * 2 + Math.PI / 6;
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        const r = 0.2 * (1 - 0.75 * t);
        const a = side * (t * Math.PI * 2.0) + (side > 0 ? Math.PI : 0);
        const u = side * 0.2 + r * Math.cos(a);
        const v = 0.61 + side * 0.05 + r * Math.sin(a) * 1.0;
        const th = thc + u / R;
        pts.push(new V3(Math.sin(th) * R, v, Math.cos(th) * R));
      }
      // tail of the scroll reaching to the neighbour
      const tailPts = [];
      for (let i = 0; i <= 8; i++) {
        const u = side * (0.2 + 0.02) + side * i * 0.045;
        const v = 0.61 + side * 0.05 - side * 0.2 * Math.cos(i / 8 * Math.PI * 0.5);
        const th = thc + u / R;
        tailPts.push(new V3(Math.sin(th) * R, v, Math.cos(th) * R));
      }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.04, 4), M.stoneD));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 6, 0.035, 4), M.stoneD));
    }
  }
}

// ---------- horse ----------
function buildHorse(root, M) {
  const g = new THREE.Group(); g.name = 'Horse'; root.add(g);
  // body (tilted up toward the front: rearing)
  sph(g, [0, 4.3, 0.05], 1, M.horse, [0.6, 0.62, 1.55], 18, 12, [-0.29, 0, 0]);
  // neck
  taper(g, [[0, 4.6, 0.95], [0, 5.5, 1.6], [0, 6.25, 2.15]], [0.55, 0.44, 0.32], M.chain, 12);
  // crinet: steel shell over the top of the neck, banded with gold
  taper(g, [[0, 4.72, 0.8], [0, 5.62, 1.45], [0, 6.35, 2.02]], [0.55, 0.44, 0.31], M.steel, 12);
  {
    const neck = new THREE.CatmullRomCurve3([new V3(0, 4.72, 0.8), new V3(0, 5.62, 1.45), new V3(0, 6.35, 2.02)]);
    const rr = [0.53, 0.48, 0.43, 0.38, 0.34];
    [0.12, 0.3, 0.48, 0.66, 0.84].forEach((t, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr[i] + 0.02, 0.028, 4, 16), M.gold);
      ring.position.copy(neck.getPointAt(t));
      ring.quaternion.setFromUnitVectors(new V3(0, 0, 1), neck.getTangentAt(t));
      g.add(ring);
    });
  }
  // head: poll -> muzzle, pointing forward/down
  taper(g, [[0, 6.45, 2.3], [0, 5.95, 2.6], [0, 5.4, 2.82]], [0.33, 0.29, 0.22], M.horse, 12, 0, [1, 0.85]);
  sph(g, [0, 5.32, 2.8], 0.2, M.horse, [1, 0.9, 1.1]);
  // chanfron (face plate)
  const chan = sph(g, [0, 5.95, 2.78], 1, M.steel, [0.36, 0.66, 0.16], 14, 10, [-0.45, 0, 0]);
  // gold trim on chanfron
  const trim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 4, 24), M.gold);
  trim.position.copy(chan.position); trim.scale.set(0.36, 0.66, 0.3); trim.rotation.set(-0.45, 0, 0);
  g.add(trim);
  // spike on the forehead
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 8), M.steelD);
  spike.position.set(0, 6.2, 3.05); spike.rotation.x = Math.PI / 2 - 0.25; g.add(spike);
  // ears
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 6), M.horse);
    ear.position.set(sx * 0.2, 6.65, 2.28); ear.rotation.set(-0.3, 0, -sx * 0.35); g.add(ear);
    sph(g, [sx * 0.3, 6.05, 2.58], 0.07, M.dark);
    const eg = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 12), M.gold);
    eg.position.set(sx * 0.31, 6.05, 2.58); eg.rotation.y = Math.PI / 2; g.add(eg);
    // nostrils
    sph(g, [sx * 0.09, 5.22, 2.98], 0.04, M.dark);
    // bridle ring
    const br = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 10), M.gold);
    br.position.set(sx * 0.2, 5.4, 2.7); br.rotation.y = Math.PI / 2; g.add(br);
  }
  // reins to the saddle
  for (const sx of [-1, 1]) seg(g, [sx * 0.2, 5.4, 2.7], [sx * 0.3, 5.35, 0.35], 0.018, 0.018, M.leather, 4);

  // peytral (chest plate) with pointed lower edge
  skirt(g, {
    cz: 0.95, rx: 0.82, rz: 0.85, th0: -1.55, th1: 1.55, n: 28, rows: 3,
    top: (z, th) => 4.7 + (z - 0.95) * 0.15,
    bottom: (z, th) => 3.85 - 0.3 * Math.pow(Math.cos(th), 6),
  }, M.peytral);
  // gold trim on peytral bottom
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const th = -1.55 + 3.1 * i / 24;
    pts.push(new V3(0.83 * Math.sin(th), 3.85 - 0.3 * Math.pow(Math.cos(th), 6), 0.95 + 0.86 * Math.cos(th)));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 5), M.gold));

  // caparison: front panels (left & right), rear wrap
  for (const sg of [-1, 1]) {
    skirt(g, {
      cz: 0.95, rx: 0.8, rz: 0.9, th0: sg * 0.55, th1: sg * 2.0, n: 10, rows: 2, flare: 0.12, uRep: 2, vRep: 1,
      top: (z) => 4.0 + (z - 0.4) * 0.3,
      bottom: (z) => 2.75 + (z - 0.4) * 0.45,
    }, M.cloth);
  }
  skirt(g, {
    cz: -0.85, rx: 0.86, rz: 0.95, th0: 0.6, th1: Math.PI * 2 - 0.6, n: 24, rows: 2, flare: 0.06, uRep: 7,
    top: () => 3.9,
    bottom: (z) => 2.3 + (z + 1.85) * 0.3,
  }, M.cloth);

  // crupper: armored dome over the hindquarters
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, Math.PI, Math.PI, 0, 1.95), M.steel);
  dome.position.set(0, 3.9, -0.55); dome.scale.set(1.0, 1.05, 1.15); g.add(dome);
  dome.material.side = THREE.DoubleSide;
  // gold bands on the crupper (rings around the tail axis)
  for (const s of [0.35, 0.65, 0.92]) {
    const p = [];
    const c = Math.sqrt(1 - s * s);
    for (let i = 0; i <= 20; i++) {
      const a = -0.35 + (Math.PI + 0.7) * i / 20;
      p.push(new V3(1.01 * s * Math.cos(a), 3.9 + 1.06 * s * Math.sin(a), -0.55 - 1.16 * c));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 30, 0.03, 5), M.gold));
  }
  // lower edge trim of the crupper
  {
    const p = [];
    for (let i = 0; i <= 24; i++) {
      const phi = Math.PI + Math.PI * i / 24;
      p.push(new V3(-Math.cos(phi) * Math.sin(1.95) * 1.01, 3.9 + Math.cos(1.95) * 1.05, -0.55 + Math.sin(phi) * Math.sin(1.95) * 1.16));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 30, 0.035, 5), M.gold));
  }

  // tail (a few strands)
  taper(g, [[0, 4.2, -1.65], [0, 3.95, -2.1], [-0.05, 3.4, -2.55], [-0.15, 2.85, -2.95]], [0.2, 0.26, 0.22, 0.05], M.tail, 8);
  taper(g, [[0.04, 4.1, -1.7], [0.05, 3.7, -2.2], [0.02, 3.1, -2.5], [-0.12, 2.5, -2.75]], [0.16, 0.2, 0.15, 0.03], M.tail, 8);
  taper(g, [[-0.04, 4.1, -1.7], [-0.06, 3.6, -2.1], [-0.18, 2.95, -2.35], [-0.42, 2.35, -2.5]], [0.14, 0.17, 0.12, 0.03], M.tail, 8);

  // front legs (raised)
  const frontLegs = [
    { x: 0.27, sh: [4.25, 1.45], kn: [3.4, 2.25], fe: [2.8, 1.9], ho: [2.6, 1.98] },
    { x: -0.27, sh: [4.45, 1.6], kn: [3.95, 2.5], fe: [3.25, 2.35], ho: [3.05, 2.25] },
  ];
  for (const L of frontLegs) {
    const P = (yz) => [L.x, yz[0], yz[1]];
    taper(g, [P(L.sh), P(L.kn)], [0.2, 0.12], M.horse, 8);
    sph(g, P(L.kn), 0.12, M.horse);
    taper(g, [P(L.kn), P(L.fe)], [0.1, 0.085], M.horse, 8);
    sph(g, P(L.fe), 0.1, M.horse);
    seg(g, P(L.fe), P(L.ho), 0.11, 0.09, M.hoof, 8);
  }
  // hind legs (standing on the pedestal)
  const hind = [
    { x: 0.42, hip: [3.8, -1.05], st: [3.0, -0.8], hk: [2.15, -1.25], fe: [1.55, -0.85], ho: [1.27, -0.68] },
    { x: -0.42, hip: [3.8, -1.15], st: [3.0, -0.95], hk: [2.15, -1.4], fe: [1.55, -1.05], ho: [1.27, -0.9] },
  ];
  for (const L of hind) {
    const P = (yz) => [L.x, yz[0], yz[1]];
    taper(g, [P(L.hip), P(L.st), P(L.hk)], [0.32, 0.22, 0.12], M.horse, 10);
    sph(g, P(L.hk), 0.12, M.horse);
    taper(g, [P(L.hk), P(L.fe)], [0.1, 0.09], M.horse, 8);
    sph(g, P(L.fe), 0.11, M.horse);
    seg(g, P(L.fe), [L.x, 1.38, L.ho[1] - 0.05], 0.09, 0.09, M.horse, 8);
    seg(g, [L.x, 1.4, L.ho[1] - 0.04], [L.x, 1.26, L.ho[1]], 0.1, 0.13, M.hoof, 10);
  }

  // saddle
  sph(g, [0, 4.78, -0.3], 1, M.leather, [0.5, 0.14, 0.62]);
  const cantle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.4, 0.3, 12, 1, true, Math.PI / 2, Math.PI), M.leather);
  cantle.material.side = THREE.DoubleSide;
  cantle.position.set(0, 4.95, -0.6); cantle.rotation.y = 0; g.add(cantle);
  // three's open cylinder with thetaStart PI/2 covers -Z side
  const cr = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 4, 14, Math.PI), M.gold);
  cr.position.set(0, 5.1, -0.6); cr.rotation.set(Math.PI / 2, 0, 0); g.add(cr);
  sph(g, [0, 4.98, 0.25], 0.14, M.leather, [1.4, 1, 1]);
  for (const sx of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.65), M.leather);
    flap.position.set(sx * 0.66, 4.35, -0.3); flap.rotation.z = sx * 0.12; g.add(flap);
    seg(g, [sx * 0.6, 4.8, 0.05], [sx * 1.0, 3.6, 0.42], 0.015, 0.015, M.leather, 4); // stirrup leather
  }
}

// ---------- knight ----------
function buildKnight(root, M) {
  const g = new THREE.Group(); g.name = 'Knight'; root.add(g);
  // torso
  sph(g, [0, 5.62, -0.28], 1, M.steel, [0.46, 0.6, 0.4], 14, 10);
  seg(g, [0, 4.9, -0.3], [0, 5.25, -0.3], 0.5, 0.4, M.steel, 14); // faulds
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.045, 5, 18), M.leather);
  belt.rotation.x = Math.PI / 2; belt.position.set(0, 5.22, -0.3); g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), M.gold);
  buckle.position.set(0, 5.22, 0.1); g.add(buckle);
  // gorget & helmet
  seg(g, [0, 6.1, -0.28], [0, 6.5, -0.22], 0.24, 0.2, M.steelD, 12);
  sph(g, [0, 6.84, -0.12], 0.3, M.steel, [0.95, 1.15, 1.15], 16, 12);
  // visor (pointed)
  const vis = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.32, 10), M.steel);
  vis.rotation.x = Math.PI / 2; vis.position.set(0, 6.76, 0.15); vis.scale.set(1, 1, 0.9); g.add(vis);
  for (const dy of [0.05, -0.03]) {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.05), M.dark);
    sl.position.set(0, 6.8 + dy, 0.2); g.add(sl);
  }
  // crest ridge
  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 4, 16, Math.PI), M.gold);
  crest.position.set(0, 6.84, -0.12); crest.rotation.set(0, Math.PI / 2, 0); crest.scale.set(1, 1.08, 1.05); g.add(crest);
  const neckRim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.03, 4, 16), M.gold);
  neckRim.rotation.x = Math.PI / 2; neckRim.position.set(0, 6.52, -0.15); g.add(neckRim);
  // breastplate gold trim
  const bt = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 4, 16, Math.PI), M.gold);
  bt.position.set(0, 6.0, -0.15); bt.rotation.set(0.3, 0, Math.PI); g.add(bt);

  for (const sx of [-1, 1]) {
    // pauldrons
    sph(g, [sx * 0.55, 6.2, -0.3], 0.3, M.steel, [1, 0.85, 1.05], 14, 10);
    const pr = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 4, 14), M.gold);
    pr.position.set(sx * 0.6, 6.0, -0.3); pr.rotation.set(Math.PI / 2, sx * 0.4, 0); g.add(pr);
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 4, 10, Math.PI), M.gold);
    ridge.position.set(sx * 0.48, 6.35, -0.3); ridge.rotation.set(0, Math.PI / 2, sx * 0.5); g.add(ridge);
    // legs
    const hip = [sx * 0.32, 4.95, -0.28], knee = [sx * 0.82, 4.55, 0.3], ank = [sx * 1.0, 3.65, 0.42], toe = [sx * 1.03, 3.55, 0.78];
    taper(g, [hip, knee], [0.18, 0.15], M.steel, 10);
    sph(g, knee, 0.15, M.steel);
    const kc = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 4, 10), M.gold);
    kc.position.set(knee[0], knee[1], knee[2] + 0.1); g.add(kc);
    taper(g, [knee, ank], [0.13, 0.1], M.steel, 10);
    taper(g, [[ank[0], ank[1] - 0.02, ank[2] - 0.12], toe], [0.11, 0.04], M.steel, 8, 0, [1, 0.6]);
    const stir = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 4, 10), M.steelD);
    stir.position.set(ank[0], 3.55, ank[2] + 0.08); stir.rotation.y = Math.PI / 2; g.add(stir);
  }
  // right arm (-X) holding the lance
  const rs = [-0.6, 6.1, -0.3], re = [-0.98, 5.8, -0.2], rh = [-1.13, 5.68, 0.28];
  taper(g, [rs, re], [0.14, 0.12], M.steel, 10); sph(g, re, 0.13, M.steel);
  taper(g, [re, rh], [0.12, 0.1], M.steel, 10); sph(g, rh, 0.13, M.chain);
  const rc = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 4, 10), M.gold);
  rc.position.set(...re); rc.rotation.y = Math.PI / 2; g.add(rc);
  // left arm (+X) holding the shield
  const ls = [0.6, 6.1, -0.3], le = [0.88, 5.72, -0.2], lh = [0.8, 5.55, 0.25];
  taper(g, [ls, le], [0.14, 0.12], M.steel, 10); sph(g, le, 0.13, M.steel);
  taper(g, [le, lh], [0.12, 0.1], M.steel, 10); sph(g, lh, 0.12, M.chain);
  // sword at the hip (scabbard, visible on the left side and back)
  seg(g, [0.55, 5.05, -0.15], [0.62, 3.75, 0.25], 0.055, 0.05, M.leather, 6);
  seg(g, [0.55, 5.05, -0.15], [0.52, 5.4, -0.25], 0.03, 0.03, M.gold, 6);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.3), M.gold);
  guard.position.set(0.55, 5.06, -0.16); g.add(guard);
}

// ---------- banner lance ----------
function buildLance(root, M) {
  const g = new THREE.Group(); g.name = 'Lance'; root.add(g);
  const hand = new V3(-1.13, 5.68, 0.28);
  const dir = new V3(-1.45, 3.05, 3.0).normalize();
  const at = (t) => hand.clone().addScaledVector(dir, t);
  const butt = at(-1.05), top = at(3.95), tip = at(4.55);
  seg(g, butt.toArray(), top.toArray(), 0.05, 0.045, M.wood, 8);
  seg(g, butt.toArray(), at(-0.45).toArray(), 0.06, 0.06, M.red, 8); // red grip wrap
  // vamplate above the hand
  const vp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.2, 0.32, 12), M.steel);
  vp.position.copy(at(0.3)); vp.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); g.add(vp);
  // finial: knob + spear head
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), M.steelD);
  knob.position.copy(top); g.add(knob);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 4), M.steel);
  head.position.copy(at(4.3)); head.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); g.add(head);
  // gold collars where the flag is tied
  for (const t of [2.65, 3.25, 3.75]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 10), M.gold);
    c.position.copy(at(t)); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); g.add(c);
  }
  // pennant: attached along the pole between t=2.55 and t=3.8, flying toward +X / -Z
  const pBot = at(2.55), pTop = at(3.8);
  const fTip = new V3(-0.42, 8.1, 0.4);
  const nu = 18, nv = 6;
  const pos = [], uv = [], idx = [];
  const side = new V3().subVectors(fTip, pTop).normalize();
  const waveN = new V3().crossVectors(side, dir).normalize();
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const A = pBot.clone().lerp(fTip, u * 0.98);
    // bottom edge sweeps up more quickly with a little notch curve
    A.y += Math.sin(u * Math.PI) * 0.25;
    const B = pTop.clone().lerp(fTip, u);
    B.y += Math.sin(u * Math.PI) * 0.08;
    const wave = Math.sin(u * Math.PI * 2.2) * 0.18 * u;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      const P = A.clone().lerp(B, v).addScaledVector(waveN, wave);
      pos.push(P.x, P.y, P.z); uv.push(u, v);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  fg.setIndex(idx); fg.computeVertexNormals();
  g.add(new THREE.Mesh(fg, M.banner));
  // gold edging on the pennant's free edges
  const edge = (row) => {
    const p = [];
    for (let i = 0; i <= nu; i++) { const k = (i * (nv + 1) + row) * 3; p.push(new V3(pos[k], pos[k + 1], pos[k + 2])); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 30, 0.03, 4), M.gold));
  };
  edge(0); edge(nv);
}

// ---------- shield ----------
function buildShield(root, M) {
  const g = new THREE.Group(); g.name = 'Shield';
  const W = 1.1, H = 1.45;
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(heaterShape(W, H), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 }), [M.steelD, M.gold]);
  back.position.z = -0.06; g.add(back);
  const faceGeo = new THREE.ShapeGeometry(heaterShape(W, H, 0.07), 10);
  // map shape coords to 0..1 UVs
  const p = faceGeo.attributes.position, uvs = [];
  for (let i = 0; i < p.count; i++) uvs.push((p.getX(i) + W / 2) / W, (p.getY(i) + H / 2) / H);
  faceGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const face = new THREE.Mesh(faceGeo, M.shieldFace);
  face.position.z = 0.025; g.add(face);
  g.position.set(0.92, 5.6, 0.25);
  g.rotation.set(0, 0.95, 0.05);
  root.add(g);
}
