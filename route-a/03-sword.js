// Ornate dragon-guard sword. Stands point-down on y = 0, front faces +Z, up is +Y.
// Built in "reference pixel" units (1 px of the 1024 turnaround = 0.001 units),
// so the whole sword is ~0.9 units tall.
import * as THREE from 'three';

const S = 0.001;
const X = (px) => (px - 511.5) * S; // image x -> world x (front view)
const Y = (py) => (961 - py) * S; // image y -> world y
const L = (px) => px * S; // length in px -> world

export function createSword() {
  const root = new THREE.Group();
  root.name = 'Sword03';

  // ---------------------------------------------------------------- materials
  const mat = {
    steel: new THREE.MeshStandardMaterial({ color: 0x9a9ea3, metalness: 0.35, roughness: 0.55, flatShading: true }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x8c7058, metalness: 0.5, roughness: 0.5 }),
    darkBronze: new THREE.MeshStandardMaterial({ color: 0x6a5444, metalness: 0.45, roughness: 0.55 }),
    gold: new THREE.MeshStandardMaterial({ color: 0x9c7650, metalness: 0.35, roughness: 0.4 }),
    silver: new THREE.MeshStandardMaterial({ color: 0x9e958a, metalness: 0.55, roughness: 0.4 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x4a3a30, metalness: 0.0, roughness: 0.85 }),
    wrap: new THREE.MeshStandardMaterial({ color: 0x75604f, metalness: 0.1, roughness: 0.7 }),
    gemGreen: new THREE.MeshStandardMaterial({ color: 0x47b86e, emissive: 0x0d3a1c, metalness: 0.1, roughness: 0.2, flatShading: true }),
    gemRed: new THREE.MeshStandardMaterial({ color: 0xc8402c, emissive: 0x3a0b05, metalness: 0.1, roughness: 0.25, flatShading: true }),
    eye: new THREE.MeshStandardMaterial({ color: 0xff3b20, emissive: 0x801000, roughness: 0.3 }),
  };

  const add = (geo, m, parent = root) => {
    const mesh = new THREE.Mesh(geo, m);
    parent.add(mesh);
    return mesh;
  };

  // ---------------------------------------------------------------- blade
  // Front-view half width (px) along image y.
  const bladeProfile = [
    [362, 42], [385, 43], [396, 47], [401, 58], [418, 57], [440, 51], [470, 46.5], [500, 44.5],
    [540, 42.5], [600, 40.5], [700, 40], [840, 40], [860, 38], [880, 35], [900, 31],
    [920, 24], [935, 17], [948, 10], [961, 0.5],
  ];
  // Hexagonal cross-section: sharp edge, bevel, flat face with a slight central ridge.
  function bladeSection(hw, py) {
    const k = THREE.MathUtils.clamp((961 - py) / 560, 0, 1);
    const t = 4 + 7 * k; // half thickness at the flats (px)
    const bevel = Math.min(11, hw * 0.45);
    const flat = Math.max(hw - bevel, 0.2);
    return [
      [hw, 0], [flat, t], [0, t + 1.5], [-flat, t], [-hw, 0],
      [-flat, -t], [0, -t - 1.5], [flat, -t],
    ];
  }
  {
    const rings = [];
    const samples = [];
    for (let i = 0; i < bladeProfile.length - 1; i++) {
      const [y0, w0] = bladeProfile[i];
      const [y1, w1] = bladeProfile[i + 1];
      const n = y1 - y0 > 60 ? 3 : 1;
      for (let j = 0; j < n; j++) samples.push([y0 + ((y1 - y0) * j) / n, w0 + ((w1 - w0) * j) / n]);
    }
    samples.push(bladeProfile[bladeProfile.length - 1]);
    for (const [py, hw] of samples) rings.push(bladeSection(hw, py).map(([x, z]) => new THREE.Vector3(L(x), Y(py), L(z))));
    add(loft(rings, true), mat.steel);
  }

  // ---------------------------------------------------------------- blade ornament (front gold, back silver)
  function bladeOrnament(side) {
    const g = new THREE.Group();
    const m = side > 0 ? mat.gold : mat.silver;
    const zBase = L(12.5);
    // central tapering strip ending in a diamond point
    const s = new THREE.Shape();
    const pts = [
      [0, 362], [16, 368], [11, 400], [8, 440], [6, 488], [11, 512], [0, 546],
      [-11, 512], [-6, 488], [-8, 440], [-11, 400], [-16, 368],
    ];
    s.moveTo(L(pts[0][0]), Y(pts[0][1]));
    for (const [x, y] of pts.slice(1)) s.lineTo(L(x), Y(y));
    s.closePath();
    const strip = add(new THREE.ExtrudeGeometry(s, { depth: L(2), bevelEnabled: true, bevelThickness: L(1), bevelSize: L(1), bevelSegments: 1 }), m, g);
    strip.position.z = zBase - L(1.5);
    // inner diamond cut in the point
    // scroll curls along the strip
    const curls = [
      [24, 395, 11, 0.4], [20, 432, 10, 0.6], [17, 466, 8, 0.8],
    ];
    for (const [cx, cy, r, rot] of curls) {
      for (const sx of [-1, 1]) {
        const tor = add(new THREE.TorusGeometry(L(r), L(3), 5, 16, Math.PI * 1.8), m, g);
        tor.position.set(L(sx * cx), Y(cy), zBase);
        tor.rotation.z = sx > 0 ? -rot : Math.PI + rot;
        tor.scale.z = 0.6;
      }
    }
    if (side > 0) {
      const gem = add(new THREE.OctahedronGeometry(1, 0), mat.gemRed, g);
      gem.scale.set(L(6), L(13), L(4));
      gem.position.set(0, Y(380), zBase + L(2));
    }
    if (side < 0) g.rotation.y = Math.PI; // mirror to back face
    root.add(g);
  }
  bladeOrnament(1);
  bladeOrnament(-1);

  // ---------------------------------------------------------------- guard
  {
    // central shield block
    const sh = new THREE.Shape();
    const p = [[0, 274], [20, 284], [34, 300], [38, 322], [28, 346], [12, 362], [0, 372], [-12, 362], [-28, 346], [-38, 322], [-34, 300], [-20, 284]];
    sh.moveTo(L(p[0][0]), Y(p[0][1]));
    for (const [x, y] of p.slice(1)) sh.lineTo(L(x), Y(y));
    sh.closePath();
    const block = add(new THREE.ExtrudeGeometry(sh, { depth: L(30), bevelEnabled: true, bevelThickness: L(5), bevelSize: L(4), bevelSegments: 2, curveSegments: 4 }), mat.darkBronze);
    block.position.z = -L(15);

    // front: gold diamond bezel + green gem
    const bez = add(new THREE.OctahedronGeometry(1, 0), mat.gold);
    bez.scale.set(L(22), L(32), L(8));
    bez.position.set(0, Y(322), L(18));
    const gem = add(new THREE.OctahedronGeometry(1, 0), mat.gemGreen);
    gem.scale.set(L(14), L(23), L(8));
    gem.position.set(0, Y(322), L(22));
    // back: silver shield plate
    const shield = add(new THREE.OctahedronGeometry(1, 0), mat.silver);
    shield.scale.set(L(18), L(28), L(9));
    shield.position.set(0, Y(318), -L(19));

    // curled scroll-work on top of the guard, both faces
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const m = sz > 0 ? mat.gold : mat.silver;
        for (const [cx, cy, r] of [[30, 292, 10], [24, 345, 9], [44, 330, 7]]) {
          const tor = add(new THREE.TorusGeometry(L(r), L(3), 5, 14, Math.PI * 1.6), m);
          tor.position.set(L(sx * cx), Y(cy), L(sz * 18));
          tor.rotation.z = sx > 0 ? 0.3 : Math.PI - 0.3;
        }
      }
    }

    // dragon heads
    for (const sx of [-1, 1]) root.add(dragon(sx));
  }

  function dragon(sx) {
    const g = new THREE.Group();
    const P = (x, y, z = 0) => new THREE.Vector3(L(sx * x), Y(y), L(z));
    const head = new THREE.Group();
    g.add(head);
    // oriented tapered segment between two points
    const seg = (a, b, r0, r1, radial, m, rot = 0, parent = g) => {
      const len = a.distanceTo(b);
      const c = add(new THREE.CylinderGeometry(r1 * S, r0 * S, len, radial), m, parent);
      c.geometry.rotateY(rot);
      c.position.copy(a.clone().add(b).multiplyScalar(0.5));
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      return c;
    };
    // neck: grows out of the guard block, dips, then rises into the head
    const neckCurve = new THREE.CatmullRomCurve3([P(20, 340), P(36, 344), P(50, 336), P(60, 324), P(68, 312)]);
    add(taperTube(neckCurve, 17, 16, 14, 8), mat.bronze, g);
    // dorsal scale ridge on the neck
    const ridge = new THREE.CatmullRomCurve3([P(32, 326), P(46, 324), P(56, 310), P(62, 296)]);
    add(taperTube(ridge, 7, 3, 8, 5), mat.darkBronze, g);

    // skull (boxy, slightly flattened)
    const skull = add(new THREE.SphereGeometry(1, 10, 8), mat.bronze, head);
    skull.scale.set(L(22), L(18), L(18));
    skull.position.copy(P(84, 310));
    // brow ridge over the eye
    const brow = seg(P(80, 300), P(106, 308), 9, 6, 6, mat.darkBronze, 0, head);
    brow.scale.z = 1.6;
    // upper snout, square-ish, pointing outward and a little down
    seg(P(88, 316), P(122, 330), 13, 7, 4, mat.bronze, Math.PI / 4, head);
    // nose knob
    const nose = add(new THREE.SphereGeometry(L(7), 8, 6), mat.bronze, head);
    nose.position.copy(P(119, 330));
    nose.scale.set(1, 0.9, 1.3);
    // lower jaw, open
    seg(P(84, 334), P(114, 352), 9, 3.5, 4, mat.darkBronze, Math.PI / 4, head);
    // mouth interior
    const mouth = add(new THREE.SphereGeometry(L(7), 8, 6), mat.darkBronze, head);
    mouth.position.copy(P(100, 338));
    mouth.scale.set(1.4, 0.8, 1.6);
    // teeth
    for (const [x, y, dir] of [[116, 336, 1], [106, 333, 1], [96, 332, 1], [108, 345, -1], [98, 342, -1]]) {
      const t = add(new THREE.ConeGeometry(L(2.2), L(8), 4), mat.silver, head);
      t.position.copy(P(x, y));
      t.rotation.z = dir > 0 ? Math.PI : 0;
    }
    // horns: swept back toward the hilt and up
    for (const [pts, r0] of [
      [[P(78, 300, 6), P(70, 282, 7), P(62, 264, 6)], 7],
      [[P(90, 300, -6), P(90, 282, -8), P(82, 268, -8)], 5.5],
    ]) add(taperTube(new THREE.CatmullRomCurve3(pts), r0, 0.8, 10, 6), mat.darkBronze, head);
    // cheek frill spikes pointing back
    for (const [a, b] of [[P(74, 318), P(56, 312)], [P(76, 330), P(58, 336)]]) seg(a, b, 5, 0.5, 5, mat.darkBronze, 0, head);
    // eyes on both sides of the head
    for (const sz of [-1, 1]) {
      const e = add(new THREE.SphereGeometry(L(3.8), 8, 6), mat.eye, head);
      e.position.copy(P(100, 314, sz * 14));
    }
    head.position.copy(P(150, 318)).multiplyScalar(1 - 1.22);
    head.scale.setScalar(1.22);
    return g;
  }

  // ---------------------------------------------------------------- hilt
  // lower collar
  add(lathe([[0, 270], [17, 270], [19, 264], [18, 256], [16, 249], [0, 249]]), mat.bronze);
  add(ring(18.5, 2.5, 264), mat.darkBronze);
  for (const sz of [-1, 1]) {
    const g = add(new THREE.OctahedronGeometry(1, 0), mat.gemRed);
    g.scale.set(L(4), L(7), L(3));
    g.position.set(0, Y(257), L(sz * 18));
  }
  // grip
  add(lathe([[0, 250], [16.5, 250], [15.5, 230], [15.3, 200], [16, 172], [0, 172]], 16), mat.leather);
  {
    // spiral leather wrap
    const pts = [];
    const turns = 3;
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      const a = u * turns * Math.PI * 2;
      const py = 248 - u * 76;
      const r = 16.2;
      pts.push(new THREE.Vector3(L(r * Math.sin(a)), Y(py - Math.sin(a) * 0), L(r * Math.cos(a))));
    }
    // tilt the wrap: advance y faster on one side to get the diagonal band look
    const curve = new THREE.CatmullRomCurve3(pts);
    const wrapMesh = add(new THREE.TubeGeometry(curve, 120, L(3.2), 6, false), mat.wrap);
    // second, darker band interleaved with the first
    const w2 = add(new THREE.TubeGeometry(curve, 120, L(2.2), 5, false), mat.darkBronze);
    w2.rotation.y = Math.PI; w2.scale.set(0.99, 1, 0.99);
  }
  // upper collar
  add(lathe([[0, 174], [17, 174], [18.5, 166], [17.5, 152], [20, 145], [21.5, 138], [18, 132], [20, 128], [0, 128]]), mat.bronze);
  add(ring(21, 2.2, 140), mat.darkBronze);
  {
    const gF = add(new THREE.OctahedronGeometry(1, 0), mat.gemGreen);
    gF.scale.set(L(5), L(9), L(3));
    gF.position.set(0, Y(157), L(18));
    const gB = add(new THREE.OctahedronGeometry(1, 0), mat.gemRed);
    gB.scale.set(L(5), L(9), L(3));
    gB.position.set(0, Y(157), -L(18));
  }

  // ---------------------------------------------------------------- pommel crown
  add(lathe([[0, 130], [19, 130], [25, 122], [26, 116], [20, 110], [0, 110]], 14), mat.bronze);
  {
    // central spike (flattened in depth)
    const spike = add(new THREE.ConeGeometry(L(11), L(52), 6), mat.bronze);
    spike.position.set(0, Y(88), 0);
    spike.scale.z = 0.75;
    // outer prongs, curving outward then up
    for (const sx of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(L(sx * 14), Y(120), 0),
        new THREE.Vector3(L(sx * 26), Y(108), 0),
        new THREE.Vector3(L(sx * 33), Y(96), 0),
        new THREE.Vector3(L(sx * 35), Y(82), 0),
      ]);
      add(taperTube(curve, 8, 0.6, 14, 6), mat.bronze);
      // inner prongs flanking the central spike
      const inner = new THREE.CatmullRomCurve3([
        new THREE.Vector3(L(sx * 8), Y(118), 0),
        new THREE.Vector3(L(sx * 14), Y(98), 0),
        new THREE.Vector3(L(sx * 15), Y(80), 0),
      ]);
      add(taperTube(inner, 5.5, 0.6, 10, 6), mat.bronze);
    }
    // depth prongs (front/back), shorter
    for (const sz of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, Y(118), L(sz * 12)),
        new THREE.Vector3(0, Y(106), L(sz * 20)),
        new THREE.Vector3(0, Y(90), L(sz * 17)),
      ]);
      add(taperTube(curve, 6, 1, 10, 6), mat.darkBronze);
    }
    // front red gem in a gold setting, back silver plate
    const set = add(new THREE.OctahedronGeometry(1, 0), mat.gold);
    set.scale.set(L(11), L(18), L(6));
    set.position.set(0, Y(102), L(9));
    const gem = add(new THREE.OctahedronGeometry(1, 0), mat.gemRed);
    gem.scale.set(L(7), L(13), L(5));
    gem.position.set(0, Y(102), L(12));
    const plate = add(new THREE.OctahedronGeometry(1, 0), mat.silver);
    plate.scale.set(L(10), L(17), L(6));
    plate.position.set(0, Y(100), -L(9));
  }

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return root;

  // ---------------------------------------------------------------- helpers
  function lathe(pts, seg = 20) {
    // pts: [radius px, image y px]
    const v = pts.map(([r, py]) => new THREE.Vector2(L(r), Y(py)));
    return new THREE.LatheGeometry(v, seg);
  }
  function ring(r, tube, py) {
    const t = new THREE.TorusGeometry(L(r), L(tube), 6, 20);
    t.rotateX(Math.PI / 2);
    t.translate(0, Y(py), 0);
    return t;
  }
}

// Tube whose radius tapers from r0 to r1 (px) along the curve.
function taperTube(curve, r0, r1, segs, radial) {
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position;
  const frames = curve.computeFrenetFrames(segs, false);
  const v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const c = curve.getPointAt(u);
    const r = (r0 + (r1 - r0) * u) * S;
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// Skin consecutive closed rings (same vertex count) into a surface; optionally cap the first ring.
function loft(rings, capStart) {
  const n = rings[0].length;
  const positions = [];
  const push = (v) => positions.push(v.x, v.y, v.z);
  for (let r = 0; r < rings.length - 1; r++) {
    const a = rings[r], b = rings[r + 1];
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      push(a[i]); push(b[i2]); push(b[i]);
      push(a[i]); push(a[i2]); push(b[i2]);
    }
  }
  if (capStart) {
    const a = rings[0];
    const c = a.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / n);
    for (let i = 0; i < n; i++) { push(c); push(a[(i + 1) % n]); push(a[i]); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export default createSword;
