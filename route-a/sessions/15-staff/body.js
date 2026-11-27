export function createStaff() {
  const group = new THREE.Group();
  group.name = 'staff';
  const D = Math.PI / 180;

  const wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 });
  const add = (geo, mat = wood) => { const m = new THREE.Mesh(geo, mat); group.add(m); return m; };

  // ---- main shaft (slightly bent, knobbly, thicker at the foot) ----
  add(branch(
    [[-0.01, 0.0, 0.0], [-0.02, 0.15, 0.01], [-0.005, 0.4, 0.0], [-0.01, 0.65, -0.01],
     [0.0, 0.9, 0.0], [0.005, 1.1, 0.0], [0.0, 1.3, 0.0]],
    t => 0.042 - 0.008 * t + 0.006 * Math.sin(t * 25) * (1 - t) + (t < 0.08 ? 0.01 * (1 - t / 0.08) : 0),
    { radial: 12, segs: 48, seed: 3, wobble: 0.15 }));

  // ---- twisted vines braided around the shaft, looping out below the head ----
  const vines = [
    { y0: 0.45, y1: 1.2, r0: 0.03, r1: 0.06, turns: 1.1, ph: 0.3, rad: 0.024, bulge: 0.9 },
    { y0: 0.55, y1: 1.22, r0: 0.035, r1: 0.06, turns: -1.0, ph: 2.4, rad: 0.026, bulge: 1.0 },
    { y0: 0.7, y1: 1.22, r0: 0.035, r1: 0.06, turns: 0.9, ph: 4.4, rad: 0.022, bulge: 0.8 },
    { y0: 0.15, y1: 0.75, r0: 0.03, r1: 0.035, turns: 0.5, ph: 1.0, rad: 0.015, bulge: 0.1 },
  ];
  vines.forEach((v, k) => {
    const pts = helix(v.y0, v.y1, v.r0, v.r1, v.turns, v.ph, 12).map((p, i, arr) => {
      const t = i / (arr.length - 1);
      // loop out most in the upper part (y ~ 0.95 in the reference)
      const s = 1 + v.bulge * Math.pow(Math.sin(Math.PI * t), 3) * (t > 0.4 ? 1.3 : 0.7);
      return [p[0] * s, p[1], p[2] * s];
    });
    add(branch(pts, t => v.rad * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.3 + 0.1))),
      { radial: 8, segs: 40, seed: 10 + k }));
  });

  // ---- head neck: a fluted cup that flares out below the crystal ----
  const cupPts = [[0.0, 1.0], [0.05, 1.02], [0.065, 1.12], [0.09, 1.24], [0.13, 1.34], [0.15, 1.41], [0.12, 1.46], [0.05, 1.47], [0.0, 1.47]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const cup = new THREE.LatheGeometry(cupPts, 16);
  {
    const p = cup.attributes.position, cc = [], c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(x, z);
      const k = 1 + 0.12 * Math.sin(a * 5 + y * 20); // fluted like bundled roots
      p.setXYZ(i, x * k, y, z * k * 0.92);
      c.copy(BARK).lerp(BARK_DARK, 0.5 + 0.5 * Math.sin(a * 5 + y * 20));
      if (y > 1.44) c.lerp(TEAL, 0.7);
      cc.push(c.r, c.g, c.b);
    }
    cup.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    cup.computeVertexNormals();
  }
  add(cup);

  // ---- claws: thick knobbly branches rising from the neck, flaring out, curling over the crystal ----
  // az in degrees from +Z toward +X. Front-view image-left = -X (az = -90).
  const claws = [
    { az: -100, oR: 0.21, tY: 1.66, tR: 0.05, tipY: 1.74, curl: 0.5, r: 0.05 },
    { az: 85, oR: 0.21, tY: 1.72, tR: 0.03, tipY: 1.8, curl: -0.9, r: 0.05 },
    { az: 175, oR: 0.2, tY: 1.68, tR: 0.04, tipY: 1.76, curl: 0.6, r: 0.045 },
    { az: 10, oR: 0.17, tY: 1.62, tR: 0.06, tipY: 1.66, curl: -0.4, r: 0.04 },
    { az: -45, oR: 0.14, tY: 1.56, tR: 0.08, tipY: 1.6, curl: 0.2, r: 0.032 },
    { az: 45, oR: 0.14, tY: 1.6, tR: 0.08, tipY: 1.64, curl: -0.2, r: 0.032 },
    { az: -140, oR: 0.15, tY: 1.58, tR: 0.08, tipY: 1.62, curl: 0.3, r: 0.032 },
    { az: 130, oR: 0.15, tY: 1.57, tR: 0.08, tipY: 1.6, curl: -0.3, r: 0.03 },
  ];
  claws.forEach((c, k) => {
    const az = c.az * D;
    const p = (r, y, da = 0) => [Math.sin(az + da) * r, y, Math.cos(az + da) * r];
    const pts = [
      p(0.04, 1.1),
      p(0.1, 1.26),
      p(c.oR * 0.95, 1.4),
      p(c.oR, lerp(1.4, c.tY, 0.5), c.curl * 0.1),
      p(c.oR * 0.85, c.tY, c.curl * 0.25),
      p(lerp(c.oR, c.tR, 0.6), c.tipY, c.curl * 0.5),
      p(c.tR, c.tipY - 0.03, c.curl * 0.7),
    ];
    add(branch(pts, t => c.r * (1.1 - 0.85 * t) * (1 + 0.15 * Math.sin(t * 30)),
      { radial: 9, segs: 32, seed: 50 + k, teal: true }));
  });
  // short outer spurs on the head sides
  const spurs = [[-90, 1.42], [95, 1.44], [0, 1.4], [180, 1.41], [-130, 1.38]];
  spurs.forEach(([azd, y], k) => {
    const az = azd * D;
    const p = (r, yy) => [Math.sin(az) * r, yy, Math.cos(az) * r];
    add(branch([p(0.13, y - 0.06), p(0.2, y + 0.02), p(0.235, y + 0.1), p(0.23, y + 0.14)],
      t => 0.03 * (1 - 0.7 * t), { radial: 7, segs: 10, seed: 80 + k }));
  });

  // ---- crystal: elongated faceted gem, blue on top, green at the base ----
  const cry = new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.12), new THREE.Vector2(0.04, -0.06), new THREE.Vector2(0.06, 0.01),
    new THREE.Vector2(0.05, 0.07), new THREE.Vector2(0, 0.14),
  ], 6);
  {
    const p = cry.attributes.position, cc = [], c = new THREE.Color();
    const top = new THREE.Color(0x3a7cf0), mid = new THREE.Color(0x30c8e0), bot = new THREE.Color(0x40e090);
    for (let i = 0; i < p.count; i++) {
      const t = (p.getY(i) + 0.12) / 0.26;
      if (t < 0.5) c.copy(bot).lerp(mid, t * 2); else c.copy(mid).lerp(top, (t - 0.5) * 2);
      cc.push(c.r, c.g, c.b);
    }
    cry.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  }
  const crystalMat = new THREE.MeshStandardMaterial({
    vertexColors: true, color: 0xffffff, emissive: 0x1a80a0, emissiveIntensity: 0.8,
    roughness: 0.2, metalness: 0.1, flatShading: true,
  });
  const crystal = new THREE.Mesh(cry, crystalMat);
  crystal.position.set(0, CRYSTAL_Y, 0);
  crystal.rotation.y = 0.3;
  crystal.name = 'crystal';
  group.add(crystal);
  const light = new THREE.PointLight(0x66e0ff, 0.6, 0.8);
  light.position.set(0, CRYSTAL_Y, 0);
  group.add(light);

  // ---- glowing green eyes on the front of the head ----
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xc8ff40, emissive: 0x9be020, emissiveIntensity: 1.0, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 6), eyeMat);
    eye.scale.set(1, 0.65, 0.5);
    const az = s * 52 * D;
    const r = 0.165;
    eye.position.set(Math.sin(az) * r, 1.36, Math.cos(az) * r);
    eye.lookAt(Math.sin(az) * 2, 1.36, Math.cos(az) * 2);
    group.add(eye);
  }

  // ---- carved runes (dark grooves on the front of the neck) ----
  const runeMat = new THREE.MeshStandardMaterial({ color: 0x24160c, roughness: 1 });
  const rune = (x, y, z, rot, len = 0.03) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.007, len, 0.008), runeMat);
    m.position.set(x, y, z); m.rotation.z = rot; group.add(m);
  };
  const cupR = y => y < 1.12 ? 0.065 : y < 1.24 ? lerp(0.065, 0.09, (y - 1.12) / 0.12) : lerp(0.09, 0.13, (y - 1.24) / 0.1);
  [[-0.03, 1.3], [-0.03, 1.22], [0.05, 1.2], [0.04, 1.12]].forEach(([x, y]) => {
    const z = Math.sqrt(Math.max(0, (cupR(y) * 0.95) ** 2 - x * x)) * 0.92 + 0.012;
    rune(x - 0.008, y, z, 0.3);
    rune(x + 0.008, y + 0.004, z, -0.6, 0.022);
    rune(x + 0.004, y - 0.01, z, 0.9, 0.018);
  });

  // ---- a few raised moss clumps on the shaft ----
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x9ccc30, roughness: 0.9 });
  const mossGeo = new THREE.IcosahedronGeometry(0.016, 0);
  const rand = rng(99);
  for (let i = 0; i < 14; i++) {
    const y = 0.3 + rand() * 1.0;
    const a = rand() * Math.PI * 2;
    const r = 0.04;
    const m = new THREE.Mesh(mossGeo, mossMat);
    m.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    m.scale.set(1 + rand(), 0.8 + rand(), 0.5);
    m.lookAt(Math.sin(a) * 3, y, Math.cos(a) * 3);
    group.add(m);
  }

  return group;
}

export default createStaff;
