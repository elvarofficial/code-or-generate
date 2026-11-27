p='15-staff.js'
s=open(p,encoding='utf8').read()
def rep(a,b):
    global s
    assert a in s, a
    s=s.replace(a,b)
rep("const spurs = [[-90, 1.42], [95, 1.44], [0, 1.4], [180, 1.41], [-130, 1.38]];",
    "const spurs = [[-90, 1.42], [95, 1.44], [-125, 1.39], [120, 1.4]];")
rep("  // short outer spurs", '''  // two thick strands twisting across the front of the neck (they carry the runes)
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const y = lerp(1.0, 1.42, t);
      const a = s * lerp(-55, 60, t) * D;
      const r = lerp(0.05, 0.13, t * t);
      pts.push([Math.sin(a) * r, y, Math.cos(a) * r * 0.95]);
    }
    add(branch(pts, t => 0.04 + 0.012 * Math.sin(Math.PI * t), { radial: 9, segs: 24, seed: 90 + s, teal: true }));
  }

  // short outer spurs''')
open(p,'w',encoding='utf8').write(s)
