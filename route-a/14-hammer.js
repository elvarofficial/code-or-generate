// Stylized war hammer with a stone head (bear relief on the front, rune-carved end caps),
// wooden haft, metal bands, leather-wrapped grip and a pommel ring.
// Stands on y = 0, faces +Z, up is +Y. Units: ~1 unit = 1 m (overall height ~0.9).
import * as THREE from 'three';

const P = 0.001; // reference pixels -> units
const px = (x) => (x - 512) * P;   // image x -> world X (front view)
const py = (y) => (960 - y) * P;   // image y -> world Y

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts });
}

// Box with chamfered edges (centered), made from a beveled extrusion.
function chamferBox(w, h, d, c) {
  const s = new THREE.Shape();
  const hw = w / 2 - c, hh = h / 2 - c, k = c * 0.6;
  s.moveTo(-hw + k, -hh);
  s.lineTo(hw - k, -hh); s.lineTo(hw, -hh + k);
  s.lineTo(hw, hh - k); s.lineTo(hw - k, hh);
  s.lineTo(-hw + k, hh); s.lineTo(-hw, hh - k);
  s.lineTo(-hw, -hh + k); s.lineTo(-hw + k, -hh);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: 1, curveSegments: 1,
  });
  g.translate(0, 0, -(d - 2 * c) / 2);
  g.computeVertexNormals();
  return g;
}

// Perturb vertices slightly for a hand-sculpted stone look (deterministic).
function roughen(geo, amt, seed = 1) {
  const pos = geo.attributes.position;
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (!map.has(key)) map.set(key, [rnd() * amt, rnd() * amt, rnd() * amt]);
    const o = map.get(key);
    pos.setXYZ(i, pos.getX(i) + o[0], pos.getY(i) + o[1], pos.getZ(i) + o[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createHammer() {
  const root = new THREE.Group();
  root.name = 'hammer';

  const stone = mat(0x9b978f, { roughness: 0.95 });
  const stoneDark = mat(0x45413d, { roughness: 1 });
  const stoneLight = mat(0xaaa69d, { roughness: 0.95 });
  const wood = mat(0x8d5a32);
  const woodEnd = mat(0xa0703f);
  const leather = mat(0x7b4a29);
  const leatherDark = mat(0x5a341c);
  const metal = mat(0xa6aaae, { metalness: 0.5, roughness: 0.45 });
  const metalDark = mat(0x7c8085, { metalness: 0.5, roughness: 0.5 });

  const add = (geo, m, x = 0, y = 0, z = 0, parent = root) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ---------------- Haft ----------------
  const R = 0.05;
  // wooden shaft running through the head and poking out of the top
  add(new THREE.CylinderGeometry(0.047, 0.049, py(540) - py(940) + 0.4, 10), wood, 0, (py(940) + py(65)) / 2 - 0.1 + 0.1);
  const shaftTop = add(new THREE.CylinderGeometry(0.051, 0.051, py(66) - py(110), 10), wood, 0, (py(66) + py(110)) / 2);
  add(new THREE.CylinderGeometry(0.048, 0.051, 0.006, 10), woodEnd, 0, py(66) + 0.002);
  // visible upper wood section (between collar and upper band)
  add(new THREE.CylinderGeometry(0.048, 0.050, py(432) - py(540), 10), wood, 0, (py(432) + py(540)) / 2);
  // wood grain streaks
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const g = new THREE.BoxGeometry(0.004, py(440) - py(535), 0.004);
    const m = add(g, mat(0x6a3f22), Math.sin(a) * 0.0495, (py(440) + py(535)) / 2, Math.cos(a) * 0.0495);
    m.rotation.y = a;
  }

  // collar under the head
  add(new THREE.CylinderGeometry(0.060, 0.056, py(398) - py(435), 12), metal, 0, (py(398) + py(435)) / 2);
  add(new THREE.CylinderGeometry(0.062, 0.062, 0.012, 12), metalDark, 0, py(400));

  // metal band with studs
  function band(yTop, yBot, r) {
    const h = py(yTop) - py(yBot), yc = (py(yTop) + py(yBot)) / 2;
    add(new THREE.CylinderGeometry(r, r, h, 14), metal, 0, yc);
    add(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.008, 14), metalDark, 0, py(yTop) - 0.004);
    add(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.008, 14), metalDark, 0, py(yBot) + 0.004);
    for (const z of [1, -1]) add(new THREE.SphereGeometry(0.013, 8, 6), metal, 0, yc, z * r);
    for (const x of [1, -1]) {
      const sp = add(new THREE.ConeGeometry(0.011, 0.014, 6), metalDark, x * (r + 0.005), yc, 0);
      sp.rotation.z = -x * Math.PI / 2;
    }
  }
  band(538, 595, 0.060);
  band(812, 868, 0.060);

  // leather grip with spiral wraps
  const gTop = py(595), gBot = py(812);
  add(new THREE.CylinderGeometry(0.052, 0.052, gTop - gBot, 12), leather, 0, (gTop + gBot) / 2);
  const wraps = 7;
  for (let i = 0; i < wraps; i++) {
    const y = gBot + 0.02 + (i / (wraps - 1)) * (gTop - gBot - 0.04);
    const t = new THREE.CylinderGeometry(0.0545, 0.0545, 0.026, 14, 1, true);
    const m = add(t, i % 2 ? leatherDark : mat(0x8a5530), 0, y, 0);
    m.material.side = THREE.DoubleSide;
    m.rotation.x = (i % 2 ? 1 : -1) * 0.28;
    m.rotation.z = (i % 3 - 1) * 0.12;
  }
  // a few scratch marks on the leather
  for (const [a, y, r] of [[0.3, 0.27, 0.6], [-0.4, 0.21, -0.4], [0.1, 0.33, 0.9], [0.5, 0.17, 0.2]]) {
    const sc = add(new THREE.BoxGeometry(0.02, 0.003, 0.003), leatherDark, Math.sin(a) * 0.057, y, Math.cos(a) * 0.057);
    sc.rotation.set(0, a, r);
  }

  // pommel ring
  add(new THREE.CylinderGeometry(0.03, 0.045, 0.02, 10), metalDark, 0, py(878));
  add(new THREE.SphereGeometry(0.018, 8, 6), metal, 0, py(888));
  const ring = add(new THREE.TorusGeometry(0.041, 0.012, 6, 16), metal, 0, py(916));
  ring.rotation.y = 0.25;

  // ---------------- Head ----------------
  const head = new THREE.Group();
  root.add(head);
  const headTop = py(100), headBot = py(395);
  const headY = (headTop + headBot) / 2;
  const coreW = px(668) - px(357), coreH = headTop - headBot, coreD = 0.24;
  add(roughen(chamferBox(coreW, coreH, coreD, 0.012), 0.004, 3), stone, 0, headY, 0, head);

  // end caps
  const capTop = py(70), capBot = py(420), capY = (capTop + capBot) / 2;
  const capW = 0.152, capH = capTop - capBot, capD = 0.285;
  for (const side of [-1, 1]) {
    const cx = side * (0.5 * coreW + capW / 2 - 0.004);
    add(roughen(chamferBox(capW, capH, capD, 0.035), 0.005, side > 0 ? 7 : 11), stone, cx, capY, 0, head);
    // runes on front and back face of each cap
    for (const fz of [1, -1]) {
      for (let r = 0; r < 4; r++) {
        const ry = capY + 0.11 - r * 0.073;
        const rx = cx - side * 0.012;
        runeGlyph(head, stoneDark, rx, ry, fz * (capD / 2 + 0.0005), fz, (r + (side > 0 ? 2 : 0) + (fz < 0 ? 5 : 0)) % 6);
      }
    }
    // runes on the cap's outer end face? (plain, slightly chipped)
  }

  // bear relief on front face
  // recessed panel frame around the bear
  const panel = add(new THREE.CylinderGeometry(0.135, 0.135, 0.006, 20), mat(0x8a867f), 0, headY + 0.005, coreD / 2 + 0.001, head);
  panel.rotation.x = Math.PI / 2; panel.scale.set(1.0, 1, 0.92);
  buildBear(head, stone, stoneLight, stoneDark, 0, headY - 0.005, coreD / 2 + 0.004);

  // chips/dents on the plain back face
  for (const [x, y, w, h] of [[-0.06, 0.08, 0.03, 0.01], [0.04, 0.05, 0.02, 0.012], [0.08, -0.04, 0.03, 0.01], [-0.03, -0.06, 0.04, 0.008], [0.1, 0.1, 0.015, 0.02]]) {
    const d = add(new THREE.SphereGeometry(1, 8, 4), mat(0x85817a), x, headY + y, -coreD / 2 + 0.0005, head);
    d.scale.set(w * 0.6, h * 0.9, 0.002);
  }

  return root;
}

// A rune made from 2-3 thin strokes.
function runeGlyph(parent, m, x, y, z, fz, kind) {
  const strokes = [
    [[0, 0, 0.05, 0], [0.012, 0.012, 0.025, -0.6], [0.012, -0.002, 0.025, -0.6]], // F
    [[0, 0, 0.05, 0], [0.01, 0.01, 0.03, 0.8], [0.01, -0.01, 0.03, -0.8]],          // R-like
    [[0, 0, 0.05, 0], [0.012, 0.01, 0.03, -0.7]],                                  // ᛚ
    [[-0.008, 0, 0.05, 0.5], [0.008, 0, 0.05, -0.5]],                              // ᚲ / ^
    [[0, 0.005, 0.04, 0.6], [0, -0.008, 0.035, -0.6]],                              // <
    [[-0.01, 0, 0.05, 0], [0.01, 0, 0.05, 0], [0, 0.008, 0.026, 1.2]],              // ᚺ
  ][kind];
  for (const [dx, dy, len, rot] of strokes) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.007, len, 0.004), m);
    b.position.set(x + dx * fz, y + dy, z);
    b.rotation.z = rot * fz;
    parent.add(b);
  }
}

// Bear head relief: recessed outline + raised face shape with ears, brows, snout, nose, mouth.
function buildBear(parent, stone, light, dark, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);

  const headShape = (s) => {
    const sh = new THREE.Shape();
    // a broad bear head outline (points in units, centered)
    const pts = [[0, -0.105], [0.04, -0.095], [0.08, -0.06], [0.11, -0.005], [0.115, 0.04], [0.1, 0.075],
      [0.06, 0.09], [0, 0.093], [-0.06, 0.09], [-0.1, 0.075], [-0.115, 0.04], [-0.11, -0.005], [-0.08, -0.06], [-0.04, -0.095]];
    pts.forEach(([a, b], i) => (i ? sh.lineTo(a * s, b * s) : sh.moveTo(a * s, b * s)));
    sh.closePath();
    return sh;
  };
  const ext = (sh, d) => new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: d * 0.5, bevelSize: 0.003, bevelSegments: 1, curveSegments: 4 });

  // dark outline (slightly larger, very thin), then raised face
  const outline = new THREE.Mesh(new THREE.ShapeGeometry(headShape(1.1)), dark);
  outline.position.z = 0.0002;
  g.add(outline);
  const face = new THREE.Mesh(ext(headShape(1.0), 0.008), light);
  face.position.z = 0.001;
  g.add(face);

  // ears
  for (const s of [-1, 1]) {
    const earO = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 14), dark);
    earO.rotation.x = Math.PI / 2; earO.position.set(s * 0.09, 0.085, 0.0012); g.add(earO);
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.014, 14), light);
    ear.rotation.x = Math.PI / 2; ear.position.set(s * 0.09, 0.085, 0.006); g.add(ear);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 10), stone);
    inner.rotation.x = Math.PI / 2; inner.position.set(s * 0.088, 0.083, 0.0135); g.add(inner);
    // angry brow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.010, 0.008), dark);
    brow.position.set(s * 0.04, 0.03, 0.016); brow.rotation.z = s * 0.4; g.add(brow);
    // eye
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.009, 0.004), dark);
    eye.position.set(s * 0.042, 0.015, 0.016); eye.rotation.z = s * 0.35; g.add(eye);
    // cheek lines
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.05, 0.004), dark);
    ch.position.set(s * 0.075, -0.035, 0.0155); ch.rotation.z = -s * 0.5; g.add(ch);
  }
  // snout (raised)
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.014, 12), light);
  snout.rotation.x = Math.PI / 2; snout.scale.set(1, 1, 1.15); snout.position.set(0, -0.045, 0.018); g.add(snout);
  // nose bridge
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.008), light);
  bridge.position.set(0, -0.005, 0.014); g.add(bridge);
  // nose
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.01, 0.008, 6), dark);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.032, 0.027); nose.scale.set(1.7, 1.4, 1.3); g.add(nose);
  // mouth
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.004), dark);
  m1.position.set(0, -0.052, 0.026); g.add(m1);
  for (const s of [-1, 1]) {
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.004, 0.004), dark);
    m2.position.set(s * 0.012, -0.063, 0.025); m2.rotation.z = s * 0.3; g.add(m2);
  }
}

export default createHammer;
