I've built the alchemist in `route-a/21-alchemist.js`. Its default export, `createAlchemist()`, returns a `THREE.Group` that stands on y = 0, faces +Z, and uses 19,174 triangles. Everything is built in code; the only texture is the rune trim, drawn on a canvas at runtime.

**What's in it:** the round stone plinth with a carved band, the hooded wizard with his green flask and raised open hand, and the gold armillary sphere floating above the hand. The dragon clings to his back with one wing spread out and one raised, and its tail curls round to the floor. The cauldron table on his right has a skull, candles and green crystals. The table on his left has books, candles and crystals, with more books and crystals on the floor.

**Compare-and-fix rounds (3, then stopped).** Each render used an orthographic camera framed to the same scale and position as its reference, so the two could be overlaid directly.
1. **Round 1:**
   - It was over budget at 29,402 triangles; I cut segment counts to get it to 19.2k.
   - The beard was hidden inside the robe.
   - The hood's gold rim floated above the head like a halo.
   - The dragon head was too small.
   - The tables were spindly.
   - The steam looked like a stack of balls.
   - The armillary sphere read as a flat disc from the side.
   - The hands were too small.
   - The plinth was hard-edged.
2. **Round 2:**
   - The hood was too large and high.
   - The beard was a sharp cone.
   - The cauldron rendered pure black.
   - Stray tick marks showed on the plinth steps.
   - The dragon's horns were too long.
3. **Round 3:**
   - The rune strips down the robe were too thin.
   - The inside of the hood was lit the same blue as the outside.

**Still not matching after round 3:**
- **Face and hood:** the hood still frames the face with a ring rather than a pointed opening running down to the collar. The face is plain, with no stern brow or wrinkles. The beard is smooth rather than wavy.
- **Dragon:** the head is boxy and the wings are flat, with no shading, veins or ragged edges. There are no scales or belly detail on the back of the body.
- **Plinth:** the carving is a simple interlaced wave, not the reference's scrollwork, and the floor stones are only sketched in with seam lines. Straight-on orthographic views also can't show the plinth top the way the angled references do.
- **Sleeves:** they are tubes with separate hanging pieces rather than flowing bell shapes, and there is no green glow on the robe.
- **Left reference:** it doesn't agree with the front and back references. It puts a skull, candles and the cauldron on the near table, but the front and back put the cauldron table on the other side. I followed the front and back, so the left view's props don't match its reference.

The final side-by-side images (reference on the left, render on the right) are:
- `C:\Users\user_\AppData\Local\Temp\claude\f74bba9aeb773fbd\a40630c6-af56-4ff5-88f2-07a5ef1f41a3\scratchpad\r4\front_cmp.png`
- `C:\Users\user_\AppData\Local\Temp\claude\f74bba9aeb773fbd\a40630c6-af56-4ff5-88f2-07a5ef1f41a3\scratchpad\r4\left_cmp.png`
- `C:\Users\user_\AppData\Local\Temp\claude\f74bba9aeb773fbd\a40630c6-af56-4ff5-88f2-07a5ef1f41a3\scratchpad\r4\back_cmp.png`

The render script is `C:\Users\user_\AppData\Local\Temp\claude\f74bba9aeb773fbd\a40630c6-af56-4ff5-88f2-07a5ef1f41a3\scratchpad\render.mjs`.