import * as THREE from 'three';

// Cluster of three glowing fly-agaric mushrooms on a mossy rock base.
// Stands on y = 0, faces +Z, up is +Y. Roughly 6.5 units wide, 9 units tall.

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise3(x, y, z) {
  return (
    Math.sin(x * 1.7 + y * 0.6 + 1.3) * Math.cos(z * 1.9 - x * 0.4) * 0.5 +
    Math.sin(x * 3.1 - z * 2.3 + y * 1.1) * 0.3 +
    Math.cos(y * 2.7 + z * 3.3 + x * 0.8) * 0.2
  );
}

const col = (h) => new THREE.Color(h);

// ---------- materials ----------
const capMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
const spotMat = new THREE.MeshStandardMaterial({ color: 0xf2e6d8, roughness: 0.8 });
const gillMat = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.6, emissive: 0x2a9fe0, emissiveIntensity: 0.55, side: THREE.DoubleSide,
});
const stemMat = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.55, emissive: 0x2c8ed8, emissiveIntensity: 0.45,
});
const skirtMat = new THREE.MeshStandardMaterial({
  color: 0x8fe4ff, roughness: 0.55, emissive: 0x3aa8e8, emissiveIntensity: 0.5, side: THREE.DoubleSide,
});
const baseMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
const mossMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

// ---------- stem: swept tube along a quadratic bezier ----------
function makeStem(p0, p1, p2, rFn, seed, radial = 16, segs = 22) {
  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], colors = [], idx = [];
  const cTop = col(0x9ae6ff), cMid = col(0x6cc6f4), cBot = col(0x4a9ad8);
  const c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPointAt(t);
    // use a stable horizontal frame so the tube does not twist
    const tan = curve.getTangentAt(t);
    const side = new THREE.Vector3(1, 0, 0).sub(tan.clone().multiplyScalar(tan.x)).normalize();
    const bin = new THREE.Vector3().crossVectors(tan, side).normalize();
    const r = rFn(t);
    if (t < 0.5) c.copy(cBot).lerp(cMid, t * 2); else c.copy(cMid).lerp(cTop, (t - 0.5) * 2);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const wob = 1 + 0.06 * Math.sin(a * 5 + seed + t * 7) + 0.04 * Math.sin(a * 9 - t * 11);
      const v = p.clone()
        .addScaledVector(side, Math.cos(a) * r * wob)
        .addScaledVector(bin, Math.sin(a) * r * wob);
      pos.push(v.x, v.y, v.z);
      const streak = 0.9 + 0.2 * Math.sin(a * 7 + seed * 3);
      colors.push(c.r * streak, c.g * streak, Math.min(1, c.b * streak));
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { mesh: new THREE.Mesh(g, stemMat), curve };
}

// ---------- ragged ring (annulus skirt) around the stem ----------
function makeSkirt(rTop, rBot, h, seed) {
  const radial = 28, rows = 3;
  const pos = [], idx = [];
  const rnd = rand(seed);
  const jag = [];
  for (let j = 0; j <= radial; j++) jag.push(j === radial ? jag[0] : rnd());
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const drop = t === 1 ? jag[j] * 0.35 * h : 0;
      const r = THREE.MathUtils.lerp(rTop, rBot, t * t) * (1 + (t === 1 ? 0.08 * Math.sin(a * 6 + seed) : 0));
      pos.push(Math.cos(a) * r, -t * h - drop, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, skirtMat);
}

// ---------- cap: dome with spots and glowing gills ----------
function makeCap(R, H, seed, spotCount) {
  const grp = new THREE.Group();
  const rnd = rand(seed);
  // profile in (r, y): rim at y=0, top at y=H
  const radial = 40, rings = 16;
  const profile = (t) => {
    // t: 0 = top centre, 1 = rim edge (outer lip), slightly turned down at the edge
    const u = Math.sin(t * Math.PI * 0.5); // denser rings toward the brim
    const r = R * u;
    // rounded crown blending into a straight sloping cone toward the brim
    const cone = 1 - Math.sin(t * Math.PI * 0.5);
    const dome = Math.cos(t * Math.PI * 0.5);
    let y = H * (1 - Math.pow(u, 2.1)) * 0.94 + H * 0.06 * dome;
    void cone;
    return [r, y];
  };
  const pos = [], colors = [], idx = [];
  const cTop = col(0xd85a2e), cMid = col(0xc63a2a), cRim = col(0x9a2c3c);
  const c = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const [r, y] = profile(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = 1 + 0.03 * Math.sin(a * 4 + seed) + 0.02 * Math.sin(a * 7 - seed * 2);
      pos.push(Math.cos(a) * r * n, y * (1 + 0.03 * Math.sin(a * 3 + seed)), Math.sin(a) * r * n);
      if (t < 0.5) c.copy(cTop).lerp(cMid, t * 2); else c.copy(cMid).lerp(cRim, (t - 0.5) * 2);
      const sh = 0.93 + 0.1 * Math.sin(a * 3 + seed + t * 4);
      colors.push(c.r * sh, c.g * sh, c.b * sh);
    }
  }
  // lip: tuck under to y = -lip
  const lipY = -H * 0.09, lipR = R * 0.96;
  for (let j = 0; j <= radial; j++) {
    const a = (j / radial) * Math.PI * 2;
    const n = 1 + 0.03 * Math.sin(a * 4 + seed) + 0.02 * Math.sin(a * 7 - seed * 2);
    pos.push(Math.cos(a) * lipR * n, lipY, Math.sin(a) * lipR * n);
    colors.push(cRim.r * 0.85, cRim.g * 0.85, cRim.b * 0.85);
  }
  for (let i = 0; i < rings + 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, capMat));

  // underside gills: shallow cone rising toward the stem, with radial ridges
  const gp = [], gc = [], gi = [];
  const gRad = 64, gRings = 6;
  const gIn = col(0x9ae8ff), gOut = col(0x3f9ee8);
  for (let i = 0; i <= gRings; i++) {
    const t = i / gRings; // 0 centre, 1 rim
    const r = lipR * 0.97 * (0.12 + 0.88 * t);
    for (let j = 0; j <= gRad; j++) {
      const a = (j / gRad) * Math.PI * 2;
      const ridge = Math.pow(Math.abs(Math.sin(a * 20)), 3);
      const y = lipY + H * 0.32 * (1 - t) + ridge * 0.03 * R * t * (1 - t) * 3;
      gp.push(Math.cos(a) * r, y, Math.sin(a) * r);
      c.copy(gIn).lerp(gOut, t);
      const k = 0.85 + 0.25 * ridge;
      gc.push(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k));
    }
  }
  for (let i = 0; i < gRings; i++)
    for (let j = 0; j < gRad; j++) {
      const a = i * (gRad + 1) + j, b = a + gRad + 1;
      gi.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
  gg.setIndex(gi);
  gg.computeVertexNormals();
  grp.add(new THREE.Mesh(gg, gillMat));

  // spots: flattened spheres on the dome surface
  const spotGeo = new THREE.SphereGeometry(1, 8, 4);
  for (let k = 0; k < spotCount; k++) {
    const f = (k + 0.5) / spotCount;
    const t = Math.min(0.8, Math.sqrt(f) * 0.82 + (rnd() - 0.5) * 0.04);
    const a = k * 2.39996 + rnd() * 0.5;
    const [r, y] = profile(t);
    const [r2, y2] = profile(Math.min(1, t + 0.01));
    const p = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    // surface normal from profile slope
    const dr = r2 - r, dy = y2 - y;
    const nrm = new THREE.Vector3(Math.cos(a) * -dy, dr, Math.sin(a) * -dy).normalize();
    const s = R * (0.07 + rnd() * 0.07) * (t > 0.7 ? 0.75 : 1);
    const m = new THREE.Mesh(spotGeo, spotMat);
    m.position.copy(p).addScaledVector(nrm, -s * 0.12);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    m.scale.set(s * (1 + rnd() * 0.3), s * 0.22, s);
    grp.add(m);
  }
  return grp;
}

// ---------- one mushroom ----------
function makeMushroom(o) {
  const g = new THREE.Group();
  const stem = makeStem(o.p0, o.p1, o.p2, o.rFn, o.seed);
  g.add(stem.mesh);
  // skirt along the stem
  const sp = stem.curve.getPointAt(o.skirtT);
  const stan = stem.curve.getTangentAt(o.skirtT);
  const sk = makeSkirt(o.rFn(o.skirtT) * 1.05, o.rFn(o.skirtT) * 1.45, o.skirtH, o.seed + 7);
  sk.position.copy(sp);
  sk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stan);
  g.add(sk);
  // cap
  const cap = makeCap(o.R, o.H, o.seed + 13, o.spots);
  cap.position.copy(o.capPos);
  cap.rotation.set(o.capRot[0], 0, o.capRot[2]);
  cap.rotateY(o.capRot[1]);
  g.add(cap);
  return g;
}

// ---------- mossy rock base ----------
function makeBase() {
  const grp = new THREE.Group();
  const radial = 64, rows = 14;
  const rx = 3.2, rz = 2.9;
  const pos = [], colors = [], idx = [];
  const rock = col(0x6a6852), rockDark = col(0x45463a), moss = col(0x55893a), mossLight = col(0x8db24a), mossDark = col(0x2f6a34);
  const c = new THREE.Color();
  // profile: t=0 bottom edge, ... up side, over the shoulder, to the top centre (t=1)
  const prof = (t) => {
    if (t < 0.35) { // rock wall, slight inward taper toward the bottom
      const u = t / 0.35;
      return [0.94 + 0.06 * Math.sin(u * Math.PI * 0.5), u * 1.1];
    }
    const u = (t - 0.35) / 0.65; // rounded shoulder up to a low dome
    const r = Math.cos(u * Math.PI * 0.5);
    const y = 1.1 + Math.pow(Math.sin(u * Math.PI * 0.5), 0.8) * 1.3;
    return [r, y];
  };
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const [rr, y0] = prof(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const x = Math.cos(a), z = Math.sin(a);
      const n = noise3(x * 2, y0, z * 2);
      const lump = 1 + 0.05 * n * (t > 0.05 ? 1 : 0.3);
      let y = y0 + (t > 0.3 ? 0.12 * noise3(x * 3 + 2, 0, z * 3) : 0);
      if (i === 0) y = 0;
      pos.push(x * rx * rr * lump, y, z * rz * rr * lump);
      // moss line hangs down irregularly over the rock
      const mossLine = 1.0 + 0.3 * noise3(x * 4, 1, z * 4) + 0.12 * Math.sin(a * 13);
      const yy = y0;
      if (yy > mossLine + 0.6) {
        const k = 0.5 + 0.5 * noise3(x * 6, yy * 2, z * 6);
        c.copy(mossDark).lerp(mossLight, k);
        if (yy > 2.1) c.lerp(moss, 0.4);
      } else if (yy > mossLine) {
        c.copy(moss).lerp(mossDark, 0.4);
      } else {
        const k = 0.5 + 0.5 * noise3(x * 5 + 3, yy * 3, z * 5);
        c.copy(rockDark).lerp(rock, k);
        if (yy < 0.15) c.multiplyScalar(0.8);
      }
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  grp.add(new THREE.Mesh(g, baseMat));
  // bottom cap
  const bot = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: 0x3e3d33 }));
  bot.rotation.x = Math.PI / 2;
  bot.scale.set(rx * 0.93, rz * 0.93, 1);
  bot.position.y = 0.001;
  grp.add(bot);

  // moss clumps on top
  const rnd = rand(42);
  const clumpGeo = new THREE.IcosahedronGeometry(1, 1);
  const cc = [];
  for (let i = 0; i < clumpGeo.attributes.position.count; i++) cc.push(1, 1, 1);
  clumpGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
  for (let k = 0; k < 26; k++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.75;
    const x = Math.cos(a) * d * rx, z = Math.sin(a) * d * rz;
    const yTop = 1.1 + 1.3 * Math.pow(Math.max(0, 1 - d * d), 0.4);
    const m = new THREE.Mesh(clumpGeo, new THREE.MeshStandardMaterial({
      color: new THREE.Color().copy(mossDark).lerp(mossLight, rnd()), roughness: 0.95, flatShading: true,
    }));
    const s = 0.25 + rnd() * 0.3;
    m.scale.set(s * 1.3, s * 0.7, s * 1.1);
    m.position.set(x, yTop - s * 0.25, z);
    grp.add(m);
  }
  return { grp, prof, rx, rz };
}

// moss collar creeping up a stem base
function makeMossCollar(x, y, z, r, h, seed) {
  const rnd = rand(seed);
  const radial = 22, rows = 4;
  const pos = [], colors = [], idx = [];
  const c1 = col(0x3f7a2c), c2 = col(0x7cb440);
  const tips = [];
  for (let j = 0; j <= radial; j++) tips.push(j === radial ? tips[0] : 0.4 + rnd() * 0.9);
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const hh = h * tips[j];
      const rr = r * (1.9 - 0.85 * Math.pow(t, 0.6));
      pos.push(x + Math.cos(a) * rr, y + t * hh - 0.1, z + Math.sin(a) * rr);
      const c = c1.clone().lerp(c2, t * 0.8 + rnd() * 0.2);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mossMat);
}

export default function createMushrooms() {
  const root = new THREE.Group();
  root.name = 'mushrooms';
  const base = makeBase();
  root.add(base.grp);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // tall centre mushroom
  root.add(makeMushroom({
    seed: 1,
    p0: V(-0.05, 2.0, -0.15), p1: V(-0.2, 4.4, -0.2), p2: V(-0.45, 6.8, -0.25),
    rFn: (t) => 0.55 - 0.1 * t + 0.15 * Math.pow(1 - t, 5),
    skirtT: 0.55, skirtH: 0.45,
    R: 2.85, H: 2.15, spots: 46,
    capPos: V(-0.5, 6.7, -0.25), capRot: [-0.2, 0.3, 0.1],
  }));
  // right (+X) mushroom, leaning outward
  root.add(makeMushroom({
    seed: 2,
    p0: V(1.25, 2.0, 0.3), p1: V(1.5, 3.4, 0.3), p2: V(2.0, 5.0, 0.3),
    rFn: (t) => 0.42 - 0.08 * t + 0.1 * Math.pow(1 - t, 5),
    skirtT: 0.6, skirtH: 0.35,
    R: 1.75, H: 1.25, spots: 30,
    capPos: V(2.1, 4.85, 0.3), capRot: [0.05, 1.2, -0.42],
  }));
  // small left (-X) mushroom
  root.add(makeMushroom({
    seed: 3,
    p0: V(-1.6, 2.0, 0.7), p1: V(-1.75, 3.0, 0.7), p2: V(-2.1, 3.9, 0.6),
    rFn: (t) => 0.36 - 0.06 * t + 0.08 * Math.pow(1 - t, 5),
    skirtT: 0.72, skirtH: 0.3,
    R: 1.4, H: 1.05, spots: 24,
    capPos: V(-2.25, 3.95, 0.55), capRot: [-0.15, 2.3, 0.45],
  }));

  root.add(makeMossCollar(-0.05, 2.1, -0.15, 0.5, 1.3, 11));
  root.add(makeMossCollar(1.25, 2.1, 0.3, 0.38, 0.75, 12));
  root.add(makeMossCollar(-1.6, 2.1, 0.7, 0.32, 0.55, 13));
  return root;
}

export { createMushrooms };
