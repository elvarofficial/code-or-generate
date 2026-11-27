The sword is built in `route-a/03-sword.js`: `createSword()` (also the default export) returns a `THREE.Group` made of 11,420 triangles, within the 20,000 limit. Geometry and materials are all in code, with no textures or external models. It stands point-down on y = 0, with the front (the green-gem side) facing +Z. One unit equals 1,000 reference pixels, so the sword is about 0.9 units tall, and I used that scale to line renders up pixel-for-pixel with the references.

I did three compare-and-fix rounds and then stopped. The scores below are how much the render's outline overlaps the reference's (1.0 is a perfect match):

| Stage | Front | Left | Back |
|---|---|---|---|
| First correct render | 0.875 | 0.501 | 0.879 |
| Final | 0.906 | 0.561 | 0.907 |

**What I fixed:**
- **Round 1:** made the guard centre a narrower diamond, rebuilt the dragon heads (squared snout, open jaw, teeth, swept-back curved horns), made the pommel prongs straight and splayed outward, changed the grip wrap to wide diagonal bands, darkened the blade, widened the blade ornament with closed curls, and added the hooked blade shoulders.
- **Round 2:** made the dragon heads about 22% bigger, thickened the necks, and darkened the guard block and ornament.
- **Round 3:** pulled the heads in to the reference width, shortened the necks, and lowered the metal shininess so front and back shade more evenly.

**What still doesn't match:**
1. **Left view:** the reference isn't a true side view; it's turned roughly three-quarters. It shows the blade about 38 px wide and the guard and dragons about 120 px deep. A real side view of a flat blade is a thin edge, which is what my render shows. Matching the picture would mean a blade half as thick as it is wide, which would look wrong from the front, so I kept the model consistent instead. This is why the left score stays at 0.56.
2. **Blade surface:** the reference has mottled, worn steel and nicked edges. Mine is clean, evenly shaded steel, since textures were ruled out and I didn't fake the wear with geometry.
3. **Ornament detail:** the reference's filigree on the guard and upper blade is a dense, interlocking lattice. Mine is a tapering strip with three pairs of torus curls, and the front gold is still paler than the reference's warm bronze.
4. **Dragon heads:** they have the right size and placement, but no scales, nostrils or fine sculpting. The snouts are also more horizontal than the reference's downturned muzzles.
5. **Guard block:** it still reads as a flat hexagonal plate. The reference has a carved bezel with scrolls flowing into the dragon necks.
6. **Pommel:** the reference's crown prongs are broad and leaf-shaped around the red gem; mine are thin tapered spikes.
7. **Shading:** my renders use a lighting setup I made for comparison, and the back view still comes out slightly darker and flatter than the reference.

The final side-by-side image is `C:\Users\user_\AppData\Local\Temp\claude\7d8e3306a9e34150\5196a0bb-60e1-4f61-a491-564c6b1dca4a\scratchpad\compare-r4.png`, and the earlier rounds are `compare-r1.png` to `compare-r3.png` in the same folder. That folder is temporary and may be cleared. I removed the temporary render page I had put in the project, so `route-a/03-sword.js` is the only file I added there.