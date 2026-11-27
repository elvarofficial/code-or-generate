const fs=require('fs');const f='D:/elvar/cog-runs/23-knight/route-a/23-knight.js';let s=fs.readFileSync(f,'utf8');
function R(a,b){ if(!s.includes(a)) {console.log('MISS',a.slice(0,70)); return;} s=s.replace(a,b);}
R("    g.fillStyle = GOLD_D; g.fillRect(0, h - 38, w, 4);\n  });","    g.fillStyle = GOLD_D; g.fillRect(0, h - 38, w, 4);\n  }, [1, 1]);");
R("g.fillStyle = RED; g.fillRect(0, h - 34, w, 34);\n    g.fillStyle = GOLD_D; g.fillRect(0, h - 38, w, 4);","g.fillStyle = RED; g.fillRect(0, h - 34, w, 34);\n    g.fillStyle = GOLD_D; g.fillRect(0, h - 38, w, 4);");
// remove raised cobble boxes (flat textured top stays)
const a=s.indexOf('  // raised cobblestones'), b=s.indexOf('  // scroll reliefs on the drum');
s=s.slice(0,a)+s.slice(b);
// tail strands closer together
R("[[0.05, 4.1, -1.7], [0.08, 3.7, -2.2], [0.1, 3.1, -2.45], [-0.05, 2.45, -2.7]]","[[0.04, 4.1, -1.7], [0.05, 3.7, -2.2], [0.02, 3.1, -2.5], [-0.12, 2.5, -2.75]]");
R("[[-0.05, 4.1, -1.7], [-0.1, 3.6, -2.0], [-0.3, 2.9, -2.15], [-0.6, 2.25, -2.3]]","[[-0.04, 4.1, -1.7], [-0.06, 3.6, -2.1], [-0.18, 2.95, -2.35], [-0.42, 2.35, -2.5]]");
fs.writeFileSync(f,s);
