// Dragon on its hoard: a seated green dragon with spread wings on a heap of gold
// coins, with an open treasure chest, a crown, goblets and gems, on a carved round
// wooden pedestal. Stands on y = 0, faces +Z, up is +Y. Units: ~1 = 1/10 of the
// asset height (total height ~8.9).
import * as THREE from 'three';

export function createDragonHoard() {
  const root = new THREE.Group();
  root.name = 'DragonHoard';

  // ---------- materials ----------
  const std = (color, rough = 0.8, metal = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: false, ...extra });
  const M = {
    wood: std(0x9a6634, 0.75),
    woodDark: std(0x6e4520, 0.85),
    woodCarve: std(0xc9925a, 0.6),
    gold: std(0xf0b52a, 0.35, 0.55),
    goldDark: std(0xe6a826, 0.4, 0.45),
    scale: std(0x6f7a2c, 0.75),
    scaleDark: std(0x55601f, 0.8),
    belly: std(0xc48d58, 0.7),
    bellyRidge: std(0xa36e40, 0.75),
    horn: std(0xd8bf98, 0.55),
    eye: std(0xffa317, 0.3, 0, { emissive: 0x7a3c00, emissiveIntensity: 0.6 }),
    pupil: std(0x1a0d00, 0.4),
    wingFront: std(0xb07a4c, 0.8, 0, { side: THREE.FrontSide }),
    wingBack: std(0x7d8530, 0.8, 0, { side: THREE.FrontSide }),
    chestWood: std(0x7a4a26, 0.8),
    chestWoodIn: std(0x5a3418, 0.9),
    iron: std(0x8d8a8a, 0.4, 0.7),
    silver: std(0xd2d2d6, 0.25, 0.85),
    gemPink: std(0xff3f8a, 0.2, 0.1, { emissive: 0x501030, emissiveIntensity: 0.4 }),
    gemGreen: std(0x2ed070, 0.2, 0.1, { emissive: 0x0a4020, emissiveIntensity: 0.4 }),
    gemBlue: std(0x5cc8ff, 0.2, 0.1, { emissive: 0x103850, emissiveIntensity: 0.4 }),
    gemRed: std(0xe0204a, 0.2, 0.1, { emissive: 0x500010, emissiveIntensity: 0.4 }),
  };

  const add = (geo, mat, parent = root) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // Ellipsoid helper
  const ellipsoid = (pos, r, mat, rot = [0, 0, 0], seg = [12, 8], parent = root) => {
    const m = add(new THREE.SphereGeometry(1, seg[0], seg[1]), mat, parent);
    m.position.copy(pos); m.scale.set(r[0], r[1], r[2]); m.rotation.set(rot[0], rot[1], rot[2]);
    return m;
  };

  // Tube along a curve with a radius function r(t); optional elliptical scale (sx for side)
  const taperTube = (points, rFn, mat, tubular = 24, radial = 8, parent = root, caps = true) => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const frames = curve.computeFrenetFrames(tubular, false);
    const pos = [], idx = [];
    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular;
      const p = curve.getPointAt(t);
      const N = frames.normals[i], B = frames.binormals[i];
      const r = rFn(t);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const c = Math.cos(a), s = Math.sin(a);
        pos.push(p.x + r * (c * N.x + s * B.x), p.y + r * (c * N.y + s * B.y), p.z + r * (c * N.z + s * B.z));
      }
    }
    for (let i = 0; i < tubular; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j, b = a + radial + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = add(g, mat, parent);
    // end caps
    if (caps) {
    const capStart = add(new THREE.SphereGeometry(rFn(0), radial, 4), mat, parent);
    capStart.position.copy(curve.getPointAt(0));
    if (rFn(1) > 0.02) {
      const capEnd = add(new THREE.SphereGeometry(rFn(1), radial, 4), mat, parent);
      capEnd.position.copy(curve.getPointAt(1));
    }
    }
    m.userData.curve = curve;
    return m;
  };

  // Cone spike from base point toward a direction
  const spike = (base, dir, len, rad, mat, seg = 6, parent = root) => {
    const g = new THREE.ConeGeometry(rad, len, seg);
    g.translate(0, len / 2, 0);
    const m = add(g, mat, parent);
    m.position.copy(base);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
    return m;
  };

  // ---------- pedestal ----------
  const PED_TOP = 1.35;
  {
    const prof = [
      [0, 0], [3.5, 0], [3.58, 0.08], [3.58, 0.22], [3.5, 0.28],
      [3.45, 0.32], [3.42, 1.0], [3.5, 1.06], [3.52, 1.2], [3.44, 1.3], [3.3, PED_TOP], [0, PED_TOP],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.LatheGeometry(prof, 48), M.wood);
    // carved swirl band: S-shaped scroll tubes around the band
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const a = a0 + u * (Math.PI * 2 / n) * 0.9;
        const y = 0.66 + 0.24 * Math.sin(u * Math.PI * 2);
        pts.push(V(Math.sin(a) * 3.49, y, Math.cos(a) * 3.49));
      }
      taperTube(pts, () => 0.07, M.woodCarve, 10, 4, root, false);
      // curl at the start
      const a = a0;
      const curl = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, ang = t * Math.PI * 1.6;
        const rr = 0.22 * (1 - t * 0.6);
        const aa = a + (0.22 - Math.cos(ang) * rr) / 3.45;
        curl.push(V(Math.sin(aa) * 3.5, 0.66 + Math.sin(ang) * rr, Math.cos(aa) * 3.46));
      }
      taperTube(curl, () => 0.06, M.woodCarve, 6, 4, root, false);
    }
    // ring mouldings
    for (const [y, r] of [[0.32, 3.47], [1.0, 3.44]]) {
      const t = add(new THREE.TorusGeometry(r, 0.035, 3, 40), M.woodDark);
      t.rotation.x = Math.PI / 2; t.position.y = y;
    }
  }

  // ---------- coin mound ----------
  const moundH = (r) => {
    // height of mound surface above pedestal top at radius r (0..3.3)
    const k = Math.max(0, 1 - (r / 3.3) ** 2);
    return 0.22 + 0.85 * Math.pow(k, 0.8);
  };
  const moundY = (x, z) => PED_TOP + moundH(Math.hypot(x, z));
  {
    const prof = [];
    for (let i = 0; i <= 10; i++) {
      const r = 3.3 * (1 - i / 10);
      prof.push(new THREE.Vector2(r, moundH(r) - (i === 0 ? 0.1 : 0)));
    }
    prof.unshift(new THREE.Vector2(3.32, 0));
    const g = new THREE.LatheGeometry(prof, 32);
    const m = add(g, M.goldDark);
    m.position.y = PED_TOP;
    m.material.side = THREE.DoubleSide;
  }
  // instanced coins
  {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 6);
    const N = 210;
    const coins = new THREE.InstancedMesh(coinGeo, M.gold, N);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const r = 3.3 * Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      dummy.position.set(x, moundY(x, z) + 0.01, z);
      // tilt roughly with the slope plus noise
      const slope = 0.6 * (r / 3.3);
      dummy.rotation.set(Math.cos(a) * slope + (rnd() - 0.5) * 0.9, rnd() * 3, -Math.sin(a) * -slope + (rnd() - 0.5) * 0.9);
      dummy.updateMatrix();
      coins.setMatrixAt(i, dummy.matrix);
    }
    coins.castShadow = true; coins.receiveShadow = true;
    root.add(coins);
  }

  // ---------- gems ----------
  const gem = (pos, s, mat, rot = [0.3, 0.5, 0.2]) => {
    const m = add(new THREE.OctahedronGeometry(1, 0), mat);
    m.position.copy(pos); m.scale.set(s, s * 1.3, s * 0.8); m.rotation.set(...rot);
    return m;
  };
  gem(V(-1.9, moundY(-1.9, 2.3) + 0.1, 2.3), 0.2, M.gemPink, [0.2, 0.4, 1.2]);
  gem(V(-2.3, moundY(-2.3, 1.6) + 0.1, 1.6), 0.15, M.gemGreen, [0.4, 0.2, 1.0]);
  gem(V(0.4, moundY(0.4, 2.6) + 0.12, 2.6), 0.2, M.gemBlue, [0.5, 0.8, 0.4]);
  gem(V(1.95, moundY(1.95, 1.3) + 0.08, 1.3), 0.13, M.gemBlue, [1.2, 0.3, 0.5]);
  gem(V(-0.1, moundY(-0.1, -2.5) + 0.1, -2.5), 0.18, M.gemRed, [0.3, 0.2, 0.9]);
  gem(V(-1.7, moundY(-1.7, -1.7) + 0.08, -1.7), 0.15, M.gemGreen, [1.0, 0.2, 0.4]);
  gem(V(-2.4, moundY(-2.4, -1.2) + 0.08, -1.2), 0.15, M.gemPink, [0.6, 0.6, 1.1]);
  gem(V(1.8, moundY(1.8, 0.4) + 0.1, 0.4), 0.14, M.gemBlue, [0.2, 0.9, 0.7]);

  // ---------- goblet ----------
  const goblet = (pos, s, rot = [0, 0, 0]) => {
    const g = new THREE.Group();
    const prof = [[0, 0], [0.32, 0], [0.3, 0.05], [0.07, 0.12], [0.06, 0.5], [0.1, 0.58],
      [0.3, 0.68], [0.36, 0.9], [0.38, 1.05], [0.34, 1.05], [0.3, 0.75], [0.0, 0.66]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.LatheGeometry(prof, 12), M.silver, g);
    g.position.copy(pos); g.scale.setScalar(s); g.rotation.set(...rot);
    root.add(g);
    return g;
  };
  goblet(V(2.05, moundY(2.05, 0.2) - 0.05, 0.2), 0.62, [0.1, 0, -0.1]);
  goblet(V(-1.1, moundY(-1.1, -2.1) - 0.05, -2.1), 0.6, [-0.35, 0, 0.3]);
  goblet(V(2.6, moundY(2.6, -1.4) - 0.02, -1.4), 0.45, [0.2, 0, 0.5]);

  // ---------- crown ----------
  {
    const g = new THREE.Group();
    const band = add(new THREE.CylinderGeometry(0.55, 0.5, 0.32, 20, 1, true), M.gold, g);
    band.material = M.gold;
    const inner = add(new THREE.CylinderGeometry(0.52, 0.47, 0.3, 20, 1, true), M.goldDark, g);
    inner.material = M.goldDark.clone(); inner.material.side = THREE.BackSide;
    const nP = 7;
    for (let i = 0; i < nP; i++) {
      const a = (i / nP) * Math.PI * 2;
      const p = spike(V(Math.sin(a) * 0.54, 0.12, Math.cos(a) * 0.54), V(Math.sin(a) * 0.15, 1, Math.cos(a) * 0.15), 0.38, 0.13, M.gold, 4, g);
      p.rotation.y += 0; // keep
      const ball = add(new THREE.SphereGeometry(0.05, 6, 4), M.gold, g);
      ball.position.set(Math.sin(a) * 0.6, 0.53, Math.cos(a) * 0.6);
      const gm = add(new THREE.OctahedronGeometry(0.07, 0), [M.gemGreen, M.gemRed, M.gemBlue][i % 3], g);
      gm.position.set(Math.sin(a) * 0.56, 0.0, Math.cos(a) * 0.56);
    }
    const rim = add(new THREE.TorusGeometry(0.53, 0.04, 5, 20), M.goldDark, g);
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.16;
    g.scale.setScalar(1.25);
    g.position.set(-0.85, moundY(-0.85, 2.35) + 0.2, 2.35);
    g.rotation.set(0.35, 0.3, 0.25);
    root.add(g);
  }

  // ---------- treasure chest ----------
  {
    const g = new THREE.Group();
    const W = 1.9, D = 1.15, H = 0.85;
    add(new THREE.BoxGeometry(W, H, D), M.chestWood, g).position.y = H / 2;
    // inside darker (slightly smaller top surface)
    const inside = add(new THREE.BoxGeometry(W - 0.14, 0.02, D - 0.14), M.chestWoodIn, g);
    inside.position.y = H - 0.05;
    // gold & gems inside
    const fill = add(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.gold, g);
    fill.scale.set(W / 2 - 0.08, 0.28, D / 2 - 0.08); fill.position.y = H - 0.06;
    for (const [x, z, m, s] of [[-0.5, 0.1, M.gemGreen, 0.15], [-0.1, 0.2, M.gemPink, 0.17], [0.3, 0.0, M.gemBlue, 0.12], [0.55, 0.25, M.gemGreen, 0.1]]) {
      const gm = add(new THREE.OctahedronGeometry(s, 0), m, g); gm.position.set(x, H + 0.15, z); gm.rotation.set(0.6, x, 0.3);
    }
    // iron bands
    for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) {
      add(new THREE.BoxGeometry(0.12, H + 0.02, D + 0.04), M.iron, g).position.set(x, H / 2, 0);
    }
    add(new THREE.BoxGeometry(W + 0.02, 0.08, D + 0.04), M.iron, g).position.set(0, H - 0.04, 0);
    add(new THREE.BoxGeometry(W + 0.02, 0.08, D + 0.04), M.iron, g).position.set(0, 0.04, 0);
    // lock
    const lock = add(new THREE.BoxGeometry(0.22, 0.28, 0.06), M.iron, g); lock.position.set(0.25, H - 0.2, D / 2 + 0.03);
    // lid (open, hinged at back top)
    const lid = new THREE.Group();
    lid.position.set(0, H, -D / 2);
    const lidShell = add(new THREE.CylinderGeometry(D / 2, D / 2, W, 14, 1, false, 0, Math.PI), M.chestWood, lid);
    lidShell.rotation.z = Math.PI / 2; lidShell.position.z = D / 2;
    lidShell.rotation.y = 0;
    const lidIn = add(new THREE.CylinderGeometry(D / 2 - 0.05, D / 2 - 0.05, W - 0.1, 14, 1, true, 0, Math.PI), M.chestWoodIn.clone(), lid);
    lidIn.material.side = THREE.BackSide;
    lidIn.rotation.z = Math.PI / 2; lidIn.position.z = D / 2;
    for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) {
      const b = add(new THREE.CylinderGeometry(D / 2 + 0.03, D / 2 + 0.03, 0.12, 14, 1, false, 0, Math.PI), M.iron, lid);
      b.rotation.z = Math.PI / 2; b.position.set(x, 0, D / 2);
    }
    lid.rotation.x = -1.95;
    g.add(lid);
    // chain hanging at front-left
    for (let i = 0; i < 4; i++) {
      const l = add(new THREE.TorusGeometry(0.06, 0.018, 4, 8), M.iron, g);
      l.position.set(-0.55, H - 0.15 - i * 0.1, D / 2 + 0.05); l.rotation.y = (i % 2) * Math.PI / 2;
    }
    g.position.set(-2.05, PED_TOP + 0.35, 0.75);
    g.rotation.set(0, 0.35, 0.05);
    root.add(g);
    // goblet in chest
    goblet(V(-1.45, PED_TOP + 0.35 + 0.95, 0.35), 0.5, [0, 0, 0.1]);
  }

  // ---------- dragon ----------
  const dragon = new THREE.Group();
  root.add(dragon);
  const D_ = dragon;

  // torso (tilted ellipsoid), belly plate
  ellipsoid(V(0, 4.4, 0.0), [0.85, 1.45, 1.1], M.scale, [0.45, 0, 0], [16, 12], D_);
  ellipsoid(V(0, 4.5, 0.45), [0.7, 1.3, 0.78], M.belly, [0.42, 0, 0], [12, 8], D_);
  // belly ridges (chevrons)
  for (let i = 0; i < 8; i++) {
    const y = 3.4 + i * 0.3;
    const f = Math.sqrt(Math.max(0.05, 1 - ((y - 4.45) / 1.32) ** 2));
    const t = add(new THREE.TorusGeometry(1, 0.035, 3, 10, Math.PI), M.bellyRidge, D_);
    t.position.set(0, y, 0.48 + (y - 4.45) * 0.45);
    t.scale.set(0.72 * f, 0.8 * f, 1);
    t.rotation.set(Math.PI / 2 + 0.45, 0, 0);
  }
  // haunches
  for (const s of [-1, 1]) {
    ellipsoid(V(s * 0.92, 3.45, -0.5), [0.45, 0.75, 0.95], M.scale, [0.2, 0, s * -0.1], [12, 8], D_);
    // hind lower leg + foot
    ellipsoid(V(s * 1.05, 2.85, 0.05), [0.32, 0.42, 0.55], M.scale, [0.4, 0, 0], [10, 8], D_);
    ellipsoid(V(s * 1.05, 2.5, 0.45), [0.3, 0.16, 0.38], M.scale, [0, 0, 0], [10, 6], D_);
    for (let k = -1; k <= 1; k++) {
      spike(V(s * 1.05 + k * 0.15, 2.45, 0.75), V(k * 0.2, -0.35, 1), 0.22, 0.05, M.horn, 5, D_);
    }
    // front legs: shoulder -> elbow -> wrist
    taperTube([V(s * 0.6, 5.0, 0.35), V(s * 0.68, 4.1, 0.55), V(s * 0.62, 3.2, 0.9), V(s * 0.55, 2.62, 1.2)],
      (t) => 0.3 - 0.12 * t, M.scale, 14, 8, D_);
    ellipsoid(V(s * 0.55, 2.52, 1.35), [0.27, 0.14, 0.3], M.scale, [0, 0, 0], [10, 6], D_);
    for (let k = -1; k <= 1; k++) {
      spike(V(s * 0.55 + k * 0.13, 2.5, 1.58), V(k * 0.15, -0.5, 1), 0.22, 0.05, M.horn, 5, D_);
    }
  }

  // neck
  const neckPts = [V(0, 5.3, 0.35), V(0, 6.0, 0.55), V(0, 6.7, 0.75), V(0, 7.45, 1.15)];
  taperTube(neckPts, (t) => 0.62 - 0.2 * t, M.scale, 16, 10, D_);
  taperTube([V(0, 5.3, 0.82), V(0, 6.0, 0.98), V(0, 6.7, 1.12)], (t) => 0.38 - 0.12 * t, M.belly, 12, 8, D_);
  // neck belly ridges
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const y = 5.5 + i * 0.27;
    const t2 = add(new THREE.TorusGeometry(1, 0.025, 3, 8, Math.PI), M.bellyRidge, D_);
    t2.position.set(0, y, 0.98 + 0.2 * t);
    t2.scale.set(0.36 - 0.06 * t, 0.36, 1);
    t2.rotation.set(Math.PI / 2 + 0.45, 0, 0);
  }

  // head
  const head = new THREE.Group();
  head.position.set(0, 7.55, 1.35);
  D_.add(head);
  ellipsoid(V(0, 0.12, 0.05), [0.5, 0.42, 0.5], M.scale, [0, 0, 0], [14, 10], head);
  // snout
  ellipsoid(V(0, -0.05, 0.6), [0.36, 0.27, 0.6], M.scale, [0.12, 0, 0], [14, 10], head);
  // jaw
  ellipsoid(V(0, -0.28, 0.45), [0.3, 0.14, 0.55], M.belly, [0.15, 0, 0], [12, 8], head);
  // nostrils
  for (const s of [-1, 1]) {
    ellipsoid(V(s * 0.14, 0.12, 1.1), [0.05, 0.04, 0.04], M.pupil, [0, 0, 0], [6, 4], head);
  }
  // eyes + brows
  for (const s of [-1, 1]) {
    const e = ellipsoid(V(s * 0.3, 0.2, 0.35), [0.11, 0.08, 0.08], M.eye, [0, s * 0.5, 0], [10, 8], head);
    ellipsoid(V(s * 0.34, 0.2, 0.41), [0.025, 0.06, 0.02], M.pupil, [0, s * 0.5, 0], [6, 4], head);
    ellipsoid(V(s * 0.3, 0.31, 0.32), [0.18, 0.06, 0.12], M.scaleDark, [0, s * 0.4, s * -0.4], [8, 6], head);
    // main horns: up, slightly outward & back, tip curling in
    taperTube([V(s * 0.28, 0.4, -0.2), V(s * 0.38, 0.75, -0.4), V(s * 0.45, 1.1, -0.55), V(s * 0.36, 1.38, -0.55)],
      (t) => 0.13 * (1 - t) + 0.01, M.horn, 12, 7, head);
    // cheek / side spikes
    spike(V(s * 0.45, 0.05, -0.15), V(s * 1, 0.4, -0.5), 0.42, 0.08, M.horn, 6, head);
    spike(V(s * 0.42, -0.2, -0.05), V(s * 1, -0.1, -0.4), 0.32, 0.06, M.horn, 6, head);
    spike(V(s * 0.5, 0.3, -0.25), V(s * 1, 0.9, -0.6), 0.36, 0.07, M.horn, 6, head);
    // fangs
    spike(V(s * 0.2, -0.22, 0.95), V(0, -1, 0.1), 0.1, 0.03, M.horn, 4, head);
  }
  // central forehead spike
  spike(V(0, 0.5, 0.05), V(0, 1, -0.2), 0.28, 0.07, M.horn, 6, head);

  // back spines (neck + spine + tail)
  const spineCurve = new THREE.CatmullRomCurve3([V(0, 7.6, 0.95), V(0, 7.0, 0.35), V(0, 6.2, -0.05), V(0, 5.4, -0.55), V(0, 4.6, -0.95), V(0, 3.8, -1.1)]);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const p = spineCurve.getPointAt(t);
    const tan = spineCurve.getTangentAt(t);
    const out = V(0, tan.z, -tan.y).normalize(); // perpendicular, pointing back
    const nrm = out.clone().add(tan.clone().multiplyScalar(-0.4)).normalize();
    spike(p.clone().add(out.clone().multiplyScalar(-0.05)), nrm, 0.22 + 0.06 * Math.sin(t * Math.PI), 0.08, M.horn, 5, D_);
  }

  // tail: from rear, around the dragon's left (+X) side, curling forward
  const tailPts = [V(0, 3.5, -1.1), V(0.9, 2.85, -2.0), V(2.2, 2.45, -2.2), V(2.95, 2.4, -1.1),
    V(3.0, 2.35, 0.3), V(2.5, 2.3, 1.35), V(1.5, 2.35, 1.75), V(0.9, 2.5, 1.3)];
  const tail = taperTube(tailPts, (t) => 0.48 * (1 - t) + 0.09, M.scale, 40, 9, D_);
  {
    const c = tail.userData.curve;
    for (let i = 1; i < 22; i++) {
      const t = i / 22;
      const p = c.getPointAt(t);
      const r = 0.48 * (1 - t) + 0.09;
      const tan = c.getTangentAt(t);
      // outward horizontal normal (away from the curl centre) tilted up
      const side = V(tan.z, 0, -tan.x).normalize().multiplyScalar(-1);
      const dir = V(0, 1, 0).add(side.clone().multiplyScalar(0.5)).normalize();
      spike(p.clone().add(dir.clone().multiplyScalar(r * 0.8)), dir.clone().add(tan.clone().multiplyScalar(-0.5)), 0.2 * (1 - t) + 0.08, 0.07 * (1 - t) + 0.03, M.horn, 4, D_);
    }
  }

  // wings
  for (const s of [-1, 1]) {
    const S = V(s * 0.55, 5.6, -0.55); // shoulder
    const E = V(s * 1.05, 6.6, -0.35); // elbow
    const W = V(s * 1.6, 8.0, -0.15); // wrist (top)
    const tips = [V(s * 3.3, 6.3, -2.4), V(s * 3.45, 3.2, -3.2), V(s * 2.7, 4.0, -2.4), V(s * 1.6, 4.55, -1.5), V(s * 1.05, 4.95, -0.95)];
    const root_ = V(s * 0.75, 4.8, -0.8);
    // bones
    taperTube([S, E, W], (t) => 0.16 - 0.06 * t, M.scale, 10, 7, D_);
    spike(W, V(s * -0.2, 1, 0.1), 0.35, 0.09, M.horn, 6, D_);
    for (const T of tips.slice(0, 4)) {
      const mid = W.clone().lerp(T, 0.5).add(V(s * 0.1, 0.1, 0));
      taperTube([W, mid, T], (t) => 0.07 - 0.04 * t, M.scaleDark, 10, 5, D_);
      spike(T, T.clone().sub(W), 0.16, 0.04, M.horn, 4, D_);
    }
    // membrane: polygon W -> tip0 -> sag -> tip1 -> sag -> tip2 -> sag -> tip3 -> root -> S -> E
    const ring = [];
    const sag = (a, b, amt) => {
      const m = a.clone().lerp(b, 0.5);
      // sag toward the wrist (inward/up)
      return m.lerp(W, amt);
    };
    ring.push(tips[0], sag(tips[0], tips[1], 0.04), tips[1], sag(tips[1], tips[2], 0.14), tips[2], sag(tips[2], tips[3], 0.14), tips[3], sag(tips[3], tips[4], 0.1), tips[4], root_, S, E);
    // triangulate as a fan from W, subdividing each triangle to give it curvature
    const posF = [];
    const bulge = (p, w) => p.clone().add(V(0, 0, -0.18 * w)); // cup backwards
    const pushTri = (a, b, c) => { posF.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); };
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      // 2-level subdivision of triangle (W, a, b)
      const n = 3;
      const P = (u, v) => {
        const p = W.clone().multiplyScalar(1 - u - v).add(a.clone().multiplyScalar(u)).add(b.clone().multiplyScalar(v));
        const w = 4 * (u + v) * (1 - u - v);
        return bulge(p, w);
      };
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n - r; c++) {
          const u0 = r / n, v0 = c / n, d = 1 / n;
          pushTri(P(u0, v0), P(u0 + d, v0), P(u0, v0 + d));
          if (c < n - r - 1) pushTri(P(u0 + d, v0), P(u0 + d, v0 + d), P(u0, v0 + d));
        }
    }
    const gF = new THREE.BufferGeometry();
    gF.setAttribute('position', new THREE.Float32BufferAttribute(posF, 3));
    gF.computeVertexNormals();
    // orient so the tan side faces forward (+Z)
    const nrm = gF.attributes.normal;
    let avgZ = 0; for (let i = 0; i < nrm.count; i++) avgZ += nrm.getZ(i);
    if (avgZ < 0) { // flip
      const p = gF.attributes.position.array;
      for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
      gF.computeVertexNormals();
    }
    add(gF, M.wingFront, D_);
    const gB = gF.clone();
    {
      const p = gB.attributes.position.array;
      for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
      gB.computeVertexNormals();
    }
    add(gB, M.wingBack, D_);
  }

  return root;
}

export default createDragonHoard;
