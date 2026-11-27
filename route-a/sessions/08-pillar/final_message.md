I built the pillar in `route-a/08-pillar.js`. Its `createPillar()` function (also the default export) returns a `THREE.Group` of about 8,100 triangles, under the 20,000 limit. Everything is made in code: stacked octagonal stone blocks with bevelled edges, raised panels with carved runes, cracks, a wolf head built from primitives, and stone colour with moss patches painted on in code. No textures or external models are used.

I rendered it from the front, left and back with an orthographic camera at the same scale and framing as the references. I did the three compare-and-fix rounds and then stopped.

**Round 1**
- **Problem:** the wolf head was far too small and mostly buried in the top block.
  - **Fix:** made the head bigger and moved it forward.
- **Problem:** the mouth and nose showed as black slabs from the side.
  - **Fix:** reshaped them.
- **Problem:** the back view had runes and dark cracks, but the reference back is plain.
  - **Fix:** removed them.
- **Problem:** the stone was too dark and cool.
  - **Fix:** made it warmer and lighter.

**Round 2**
- **Problem:** the head still floated in the side view, with its mane hidden inside the block and the lower jaw detached.
  - **Fix:** moved the mane in front of the block, filled the gap at the jaw, and scaled the head up.

**Round 3**
- **Problem:** the head was still a little small, the ears were thin spikes from the side, and the nose and mouth were too dark and stuck out too far.
  - **Fix:** scaled the head up again, thickened the ears, and shrank the nose and mouth.

**What still does not match:**
- **Wolf head detail:** the head is now the right size and in the right place, but it is much simpler than the reference. The mane is lumpy instead of fur-like, the brow and snout are less defined, and from the side the jaw reads as boxy rather than a snarl.
- **Moss:** there is less of it, and it is softer. The reference has thick moss on the top of each base tier, which a straight-on camera barely sees.
- **Base stonework:** the base tiers are clean octagons. The reference has irregular, chipped stones with more visible joints.
- **Viewpoint:** the reference images are drawn from slightly above, so they show the tops of ledges and the base looks taller. The orthographic renders are level, so those top surfaces don't show.
- **Exact runes:** the rune shapes are close to the reference but not copied one-to-one.

Files are in `C:\Users\user_\AppData\Local\Temp\claude\ea04f1cfe4cb73e1\f3c3a364-6eea-4f57-8c17-35c6613669a2\scratchpad\`:
- **Final comparison** (references on top, renders below): `C:\Users\user_\AppData\Local\Temp\claude\ea04f1cfe4cb73e1\f3c3a364-6eea-4f57-8c17-35c6613669a2\scratchpad\r4\composite.png`
- **Earlier rounds:** the same file in the `r1`, `r2` and `r3` folders next to it.
- **Render script:** `C:\Users\user_\AppData\Local\Temp\claude\ea04f1cfe4cb73e1\f3c3a364-6eea-4f57-8c17-35c6613669a2\scratchpad\render.mjs`