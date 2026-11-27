import * as THREE from 'three';

// Treasure chest. Stands on y = 0, faces +Z, up is +Y.
// Units: ~1 unit = 500 px of the reference sheet.
export function createChest() {
  const root = new THREE.Group();
  root.name = 'chest';

  // ---------- dimensions ----------
  const W = 1.71;        // outer width (x)
  const D = 1.08;        // outer depth (z)
  const BH = 0.67;       // body height
  const LS = 0.13;       // lid straight (vertical) part
  const LR = 0.47;       // lid arch height above straight part
  const T = 0.03;        // metal thickness (how far it stands proud)
  const FR = 0.12;       // frame border width

  // ---------- materials ----------
  const wood = new THREE.MeshStandardMaterial({ color: 0x8b5631, roughness: 0.85 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x3e2414, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x94949a, roughness: 0.55, metalness: 0.25 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.55, metalness: 0.25 });
  const keyhole = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  const rope = new THREE.MeshStandardMaterial({ color: 0xc09a68, roughness: 0.95 });
  const ropeDark = new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 1 });

  const add = (geo, mat, x = 0, y = 0, z = 0, parent = root) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  const woodTones = [0x8b5631, 0x7f4c2a, 0x935d36, 0x845130, 0x7a4828].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
  let woodIdx = 0;
  const woodV = () => woodTones[(woodIdx++ * 3) % woodTones.length];

  const rivetGeo = new THREE.SphereGeometry(0.019, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  // rivet on a surface with given outward normal
  const rivet = (x, y, z, normal) => {
    const m = new THREE.Mesh(rivetGeo, metalDark);
    m.position.set(x, y, z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
    root.add(m);
  };
  const NZ = new THREE.Vector3(0, 0, 1), NMZ = new THREE.Vector3(0, 0, -1);

  // ---------- body ----------
  const inW = W - 2 * T, inD = D - 2 * T;
  // dark core (shows through plank gaps)
  box(inW - 0.01, BH - 0.01, inD - 0.01, woodDark, 0, BH / 2, 0);

  // wooden planks on front/back faces, 3 rows
  const plankRows = 3;
  const panelBottom = FR * 0.4, panelTop = BH - FR * 0.6;
  const rowH = (panelTop - panelBottom) / plankRows;
  for (const s of [1, -1]) {
    for (let r = 0; r < plankRows; r++) {
      const y = panelBottom + rowH * (r + 0.5);
      box(inW - 0.02, rowH - 0.012, 0.02, woodV(), 0, y, s * (inD / 2));
    }
  }
  // planks on sides
  for (const s of [1, -1]) {
    for (let r = 0; r < plankRows; r++) {
      const y = panelBottom + rowH * (r + 0.5);
      box(0.02, rowH - 0.012, inD - 0.02, woodV(), s * (inW / 2), y, 0);
    }
  }

  // metal frame around body: corner posts + bottom/top rails on all four faces
  const fz = D / 2 - T / 2, fx = W / 2 - T / 2;
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    // corner posts (L shaped from two boxes)
    box(FR, BH, T, metal, sx * (W / 2 - FR / 2), BH / 2, sz * fz);
    box(T, BH, FR, metal, sx * fx, BH / 2, sz * (D / 2 - FR / 2));
  }
  for (const sz of [1, -1]) {
    box(W, 0.085, T, metal, 0, 0.0425, sz * fz);           // bottom rail
    box(W, FR, T, metal, 0, BH - FR / 2, sz * fz);           // top rail
  }
  for (const sx of [1, -1]) {
    box(T, 0.085, D, metal, sx * fx, 0.0425, 0);
    box(T, FR, D, metal, sx * fx, BH - FR / 2, 0);
  }
  // vertical straps front & back, with rivets
  const strapX = [-0.36, 0.36], strapW = 0.13;
  for (const sz of [1, -1]) {
    for (const x of strapX) {
      box(strapW, BH, T * 1.6, metal, x, BH / 2, sz * (D / 2 - T * 0.2));
      for (const y of [0.1, 0.27, 0.45, 0.6]) {
        rivet(x, y, sz * (D / 2 + T * 0.6), sz > 0 ? NZ : NMZ);
      }
    }
  }

  // ---------- lid ----------
  const lid = new THREE.Group();
  lid.position.y = BH;
  root.add(lid);

  // profile in (z, y) of the lid end, as a Shape (shape x -> world z)
  const lidShape = (halfD, straight, archH, segs = 24) => {
    const s = new THREE.Shape();
    s.moveTo(-halfD, 0);
    s.lineTo(halfD, 0);
    s.lineTo(halfD, straight);
    for (let i = 1; i <= segs; i++) {
      const a = (i / segs) * Math.PI;
      s.lineTo(Math.cos(a) * halfD, straight + Math.sin(a) * archH);
    }
    s.lineTo(-halfD, 0);
    return s;
  };
  const extrudeX = (shape, len, mat, x) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 24 });
    g.translate(0, 0, -len / 2);
    const m = new THREE.Mesh(g, mat);
    m.rotation.y = Math.PI / 2; // shape x -> world -z ... fix below
    m.position.x = x;
    lid.add(m);
    return m;
  };
  // Rotating by +90deg about Y maps local x -> world -z, local z -> world x.
  // Shape is symmetric in x, so the sign flip doesn't matter.

  // dark core of lid
  extrudeX(lidShape(inD / 2 - 0.005, LS, LR - T - 0.005), inW - 0.16, woodDark, 0);

  // wooden plank strips on the arch (curved planks running along X)
  const archSegs = 5;
  const halfIn = inD / 2;
  const archPt = (a, h = 0) => new THREE.Vector2(Math.cos(a) * (halfIn + h), LS + Math.sin(a) * (LR - T + h * (LR - T) / halfIn));
  for (let i = 0; i < archSegs; i++) {
    const a0 = (i / archSegs) * Math.PI + 0.012, a1 = ((i + 1) / archSegs) * Math.PI - 0.012;
    const s = new THREE.Shape();
    const n = 6;
    for (let k = 0; k <= n; k++) {
      const p = archPt(a0 + (a1 - a0) * k / n, 0.02);
      k === 0 ? s.moveTo(p.x, p.y) : s.lineTo(p.x, p.y);
    }
    for (let k = n; k >= 0; k--) {
      const p = archPt(a0 + (a1 - a0) * k / n, -0.005);
      s.lineTo(p.x, p.y);
    }
    extrudeX(s, inW - 0.02, woodV(), 0);
  }
  // lid ends: wooden panels
  for (const sx of [1, -1]) {
    const g = new THREE.ShapeGeometry(lidShape(inD / 2 - 0.01, LS, LR - T - 0.01));
    const m = new THREE.Mesh(g, wood);
    m.rotation.y = sx * Math.PI / 2;
    const PX = W / 2 * 0.935;
    m.position.x = sx * PX;
    m.userData.noDeform = true;
    lid.add(m);
    for (const gy of [0.24, 0.36]) {
      const halfW = Math.sqrt(Math.max(0, 1 - ((gy - LS) / (LR - T)) ** 2)) * (inD / 2);
      box(0.004, 0.01, halfW * 2, woodDark, sx * (PX + 0.003), gy, 0, lid).userData.noDeform = true;
    }
  }

  // metal arch bands (lid ends + two straps), each = ring of arch shape
  const archBand = (x, width, inset, outset, mat) => {
    const outer = lidShape(D / 2 + outset, LS, LR + outset);
    const hole = new THREE.Path();
    const hd = D / 2 - inset, ah = LR - inset;
    const segs = 24;
    hole.moveTo(-hd, LS);
    for (let i = segs; i >= 0; i--) {
      const a = (i / segs) * Math.PI;
      hole.lineTo(Math.cos(a) * hd, LS + Math.sin(a) * ah);
    }
    // hole must be closed, keep it above the straight part
    hole.lineTo(-hd, LS);
    outer.holes.push(hole);
    return extrudeX(outer, width, mat, x);
  };
  // end bands: thick arch frame around the lid end
  for (const sx of [1, -1]) box(0.12, LS, D, metal, sx * (W / 2 - 0.06), LS / 2, 0, lid);
  // straps over the lid
  for (const x of strapX) {
    archBand(x, strapW, 0.035, 0.012, metal);
  }
  // lower rim band of lid (the straight part), all around
  for (const sz of [1, -1]) box(W, LS, T, metal, 0, LS / 2, sz * fz, lid);
  for (const sx of [1, -1]) box(T, LS, D, metal, sx * fx, LS / 2, 0, lid);
  // seam line between body and lid
  box(W + 0.004, 0.008, D + 0.004, metalDark, 0, 0.004, 0, lid);

  // Round the lid's shoulders as seen from the front: pull x inward near the top.
  const shoulder = (x, yl) => {
    const t = Math.min(1, Math.max(0, (yl - LS) / LR));
    return x * (1 - 0.18 * t ** 4);
  };
  lid.updateMatrixWorld(true);
  lid.traverse(o => {
    if (!o.isMesh || o.userData.noDeform) return;
    o.updateMatrix();
    o.geometry.applyMatrix4(o.matrix);
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    const pa = o.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setX(i, shoulder(pa.getX(i), pa.getY(i)));
    pa.needsUpdate = true;
    o.geometry.computeVertexNormals();
  });

  // swept end bands following the rounded shoulder
  const endBand = (sx, width, inset) => {
    const segs = 32, pos = [], idx = [];
    const ring = a => {
      const c = Math.cos(a), sn = Math.sin(a);
      const oz = c * D / 2, oy = LS + sn * LR;
      const iz = c * (D / 2 - inset), iy = LS + sn * (LR - inset);
      const xo = W / 2, xi = W / 2 - width;
      return [
        [shoulder(sx * xo, oy), oy, oz], [shoulder(sx * xi, oy), oy, oz],
        [shoulder(sx * xi, iy), iy, iz], [shoulder(sx * xo, iy), iy, iz],
      ];
    };
    const rings = [];
    for (let i = 0; i <= segs; i++) rings.push(ring((i / segs) * Math.PI));
    // four faces: outer(0-1), inner-x side(1-2), hole(2-3), outer-x side(3-0)
    for (let f = 0; f < 4; f++) {
      const a = f, b = (f + 1) % 4, base = pos.length / 3;
      for (let i = 0; i <= segs; i++) pos.push(...rings[i][a], ...rings[i][b]);
      for (let i = 0; i < segs; i++) {
        const p = base + i * 2;
        if (sx < 0) idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
        else idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, metal);
    lid.add(m);
  };
  for (const sx of [1, -1]) endBand(sx, 0.12, 0.11);

  // rivets on lid straps and rim (in root space, offset by BH)
  for (const x of strapX) {
    for (const sz of [1, -1]) {
      const n = sz > 0 ? NZ : NMZ;
      rivet(x, BH + LS / 2, sz * (D / 2 + 0.002), n);
      // along arch
      for (const a of [Math.PI * 0.2, Math.PI * 0.36]) {
        const aa = sz > 0 ? a : Math.PI - a;
        const z = Math.cos(aa) * (D / 2 + 0.012), y = BH + LS + Math.sin(aa) * (LR + 0.012);
        const nrm = new THREE.Vector3(0, Math.sin(aa) / (LR), Math.cos(aa) / (D / 2));
        rivet(shoulder(x, y - BH), y, z, nrm);
      }
    }
  }

  // ---------- lock (front) ----------
  const lockZ = D / 2;
  // hasp plate on lid
  box(0.24, 0.15, 0.03, metal, 0, BH + 0.065, lockZ + 0.015);
  // hasp tongue + staple loop
  box(0.07, 0.13, 0.02, metal, 0, BH + 0.03, lockZ + 0.04);
  const staple = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.013, 6, 12, Math.PI), metalDark);
  staple.position.set(0, BH + 0.1, lockZ + 0.055);
  staple.scale.set(1, 1.3, 1);
  root.add(staple);
  // shackle
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20, Math.PI), metal);
  shackle.position.set(0, BH - 0.06, lockZ + 0.06);
  root.add(shackle);
  for (const sx of [1, -1]) box(0.044, 0.05, 0.044, metal, sx * 0.075, BH - 0.085, lockZ + 0.06);
  // padlock body (rounded bottom)
  const pl = new THREE.Shape();
  const pw = 0.13, ptop = 0, pbot = -0.22;
  pl.moveTo(-pw, ptop);
  pl.lineTo(pw, ptop);
  pl.lineTo(pw, pbot + 0.08);
  pl.quadraticCurveTo(pw, pbot, pw - 0.08, pbot);
  pl.lineTo(-pw + 0.08, pbot);
  pl.quadraticCurveTo(-pw, pbot, -pw, pbot + 0.08);
  pl.lineTo(-pw, ptop);
  const plg = new THREE.ExtrudeGeometry(pl, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 });
  add(plg, metal, 0, BH - 0.1, lockZ + 0.03);
  // keyhole
  add(new THREE.CircleGeometry(0.022, 12), keyhole, 0, BH - 0.19, lockZ + 0.104);
  const kh = new THREE.Shape();
  kh.moveTo(-0.012, 0); kh.lineTo(0.012, 0); kh.lineTo(0.02, -0.06); kh.lineTo(-0.02, -0.06); kh.lineTo(-0.012, 0);
  add(new THREE.ShapeGeometry(kh), keyhole, 0, BH - 0.195, lockZ + 0.104);

  // ---------- hinges (back) ----------
  for (const x of [-0.37, 0.37]) {
    const z = -D / 2 - 0.03;
    box(0.23, 0.11, 0.02, metalDark, x, BH + 0.075, z);   // upper leaf (edge)
    box(0.21, 0.095, 0.022, metal, x, BH + 0.075, z - 0.002);
    box(0.23, 0.11, 0.02, metalDark, x, BH - 0.075, z);   // lower leaf
    box(0.21, 0.095, 0.022, metal, x, BH - 0.075, z - 0.002);
    for (const [bx, bw] of [[-0.085, 0.06], [0, 0.1], [0.085, 0.06]]) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, bw - 0.006, 10), bx === 0 ? metalDark : metal);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(x + bx, BH, z - 0.02);
      root.add(barrel);
    }
    for (const dx of [-0.075, 0.075]) for (const dy of [0.1, -0.1]) {
      rivet(x + dx, BH + dy, z - 0.013, NMZ);
    }
  }

  // ---------- rope handles (sides) ----------
  for (const sx of [1, -1]) {
    const pts = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * Math.PI;
      const z = Math.cos(a) * 0.21;
      const sag = Math.sin(a);
      pts.push(new THREE.Vector3(sx * (W / 2 + 0.03 + sag * 0.035), 0.46 - sag * 0.21, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    add(new THREE.TubeGeometry(curve, 32, 0.02, 8, false), ropeDark);
    // two twisted strands
    const frames = curve.computeFrenetFrames(80, false);
    for (const ph of [0, Math.PI]) {
      const hp = [];
      for (let i = 0; i <= 80; i++) {
        const t = i / 80, p = curve.getPointAt(t);
        const a = t * Math.PI * 2 * 9 + ph;
        hp.push(p.clone().addScaledVector(frames.normals[i], Math.cos(a) * 0.014).addScaledVector(frames.binormals[i], Math.sin(a) * 0.014));
      }
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 120, 0.017, 6, false), rope);
    }
    // ring mounts
    for (const z of [0.21, -0.21]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 6, 14), metalDark);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(sx * (W / 2 + 0.005), 0.46, z);
      root.add(ring);
    }
  }

  return root;
}

export default createChest;
