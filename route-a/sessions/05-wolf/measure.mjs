import { chromium } from 'playwright';
import { serve } from '../server.mjs';
const s = await serve(8766);
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://localhost:8766/05-wolf/assets/05-wolf/front.png');
for (const v of ['front','left','back']) {
  const r = await p.evaluate(async (v) => {
    const img = new Image(); img.src = '/05-wolf/assets/05-wolf/'+v+'.png'; await img.decode();
    const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
    const g=c.getContext('2d'); g.drawImage(img,0,0); const d=g.getImageData(0,0,c.width,c.height).data;
    const W=c.width,H=c.height; let out=[`${v} ${W}x${H}`]; let minx=W,maxx=0,miny=H,maxy=0;
    const fg=(x,y)=>{const i=(y*W+x)*4; return d[i]+d[i+1]+d[i+2] < 720;};
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(fg(x,y)){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);}
    out.push(`bbox x ${minx}-${maxx} y ${miny}-${maxy}`);
    for(let y=miny;y<=maxy;y+=20){ let segs=[],inn=false,st=0; for(let x=0;x<W;x++){const f=fg(x,y); if(f&&!inn){inn=true;st=x;} if(!f&&inn){inn=false; if(x-st>3)segs.push(st+'-'+(x-1));}} out.push(y+': '+segs.join(' ')); }
    return out.join('\n');
  }, v);
  console.log(r);
}
await b.close(); s.close();
