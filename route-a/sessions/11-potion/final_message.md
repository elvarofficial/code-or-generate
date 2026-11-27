I built the potion as `route-a/11-potion.js`. It exports `createPotion()` (also the default export), which returns a `THREE.Group` that stands on y = 0 and faces +Z. It has 15,744 triangles, uses no external models or textures, and the glass and liquid materials are small shaders written in the file.

I ran three compare-and-fix rounds against your front, left and back references, then stopped.

**What it's made of:** a round glass flask with a short neck and a thick lip, red liquid filling about two thirds of it with a lighter band at the surface, and a slightly lumpy cork. The glass is clear in the middle and greyer toward the edges.

**The left reference doesn't match the front and back ones.** From the side it shows a body that is flat at the front and bulges only toward the back, which a perfectly round flask wouldn't do. I followed it literally. The body is about 0.38 deep against 0.64 wide, with a flat front face and a rounded back. The model matches all three silhouettes, but if you meant a normal round flask, the side view is wrong in the reference, not the model.

**Fixed along the way:**
- **Round 1:** the neck and its curved shoulders were missing, the glass looked like milky plastic that turned the liquid pink, the lip was a thin ring instead of a thick collar, the cork's top was too sharp, and the bottom had a flat notch.
- **Round 2:** the liquid was one flat red with no shading, and the lighter band at its surface was missing.

**Still not matching after round 3:**
1. **Front and back liquid shading:** the reference glows bright red in the lower centre and darkens toward the edges. Mine is mostly an even red with only a thin dark edge. Because of the flat front face, the front of the liquid faces the camera head-on, so it gets almost no shading.
2. **Liquid surface:** the reference shows the top of the liquid as a tilted lighter ellipse. A straight-on orthographic camera can only show it as a thin straight band.
3. **Painted detail:** the brush-stroke highlights, reflections inside the glass, and the cork's dark speckles and torn chip aren't modelled. The cork is just lightly lumpy.
4. **Left view:** the reference has a vertical seam line on the glass between the flat front and the bulging back, and a slightly angled bottom edge at the front. Neither is in the model.
5. **Glass seen through the liquid:** in the reference the glass above the liquid is slightly pink. Mine is a neutral pale grey.

The side-by-side images (reference on the left, render on the right) are in `C:\Users\user_\AppData\Local\Temp\claude\ef8f4cec624b597a\60997dd1-188b-48f9-a8c7-c41c2ff4ab39\scratchpad\`:
- Final round: `r3-front.png`, `r3-left.png`, `r3-back.png`
- Earlier rounds: the same names starting with `r1-` and `r2-`
- The render script: `render.mjs`