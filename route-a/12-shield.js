// Round wooden shield with a painted bear crest, iron rim and two leather back straps.
// Stands on y = 0 (bottom of the rim), faces +Z, up is +Y. Diameter 1 unit.
import * as THREE from 'three';

const R_OUT = 0.5;      // outer radius of the iron rim
const R_WOOD = 0.45;    // radius of the wooden board (runs under the rim)
const WOOD_HALF = 0.02; // half thickness of the board
const RIM_HALF = 0.046; // half depth of the rim

// ---------------------------------------------------------------- helpers
function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function lumpy(theta, k) {
  return (
    Math.sin(7 * theta + 1.3 + k) * 0.5 +
    Math.sin(13 * theta + 0.4 + 2 * k) * 0.3 +
    Math.sin(23 * theta + 2.1 + 3 * k) * 0.2
  );
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// Wooden planks with grain. ctx covers the board; seams are given in canvas px.
function drawPlanks(ctx, size, seams, base, dark, light, seed) {
  const rnd = rand(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const edges = [0, ...seams, size];
  for (let i = 0; i < edges.length - 1; i++) {
    const x0 = edges[i], x1 = edges[i + 1];
    // per-plank tint
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,220,170'},${0.04 + rnd() * 0.06})`;
    ctx.fillRect(x0, 0, x1 - x0, size);
    // grain lines
    const n = 7 + Math.floor(rnd() * 4);
    for (let g = 0; g < n; g++) {
      const gx = x0 + 8 + rnd() * (x1 - x0 - 16);
      ctx.strokeStyle = rnd() < 0.6 ? dark : light;
      ctx.globalAlpha = 0.25 + rnd() * 0.3;
      ctx.lineWidth = 1.5 + rnd() * 2.5;
      ctx.beginPath();
      const amp = 3 + rnd() * 6, freq = 0.004 + rnd() * 0.01, ph = rnd() * 6;
      const y0 = rnd() * size * 0.5, y1 = y0 + size * (0.3 + rnd() * 0.7);
      for (let y = y0; y <= y1; y += 8) {
        const x = gx + Math.sin(y * freq + ph) * amp;
        if (y === y0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // occasional knot
    if (rnd() < 0.45) {
      const kx = x0 + (x1 - x0) * (0.3 + rnd() * 0.4), ky = size * (0.2 + rnd() * 0.6);
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      for (let r = 4; r < 22; r += 6) {
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 0.6, r * 1.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  // dark shadow under the rim
  const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.44, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(30,12,4,0)");
  grd.addColorStop(1, "rgba(30,12,4,0.75)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  // seams
  for (const s of seams) {
    ctx.fillStyle = 'rgba(50,22,8,0.6)';
    ctx.fillRect(s - 2, 0, 4, size);
    ctx.fillStyle = 'rgba(255,210,160,0.18)';
    ctx.fillRect(s + 3, 0, 3, size);
  }
}

// jagged "painted fur" polygon
function furPath(ctx, pts, jag, seed) {
  const rnd = rand(seed);
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      let x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (s > 0 && jag > 0) {
        x += (rnd() - 0.5) * jag;
        y += (rnd() - 0.5) * jag;
      }
      if (i === 0 && s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function blob(ctx, pts, color, jag = 0, seed = 1) {
  ctx.fillStyle = color;
  furPath(ctx, pts, jag, seed);
  ctx.fill();
}

// mirrored pair helper: pts given for the left side (x < 512)
function mirror(pts) {
  return pts.map(([x, y]) => [1024 - x, y]).reverse();
}

// The bear head painted on the front. Coordinates are in "reference pixels"
// (1024 px image, shield centre ~ (512, 511), outer diameter ~ 880 px).
function drawBear(ctx) {
  const BLUE = '#264f72', TEAL = '#4f7f78', GREEN = '#6f9a72', TAN = '#d29c5e', DEEP = '#1d3a57';

  // whole head silhouette (blue)
  const head = [
    [330, 268], [378, 290], [430, 270], [520, 262], [610, 270], [660, 290], [705, 268],
    [748, 288], [768, 330], [752, 385], [772, 445], [782, 505], [772, 565], [748, 625],
    [730, 690], [695, 742], [640, 780], [570, 808], [522, 830], [474, 808], [404, 780],
    [350, 742], [316, 690], [298, 625], [272, 565], [262, 505], [270, 445], [290, 385],
    [274, 330], [292, 288],
  ];
  blob(ctx, head, BLUE, 9, 3);

  // ears inner
  const earL = [[300, 300], [335, 288], [365, 305], [360, 345], [325, 370], [303, 345]];
  blob(ctx, earL, GREEN, 6, 4);
  blob(ctx, mirror(earL), GREEN, 6, 5);
  const earLi = [[315, 318], [340, 310], [350, 330], [330, 355], [314, 340]];
  blob(ctx, earLi, BLUE, 4, 6);
  blob(ctx, mirror(earLi), BLUE, 4, 7);

  // teal / green fur body inside the blue outline
  const furL = [
    [380, 300], [450, 285], [510, 290], [510, 360], [470, 380], [420, 400], [390, 440],
    [360, 500], [355, 570], [380, 640], [420, 700], [470, 745], [512, 770], [512, 800],
    [460, 770], [400, 730], [350, 670], [318, 600], [305, 520], [318, 440], [345, 380],
  ];
  blob(ctx, furL, TEAL, 14, 8);
  blob(ctx, mirror(furL), TEAL, 14, 9);
  const greenL = [[400, 310], [470, 298], [505, 320], [470, 345], [420, 350], [385, 345]];
  blob(ctx, greenL, GREEN, 10, 10);
  blob(ctx, mirror(greenL), GREEN, 10, 11);
  const cheekL = [[330, 470], [370, 450], [400, 520], [395, 600], [370, 650], [340, 590], [325, 530]];
  blob(ctx, cheekL, GREEN, 12, 12);
  blob(ctx, mirror(cheekL), GREEN, 12, 13);
  const cheekTanL = [[318, 520], [334, 505], [340, 560], [334, 610], [322, 575]];
  blob(ctx, cheekTanL, TAN, 10, 14);
  blob(ctx, mirror(cheekTanL), TAN, 10, 15);

  // brows (tan) above the eyes
  const browL = [[370, 350], [420, 325], [482, 330], [505, 362], [478, 378], [430, 372], [390, 392], [362, 380]];
  blob(ctx, browL, TAN, 8, 16);
  blob(ctx, mirror(browL), TAN, 8, 17);

  // muzzle bridge (teal) and tan muzzle sides
  const bridge = [[488, 320], [536, 320], [552, 390], [520, 410], [472, 390]];
  blob(ctx, bridge, TEAL, 6, 18);
  const muzL = [[430, 400], [480, 405], [505, 440], [500, 470], [470, 480], [440, 470], [425, 440]];
  blob(ctx, muzL, TAN, 8, 19);
  blob(ctx, mirror(muzL), TAN, 8, 20);

  // eyes: dark mask, tan almond, dark pupil
  const maskL = [[385, 380], [430, 372], [475, 390], [455, 408], [410, 405]];
  blob(ctx, maskL, DEEP, 4, 21);
  blob(ctx, mirror(maskL), DEEP, 4, 22);
  const eyeL = [[402, 388], [435, 382], [462, 394], [438, 402], [410, 398]];
  blob(ctx, eyeL, TAN, 0, 23);
  blob(ctx, mirror(eyeL), TAN, 0, 24);
  ctx.fillStyle = DEEP;
  ctx.beginPath(); ctx.arc(436, 392, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(588, 392, 6, 0, Math.PI * 2); ctx.fill();

  // nose
  ctx.fillStyle = DEEP;
  ctx.beginPath(); ctx.ellipse(518, 408, 50, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3f6f8c';
  ctx.beginPath(); ctx.ellipse(508, 398, 14, 7, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#14283c';
  ctx.beginPath(); ctx.ellipse(500, 414, 9, 6, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(536, 414, 9, 6, -0.3, 0, Math.PI * 2); ctx.fill();

  // tan lips around the open mouth
  const lips = [
    [432, 462], [480, 448], [520, 458], [560, 448], [608, 462], [622, 560], [610, 660],
    [578, 722], [520, 742], [462, 722], [430, 660], [418, 560],
  ];
  blob(ctx, lips, TAN, 8, 25);
  // dark mouth cavity
  const mouth = [
    [456, 486], [520, 474], [586, 486], [594, 570], [582, 660], [558, 705], [520, 716],
    [482, 705], [458, 660], [446, 570],
  ];
  blob(ctx, mouth, DEEP, 0, 26);
  // throat / tongue
  ctx.fillStyle = '#4f8a72';
  ctx.beginPath(); ctx.ellipse(520, 600, 40, 62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6aa07c';
  ctx.beginPath(); ctx.ellipse(520, 665, 44, 26, 0, Math.PI, 0); ctx.fill();

  // teeth
  ctx.fillStyle = '#e8c48c';
  const tooth = (x, y, w, h) => {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
  };
  tooth(470, 490, 22, 58); tooth(572, 490, 22, 58);   // upper fangs
  for (const x of [494, 508, 522, 536, 550]) tooth(x, 488, 13, 18);
  tooth(478, 704, 18, -44); tooth(562, 704, 18, -44); // lower fangs
  for (const x of [498, 512, 526, 540]) tooth(x, 708, 13, -16);

  ctx.globalAlpha = 1;
}

function frontTexture() {
  const S = 1024;
  const c = makeCanvas(S);
  const ctx = c.getContext('2d');
  // canvas spans the board diameter (2 * R_WOOD). Reference px -> canvas px.
  const refPerUnit = 880; // reference px per world unit (outer diameter 880 px)
  const k = S / (2 * R_WOOD * refPerUnit);
  const toC = (px) => (px - 512) * k + S / 2;
  const seams = [240, 378, 515, 652, 790].map(toC);
  drawPlanks(ctx, S, seams, '#a8683a', '#6b3a1c', '#d39a62', 11);
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.scale(k, k);
  ctx.translate(-512, -511);
  ctx.globalAlpha = 0.93;
  drawBear(ctx);
  ctx.restore();
  // re-draw seams lightly over the paint so planks show through
  for (const s of seams) {
    ctx.fillStyle = 'rgba(50,22,8,0.35)';
    ctx.fillRect(s - 1.5, 0, 3, S);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function backTexture() {
  const S = 1024;
  const c = makeCanvas(S);
  const ctx = c.getContext('2d');
  const k = S / (2 * R_WOOD * 880);
  const toC = (px) => (px - 512) * k + S / 2;
  const seams = [248, 380, 505, 645, 772].map(toC);
  drawPlanks(ctx, S, seams, '#7a4a2a', '#4a2714', '#a4704a', 29);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- geometry
// Hammered iron rim: rounded-rectangle profile swept around Z with lumpy dents.
function rimGeometry() {
  const SEG = 128, PROF = 20;
  const rc = (R_OUT + 0.432) / 2, a = (R_OUT - 0.432) / 2, b = RIM_HALF;
  const pos = [], col = [], idx = [];
  for (let i = 0; i < SEG; i++) {
    const th = (i / SEG) * Math.PI * 2;
    const dent = lumpy(th, 0) * 0.0015;
    const dentFace = lumpy(th, 1.7) * 0.002 + Math.sin(41 * th) * 0.001;
    for (let j = 0; j < PROF; j++) {
      const ph = (j / PROF) * Math.PI * 2;
      const c = Math.cos(ph), s = Math.sin(ph);
      const n = 7;
      let r = rc + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      let z = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      if (c > 0.3) r += dent * c;
      z += dentFace * s;
      pos.push(Math.cos(th) * r, Math.sin(th) * r, z);
      const hammer = lumpy(th * 2.3, 4.1) * 0.5 + lumpy(th * 5.1, 2.2) * 0.5;
      const shade = 0.84 + 0.24 * Math.max(hammer, -0.3) + (Math.abs(c) > 0.85 ? -0.12 : 0);
      col.push(shade, shade, shade * 1.02);
    }
  }
  for (let i = 0; i < SEG; i++) {
    const i2 = (i + 1) % SEG;
    for (let j = 0; j < PROF; j++) {
      const j2 = (j + 1) % PROF;
      const A = i * PROF + j, B = i2 * PROF + j, C = i2 * PROF + j2, D = i * PROF + j2;
      idx.push(A, B, D, B, C, D);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Sweep a flat rectangular strap along a polyline (points are Vector3).
// `up` is the strap's face normal direction hint.
function strapGeometry(points, width, thick, up) {
  const pos = [], idx = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const t = new THREE.Vector3().subVectors(points[Math.min(i + 1, n - 1)], points[Math.max(i - 1, 0)]).normalize();
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    const nrm = new THREE.Vector3().crossVectors(side, t).normalize();
    const hw = width / 2, ht = thick / 2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      pos.push(
        p.x + side.x * hw * sx + nrm.x * ht * sy,
        p.y + side.y * hw * sx + nrm.y * ht * sy,
        p.z + side.z * hw * sx + nrm.z * ht * sy,
      );
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = (i + 1) * 4 + ((k + 1) % 4), d = (i + 1) * 4 + k;
      idx.push(a, b, c, a, c, d);
    }
  }
  // end caps
  idx.push(0, 2, 1, 0, 3, 2);
  const e = (n - 1) * 4;
  idx.push(e, e + 1, e + 2, e, e + 2, e + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

// ---------------------------------------------------------------- build
export function createShield() {
  const group = new THREE.Group();
  group.name = 'shield';
  const body = new THREE.Group();
  body.position.y = R_OUT; // rim bottom touches y = 0
  group.add(body);

  // materials
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTexture(), roughness: 0.8, metalness: 0 });
  const backMat = new THREE.MeshStandardMaterial({ map: backTexture(), roughness: 0.85, metalness: 0 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x6e4126, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x8e9399, roughness: 0.38, metalness: 0.3, vertexColors: true });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x7c3e22, roughness: 0.55 });
  const rivetMat = new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.35, metalness: 0.5 });

  // wooden board: front face, back face, edge band
  const front = new THREE.Mesh(new THREE.CircleGeometry(R_WOOD, 96), frontMat);
  front.position.z = WOOD_HALF;
  body.add(front);
  const back = new THREE.Mesh(new THREE.CircleGeometry(R_WOOD, 96), backMat);
  back.rotation.y = Math.PI;
  back.position.z = -WOOD_HALF;
  body.add(back);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(R_WOOD, R_WOOD, WOOD_HALF * 2, 96, 1, true), edgeMat);
  edge.rotation.x = Math.PI / 2;
  body.add(edge);

  // iron rim
  const rim = new THREE.Mesh(rimGeometry(), ironMat);
  body.add(rim);

  // leather straps on the back (seen from behind at world x = +/-0.24)
  const rivetGeo = new THREE.SphereGeometry(0.011, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const sx of [-1, 1]) {
    const x0 = sx * 0.24;
    const yTop = 0.19, yBot = -0.22;
    const pts = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = yTop + (yBot - yTop) * t;
      // stands off the board in the middle, flat at the riveted ends
      const lift = Math.pow(Math.sin(Math.PI * Math.min(Math.max((t - 0.14) / 0.72, 0), 1)), 0.7) * 0.034;
      const bend = Math.sin(Math.PI * t) * 0.012 * sx; // slight outward bow
      pts.push(new THREE.Vector3(x0 + bend, y, -WOOD_HALF - 0.0075 - lift));
    }
    const strap = new THREE.Mesh(strapGeometry(pts, 0.07, 0.014, new THREE.Vector3(0, 0, -1)), leatherMat);
    body.add(strap);
    for (const [y] of [[yTop], [yBot]]) {
            const rv = new THREE.Mesh(rivetGeo, rivetMat);
      rv.rotation.x = -Math.PI / 2; // dome points to -Z
      rv.position.set(x0, y + (y > 0 ? -0.016 : 0.016), -WOOD_HALF - 0.0135);
      body.add(rv);
    }
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

export default createShield;
