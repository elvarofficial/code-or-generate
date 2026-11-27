I've built the boulder in `route-a/17-boulder.js`, rendered it three ways and done all three compare-and-fix rounds. It reads as the same kind of object (a moss-covered boulder with cracked stone plates), but it is not a close match to the references. Stone shows in the wrong places from the side, and the surface looks smoother and blobbier than the painted originals.

**What's in the module:** it exports `createBoulder()` (also the default export), which returns a `THREE.Group` holding one mesh of 18,176 triangles. It stands on y = 0, faces +Z and is 1.8 units tall. The outline comes from width and depth measurements taken off the front and side pictures. The cracks and plates, the moss and the colouring are all generated in code; there are no image files or downloaded textures.

**What I fixed in the three rounds:**
1. **Shape and colour:** the first version was too boxy and too wide at the top, with puffy plates and jagged cracks. Stone showed all over, the moss was too blue-green and the lighting was flat. I narrowed the upper part, flattened the plates, used fewer and larger plates, and limited the stone to the front centre and the back upper left. I also made the moss more olive and darkened the base.
2. **Lighting bug:** the surface lighting was inside-out, so the side facing the camera came out dark. I fixed that and broke up the hard edges of the stone patches.
3. **Final tuning:** I made the base tuck in like an egg in the side view and toned down the moss and stone colours.

**What still doesn't match (after the third round, so left as is):**
- **Side view:** grey plates show along both edges and a moss stripe runs down the middle. In the reference that side is almost all moss, with only a few thin plates at the edges.
- **Front view:** the stone area is smaller and sits lower than in the reference. The reference has a big cluster of plates in the upper and middle front, and a wider top that steps out on the upper right.
- **Back view:** the stone covers a large left-centre area. The reference has one big plate at the upper left and a diagonal crack down the centre.
- **Painting style:** the moss looks like blotchy noise rather than brush strokes, and the plates are smooth and pillowy rather than chiselled with light-catching rims.
- **Cracks:** they come out as an even honeycomb pattern. The reference cracks are a few branching lines with golden centres, mostly on the front.
- **Outline:** it is smooth and rounded, while the reference edge is faceted, with angular corners at the top and bottom.
- **Seams:** some crack edges are slightly jagged at the plate borders on the right side of the back view.

The side-by-side images (reference left, my render right) for each round are in `C:\Users\user_\AppData\Local\Temp\claude\7d70849c74a0f4d8\7f95d2c7-b9b6-48cc-b826-bccb1085ea71\scratchpad\`. The final set is `r4-front.png`, `r4-left.png` and `r4-back.png`; `r1` to `r3` are the earlier rounds.