I built the crystal cluster in `route-a/16-crystals.js` and ran the three compare-and-fix rounds, then stopped. It's 2,292 triangles, against your limit of 20,000.

The module exports `createCrystals()` (also the default export), which returns a `THREE.Group`. Everything is built in code with no textures:
- **Crystals:** nine six-sided crystals with pointed tips, flat-shaded in two shades of lavender.
- **Rocks:** nine lumpy grey boulders, flattened where they meet the ground.
- **Moss:** a green cap over the rock tops, plus moss patches laid onto the rock surface.

**What each round fixed:**
1. I fixed a bug in my render script that framed the first render wrong; I didn't count that as a round. The real first round then fixed three things: the rocks went below the ground, the moss was a disc floating above them, and the crystals didn't fan out enough when seen from the side.
2. Raised the rock pile, made the moss patches sit on the rock surface, and spread the two big side crystals wider.
3. Made the rocks taller still, shrank the moss cap so it no longer sticks out like a lid, and thickened the patches.

**What still doesn't match after round 3:**
- **Rock pile shape:** it's still too box-like with near-vertical sides. The reference is a tapering mound of a few large, clearly separate boulders.
- **Moss:** it shows as separate green lumps on top. The reference has continuous moss that runs down between the rocks and up around the crystal bases.
- **Back view width:** the reference's two big side crystals spread wider. The painted views disagree here: the front view has nothing that far out, so I kept the front view correct and accepted a narrower back.
- **Left view:** the low crystal leaning toward the front, on the left of the image, is smaller and less visible than in the reference.
- **Surface look:** the painting's glowing edges, pink highlights and gradients are missing. The model is flat-shaded in solid colours only.
- **Colour:** the crystals are slightly more blue-violet than the reference's pinker lavender.

The side-by-side images (reference on the left, render on the right) are in the scratchpad. `r1` is the first round and `r4` is the final state:
`C:\Users\user_\AppData\Local\Temp\claude\b205883308a81b14\18e82a9e-6191-4908-8404-c27881523687\scratchpad\r4-front.png`, `r4-left.png` and `r4-back.png` in that same folder.