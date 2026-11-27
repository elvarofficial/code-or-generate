I've built the chest in `route-a/07-chest.js`. It exports `createChest()` (also the default export), which returns a `THREE.Group` of 14,336 triangles. Everything is made in code with plain materials, no models or textures. It stands on y = 0, faces +Z, and its overall size matches the reference sheet.

I ran the three compare-and-fix rounds and then stopped. Each set of renders was made with an orthographic camera at the reference scale and placed beside the matching reference image.

**What changed each round:**
1. **First render vs reference:**
   - The lid looked like a square box from the front; it now has rounded shoulders.
   - The back hinges were hidden inside the straps; they now stand out, with plates, knuckles and rivets.
   - The rope was a lumpy tube sticking too far out; it is now a twisted two-strand rope closer to the side.
   - The metal was too dark.
   - The lid end panel had no plank lines.
   - The lock hasp was blocky.
2. **Second pass:** rounding the shoulders broke the lid end bands in the side view. I rebuilt them as proper curved bands, set the wooden end panel in slightly, and gave the planks varied wood tones.
3. **Third pass:** the new end bands were facing the wrong way and didn't render at all. Flipping them fixed the side and front views.

**What still doesn't match after the last round:**
- **Side view:** a thin wooden sliver shows near the top of each lid end, between the end panel and the metal band.
- **Side view:** a few rivets poke out of the outline at the front and back edges; the reference has none there.
- **Surfaces:** the metal is one flat grey and the wood one flat colour per plank. The reference has painted highlights, worn edges and wood grain, which would need textures (ruled out) or a lot more geometry.
- **Shapes:** the lid top is a simple curve, a bit squarer than the reference's softly bulging barrel shape. The padlock's shackle and staple are smaller and less visible than in the reference.
- **Rope:** from the front it hangs nearly straight down instead of curving outward in a visible loop. In the side view it matches well.

The render harness is in the scratchpad folder, not the project: `C:\Users\user_\AppData\Local\Temp\claude\a3ff6f61c80c1be5\3e69992b-b7ae-4a34-800f-30ab9cdd7de4\scratchpad\render.mjs` with `view.html` beside it. The final side-by-side images are in the same folder:
- `C:\Users\user_\AppData\Local\Temp\claude\a3ff6f61c80c1be5\3e69992b-b7ae-4a34-800f-30ab9cdd7de4\scratchpad\r4-front.png`
- `C:\Users\user_\AppData\Local\Temp\claude\a3ff6f61c80c1be5\3e69992b-b7ae-4a34-800f-30ab9cdd7de4\scratchpad\r4-left.png`
- `C:\Users\user_\AppData\Local\Temp\claude\a3ff6f61c80c1be5\3e69992b-b7ae-4a34-800f-30ab9cdd7de4\scratchpad\r4-back.png`