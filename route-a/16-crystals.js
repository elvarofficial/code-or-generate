import * as THREE from 'three';

// Amethyst crystal cluster on a mossy rock base.
// Stands on y = 0, faces +Z, up +Y. Roughly 2 units tall.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Hexagonal crystal: slightly tapered prism with a pointed 6-facet termination.
function crystalGeometry(radius, length, tipFrac) {
  const shoulder = length * (1 - tipFrac);
  const pts = [
    new THREE.Vector2(0, -0.25),
    new THREE.Vector2(radius * 0.85, -0.25),
    new THREE.Vector2(radius, shoulder),
    new THREE.Vector2(radius * 0.18, length - 0.01),
    new THREE.Vector2(0, length),
  ];
  const g = new THREE.LatheGeometry(pts, 6);
  return g.toNonIndexed();
}

function lumpGeometry(detail, rand, amount) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  // displace by direction-dependent noise so shared vertices stay welded
  const key = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const cache = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = key(v.x, v.y, v.z);
    if (!cache.has(k)) cache.set(k, 1 + (rand() - 0.5) * amount);
    v.multiplyScalar(cache.get(k));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function createCrystals() {
  const group = new THREE.Group();
  group.name = 'Crystals';
  const rand = rng(16);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xa57ce6, emissive: 0x5a2c9a, emissiveIntensity: 0.4,
    roughness: 0.35, metalness: 0.0, flatShading: true,
  });
  const crystalMatLight = crystalMat.clone();
  crystalMatLight.color.set(0xbb94ee);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7f8a82, roughness: 0.95, flatShading: true });
  const rockMatDark = rockMat.clone();
  rockMatDark.color.set(0x6c7670);
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x7c9a34, roughness: 1, flatShading: true });

  // ---- rock base -------------------------------------------------------
  const rocks = [
    // [x, y, z, sx, sy, sz, rotY]
    [0.0, 0.2, 0.0, 0.4, 0.46, 0.48, 0.0],
    [-0.3, 0.16, 0.2, 0.26, 0.32, 0.28, 0.4],
    [0.27, 0.18, 0.22, 0.26, 0.36, 0.27, 1.1],
    [-0.02, 0.08, 0.45, 0.24, 0.24, 0.2, 0.2],
    [0.32, 0.14, -0.28, 0.24, 0.34, 0.27, 0.7],
    [-0.32, 0.14, -0.28, 0.25, 0.34, 0.28, 2.0],
    [0.03, 0.1, -0.48, 0.27, 0.26, 0.2, 0.3],
    [0.47, 0.06, 0.02, 0.16, 0.18, 0.2, 0.5],
    [-0.5, 0.06, 0.02, 0.15, 0.17, 0.2, 1.5],
  ];
  // bake transform into geometry and flatten everything below the ground plane
  const placed = (geo, pos, scl, rotY) => {
    const m4 = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
      new THREE.Vector3(...scl));
    geo.applyMatrix4(m4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
    geo.computeVertexNormals();
    return geo;
  };
  const rockMeshes = [];
  rocks.forEach((r, i) => {
    const geo = placed(lumpGeometry(1, rand, 0.3), [r[0], r[1], r[2]], [r[3], r[4], r[5]], r[6]);
    const m = new THREE.Mesh(geo, i % 2 ? rockMatDark : rockMat);
    rockMeshes.push(m);
    group.add(m);
  });

  // moss: a domed cap over the rock tops plus flat patches lying on the rock surface
  group.add(new THREE.Mesh(placed(lumpGeometry(2, rand, 0.15), [0, 0.56, 0], [0.34, 0.1, 0.42], 0), mossMat));
  const ray = new THREE.Raycaster();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const patches = [
    [-0.3, 0.2, 0.18], [0.3, 0.2, 0.17], [0.28, -0.3, 0.18], [-0.28, -0.3, 0.18],
    [0.5, 0.05, 0.1], [-0.08, 0.5, 0.12], [0.15, 0.4, 0.1], [0.05, -0.5, 0.13],
    [-0.5, -0.05, 0.1], [0.42, 0.32, 0.09], [-0.42, 0.3, 0.09], [-0.2, -0.5, 0.1],
  ];
  patches.forEach(([x, z, s]) => {
    // drop a ray from above toward the mound centre so patches hug the rock surface
    const origin = new THREE.Vector3(x * 1.6, 1.2, z * 1.6);
    const target = new THREE.Vector3(x * 0.6, 0.0, z * 0.6);
    ray.set(origin, target.clone().sub(origin).normalize());
    const hit = ray.intersectObjects(rockMeshes, false)[0];
    if (!hit) return;
    const n = hit.face.normal.clone();
    const geo = lumpGeometry(1, rand, 0.3);
    geo.scale(s, s * 0.4, s);
    const m = new THREE.Mesh(geo, mossMat);
    m.position.copy(hit.point).addScaledVector(n, 0.01);
    m.quaternion.setFromUnitVectors(yAxis, n);
    group.add(m);
  });

  // ---- crystals --------------------------------------------------------
  // base point, tip point, radius, tip fraction
  const crystals = [
    { b: [0.0, 0.45, -0.05], t: [0.06, 2.0, -0.05], r: 0.2, tip: 0.17 },   // tallest centre
    { b: [-0.18, 0.5, -0.1], t: [-0.38, 1.71, -0.58], r: 0.14, tip: 0.17 }, // tall left, leaning back
    { b: [0.08, 0.45, 0.15], t: [0.08, 1.64, 0.58], r: 0.16, tip: 0.2 },    // mid front, leaning forward
    { b: [-0.2, 0.5, 0.12], t: [-0.47, 1.29, 0.3], r: 0.13, tip: 0.2 },     // left lean
    { b: [-0.3, 0.48, 0.2], t: [-0.52, 0.98, 0.72], r: 0.1, tip: 0.22 },    // small far left, leaning forward
    { b: [0.22, 0.5, -0.1], t: [0.46, 1.42, -0.58], r: 0.12, tip: 0.2 },     // right, leaning back
    { b: [0.04, 0.45, 0.36], t: [0.04, 1.0, 0.48], r: 0.09, tip: 0.22 },    // small front
    { b: [0.22, 0.48, -0.25], t: [0.48, 1.0, -0.72], r: 0.1, tip: 0.22 },   // low back right
    { b: [-0.05, 0.48, -0.25], t: [-0.12, 1.3, -0.3], r: 0.08, tip: 0.2 },  // hidden filler back
  ];
  const up = new THREE.Vector3(0, 1, 0);
  crystals.forEach((c, i) => {
    const b = new THREE.Vector3(...c.b), t = new THREE.Vector3(...c.t);
    const dir = t.clone().sub(b);
    const len = dir.length();
    dir.normalize();
    const m = new THREE.Mesh(crystalGeometry(c.r, len, c.tip), i % 3 === 1 ? crystalMatLight : crystalMat);
    m.position.copy(b);
    m.quaternion.setFromUnitVectors(up, dir);
    m.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(up, rand() * Math.PI));
    group.add(m);
  });

  return group;
}

export default createCrystals;
