p='15-staff.js'
s=open(p,encoding='utf8').read()
def rep(a,b):
    global s
    assert a in s, a
    s=s.replace(a,b)
rep("const MOSS = new THREE.Color(0x8fbf2a);","const MOSS = new THREE.Color(0x7aa02c);")
rep("if (moss && mn > 0.32 && py > 0.25) c.lerp(MOSS, Math.min(1, (mn - 0.32) * 6));",
    "if (moss && mn > 0.5 && py > 0.25) c.lerp(MOSS, Math.min(0.9, (mn - 0.5) * 5));")
rep("[0.13, 1.34], [0.15, 1.41], [0.12, 1.46], [0.05, 1.47], [0.0, 1.47]]",
    "[0.11, 1.34], [0.115, 1.41], [0.09, 1.45], [0.04, 1.46], [0.0, 1.46]]")
old_start=s.index("  const claws = [")
old_end=s.index("  // short outer spurs")
new='''  const claws = [
    // big hooked claws: rise on the outside, then hook over toward the crystal
    { az: -95, pts: [[0.21, 1.42], [0.215, 1.56], [0.19, 1.68], [0.11, 1.75], [0.04, 1.73]], curl: 0.15, r: 0.058 },
    { az: 88, pts: [[0.21, 1.44], [0.22, 1.6], [0.19, 1.72], [0.11, 1.79], [0.03, 1.77]], curl: -0.25, r: 0.058 },
    { az: 178, pts: [[0.2, 1.42], [0.21, 1.57], [0.18, 1.69], [0.1, 1.75], [0.04, 1.72]], curl: 0.2, r: 0.052 },
    { az: 140, pts: [[0.19, 1.42], [0.2, 1.52], [0.17, 1.62], [0.11, 1.67]], curl: -0.2, r: 0.04 },
    // shorter inner fingers curling round the crystal (none directly in front)
    { az: -55, pts: [[0.15, 1.42], [0.15, 1.51], [0.11, 1.57], [0.075, 1.58]], curl: 0.2, r: 0.034 },
    { az: 55, pts: [[0.15, 1.43], [0.155, 1.52], [0.12, 1.59], [0.08, 1.6]], curl: -0.2, r: 0.034 },
    { az: -135, pts: [[0.16, 1.42], [0.16, 1.52], [0.12, 1.59], [0.08, 1.6]], curl: 0.2, r: 0.034 },
  ];
  claws.forEach((c, k) => {
    const az = c.az * D;
    const p = (r, y, da = 0) => [Math.sin(az + da) * r, y, Math.cos(az + da) * r];
    const n = c.pts.length;
    const pts = [p(0.04, 1.1), p(0.09, 1.26), ...c.pts.map(([r, y], i) => p(r, y, c.curl * (i / (n - 1)) ** 2))];
    add(branch(pts, t => c.r * (1.05 - 0.8 * t) * (1 + 0.15 * Math.sin(t * 30)),
      { radial: 9, segs: 36, seed: 50 + k, teal: true }));
  });
'''
s=s[:old_start]+new+s[old_end:]
rep("new THREE.Vector2(0, -0.12), new THREE.Vector2(0.04, -0.06), new THREE.Vector2(0.06, 0.01),\n    new THREE.Vector2(0.05, 0.07), new THREE.Vector2(0, 0.14),",
    "new THREE.Vector2(0, -0.13), new THREE.Vector2(0.045, -0.065), new THREE.Vector2(0.066, 0.01),\n    new THREE.Vector2(0.052, 0.07), new THREE.Vector2(0, 0.14),")
rep("const t = (p.getY(i) + 0.12) / 0.26;","const t = (p.getY(i) + 0.13) / 0.27;")
rep("const CRYSTAL_Y = 1.57;","const CRYSTAL_Y = 1.555;")
rep("const r = 0.165;","const r = 0.15;")
open(p,'w',encoding='utf8').write(s)
