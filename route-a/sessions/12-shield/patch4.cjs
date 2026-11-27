const fs=require('fs');const F='D:/elvar/cog-runs/12-shield/route-a/12-shield.js';let s=fs.readFileSync(F,'utf8');
const rep=(a,b)=>{if(!s.includes(a))throw new Error('miss '+a);s=s.replace(a,b)};
rep('color: 0xa3a8ae, roughness: 0.38, metalness: 0.3','color: 0x8e9399, roughness: 0.38, metalness: 0.3');
rep('const shade = 0.86 + 0.14 * hammer','const shade = 0.84 + 0.24 * Math.max(hammer, -0.3)');
rep('const cheekTanL = [[300, 500], [330, 480], [345, 540], [335, 600], [310, 570]];','const cheekTanL = [[318, 520], [334, 505], [340, 560], [334, 610], [322, 575]];');
fs.writeFileSync(F,s);console.log('ok');
