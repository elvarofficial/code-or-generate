I built the lantern in `route-a/02-lantern.js` and ran the three compare-and-fix rounds. It exports `createLantern()` (also the default export), which returns a `THREE.Group` of about 18,700 triangles, under the 20,000 limit. It stands on y = 0, faces +Z (filler cap at the front) and is about 0.30 m tall. There are no external models or textures: the rust pattern is computed into per-vertex colours.

**How I compared:** I rendered it from the front, left and back with an orthographic camera scaled so one render pixel equals one reference pixel. Each comparison image shows the reference, the render, and the two overlaid at 50%. Outlines line up closely in all three views: tank, globe, chimney with vent holes, hood, top cap, carry ring, side frames, crossed guard wires, bail handle folded down at the back, and the filler cap tilted forward.

**What I fixed:**
- **Round 1:**
  - Metal came out too orange. Part of that was an orange light in my render setup, which I removed; the rest was too much rust colour in the model, which I reduced.
  - The glass was too opaque and the flame was a flat orange shape; it now has three layers.
  - The filler cap was too far back and not tilted enough.
  - The side frames were too thin.
  - The pivot loops at the top corners were edge-on and invisible from the front.
- **Round 2:** the metal was too dark and uniform, so I lightened it and added grey worn patches. I made the glass clearer and added a soft glow around the flame.
- **Round 3:** I adjusted the filler cap's tilt, enlarged the pivot loops, and faded the edge of the flame glow.

**Still not matching:**
1. The rust is a soft blotchy pattern, without the reference's painted streaks, sharp patches and outlines.
2. The flame has no bright glow at its base and no light on the inner sides of the frames.
3. The glass still looks a bit milky and evenly white, without the reference's highlight streaks.
4. From the side, each frame's bottom end is rounded where the reference has a flat strip ending in a point on the tank.
5. The frames' lower bends sit about 10–15 px higher and slightly narrower than the reference.
6. The glowing burner under the flame reads as a flat cream disc rather than a small bright bulb.
7. The top vent openings are dark gaps between posts; the reference has cleaner rectangular windows.

I stopped after round 3 as asked. The comparisons are:
- `C:\Users\user_\AppData\Local\Temp\claude\e28d92b2118b3d7f\60d12807-b93c-409f-90df-933667194bc1\scratchpad\r3\cmp_front.png`
- `C:\Users\user_\AppData\Local\Temp\claude\e28d92b2118b3d7f\60d12807-b93c-409f-90df-933667194bc1\scratchpad\r3\cmp_left.png`
- `C:\Users\user_\AppData\Local\Temp\claude\e28d92b2118b3d7f\60d12807-b93c-409f-90df-933667194bc1\scratchpad\r3\cmp_back.png`

The render script is `C:\Users\user_\AppData\Local\Temp\claude\e28d92b2118b3d7f\60d12807-b93c-409f-90df-933667194bc1\scratchpad\render.mjs`.