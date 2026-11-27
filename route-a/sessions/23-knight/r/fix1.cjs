const fs=require('fs');const f='D:/elvar/cog-runs/23-knight/route-a/23-knight.js';let s=fs.readFileSync(f,'utf8');
function R(a,b){ if(!s.includes(a)) {console.log('MISS',a.slice(0,60)); return;} s=s.replace(a,b);}
// materials: darker steel, stone
R("color: 0xc9ced6, metalness: 0.55, roughness: 0.3","color: 0xaab1bb, metalness: 0.6, roughness: 0.32");
R("color: 0xa69f92, roughness: 0.9","color: 0x8f877a, roughness: 0.9");
R("color: 0x8a8376, roughness: 0.9","color: 0x6f685d, roughness: 0.9");
R("color: 0x9d968a, roughness: 0.9","color: 0x857d70, roughness: 0.9");
R("g.fillStyle = '#c3c8cf'; g.fillRect(0, 0, w, h);","g.fillStyle = '#a9b0ba'; g.fillRect(0, 0, w, h);");
R("const v = 140 + ((x * 37 + y * 53) % 40);","const v = 110 + ((x * 37 + y * 53) % 40);");
// scroll tubes cheaper
R("new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.035, 5), M.stoneD","new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, 0.04, 4), M.stoneD");
R("new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 8, 0.03, 5), M.stoneD","new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 6, 0.035, 4), M.stoneD");
R("for (let x = -1.35; x <= 1.35; x += 0.3) for (let z = -1.35; z <= 1.35; z += 0.27) {","for (let x = -1.35; x <= 1.35; x += 0.34) for (let z = -1.35; z <= 1.35; z += 0.3) {");
R("new THREE.BoxGeometry(0.24 + rnd() * 0.04, 0.05,","new THREE.BoxGeometry(0.28 + rnd() * 0.04, 0.03,");
R("st.position.set(ox, 1.285, z)","st.position.set(ox, 1.27, z)");
// thicker neck, plates hugging
R("[[0, 4.75, 1.05], [0, 5.5, 1.65], [0, 6.2, 2.2]], [0.5, 0.38, 0.28], M.chain, 12","[[0, 4.6, 0.95], [0, 5.5, 1.6], [0, 6.25, 2.15]], [0.55, 0.44, 0.32], M.chain, 12");
R("const p = new V3(0, 5.0 + t * 1.3, 1.0 + t * 1.15);\n    const r = 0.5 - t * 0.2;","const p = new V3(0, 4.95 + t * 1.3, 0.85 + t * 1.2);\n    const r = 0.56 - t * 0.2;");
R("new THREE.CylinderGeometry(r, r, 0.3, 14, 1, true, -Math.PI / 2, Math.PI)","new THREE.CylinderGeometry(r, r * 1.08, 0.36, 12, 1, true, -Math.PI / 2, Math.PI)");
R("plate.position.copy(p).add(new V3(0, 0.08, -0.08));","plate.position.copy(p);");
// bigger head
R("[[0, 6.45, 2.3], [0, 5.95, 2.6], [0, 5.4, 2.82]], [0.27, 0.24, 0.19], M.horse, 12, 0, [1, 0.85]","[[0, 6.45, 2.3], [0, 5.95, 2.6], [0, 5.4, 2.82]], [0.33, 0.29, 0.22], M.horse, 12, 0, [1, 0.85]");
R("sph(g, [0, 5.95, 2.75], 1, M.steel, [0.3, 0.62, 0.14], 14, 10, [-0.45, 0, 0]);","sph(g, [0, 5.95, 2.78], 1, M.steel, [0.36, 0.66, 0.16], 14, 10, [-0.45, 0, 0]);");
R("trim.scale.set(0.3, 0.62, 0.3)","trim.scale.set(0.36, 0.66, 0.3)");
// peytral lower, gold trim matched
R("top: (z, th) => 4.85 + (z - 0.95) * 0.1,\n    bottom: (z, th) => 4.05 - 0.38 * Math.pow(Math.cos(th), 6),","top: (z, th) => 4.7 + (z - 0.95) * 0.15,\n    bottom: (z, th) => 3.85 - 0.3 * Math.pow(Math.cos(th), 6),");
R("pts.push(new V3(0.83 * Math.sin(th), 4.05 - 0.38 * Math.pow(Math.cos(th), 6), 0.95 + 0.86 * Math.cos(th)));","pts.push(new V3(0.83 * Math.sin(th), 3.85 - 0.3 * Math.pow(Math.cos(th), 6), 0.95 + 0.86 * Math.cos(th)));");
// front skirts narrower, start at the side
R("cz: 0.95, rx: 0.9, rz: 0.95, th0: sg * 0.35, th1: sg * 2.0, n: 12, rows: 3, flare: 0.1,\n      top: () => 4.35,\n      bottom: (z) => 2.75 + (z - 0.4) * 0.45,","cz: 0.95, rx: 0.8, rz: 0.9, th0: sg * 0.55, th1: sg * 2.0, n: 10, rows: 2, flare: 0.12,\n      top: (z) => 4.0 + (z - 0.4) * 0.3,\n      bottom: (z) => 2.75 + (z - 0.4) * 0.45,");
// rear skirt narrower, less flare
R("cz: -0.85, rx: 0.95, rz: 1.0, th0: 0.6, th1: Math.PI * 2 - 0.6, n: 30, rows: 3, flare: 0.12, uRep: 3,\n    top: () => 4.05,","cz: -0.85, rx: 0.86, rz: 0.95, th0: 0.6, th1: Math.PI * 2 - 0.6, n: 24, rows: 2, flare: 0.06, uRep: 3,\n    top: () => 3.9,");
// saddle cantle smaller
R("new THREE.CylinderGeometry(0.48, 0.42, 0.5, 14, 1, true, Math.PI / 2, Math.PI)","new THREE.CylinderGeometry(0.42, 0.4, 0.3, 12, 1, true, Math.PI / 2, Math.PI)");
R("cantle.position.set(0, 5.05, -0.55)","cantle.position.set(0, 4.95, -0.6)");
R("cr.position.set(0, 5.3, -0.55)","cr.position.set(0, 5.1, -0.6)");
R("new THREE.TorusGeometry(0.48, 0.03, 4, 14, Math.PI), M.gold);\n  cr","new THREE.TorusGeometry(0.42, 0.03, 4, 14, Math.PI), M.gold);\n  cr");
// knight torso bulkier
R("sph(g, [0, 5.62, -0.3], 1, M.steel, [0.42, 0.58, 0.34], 16, 12);","sph(g, [0, 5.62, -0.28], 1, M.steel, [0.46, 0.6, 0.4], 14, 10);");
// shield back steel with gold rim
R("{ depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 }), M.gold);","{ depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 }), [M.steelD, M.gold]);");
fs.writeFileSync(f,s);
