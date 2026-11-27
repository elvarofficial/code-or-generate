// Ogre carrying a goblin shaman on a rune pedestal.
// Stands on y = 0, faces +Z, up is +Y. 1 unit ~ 100 px of the reference sheet.
import * as THREE from 'three';

export function createGoblin() {
  const root = new THREE.Group();
  root.name = 'goblin-ogre-statue';

  // ---------- materials ----------
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  const mat = {
    stone: M(0x8d877b),
    stoneDark: M(0x5f5a52),
    skin: M(0x6f9a48),
    skinDark: M(0x587d38),
    gSkin: M(0x84ac4c),
    toenail: M(0xc9c09a),
    fur: M(0x8f7c66),
    furDark: M(0x76604a),
    leather: M(0x5a3a24),
    leatherLight: M(0x7a5536),
    cloth: M(0x6e4c33),
    clothDark: M(0x4f3628),
    hood: M(0x4b3a38),
    trim: M(0xa07a40),
    bone: M(0xe6dcc4),
    sack: M(0xa08560),
    sackDark: M(0x806848),
    rope: M(0x9c7a4e),
    pot: M(0xa85a35),
    potDark: M(0x6a3520),
    metal: M(0x3a3634, { metalness: 0.5, roughness: 0.5 }),
    gold: M(0xc8a040, { metalness: 0.6, roughness: 0.4 }),
    eye: M(0xffd040, { emissive: 0xffa020, emissiveIntensity: 0.8 }),
    glow: M(0xffc060, { emissive: 0xff9020, emissiveIntensity: 1.4 }),
    crystal: M(0xfff6dc, { emissive: 0xffe8b0, emissiveIntensity: 0.7, roughness: 0.3 }),
    potion: M(0x3a9a6a, { roughness: 0.3 }),
    wood: M(0x6b4528),
    featherBlue: M(0x41506e, { side: THREE.DoubleSide }),
    featherWhite: M(0xd8d8d4, { side: THREE.DoubleSide }),
    tooth: M(0xf0e8d0),
    mouth: M(0x3a2020),
  };

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const add = (mesh, parent = root) => { parent.add(mesh); return mesh; };

  function ell(material, pos, scale, seg = 10, parent) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(5, seg * 0.6 | 0)), material);
    m.position.copy(pos);
    m.scale.set(scale[0], scale[1], scale[2]);
    return add(m, parent);
  }
  // cylinder between two points
  function limb(material, a, b, r1, r2 = r1, seg = 10, open = false, parent) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r2, r1, len, seg, 1, open);
    const m = new THREE.Mesh(g, material);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
    return add(m, parent);
  }
  // cone from base point a to tip b
  function cone(material, a, b, r, seg = 10, parent) {
    return limb(material, a, b, r, 0.001, seg, false, parent);
  }
  function box(material, pos, size, rot = [0, 0, 0], parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    m.position.copy(pos);
    m.rotation.set(rot[0], rot[1], rot[2]);
    return add(m, parent);
  }

  // ======================= PEDESTAL =======================
  {
    const prof = [
      [0, 0], [2.1, 0], [2.12, 0.08], [2.1, 0.3], [1.98, 0.36],
      [1.97, 0.9], [1.9, 0.96], [1.9, 1.04], [1.84, 1.1], [0, 1.1],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.Mesh(new THREE.LatheGeometry(prof, 36), mat.stone));

    // runes carved on the front / +X side of the drum
    const R = 1.985;
    const runeAt = (ang, y, strokes) => {
      const g = new THREE.Group();
      g.position.set(Math.sin(ang) * R, y, Math.cos(ang) * R);
      g.rotation.y = ang;
      for (const [x0, y0, x1, y1] of strokes) {
        const dx = x1 - x0, dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.045, len, 0.03), mat.stoneDark);
        b.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
        b.rotation.z = -Math.atan2(dx, dy);
        g.add(b);
      }
      root.add(g);
    };
    const glyphs = [
      [[-0.08, -0.15, -0.08, 0.15], [-0.08, 0.15, 0.08, 0.0], [-0.08, 0.0, 0.08, -0.15]],
      [[-0.06, -0.15, -0.06, 0.15], [0.06, -0.15, 0.06, 0.15], [-0.06, 0.12, 0.06, 0.02]],
      [[0, -0.15, 0, 0.15], [-0.1, 0.12, 0, 0.0], [0.1, 0.12, 0, 0.0]],
      [[-0.08, 0.15, 0.08, 0.05], [0.08, 0.05, -0.08, -0.05], [-0.08, -0.05, 0.08, -0.15]],
      [[-0.07, -0.15, -0.07, 0.15], [-0.07, 0.15, 0.08, 0.15], [0.08, 0.15, 0.08, -0.15]],
      [[-0.09, 0.15, 0.09, -0.15], [0.09, 0.15, -0.09, -0.15]],
    ];
    let k = 0;
    for (let a = -1.25; a <= 1.7; a += 0.2) {
      if (Math.abs(a) < 0.3) continue;
      runeAt(a, 0.62, glyphs[k++ % glyphs.length]);
    }
    // round medallion with R glyph at the front
    const med = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.08, 20), mat.stone);
    med.rotation.x = Math.PI / 2;
    med.position.set(0, 0.62, 1.99);
    add(med);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 24), mat.stoneDark);
    ring.position.set(0, 0.62, 2.04);
    add(ring);
    runeAt(0, 0.62, [[-0.08, -0.17, -0.08, 0.17], [-0.08, 0.17, 0.08, 0.08], [0.08, 0.08, -0.08, 0.0], [-0.04, 0.0, 0.1, -0.17]]);
    root.children[root.children.length - 1].position.z = 2.06;
  }

  // ======================= OGRE =======================
  const ogre = new THREE.Group();
  ogre.name = 'ogre';
  root.add(ogre);
  const O = (m) => add(m, ogre);

  for (const s of [-1, 1]) {
    // feet
    ell(mat.skin, V(s * 0.95, 1.27, 0.12), [0.42, 0.2, 0.55], 12, ogre);
    for (let t = 0; t < 4; t++) {
      const tx = s * (0.95 + (t - 1.5) * 0.17 * -1);
      ell(mat.skin, V(tx + s * 0.05, 1.2, 0.62 - Math.abs(t - 1.2) * 0.05), [0.1, 0.09, 0.12], 6, ogre);
      ell(mat.toenail, V(tx + s * 0.05, 1.22, 0.72 - Math.abs(t - 1.2) * 0.05), [0.06, 0.04, 0.04], 6, ogre);
    }
    // shins & knees
    limb(mat.skin, V(s * 0.95, 1.3, 0.0), V(s * 0.88, 2.35, 0.12), 0.3, 0.34, 11, false, ogre);
    ell(mat.skin, V(s * 0.88, 2.4, 0.12), [0.36, 0.36, 0.36], 12, ogre);
    // leg wraps with fur tops
    limb(mat.leather, V(s * 0.94, 1.45, 0.02), V(s * 0.9, 2.05, 0.08), 0.35, 0.37, 11, false, ogre);
    for (const y of [1.6, 1.8]) limb(mat.leatherLight, V(s * 0.93, y, 0.03), V(s * 0.92, y + 0.08, 0.04), 0.375, 0.375, 11, false, ogre);
    limb(mat.fur, V(s * 0.9, 2.02, 0.08), V(s * 0.89, 2.2, 0.1), 0.42, 0.36, 12, false, ogre);
    // thighs
    limb(mat.skin, V(s * 0.88, 2.4, 0.1), V(s * 0.6, 3.25, 0.0), 0.38, 0.48, 11, false, ogre);
  }

  // torso
  ell(mat.skin, V(0, 3.45, 0.05), [0.95, 0.6, 0.72], 12, ogre);          // hips
  ell(mat.skin, V(0, 3.9, 0.22), [0.98, 0.72, 0.6], 12, ogre);           // belly
  ell(mat.skin, V(0, 4.55, -0.2), [1.22, 0.85, 0.85], 12, ogre);         // chest
  ell(mat.skinDark, V(0, 4.65, -0.55), [1.05, 0.95, 0.75], 12, ogre);    // back hump
  ell(mat.skin, V(-0.42, 4.55, 0.38), [0.45, 0.32, 0.25], 12, ogre);     // pecs
  ell(mat.skin, V(0.42, 4.55, 0.38), [0.45, 0.32, 0.25], 12, ogre);

  // arms
  for (const s of [-1, 1]) {
    const sh = V(s * 1.38, 4.75, -0.15);
    const el = V(s * 1.68, 3.55, 0.12);
    const wr = V(s * 1.74, 2.55, 0.5);
    ell(mat.skin, sh, [0.55, 0.52, 0.55], 12, ogre);
    limb(mat.skin, sh, el, 0.44, 0.38, 11, false, ogre);
    ell(mat.skin, el, [0.37, 0.37, 0.37], 12, ogre);
    limb(mat.skin, el, wr, 0.4, 0.33, 11, false, ogre);
    // upper arm band
    limb(mat.leather, V(s * 1.52, 4.2, -0.05), V(s * 1.56, 4.05, 0.0), 0.43, 0.43, 11, false, ogre);
    // bracer with fur cuffs
    limb(mat.leather, V(s * 1.7, 2.65, 0.45), V(s * 1.69, 3.4, 0.22), 0.43, 0.45, 11, false, ogre);
    for (const t of [0.25, 0.55, 0.8]) {
      const p = V(s * 1.7, 2.65 + t * 0.75, 0.45 - t * 0.23);
      limb(mat.leatherLight, p, p.clone().add(V(0, 0.07, -0.02)), 0.465, 0.465, 11, false, ogre);
    }
    limb(mat.fur, V(s * 1.69, 3.35, 0.24), V(s * 1.68, 3.62, 0.15), 0.5, 0.4, 12, false, ogre);
    limb(mat.fur, V(s * 1.72, 2.48, 0.52), V(s * 1.7, 2.7, 0.46), 0.38, 0.48, 12, false, ogre);
    // hand: palm + fingers curling
    const hp = V(s * 1.76, 2.15, 0.62);
    ell(mat.skin, hp, [0.36, 0.44, 0.3], 12, ogre);
    for (let f = 0; f < 4; f++) {
      const fz = 0.78 - f * 0.12;
      const a = V(s * 1.72, 1.95, fz);
      const b = V(s * 1.62, 1.62, fz + 0.04);
      limb(mat.skin, a, b, 0.1, 0.085, 8, false, ogre);
      ell(mat.skin, b, [0.07, 0.07, 0.07], 6, ogre);
    }
    // thumb (inner side, forward)
    limb(mat.skin, V(s * 1.6, 2.2, 0.8), V(s * 1.48, 1.95, 0.88), 0.09, 0.07, 8, false, ogre);
  }

  // neck & head (hunched far forward)
  limb(mat.skin, V(0, 4.75, 0.2), V(0, 4.95, 1.05), 0.55, 0.42, 11, false, ogre);
  const head = new THREE.Group();
  head.position.set(0, 5.0, 1.35);
  ogre.add(head);
  ell(mat.skin, V(0, 0.05, -0.05), [0.44, 0.48, 0.48], 12, head);       // skull
  ell(mat.skin, V(0, -0.28, 0.05), [0.46, 0.27, 0.45], 12, head);       // big jaw
  ell(mat.skinDark, V(0, 0.2, 0.3), [0.4, 0.1, 0.16], 12, head);        // brow ridge
  ell(mat.mouth, V(0, -0.22, 0.42), [0.24, 0.035, 0.08], 10, head);     // mouth
  // nose: bulbous pointed
  ell(mat.skin, V(0, 0.0, 0.48), [0.11, 0.12, 0.14], 12, head);
  cone(mat.skin, V(0, 0.02, 0.45), V(0, -0.1, 0.72), 0.1, 10, head);
  // eyes
  for (const s of [-1, 1]) {
    ell(mat.eye, V(s * 0.16, 0.1, 0.39), [0.065, 0.045, 0.04], 8, head);
    // tusks
    cone(mat.tooth, V(s * 0.17, -0.28, 0.42), V(s * 0.2, -0.05, 0.5), 0.05, 8, head);
    // ears pointing out & back
    const ear = cone(mat.skin, V(s * 0.38, 0.15, -0.05), V(s * 0.9, 0.34, -0.25), 0.2, 10, head);
    ear.scale.z = 0.5;
    const earIn = cone(mat.skinDark, V(s * 0.4, 0.15, -0.02), V(s * 0.8, 0.3, -0.2), 0.09, 8, head);
    earIn.scale.z = 0.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), mat.gold);
    ring.position.set(s * 0.44, -0.03, -0.05);
    ring.rotation.y = Math.PI / 2;
    head.add(ring);
  }

  // fur mantle over shoulders
  {
    const g = new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const mant = new THREE.Mesh(g, mat.fur);
    mant.material = mat.fur.clone();
    mant.material.side = THREE.DoubleSide;
    mant.position.set(0, 4.75, -0.25);
    mant.scale.set(1.62, 0.7, 1.15);
    O(mant);
    // shaggy tufts along the mantle edge
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const x = Math.sin(a) * 1.6, z = Math.cos(a) * 1.13 - 0.25;
      if (z > 0.6 && Math.abs(x) < 0.45) continue; // keep the neck opening free
      const base = V(x * 0.95, 4.9, z * 0.95);
      const tip = V(x * 1.04, 4.55 - (i % 3) * 0.07, z * 1.04);
      cone(i % 2 ? mat.fur : mat.furDark, base, tip, 0.2, 5, ogre);
    }
    // collar ring of fur around the neck, in front of the chest
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      // tall shaggy collar rising beside the head
      const p = V(s * (0.6 + i * 0.18), 5.05 - i * 0.08, 0.55 - i * 0.15);
      cone(i % 2 ? mat.fur : mat.furDark, p, p.clone().add(V(s * 0.12, 0.42 - i * 0.05, 0.05)), 0.17, 5, ogre);
      cone(mat.fur, p, p.clone().add(V(s * 0.05, -0.45, 0.12)), 0.14, 5, ogre);
    }
    // fur around top / shoulders
    for (const s of [-1, 1]) {
      ell(mat.fur, V(s * 1.15, 5.15, -0.25), [0.55, 0.35, 0.7], 12, ogre);
      cone(mat.furDark, V(s * 1.25, 5.1, 0.25), V(s * 1.0, 5.35, 0.6), 0.15, 6, ogre);
    }
    ell(mat.fur, V(0, 5.3, -0.55), [0.85, 0.4, 0.6], 12, ogre);
  }

  // chest straps (diagonals) + belt
  {
    const strap = (a, b) => {
      const m = limb(mat.leather, a, b, 0.07, 0.07, 6, false, ogre);
      m.scale.x = 1; return m;
    };
    // front: from both shoulders down to the necklace centre
    strap(V(-0.75, 5.1, 0.4), V(-0.05, 4.2, 0.72));
    strap(V(0.75, 5.1, 0.4), V(0.05, 4.2, 0.72));
    // back: X straps
    strap(V(-1.0, 5.15, -1.25), V(0.85, 3.65, -0.9));
    strap(V(1.0, 5.15, -1.25), V(-0.85, 3.65, -0.9));
    // side straps over shoulders to back
    strap(V(-0.75, 5.1, 0.4), V(-1.0, 5.15, -1.25));
    strap(V(0.75, 5.1, 0.4), V(1.0, 5.15, -1.25));
    // belt
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 6, 28), mat.leather);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(0, 3.62, 0.08);
    belt.scale.set(1.0, 0.82, 1.4);
    O(belt);
    box(mat.metal, V(-0.6, 3.62, 0.72), [0.16, 0.18, 0.05], [0, -0.5, 0], ogre);
    // rope belt at back
    const rb = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 5, 28), mat.rope);
    rb.rotation.x = Math.PI / 2;
    rb.position.set(0, 3.45, 0.0);
    rb.scale.set(1.0, 0.85, 1.0);
    O(rb);
  }

  // bone & fang necklace
  {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 24, Math.PI), mat.leather);
    arc.position.set(0, 4.55, 0.62);
    arc.rotation.set(Math.PI * 0.62, 0, Math.PI);
    O(arc);
    for (let i = -2; i <= 2; i++) {
      const x = i * 0.2;
      const y = 4.45 - (2 - Math.abs(i)) * 0.06;
      const z = 0.72 + (2 - Math.abs(i)) * 0.03;
      cone(mat.bone, V(x, y, z), V(x * 1.25, y - 0.32, z + 0.04), 0.06, 8, ogre);
    }
    // bone ornament
    box(mat.bone, V(0, 4.0, 0.84), [0.08, 0.32, 0.06], [0, 0, 0], ogre);
    box(mat.bone, V(0, 4.08, 0.84), [0.3, 0.07, 0.06], [0, 0, 0], ogre);
    for (const s of [-1, 1]) ell(mat.bone, V(s * 0.06, 3.84, 0.84), [0.06, 0.05, 0.05], 6, ogre);
  }

  // loincloths
  function jaggedFlap(w1, w2, h, teeth, material) {
    const sh = new THREE.Shape();
    sh.moveTo(-w1 / 2, 0);
    sh.lineTo(w1 / 2, 0);
    sh.lineTo(w2 / 2, -h + 0.15);
    for (let i = teeth; i >= 0; i--) {
      const x = -w2 / 2 + (w2 * i) / teeth;
      const deep = i % 2 ? 0.0 : 0.22 + (i % 3) * 0.08;
      sh.lineTo(x, -h + 0.15 - deep);
    }
    sh.lineTo(-w1 / 2, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
    g.translate(0, 0, -0.03);
    return new THREE.Mesh(g, material);
  }
  {
    const front = jaggedFlap(1.6, 1.3, 1.55, 8, mat.cloth);
    front.position.set(0.05, 3.5, 0.72);
    front.rotation.x = 0.08;
    O(front);
    // fur fringe at the top of the front flap
    for (let i = 0; i < 8; i++) {
      const x = -0.75 + i * 0.22;
      cone(mat.fur, V(x, 3.5, 0.75), V(x + 0.05, 3.15, 0.86), 0.11, 6, ogre);
    }
    const back = jaggedFlap(1.9, 1.6, 1.85, 9, mat.furDark);
    back.material = mat.furDark;
    back.position.set(0, 3.55, -0.62);
    back.rotation.x = -0.1;
    O(back);
    for (const s of [-1, 1]) {
      const side = jaggedFlap(0.9, 0.7, 1.1, 4, mat.clothDark);
      side.position.set(s * 0.88, 3.5, 0.05);
      side.rotation.set(0, s * Math.PI / 2, s * 0.08);
      O(side);
    }
    // skull ornament
    const sk = new THREE.Group();
    sk.position.set(-0.25, 2.68, 0.86);
    ogre.add(sk);
    ell(mat.bone, V(0, 0.05, 0), [0.15, 0.14, 0.1], 12, sk);
    ell(mat.bone, V(0, -0.1, 0), [0.09, 0.08, 0.08], 8, sk);
    for (const s of [-1, 1]) ell(mat.mouth, V(s * 0.06, 0.03, 0.085), [0.04, 0.035, 0.02], 6, sk);
    cone(mat.bone, V(0, -0.15, 0), V(0, -0.35, 0.02), 0.03, 5, sk);
    // potion vial
    limb(mat.potion, V(0.38, 2.6, 0.84), V(0.38, 2.95, 0.84), 0.09, 0.09, 10, false, ogre);
    limb(mat.leather, V(0.38, 2.95, 0.84), V(0.38, 3.05, 0.84), 0.05, 0.05, 8, false, ogre);
    limb(mat.potion, V(0.38, 2.48, 0.84), V(0.38, 2.6, 0.84), 0.06, 0.09, 10, false, ogre);
    // pouch on left hip (-X)
    ell(mat.leatherLight, V(-1.08, 3.05, 0.35), [0.32, 0.4, 0.3], 12, ogre);
    limb(mat.leather, V(-1.08, 3.38, 0.35), V(-1.05, 3.55, 0.35), 0.15, 0.2, 8, false, ogre);
  }

  // lantern hanging on the right hip (+X)
  {
    const L = new THREE.Group();
    L.position.set(1.0, 3.0, -0.6);
    ogre.add(L);
    const h = 0.55, w = 0.32;
    box(mat.glow, V(0, 0, 0), [w * 0.8, h * 0.85, w * 0.8], [0, 0, 0], L);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(mat.metal, V(sx * w / 2, 0, sz * w / 2), [0.045, h, 0.045], [0, 0, 0], L);
    box(mat.metal, V(0, -h / 2, 0), [w + 0.06, 0.06, w + 0.06], [0, 0, 0], L);
    box(mat.metal, V(0, h / 2, 0), [w + 0.06, 0.05, w + 0.06], [0, 0, 0], L);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 0.2, 4), mat.metal);
    roof.position.y = h / 2 + 0.12;
    roof.rotation.y = Math.PI / 4;
    L.add(roof);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), mat.metal);
    hook.position.y = h / 2 + 0.28;
    L.add(hook);
    limb(mat.leather, V(0, h / 2 + 0.34, 0), V(-0.2, 0.62, 0.0), 0.02, 0.02, 4, false, L);
  }

  // back gear: two big sacks, small sack, clay pot
  function sack(pos, sc, mtl = mat.sack) {
    const g = new THREE.Group();
    g.position.copy(pos);
    ogre.add(g);
    ell(mtl, V(0, 0, 0), [0.5 * sc, 0.52 * sc, 0.45 * sc], 16, g);
    limb(mtl, V(0, 0.4 * sc, 0), V(0.03, 0.72 * sc, 0), 0.22 * sc, 0.13 * sc, 10, false, g);
    limb(mtl, V(0.03, 0.72 * sc, 0), V(0.05, 0.82 * sc, 0), 0.13 * sc, 0.2 * sc, 10, false, g);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.16 * sc, 0.035 * sc, 5, 10), mat.rope);
    tie.rotation.x = Math.PI / 2;
    tie.position.y = 0.6 * sc;
    g.add(tie);
    return g;
  }
  {
    const s1 = sack(V(0.85, 4.95, -1.35), 1.05);
    s1.rotation.set(0.15, 0, -0.15);
    // stitched patch
    box(mat.sackDark, V(0.0, 0.0, -0.45), [0.35, 0.03, 0.03], [0, 0, 0.6], s1);
    box(mat.sackDark, V(0.0, 0.0, -0.45), [0.35, 0.03, 0.03], [0, 0, -0.6], s1);
    const s2 = sack(V(-0.8, 4.85, -1.4), 1.1);
    s2.rotation.set(0.15, 0, 0.12);
    const s3 = sack(V(0.45, 3.05, -1.05), 0.7, mat.sackDark);
    s3.rotation.set(0.1, 0, 0.05);
    const s4 = sack(V(-1.05, 2.8, -0.95), 0.6, mat.sack);

    // clay pot
    const pot = new THREE.Group();
    pot.position.set(-0.55, 3.05, -1.4);
    ogre.add(pot);
    const pp = [[0, -0.42], [0.2, -0.4], [0.38, -0.25], [0.44, 0], [0.38, 0.25], [0.24, 0.38], [0.22, 0.44], [0.3, 0.5], [0.27, 0.52], [0.18, 0.45]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const pg = new THREE.LatheGeometry(pp, 22);
    const pm = new THREE.Mesh(pg, mat.pot);
    pm.material = mat.pot.clone();
    pm.material.side = THREE.DoubleSide;
    pot.add(pm);
    pot.rotation.set(0.25, 0, 0.1);
    // painted zigzag band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 4, 22), mat.potDark);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.05;
    pot.add(band);
    limb(mat.rope, V(-0.3, 3.5, -1.3), V(0.3, 3.55, -1.15), 0.03, 0.03, 4, false, ogre);
  }

  // ======================= GOBLIN RIDER =======================
  const gob = new THREE.Group();
  gob.name = 'goblin';
  root.add(gob);
  {
    // seated robe body
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 1.05, 14), mat.cloth);
    robe.position.set(0, 6.15, -0.05);
    gob.add(robe);
    ell(mat.cloth, V(0, 5.7, 0.05), [0.55, 0.25, 0.55], 12, gob);
    // little legs straddling forward
    for (const s of [-1, 1]) {
      limb(mat.cloth, V(s * 0.25, 5.7, 0.1), V(s * 0.45, 5.45, 0.4), 0.13, 0.1, 8, false, gob);
      ell(mat.gSkin, V(s * 0.47, 5.4, 0.48), [0.09, 0.07, 0.14], 8, gob);
    }
    // collar / capelet
    ell(mat.hood, V(0, 6.6, -0.05), [0.5, 0.2, 0.42], 12, gob);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 24), mat.trim);
    trim.rotation.x = Math.PI / 2;
    trim.scale.set(1, 0.84, 1);
    trim.position.set(0, 6.52, -0.05);
    gob.add(trim);
    // belt / sash
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.035, 6, 20), mat.leather);
    sash.rotation.x = Math.PI / 2;
    sash.position.set(0, 6.0, -0.05);
    gob.add(sash);
    // tooth necklace
    for (let i = -1; i <= 1; i++) cone(mat.bone, V(i * 0.11, 6.45, 0.3), V(i * 0.13, 6.28, 0.35), 0.035, 6, gob);

    // head
    const hd = new THREE.Group();
    hd.position.set(0, 7.1, 0.08);
    gob.add(hd);
    ell(mat.gSkin, V(0, 0, 0.05), [0.24, 0.28, 0.25], 16, hd);
    ell(mat.gSkin, V(0, -0.15, 0.12), [0.17, 0.12, 0.17], 12, hd);      // chin
    cone(mat.gSkin, V(0, 0.0, 0.25), V(0, -0.15, 0.62), 0.07, 8, hd);   // long nose
    ell(mat.mouth, V(0, -0.16, 0.27), [0.1, 0.02, 0.03], 8, hd);
    for (const s of [-1, 1]) {
      ell(mat.eye, V(s * 0.09, 0.06, 0.26), [0.05, 0.035, 0.03], 8, hd);
      const ear = cone(mat.gSkin, V(s * 0.2, 0.1, 0.0), V(s * 0.8, 0.24, -0.08), 0.17, 10, hd);
      ear.scale.z = 0.35;
      const ei = cone(mat.skinDark, V(s * 0.22, 0.1, 0.02), V(s * 0.66, 0.2, -0.06), 0.07, 8, hd);
      ei.scale.z = 0.4;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10), mat.gold);
      ring.position.set(s * 0.36, 0.03, 0.02);
      ring.rotation.y = Math.PI / 2;
      hd.add(ring);
    }
    // hood: open-front shell + peak drooping back
    const hg = new THREE.SphereGeometry(0.34, 20, 14, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.8);
    const hood = new THREE.Mesh(hg, mat.hood.clone());
    hood.material.side = THREE.DoubleSide;
    hood.position.set(0, 0.04, -0.02);
    hood.scale.set(1.25, 1.3, 1.2);
    hd.add(hood);
    cone(mat.hood, V(0, 0.28, -0.16), V(0, 0.6, -0.55), 0.26, 12, hd);
    const htrim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 20, Math.PI * 1.2), mat.trim);
    htrim.position.set(0, 0.02, 0.3);
    htrim.rotation.z = -Math.PI * 0.1;
    htrim.scale.set(1.0, 1.25, 1);
    hd.add(htrim);

    // right arm (-X) holding staff
    const shR = V(-0.38, 6.5, 0.0);
    const elR = V(-0.75, 6.25, 0.2);
    const haR = V(-0.98, 6.6, 0.42);
    limb(mat.cloth, shR, elR, 0.18, 0.16, 8, false, gob);
    limb(mat.cloth, elR, haR, 0.16, 0.21, 8, false, gob);
    ell(mat.gSkin, haR.clone().add(V(-0.03, 0.03, 0.02)), [0.15, 0.14, 0.14], 10, gob);
    // left arm (+X) reaching forward-down
    const shL = V(0.38, 6.5, 0.0);
    const elL = V(0.72, 6.3, 0.25);
    const haL = V(0.95, 6.15, 0.6);
    limb(mat.cloth, shL, elL, 0.18, 0.16, 8, false, gob);
    limb(mat.cloth, elL, haL, 0.16, 0.2, 8, false, gob);
    ell(mat.gSkin, haL.clone().add(V(0.03, -0.05, 0.05)), [0.15, 0.13, 0.15], 10, gob);
    for (let f = 0; f < 3; f++)
      cone(mat.gSkin, V(0.97 + f * 0.04 - 0.04, 6.05, 0.68), V(0.95 + f * 0.06 - 0.06, 5.9, 0.78), 0.03, 5, gob);
  }

  // staff
  {
    const a = V(-0.82, 5.55, 0.2);
    const b = V(-1.12, 8.2, 0.95);
    limb(mat.wood, a, b, 0.05, 0.045, 8, false, gob);
    const wraps = [0.32, 0.36, 0.4];
    for (const t of wraps) {
      const p = a.clone().lerp(b, t);
      limb(mat.leatherLight, p, a.clone().lerp(b, t + 0.025), 0.06, 0.06, 8, false, gob);
    }
    // fork
    const f1 = V(-1.28, 8.65, 1.0), f2 = V(-1.0, 8.6, 1.02);
    limb(mat.wood, b, f1, 0.045, 0.035, 6, false, gob);
    limb(mat.wood, b, f2, 0.045, 0.035, 6, false, gob);
    // crystal cradled in fork
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), mat.crystal);
    cr.position.set(-1.15, 8.68, 1.0);
    cr.scale.set(0.9, 1.7, 0.9);
    gob.add(cr);
    // feather bunches hanging from the staff
    function feather(base, dir, len, width, mtlTip, mtlBase) {
      const g = new THREE.Group();
      g.position.copy(base);
      const vane = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), mtlTip);
      vane.scale.set(width, len / 2, 0.015);
      vane.position.y = len * 0.55;
      g.add(vane);
      const lower = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), mtlBase);
      lower.scale.set(width * 0.85, len * 0.28, 0.02);
      lower.position.y = len * 0.3;
      g.add(lower);
      g.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
      gob.add(g);
    }
    const top = V(-1.18, 8.35, 0.98);
    for (const d of [[-0.9, 0.55, 0.0], [-1.0, 0.3, 0.05], [-0.7, 0.8, -0.05], [-1.0, 0.05, 0.08]])
      feather(top, V(...d), 0.75, 0.08, mat.featherBlue, mat.featherWhite);
    const mid = V(-1.08, 7.9, 0.85);
    for (const d of [[-0.35, -0.9, 0.05], [-0.15, -1.0, 0.1], [-0.5, -0.8, 0.0]])
      feather(mid, V(...d), 0.75, 0.08, mat.featherBlue, mat.featherWhite);
  }

  return root;
}

export default createGoblin;
