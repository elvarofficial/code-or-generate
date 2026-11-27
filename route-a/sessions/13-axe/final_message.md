I built the axe as `route-a/13-axe.js`, which exports `createAxe()` (also the default export) and returns a `THREE.Group`. It's about 6,000 triangles, with all geometry and materials made in code. The shape matches the reference closely in all three views; the main visible difference left is the steel colour, which is still lighter than the painted reference. I ran three compare-and-fix rounds and then stopped.

**How it's built:** each blade is a crescent outline traced from `front.png` and extruded. It is thickest at the socket and thins toward the cutting edge and the tips, so from the side it reads as the pointed edge seen in `left.png`. Each blade face also has a raised rune band with a dark groove around it, a recessed inner panel with a raised shape in it, and engraved runes on both faces. The rest is:
- a socket block with collars and crossed leather straps;
- a wooden plug and an eight-sided spike on top;
- a curved, tapering haft with a 9-band leather wrap and a flared, slanted butt.

I used the reference scale: 1 pixel = 0.001 units, so the axe is about 0.865 tall and stands on y = 0.

**What each round found and fixed:**
1. **Round 1:** the grip wrap rendered as large blocks because the ring pieces were far too thick, the steel was too pale and flat, there was no groove around the rune band, the wood was too yellow, and the spike had a faceting artifact. All fixed. (Before this I also had to correct my own render setup, which had drawn the axe too low in the frame.)
2. **Round 2:** the haft was too straight and the reference curves to the left near the bottom, the butt was cut flat, the wrap was too thin, and gaps between wrap bands showed white in the side view. All fixed.
3. **Round 3:** the steel was still too light and the butt flare too small. I darkened the steel and enlarged the butt.

**Still not matching:**
- The steel is lighter and flatter than the reference, which also has painted wear and highlights I didn't attempt.
- The chipped notches along the blades' outer edges aren't modelled.
- The grip wrap is a simple spiral, not the reference's criss-cross pattern.
- In the side view, the strap loops on the socket show as straight vertical strips, not ovals.
- The runes are simple stroke glyphs, not copies of the specific runes in the reference.

The side-by-side comparisons (reference on the left, render on the right) are in `C:\Users\user_\AppData\Local\Temp\claude\1bd95ab707c1c8ff\d82ba2d3-78fa-4cc0-badb-51a668ee9aec\scratchpad\`. The final images are `final-front.png`, `final-left.png` and `final-back.png`, and the earlier rounds are `r1-*`, `r2-*` and `r3-*`. That folder is temporary and can be cleared; the render script `render.mjs` and page `page.html` are in it too.