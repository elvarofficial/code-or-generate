import { chromium } from 'playwright'; import { serve } from './server.mjs';
const s=await serve(); const b=await chromium.launch(); const p=await b.newPage();
await p.goto('http://localhost:8765/03-sword/assets/03-sword/front.png');
for (const v of ['front','left','back']) {
 const out = await p.evaluate(async (v)=>{ const img=new Image(); img.src='/03-sword/assets/03-sword/'+v+'.png'; await img.decode();
  const c=document.createElement('canvas'); c.width=img.width;c.height=img.height; const x=c.getContext('2d'); x.drawImage(img,0,0); const d=x.getImageData(0,0,c.width,c.height).data;
  let lines=[]; let top=-1,bot=-1;
  for(let y=0;y<c.height;y++){ let l=-1,r=-1; for(let xx=0;xx<c.width;xx++){ const i=(y*c.width+xx)*4; if(d[i]+d[i+1]+d[i+2]<690){ if(l<0)l=xx; r=xx; } } if(l>=0){ if(top<0)top=y; bot=y;} if(y%10==0 && l>=0) { const mid=(y*c.width+((l+r)>>1))*4; lines.push(y+': '+l+'-'+r+' w'+(r-l)+' c'+d[mid]+','+d[mid+1]+','+d[mid+2]); } }
  return {w:c.width,h:c.height,top,bot,lines}; }, v);
 console.log(v, out.w, out.h, 'top',out.top,'bot',out.bot); console.log(out.lines.join('\n'));
}
await b.close(); s.close();
