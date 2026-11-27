// Crowned green slime — Route A: stands on y = 0, faces +Z, up is +Y. Height ≈ 1 unit.
import * as THREE from 'three';

// Body silhouette (radius, height), traced from front/left references.
const A = 0.635, YC = 0.36;
const PROFILE = [];
for (let i = 0; i <= 40; i++) {
  const y = i / 40;
  let r;
  if (y >= YC) { const t = (y - YC) / (1 - YC); r = A * Math.pow(Math.max(1 - Math.pow(t, 1.95), 0), 1 / 1.95); }
  else { const t = (YC - y) / 0.375; r = A * Math.pow(Math.max(1 - Math.pow(t, 2.4), 0), 1 / 2.4); }
  PROFILE.push([r, y]);
}
PROFILE.unshift([0, 0]);

function bodyRadiusAt(y) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i];
    if (y >= y0 && y <= y1 && y1 > y0) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
  }
  return 0;
}

// Point on the body surface in direction (x side offset, height y), front side (+Z).
function surfacePoint(x, y, sign = 1) {
  const r = bodyRadiusAt(y);
  const z = Math.sqrt(Math.max(r * r - x * x, 0)) * sign;
  return new THREE.Vector3(x, y, z);
}

// Approximate outward normal of the lathe body at a surface point.
function surfaceNormal(p) {
  const e = 0.01;
  const dr = (bodyRadiusAt(p.y + e) - bodyRadiusAt(p.y - e)) / (2 * e);
  const radial = new THREE.Vector3(p.x, 0, p.z).normalize();
  return new THREE.Vector3(radial.x, -dr, radial.z).normalize();
}

function makeBody() {
  const pts = PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, 64);
  // Vertical colour gradient: darker base, lighter crown of the dome.
  const pos = geo.attributes.position, col = [];
  const low = new THREE.Color('#56a64e'), mid = new THREE.Color('#66b24f'), top = new THREE.Color('#8fcc5e');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0.5) c.copy(low).lerp(mid, THREE.MathUtils.smoothstep(y, 0.0, 0.5));
    else c.copy(mid).lerp(top, THREE.MathUtils.smoothstep(y, 0.5, 0.95));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0 });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'body';
  return m;
}

// Orient an object so its local +Z points along `normal`.
function alignTo(obj, normal) {
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
}

function makeEye(side) {
  const g = new THREE.Group();
  g.name = side < 0 ? 'eyeRight' : 'eyeLeft';
  const R = 0.15;
  // dark-green socket rim
  const socket = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#4f9a45', roughness: 0.55 }));
  socket.scale.set(1, 1, 0.42);
  g.add(socket);
  // eye white
  const white = new THREE.Mesh(
    new THREE.SphereGeometry(R, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#e6eedb', roughness: 0.35 }));
  white.scale.set(1, 1, 0.55);
  white.position.z = 0.02;
  g.add(white);
  // iris: dark green disc, shifted toward the nose
  const irisGrp = new THREE.Group();
  irisGrp.position.set(-side * 0.022, -0.002, 0.02 + R * 0.55 - 0.012);
  const iris = new THREE.Mesh(
    new THREE.SphereGeometry(0.098, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#244a2c', roughness: 0.3 }));
  iris.scale.set(1, 1, 0.25);
  irisGrp.add(iris);
  // lighter green lower glow inside the iris
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 24, 12),
    new THREE.MeshStandardMaterial({ color: '#5f8a3a', roughness: 0.4 }));
  glow.scale.set(1.1, 0.6, 0.25);
  glow.position.set(0.0, -0.035, 0.012);
  irisGrp.add(glow);
  // catch-light
  const hl = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 16, 8),
    new THREE.MeshBasicMaterial({ color: '#f4f8ec' }));
  hl.scale.set(1, 1, 0.3);
  hl.position.set(-0.03, 0.035, 0.025);
  irisGrp.add(hl);
  g.add(irisGrp);
  return g;
}

function makeCrown() {
  const g = new THREE.Group();
  g.name = 'crown';
  const seg = 120, points = 5;
  const rBot = 0.15, rTop = 0.2, hValley = 0.13, hPeak = 0.29, th = 0.016;
  const gold = new THREE.MeshStandardMaterial({ color: '#e8b04c', emissive: '#4a3010', roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide });
  const goldIn = new THREE.MeshStandardMaterial({ color: '#b98234', roughness: 0.65, metalness: 0.0, side: THREE.DoubleSide });
  // zigzag top height
  const topH = a => {
    const t = (a / (2 * Math.PI)) * points;
    const f = t - Math.floor(t);           // 0..1 within one point
    const tri = 1 - Math.abs(f - 0.5) * 2; // 0 at valley, 1 at peak
    return hValley + (hPeak - hValley) * tri;
  };
  const build = (rOff, mat) => {
    const geo = new THREE.CylinderGeometry(rTop + rOff, rBot + rOff, 1, seg, 1, true);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const a = Math.atan2(x, z) + Math.PI;
      pos.setY(i, y > 0 ? topH(a) : 0);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };
  g.add(build(0, gold));
  g.add(build(-th, goldIn));
  // base band
  const band = new THREE.Mesh(new THREE.TorusGeometry(rBot + 0.002, 0.014, 8, 64), gold);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.012;
  g.add(band);
  return g;
}

function makeHighlight(p, n, sx, sy, roll = 0, color = '#a9dc7c') {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
  m.scale.set(sx, sy, 1);
  alignTo(m, n);
  m.rotateZ(roll);
  m.position.copy(p).addScaledVector(n, 0.004);
  return m;
}

export function createSlime() {
  const root = new THREE.Group();
  root.name = '19-slime';
  root.add(makeBody());

  // Eyes (slime's right = -X, left = +X)
  for (const side of [-1, 1]) {
    const p = surfacePoint(side * 0.26, 0.54);
    const n = surfaceNormal(p);
    // turn the eye a little further outward than the bare surface normal
    n.x += side * 0.12; n.normalize();
    const eye = makeEye(side);
    alignTo(eye, n);
    eye.position.copy(p).addScaledVector(n, 0.0);
    root.add(eye);
  }

  // Crown, perched on the slime's upper left (+X), slightly forward, tilted outward.
  const crown = makeCrown();
  const cp = new THREE.Vector3(0.29, 0, 0.08);
  cp.y = 0.86;
  crown.position.copy(cp);
  crown.rotation.set(0.18, 0, -0.42);
  root.add(crown);

  // Glossy highlights on the dome (one per main viewing side).
  const hls = [
    [surfacePoint(-0.25, 0.83), 0.075, 0.042, 0.35],
    [surfacePoint(-0.10, 0.88), 0.032, 0.026, 0.3],
  ];
  for (const [p, sx, sy, roll] of hls) root.add(makeHighlight(p, surfaceNormal(p), sx, sy, roll));
  // side (+X) and back (-Z) highlights
  const rot = (p, ang) => p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
  for (const ang of [Math.PI / 2 + 0.0, Math.PI]) {
    for (const [p, sx, sy, roll] of hls) {
      const q = rot(p, ang);
      const n = surfaceNormal(q);
      root.add(makeHighlight(q, n, sx, sy, roll));
    }
  }
  return root;
}

export default createSlime;
