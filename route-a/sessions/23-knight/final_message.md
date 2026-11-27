I built the mounted knight in `route-a/23-knight.js`, ran the three compare-and-fix rounds, and stopped. It's 19,841 triangles, under the 20,000 limit. The silhouette lines up with the references in all three views: the overlays match on pose, height, and where the banner, shield, hooves and tail sit. There are still visible differences, listed below.

The module exports `createKnight()` (also the default export), which returns a `THREE.Group`. It stands on y = 0 and faces +Z. All geometry is built in code, and the shield, banner, cloth, chest plate and cobble patterns are drawn on in-code canvases. Outside a browser it falls back to plain colours.

**What I fixed each round:**
- **Round 1:** I darkened the lighting and the steel and stone, which had been washed out. I also made the cloth skirts narrower, lowered the chest plate, made the neck thicker, shrank the saddle back and gave the knight a bulkier torso. The back of the shield is now steel instead of gold.
- **Round 2:** I replaced the boxy neck plates with a smooth steel shell and gold bands. I made the tail fuller, bulged the pedestal sides slightly, and moved the horse's ears and eyes outward.
- **Round 3:** The red-on-blue diamond pattern on the cloth had been showing as horizontal stripes; it now tiles properly. I removed the cobblestone blocks that stuck up from the pedestal top, pulled the tail strands together, and got the count from 26,689 down to 19,841.

**What still doesn't match:**
- **Detail:** this is a low-poly build made from simple shapes, and looks smooth and simple next to the painted, sculpted references.
- **Pedestal:** the references are drawn from slightly above, so they show the cobbled top and a curved rim. The flat-on renders can't show that, so the pedestal reads as a straight-sided block. The scroll carvings are thinner and simpler than in the reference.
- **Horse:**
  - The legs are thinner than in the reference.
  - The head is too small, and from the front the face plate is a plain pale oval without the reference's detail.
  - The neck armour is a smooth shell with rings, not the overlapping plates in the reference.
  - The blue cloth band across the horse's chest in the left view is missing.
- **Cloth skirts:** they hang as stiff panels, the front pair is a bit too wide in the front view, and there are no folds.
- **Knight:** the arms and legs are thinner, and the shoulder plates are plain domes without the layered plates. The sword is just a scabbard and hilt.
- **Tail:** it is still a few separate strands, not one flowing mass with a curl at the tip.
- **Emblems:** the lion on the shield and the griffin on the banner are rough shapes, and the banner's blue and red sections are split differently.

The side-by-side images (reference, render, and a 50% overlay) are in the scratchpad: `C:\Users\user_\AppData\Local\Temp\claude\15f0b658d0683048\da286ae0-d7e6-4bf6-965d-3b5c220338f2\scratchpad\r\r4-front.png`, `C:\Users\user_\AppData\Local\Temp\claude\15f0b658d0683048\da286ae0-d7e6-4bf6-965d-3b5c220338f2\scratchpad\r\r4-left.png` and `C:\Users\user_\AppData\Local\Temp\claude\15f0b658d0683048\da286ae0-d7e6-4bf6-965d-3b5c220338f2\scratchpad\r\r4-back.png`. Earlier rounds are `r1`–`r3` in the same folder.