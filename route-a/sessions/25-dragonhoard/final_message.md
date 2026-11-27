I built the dragon hoard as `route-a/25-dragonhoard.js` and ran all 3 compare-and-fix rounds, then stopped. The final version is 19,904 triangles, just under the 20k limit, and uses only code-built geometry and materials (no external models or textures).

The module exports `createDragonHoard()` (also the default export), which returns a `THREE.Group`. It follows the project setup: it stands on y = 0, faces +Z, and up is +Y. It contains:
- **Dragon:** seated, with horns, eyes, belly ridges, back spines, spread two-tone wings, and a tail that curls around its left side to the front.
- **Hoard:** a coin mound with 210 individual coins, an open chest with gems and a goblet inside, a crown, goblets and gems scattered on the coins.
- **Base:** a round pedestal with carved swirls around its side.

Each comparison image has the reference on the left and my orthographic render on the right, for front, left and back. They're in `route-a/_render/`:
- `r1.png` – round 1
- `r2.png` – round 2
- `r3.png` – final

To re-render, run `node render.mjs <out.png>` from that folder.

**Fixed across the rounds:**
- **Round 1:** too many triangles (34.9k); narrow, spiky wings; tail buried in the coins; flat coin mound; faint carvings; thin neck; upright torso; oversized haunches; small crown.
- **Round 2:** still too many triangles (27.6k); coin mound too tall and too brown; carvings sunk into the band; the back of the head looked like a spiked ball.
- **Round 3:** trimmed coins and segment counts to get to 19.9k.

**Still doesn't match:**
1. **Viewing angle:** the reference is drawn slightly from above, so you see the top of the pedestal and coins. A level orthographic camera shows the pedestal as a flat rectangle and the coin pile as a thin strip.
2. **Wings from the side:** in `left.png` the wing is folded and seen almost flat-on, showing a broad green surface. Mine is swept back at a fixed angle, so it looks like a narrow brown band.
3. **Body shape:** it's built from smooth ellipsoids and reads blobby. The reference has scale texture, defined muscles and slimmer thighs; from behind, my haunches are two round balls.
4. **Belly ridges:** mine are stacked horizontal rings that look like a barrel. The reference has V-shaped plates.
5. **Back spines:** they point straight back, so in the back view they show as dots. The reference has a row of long, flat plates down the neck and back.
6. **Head:** the snout is thinner and simpler than the reference, and the cheek spikes are smaller.
7. **Chest:** it's darker than the reference and lacks its silver-grey metal trim. The open lid shows as a dark block rather than a clear wooden inside.
8. **Coins:** there are fewer and they're spread out, with gaps where the gold mound shows through, because coin count was the main thing I cut to get under the triangle limit.
9. **Tail:** it now shows on the right in the front view and in the back view, but its front curl is lower and less of a clear loop than in the reference.