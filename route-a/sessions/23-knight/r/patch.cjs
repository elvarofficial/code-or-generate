const fs=require('fs');let s=fs.readFileSync('page.html','utf8');
s=s.replace("let tris=0; obj.traverse(o=>{if(o.isMesh){const g=o.geometry; tris+=(g.index?g.index.count:g.attributes.position.count)/3;}});",
"let tris=0; const by={}; obj.traverse(o=>{if(o.isMesh){const g=o.geometry; const t=(g.index?g.index.count:g.attributes.position.count)/3; tris+=t; const k=(o.parent.name||'')+':'+g.type; by[k]=(by[k]||0)+t;}}); console.log(JSON.stringify(by));");
s=s.replace('renderer.toneMapping=THREE.ACESFilmicToneMapping;','renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.8;');
s=s.replace('environmentIntensity=0.7','environmentIntensity=0.55').replace('0x887766,1.2','0x887766,0.9');
fs.writeFileSync('page.html',s);
