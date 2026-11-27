I've built the dragon as `route-a/20-dragon.js`. It exports `createDragon()` (also the default export), which returns a `THREE.Group`. It uses 19,692 triangles, under your 20k budget, and the geometry and materials are all in code: no models, no image textures. It follows the project conventions: it stands on y = 0, faces +Z, and is about 7.2 units tall.

**How it's built:** the neck, body and tail are one continuous smooth shape. The tan belly plates and the scale-like colour variation are painted onto that surface. The head, legs, wings, horns, eyes and dorsal spikes are separate pieces added to it.

**Reference conflict:** the three pictures don't agree on pose. The left view shows a walking dragon whose tail curls up into a spiral. The front and back views show the tail lying on the ground and hooking sideways to the dragon's right. I went with the front/back version, and the near front paw is only slightly lifted.

**Compare-and-fix rounds** (orthographic renders at the same scale as the references, each shown next to its reference and overlaid on it):

| Round | What didn't match | Fix |
|---|---|---|
| 1 | Over budget (22,956 triangles); wing colours swapped (front should be brown, back green); tail tip curled up in front/back; belly band too narrow; lower body too slim; eyes small and sunken; chest flat in side view | Fewer segments; wing sides flipped; tail now hooks along the ground; belly band and body widened; bigger eyes moved forward; chest pushed forward |
| 2 | Side view of the wing all brown; head too round with a stubby snout; green too dark and flat | Green fades in along the top of the wing; forehead-to-muzzle piece added and longer snout; lighter green with more variation |
| 3 | Tail tip too thin and pointy | Thicker, rounded tail end |

**Still doesn't match after three rounds:**
- **Side view:** no upward tail spiral (I followed the front and back views), and the near front paw is barely lifted, not clearly mid-step.
- **Side view wing:** mostly brown, where the reference is mostly green. The front and side cameras see the same face of the wing, and the front reference needs it brown.
- **Legs:** they look like plain tubes with a visible join at the shoulder, without the soft bulges in the art.
- **Skin detail:** the painted scale pattern, outline strokes and dark brow lines aren't reproduced; the colour variation only hints at them.
- **Back view:** the reference shows a raised heel on the dragon's left hind foot; that isn't modelled.

The final side-by-side images are in `C:\Users\user_\AppData\Local\Temp\claude\3d09a3e418f65305\3dd85670-d61d-4ee4-a9ba-edc52cb8012f\scratchpad\h\`: `final_front.png`, `final_left.png` and `final_back.png`. Each shows reference | render | overlay. Re-render with `node render.mjs <tag>` in that folder.