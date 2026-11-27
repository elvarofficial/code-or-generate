// Wooden barrel with four iron hoops. Stands on y = 0, faces +Z, up is +Y.
// Geometry and materials are generated entirely in code.
import * as THREE from 'three';

// Reference sheet scale: 1 px of the 1024 px turnaround = S world units.
const S = 0.00125;
const PX_BOTTOM = 960;          // ground line in the reference (px)
const PX_TOP = 70;              // top rim of the barrel (px)
const PX_MID = 510;             // widest point (px)

const toY = (py) => (PX_BOTTOM - py) * S;

// Outer wood radius in px as a function of reference y (px).
function woodRadiusPx(py) {
  const d = Math.abs(py - PX_MID) / (PX_BOTTOM - PX_MID); // 0 at middle, 1 at the ends
  return 356 - 90 * d * d;
}
const woodR = (y) => woodRadiusPx(PX_BOTTOM - y / S) * S;

// Small deterministic pseudo-random helpers.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Revolve a closed/open (r, y) profile around Y, with an optional radial perturbation.
function revolve(profile, segments, perturb = null, colorFn = null) {
  const pos = [];
  const col = [];
  const idx = [];
  const rows = profile.length;
  for (let j = 0; j <= segments; j++) {
    const a = (j / segments) * Math.PI * 2;
    const ja = j === segments ? 0 : a;
    for (let i = 0; i < rows; i++) {
      const [r0, y] = profile[i];
      const r = r0 + (perturb ? perturb(ja, i, y) : 0);
      pos.push(Math.sin(a) * r, y, Math.cos(a) * r);
      if (colorFn) {
        const c = colorFn(ja, i, y);
        col.push(c.r, c.g, c.b);
      }
    }
  }
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < rows - 1; i++) {
      const a = j * rows + i;
      const b = (j + 1) * rows + i;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colorFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// One curved stave between angles a0..a1, following the bulged profile.
function makeStave(a0, a1, yBot, yTop, seed, baseColor) {
  const NU = 7;
  const NV = 28;
  const thick = 22 * S;
  const rand = rng(seed);
  const tone = 0.86 + rand() * 0.24;
  const streakPhase = [rand() * 10, rand() * 10, rand() * 10];
  const streakFreq = [9 + rand() * 6, 21 + rand() * 9, 43 + rand() * 12];

  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  const vertex = (u, v, inner) => {
    const a = a0 + (a1 - a0) * u;
    const y = yBot + (yTop - yBot) * v;
    // rounded stave edges: pull the outer surface in near the seams
    const edge = Math.pow(Math.abs(u * 2 - 1), 6);
    let r = woodR(y) - edge * 3.2 * S;
    if (inner) r -= thick;
    pos.push(Math.sin(a) * r, y, Math.cos(a) * r);
    // painted grain: long vertical streaks plus a soft vertical gradient
    let k = tone;
    k *= 1 + 0.11 * Math.sin(u * streakFreq[0] + streakPhase[0] + v * 1.5);
    k *= 1 + 0.08 * Math.sin(u * streakFreq[1] + streakPhase[1] + v * 3.0);
    k *= 1 + 0.04 * Math.sin(u * streakFreq[2] + streakPhase[2] + v * 6.0);
    k *= 1 - 0.5 * edge;                       // dark seam shading
    k *= 1 - 0.12 * Math.pow(Math.abs(v * 2 - 1), 3); // darker toward the ends
    if (inner) k *= 0.45;
    c.copy(baseColor).multiplyScalar(k);
    col.push(c.r, c.g, c.b);
  };
  // outer surface grid
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) vertex(i / NU, j / NV, false);
  const W = NV + 1;
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const a = i * W + j;
      const b = (i + 1) * W + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  // two side walls (seams) so the gaps read as depth
  const sideStart = pos.length / 3;
  for (const u of [0, 1]) {
    for (let j = 0; j <= NV; j++) {
      vertex(u, j / NV, false);
      vertex(u, j / NV, true);
    }
  }
  for (let s = 0; s < 2; s++) {
    const base = sideStart + s * W * 2;
    for (let j = 0; j < NV; j++) {
      const o0 = base + j * 2;
      const i0 = o0 + 1;
      const o1 = o0 + 2;
      const i1 = o0 + 3;
      if (s === 0) idx.push(o0, o1, i0, i0, o1, i1);
      else idx.push(o0, i0, o1, i0, i1, o1);
    }
  }
  // top end grain
  const topStart = pos.length / 3;
  for (let i = 0; i <= NU; i++) {
    vertex(i / NU, 1, false);
    vertex(i / NU, 1, true);
  }
  for (let i = 0; i < NU; i++) {
    const o0 = topStart + i * 2;
    idx.push(o0, o0 + 1, o0 + 2, o0 + 1, o0 + 3, o0 + 2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// An iron hoop between reference rows pyTop..pyBot (px), hugging the wood.
function makeHoop(pyTop, pyBot, seed, outPx = 13, bevPx = 6) {
  const out = outPx * S;
  const bev = bevPx * S;
  const y0 = toY(pyBot);
  const y1 = toY(pyTop);
  const prof = [];
  prof.push([woodR(y0) - 4 * S, y0]);
  prof.push([woodR(y0) + out - bev, y0]);
  prof.push([woodR(y0 + bev) + out, y0 + bev]);
  const N = 8;
  for (let k = 1; k < N; k++) {
    const y = y0 + bev + ((y1 - y0 - 2 * bev) * k) / N;
    prof.push([woodR(y) + out, y]);
  }
  prof.push([woodR(y1 - bev) + out, y1 - bev]);
  prof.push([woodR(y1) + out - bev, y1]);
  prof.push([woodR(y1) - 4 * S, y1]);
  const ph = [hash(seed) * 6.28, hash(seed + 1) * 6.28, hash(seed + 2) * 6.28];
  // hammered, slightly uneven iron
  const perturb = (a, i) => {
    if (i === 0 || i === prof.length - 1) return 0;
    return S * (1.6 * Math.sin(a * 3 + ph[0]) + 1.0 * Math.sin(a * 7 + ph[1]) + 0.8 * Math.sin(a * 13 + ph[2]));
  };
  const base = new THREE.Color(0x55535f);
  const c = new THREE.Color();
  const colorFn = (a, i) => {
    let k = 1 + 0.18 * Math.sin(a * 5 + ph[1]) * Math.sin(a * 11 + ph[2]) + 0.1 * Math.sin(a * 23 + ph[0]);
    if (i <= 2 || i >= prof.length - 3) k *= 1.45; // worn, lighter edges
    return c.copy(base).multiplyScalar(k);
  };
  return revolve(prof, 72, perturb, colorFn);
}

export function createBarrel() {
  const group = new THREE.Group();
  group.name = 'Barrel';

  const woodMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e120b, roughness: 1.0 });
  const ironMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15 });
  const lidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

  const yBot = toY(956);
  const yTop = toY(PX_TOP + 4);

  // Dark core visible through the seams between staves.
  const coreProf = [];
  for (let k = 0; k <= 24; k++) {
    const y = yBot + ((yTop - 2 * S - yBot) * k) / 24;
    coreProf.push([woodR(y) - 6 * S, y]);
  }
  group.add(new THREE.Mesh(revolve(coreProf, 48), darkMat));

  // Staves.
  const STAVES = 12;
  const gap = 0.017; // radians of seam
  const woodBase = new THREE.Color(0x925a36);
  const stavesGroup = new THREE.Group();
  stavesGroup.name = 'Staves';
  for (let i = 0; i < STAVES; i++) {
    const w = (Math.PI * 2) / STAVES;
    const a0 = (i - 0.5) * w + gap / 2; // a stave is centred on +Z
    const a1 = (i + 0.5) * w - gap / 2;
    stavesGroup.add(new THREE.Mesh(makeStave(a0, a1, yBot, yTop, 1000 + i * 77, woodBase), woodMat));
  }
  group.add(stavesGroup);

  // Lids (top and bottom heads), recessed inside the chime.
  const lidColor = (yy) => {
    const c = new THREE.Color();
    return (a, i, y) => {
      // planks run along X: modulate by the X coordinate is not available here,
      // so use concentric darkening + a few angular bands.
      const k = 0.75 + 0.08 * Math.sin(a * 6) - 0.15 * (i === 0 ? 1 : 0);
      return c.set(0x6e4228).multiplyScalar(k);
    };
  };
  for (const [yy, dir] of [[yTop - 14 * S, 1], [yBot + 14 * S, -1]]) {
    const r = woodR(yy) - 20 * S;
    const prof = dir > 0 ? [[0, yy], [r, yy]] : [[r, yy], [0, yy]];
    group.add(new THREE.Mesh(revolve(prof, 48, null, lidColor(yy)), lidMat));
  }
  // Plank seams on the top lid.
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x24150c });
  const lidY = yTop - 14 * S + 0.0008;
  const lidR = woodR(yTop - 14 * S) - 20 * S;
  for (const x of [-0.17, -0.06, 0.06, 0.17]) {
    const half = Math.sqrt(Math.max(lidR * lidR - x * x, 0));
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.006, half * 2), seamMat);
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(x, lidY, 0);
    group.add(seam);
  }

  // Iron hoops (reference px rows).
  const hoops = [
    [68, 150, 1, 16],
    [248, 345, 2, 13],
    [678, 775, 3, 13],
    [862, 960, 4, 16],
  ];
  const hoopGroup = new THREE.Group();
  hoopGroup.name = 'Hoops';
  for (const [t, b, seed, o] of hoops) {
    hoopGroup.add(new THREE.Mesh(makeHoop(t, b, seed, o), ironMat));
  }
  group.add(hoopGroup);

  // Rivets on the middle hoops, on the barrel's left and right sides.
  const rivetGeo = new THREE.SphereGeometry(10 * S, 12, 8);
  const rivetMat = new THREE.MeshStandardMaterial({ color: 0x55535f, roughness: 0.6, metalness: 0.15 });
  for (const [t, b] of [hoops[1], hoops[2]]) {
    const y = toY((t + b) / 2);
    const r = woodR(y) + 12 * S;
    for (const sx of [-1, 1]) {
      const rv = new THREE.Mesh(rivetGeo, rivetMat);
      rv.scale.set(0.6, 1.6, 1.0);
      rv.position.set(sx * r, y, 0);
      group.add(rv);
    }
  }

  return group;
}

export default createBarrel;
