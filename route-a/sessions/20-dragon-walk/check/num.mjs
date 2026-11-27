import * as THREE from 'file:///D:/elvar/cog-runs/node_modules/three/build/three.module.js';
const { createDragon } = await import('file:///D:/elvar/cog-runs/20-dragon-walk/route-a/20-dragon.js');
function snap(g){ g.updateMatrixWorld(true); const out=[]; const v=new THREE.Vector3(); let minY=1e9;
 g.traverse(o=>{ if(!o.isMesh) return; const p=o.geometry.attributes.position; for(let i=0;i<p.count;i+=3){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); out.push(v.x,v.y,v.z); if(v.y<minY)minY=v.y; } }); return {out,minY}; }
for (const [mode,T] of [['walk',1.3],['idle',8]]) {
  const g=createDragon(); g.userData.play(mode); const a=snap(g); let minY=a.minY, n=Math.round(T*60);
  for(let i=0;i<n;i++){ g.userData.update(T/n); minY=Math.min(minY,snap(g).minY); }
  const b=snap(g); let md=0; for(let i=0;i<a.out.length;i++) md=Math.max(md,Math.abs(a.out[i]-b.out[i]));
  console.log(mode,'minY',minY.toFixed(3),'loop max diff',md.toExponential(2));
}
const r=createDragon(); r.updateMatrixWorld(true); console.log('rest minY (original pose ~)', snap(r).minY.toFixed(3));
