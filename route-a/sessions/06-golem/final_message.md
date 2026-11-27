I built the golem in `route-a/06-golem.js` and did three compare-and-fix rounds, then stopped. It roughly matches the references but is clearly not finished: the last round fixed some things and broke others.

The module exports `createGolem()` (also the default export), which returns a `THREE.Group`. It stands on y = 0, faces +Z, is about 2 units tall, and uses 6,560 triangles. Everything is built from three.js primitives with no textures: olive-grey stone, purple-grey metal, leather straps and a loincloth, and glowing gold runes made from thin boxes (an R on the chest and belt buckle, symbols on the shoulder plates, bracers and forehead).

**How the outline matched** (overlap between the reference outline and the render, 1.0 = identical):

| View | Round 1 | Final |
|---|---|---|
| Front | 0.79 | 0.83 |
| Left | 0.87 | 0.87 |
| Back | 0.79 | 0.83 |

**What I fixed**
1. Shoulder plates: the flat domes became domes tilted outward with a rim and arc bands, and a raised plate beside the head.
2. Hands: bigger, lower and further forward, with four fingers and a thumb.
3. Bracers: lowered and tapered toward the top.
4. Upper arms: thicker and given more depth at the back.
5. Legs and feet: moved inward, toes shortened and heels lengthened.
6. Final round: narrower shoulder domes, fingers spread outward, a gap kept between the knees, wider feet, lighter metal, and the back triangle runes pushed back into view.

**Still wrong after the last round**
- **Floating rune bits:** after I narrowed the shoulder domes, a few rune strokes on their outer sides were left floating in the air. They show as thin yellow slivers beside each shoulder in the front and back views.
- **Shoulder plates:** the raised plates beside the head now stick up like posts instead of a curved rim. The domes are rounder than the reference's angled shape, still bulge slightly backward in the side view, and the rune row along the top of each dome isn't modelled.
- **Hands:** the fingers are straight blocks, not curled fists, and they still sit a little inside and below where the reference has them.
- **Bracers:** they are boxy 8-sided tubes, without the layered plates and the large spiral-rune plate seen in the side view.
- **Boots:** plain cylinders with bands, lacking the reference's tapered stone chunks. The swirl ornament is reduced to a small ring.
- **Head:** blocky and without the hunched heavy brow. The collar ring around the neck is simpler than the reference's.
- **Surface detail:** none of the painted cracks, stone plating, rust or edge highlights are modelled.

The comparison images are in `C:\Users\user_\AppData\Local\Temp\claude\d48dbe0dd1ff1fe7\2b3f1bdd-a82b-4c14-9e64-b5a08dc6418b\scratchpad`. Each run folder (`r1`, `r2`, `r3`, `r4` is the final) holds `compare_front.png`, `compare_left.png` and `compare_back.png`. Each puts the reference, the render and an outline overlay side by side, with red for reference-only areas and blue for render-only areas. The render script is `render.mjs` in the same folder.