The ogre-and-goblin statue is in `route-a/24-goblin.js`. Its `createGoblin()` function (also the default export) returns a `THREE.Group` of 18,758 triangles, under the 20,000 limit. It has no external models or textures: everything is built in code, including the rune strokes on the pedestal. I did three compare-and-fix rounds and then stopped. I only re-rendered the front view after the last fix; I didn't recheck the side and back views after it.

**What matches the references:**
- Overall proportions: the rune pedestal with the "R" medallion, the hunched ogre with its head pushed forward, long arms hanging forward, bracers, leg wraps, and a ragged loincloth with a skull and a green potion.
- The bone and fang necklace, the belt pouch, and the lantern on the ogre's right hip, which is visible from the front, side and back.
- On the back: two tied sacks, X-shaped straps, a small sack, a clay pot and a fur back-flap.
- The hooded goblin sits on the ogre's shoulders with big ears and a long nose. It holds a forked staff in its right hand with a glowing crystal and blue and white feathers, and reaches forward with its other hand.
- Everything is on the correct side in every view, following the axis rules in `CLAUDE.md`.

**What I fixed in the three rounds:**
1. The model was at 27.7k triangles, so I lowered the detail on the spheres, cylinders and rings.
2. The grey spikes hanging over the chest became shorter brown fur, and the back loincloth went from grey to brown.
3. The ogre's hands and the goblin's arms and hands are larger, and both characters' ears are wider. The goblin's robe and hood are bigger, and the hood's peak droops back instead of sticking up.
4. The lantern was hidden behind the arm; it now hangs where it's visible.
5. The back straps now sit outside the body.
6. The fur over the shoulders is flatter.

**What still doesn't match:**
- **Fur:** the fur over the shoulders still reads as a smooth grey-brown pad with spikes. The reference has a shaggy collar that frames the head, and my collar tufts are still mostly hidden inside it.
- **Overall look:** the build is blocky and the shading is flat. There are no muscles, the green is brighter and more uniform, and there's no painted texture, stitching or fur detail.
- **Pedestal:** in the reference you can see its top surface and it's darker at the base. An orthographic camera can't show the top, so mine looks like a plain drum. The rune glyphs are invented, not copied.
- **Goblin:** the hood still looks like a ring around the face, the robe is a simple cone, and it has no V-neck or chest cord.
- **Back gear:** the sacks are too round and smooth and stand out too far from the back from the side. The pot has a plain band instead of the zigzag pattern.
- **Ogre's head:** the face is simplified, with no scowl, and the tusks and ears are a bit small.
- **Toes:** they are small blobs and the toes and fingers are short.

The side-by-side images are in `C:\Users\user_\AppData\Local\Temp\claude\1b84c619c789e773\4415a997-4bba-43fd-a253-f2f0d5f7607f\scratchpad\render\`. Files `r1-*`, `r2-*` and `r3-*` are the three comparison rounds and `final-front.png` is the last render. Running `render.mjs` in that folder re-renders all three views.