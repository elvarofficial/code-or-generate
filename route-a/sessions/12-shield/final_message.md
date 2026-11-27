I built the shield as `route-a/12-shield.js` and ran three compare-and-fix rounds, then stopped. It renders correctly from all three sides. The main remaining gaps are that the bear painting is simpler than the reference and the reference's side view can't be matched exactly (more on both below).

**What it is**
- The module exports `createShield()` (also the default export), which returns a `THREE.Group`.
- It stands on y = 0, faces +Z, and is 1 unit across.
- It has 6,616 triangles, well under the 20,000 limit.
- Parts:
  - **Iron rim:** a hammered ring with uneven light and dark shading.
  - **Wooden board:** the front shows orange planks with the bear painted on; the back shows darker planks. Both are drawn in code at load time, with no image files.
  - **Back straps:** two curved leather straps, riveted at both ends.
- Because the wood and bear are drawn at load time, the module needs a browser (it uses `document`).

**Fixes per round**
1. The rim was a lumpy tube with a wavy outline. I made it a flatter band with a clean circular outline. I removed stray paint strokes that looked like scratches, made the mouth taller, recoloured the ears, softened the plank seams, added a dark shadow ring under the rim, and removed the strap end plates.
2. The strap ends were sunk into the wood, so the straps looked short. I lifted them and put the rivets on the strap ends. I also lightened the rim, smoothed the bear's outline, and widened its jaw and brows.
3. The rim was now too light and plain, so I darkened it and added stronger light streaks. I also made the bear's tan cheek patches smaller.

**What still doesn't match**
- **Side view:** the reference "left" image isn't a true side view. It shows the shield turned about 70°, so the bear face is visible. Looking exactly from the side, the real shield shows only its edge: a rim band with the strap bulging out behind. The rim depth there looks right.
- **Bear painting:** it is a simpler, flat-colour version. It lacks the reference's soft brushed blending, fur texture and blue/green shading. The head is about the right size and position, but the outline is blockier.
- **Rim:** the reference has crisper bright highlights and nicks along its edge. Mine has smooth shading instead.
- **Back straps:** they are a little flat and uniform. The reference straps are wavy and wrinkled, with dark edges.
- **Wood:** the reference's grain is more painterly, with more highlights. The board is flat; any slight curve in the reference's surface isn't modelled.

The final side-by-side images are in the scratchpad:
- `C:/Users/user_/AppData/Local/Temp/claude/199eaf208adf5c38/b2c5f5b2-a8f3-4fb8-871a-561fda269850/scratchpad/r4-front.png`
- `C:/Users/user_/AppData/Local/Temp/claude/199eaf208adf5c38/b2c5f5b2-a8f3-4fb8-871a-561fda269850/scratchpad/r3-left.png` (the last fix didn't change the side view)
- `C:/Users/user_/AppData/Local/Temp/claude/199eaf208adf5c38/b2c5f5b2-a8f3-4fb8-871a-561fda269850/scratchpad/r4-back.png`

To re-render, run `node render.mjs <tag>` in that scratchpad folder.