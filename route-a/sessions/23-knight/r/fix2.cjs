const fs=require('fs');const f='D:/elvar/cog-runs/23-knight/route-a/23-knight.js';let s=fs.readFileSync(f,'utf8');
function R(a,b){ if(!s.includes(a)) {console.log('MISS',a.slice(0,70)); return;} s=s.replace(a,b);}
// replace crinet block
const a=s.indexOf('  // crinet plates along the top of the neck'), b=s.indexOf('  // head: poll -> muzzle');
s=s.slice(0,a)+`  // crinet: steel shell over the top of the neck, banded with gold
  taper(g, [[0, 4.72, 0.8], [0, 5.62, 1.45], [0, 6.35, 2.02]], [0.55, 0.44, 0.31], M.steel, 12);
  {
    const neck = new THREE.CatmullRomCurve3([new V3(0, 4.72, 0.8), new V3(0, 5.62, 1.45), new V3(0, 6.35, 2.02)]);
    const rr = [0.53, 0.48, 0.43, 0.38, 0.34];
    [0.12, 0.3, 0.48, 0.66, 0.84].forEach((t, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr[i] + 0.02, 0.028, 4, 16), M.gold);
      ring.position.copy(neck.getPointAt(t));
      ring.quaternion.setFromUnitVectors(new V3(0, 0, 1), neck.getTangentAt(t));
      g.add(ring);
    });
  }
`+s.slice(b);
// cheaper defaults
R("const n = segs || pts.length * 6;","const n = segs || pts.length * 4;");
R("function sph(parent, p, r, mat, scale = [1, 1, 1], ws = 12, hs = 8, rot)","function sph(parent, p, r, mat, scale = [1, 1, 1], ws = 10, hs = 7, rot)");
R("new THREE.CatmullRomCurve3(pts), 22, 0.04, 4)","new THREE.CatmullRomCurve3(pts), 18, 0.04, 4)");
// fuller tail
R("[0.16, 0.2, 0.16, 0.03], M.tail, 8);","[0.2, 0.26, 0.22, 0.05], M.tail, 8);");
R("[0.12, 0.15, 0.1, 0.02], M.tail, 8);","[0.16, 0.2, 0.15, 0.03], M.tail, 8);");
R("[0.1, 0.12, 0.08, 0.02], M.tail, 8);","[0.14, 0.17, 0.12, 0.03], M.tail, 8);");
// bulging pedestal drum
R("[1.55, 0.3],\n    [1.55, 0.92]","[1.55, 0.3], [1.6, 0.48], [1.62, 0.62], [1.6, 0.78],\n    [1.56, 0.92]");
R("const R = 1.565;","const R = 1.615;");
R("new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 48)","new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 40)");
// denser lattice
R("cz: 0.95, rx: 0.8, rz: 0.9, th0: sg * 0.55, th1: sg * 2.0, n: 10, rows: 2, flare: 0.12,","cz: 0.95, rx: 0.8, rz: 0.9, th0: sg * 0.55, th1: sg * 2.0, n: 10, rows: 2, flare: 0.12, uRep: 2, vRep: 1,");
R("flare: 0.06, uRep: 3,","flare: 0.06, uRep: 7,");
R("for (let i = -2; i <= 2; i++) {","for (let i = -2; i <= 2; i++) { g.lineWidth = 8;");
// darker ears / eyes visible in front: put ears wider
R("ear.position.set(sx * 0.14, 6.62, 2.3); ear.rotation.set(-0.3, 0, -sx * 0.25);","ear.position.set(sx * 0.2, 6.65, 2.28); ear.rotation.set(-0.3, 0, -sx * 0.35);");
R("sph(g, [sx * 0.25, 6.05, 2.58], 0.06, M.dark);","sph(g, [sx * 0.3, 6.05, 2.58], 0.07, M.dark);");
R("eg.position.set(sx * 0.26, 6.05, 2.58)","eg.position.set(sx * 0.31, 6.05, 2.58)");
fs.writeFileSync(f,s);
