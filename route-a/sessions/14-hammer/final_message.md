I built the hammer in `route-a/14-hammer.js` and ran three compare-and-fix rounds. The front and back views match the references closely in outline and proportions; the left view doesn't, mainly because the reference image isn't a true side view.

The module exports `createHammer()` (also the default export), which returns a `THREE.Group`. Everything is built in code with no external models or textures, and the final model is about 3,200 triangles. It stands on y = 0, faces +Z, and is about 0.9 units tall. It has:
- **Head:** a stone block with an angry bear-head carving on the front and a plain, slightly dented back.
- **End caps:** two chamfered stone caps, each with four carved runes on the front and back faces.
- **Haft:** a wooden shaft that pokes out above the head, a metal collar under the head, and two metal bands. Each band has a rivet front and back and a spike on each side.
- **Grip and pommel:** a leather-wrapped grip with crossing straps, and a ring at the bottom.

**Fixed over the three rounds:**
1. The bear carving was hard to read. It now has a dark outline, a slightly sunken backing panel, angry brows and eyes, and a bigger nose.
2. The grip wraps were evenly spaced rings; they are now wider straps tilted in alternating directions, with scratch marks.
3. The bands had eight small dark studs each; they now have the reference's single big rivet and side spikes, in a lighter steel.
4. A stray chip block was sticking out of each end cap; I removed it.
5. The ring showed as a thin line in the left view. It's now larger and turned slightly so it reads as a ring from the front and side.
6. The dents on the back face were rectangles; they're now soft oval shallow marks.

**Still doesn't match:**
- **Left view:** the reference left image is drawn as a three-quarter view, showing the end face and the bear side at once. A true orthographic left view shows only the square end face, so the outlines differ.
- **Stone colour:** the head is a flat grey. The reference has painted shading, darker edges and texture, which plain materials without textures don't reproduce.
- **Ring:** its top still sits partly behind the bottom band, so it looks smaller than in the reference.
- **Detail level:** the runes are simple strokes standing slightly proud of the surface rather than cut into it, and the bear is flatter and simpler than the painted one.
- **Pommel:** the band above the ring is a plain cylinder; the reference has a flared, cone-shaped end.

The final side-by-side render (reference on the left, model on the right) is `C:\Users\user_\AppData\Local\Temp\claude\b76ce61c037770a0\abd3d1c1-9f82-4423-955e-d9394603d7c9\scratchpad\r4.png`. The render script is `C:\Users\user_\AppData\Local\Temp\claude\b76ce61c037770a0\abd3d1c1-9f82-4423-955e-d9394603d7c9\scratchpad\render.mjs`.