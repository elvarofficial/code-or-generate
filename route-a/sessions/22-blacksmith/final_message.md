I built the blacksmith as `route-a/22-blacksmith.js` and did all three compare-and-fix rounds. The final model is 17,336 triangles, under the 20,000 limit. It uses only code-built geometry and materials, with no model files or textures. It exports `createBlacksmith()` (also the default export), which returns a `THREE.Group`.

**What's in it:**
- **Base:** a round stone base with runes carved around the front half and a round "R" plate at the front. The top is a ring of stone blocks around a stone-tiled floor.
- **Forge:** made of individual stones, with an arched fire opening, coals and flames. It has a chimney and an arched wood store with logs underneath.
- **Dwarf:** red hair and braided beard with gold rings, bare arms, leather apron with crossed straps on the back, belt, wrist guards, grey trousers and boots. His raised right hand holds a hammer; his left holds tongs gripping a glowing blade on the anvil.
- **Anvil, rack and bellows:** an anvil with a horn, and a wooden tool rack holding a hammer, two pairs of tongs and two swords. Two bellows rest on planks over stone blocks.

**Fixed over the three rounds:**
1. **Round 1:** the first version was 23.8k triangles, over the limit. I cut it by lowering the detail on spheres and curved shapes. I also brought the raised arm forward, made the upper arms thicker and opened the bellows wider.
2. **Round 2:** I made the skin warmer, made the flames larger and the fire glow brighter, and tilted the hammer back. I also gave the anvil a narrower middle and a wider top, enlarged the right bellows and added bicep bulk.
3. **Round 3:** the top half of the fire opening was dark because a hidden stone surface sat in front of the glow; I shortened it so the fire shows. I also tilted the left bellows more upright.

**What still doesn't match:**
- **Camera angle:** the references look down from slightly above, so they show the tiled floor, the anvil's top face and the forge's arch from the side. A straight orthographic view can't show those, so the base looks like a flat band, and in the side view the forge looks like a block of stone with no visible arch.
- **The views disagree with each other.** In the front reference the bellows lie side to side; in the left reference the right one runs front to back; in the back reference the large one has switched sides. I angled the right bellows diagonally as a compromise, so it matches no view exactly.
- **Too stylised and regular:** the reference stonework is rounded and uneven. Mine is evenly sized boxes, so the forge, and especially its back, looks more like neat bricks than rubble.
- **Dwarf:** the arms and chest are smooth, rounded shapes without visible muscle. The face is mostly hidden by the beard and moustache, where the reference shows eyes and a frown. The apron is a little shorter and narrower than in the reference.
- **Fire:** the flames are simple cones and look stiffer and smaller than the painted fire.
- **Anvil:** from the side it still looks boxier than the reference.
- **Tool rack:** it has one post on each side, while the left reference shows a deeper frame. The right post hangs past the edge of the base, standing on the bellows plank, which is roughly how the reference has it.
- **Base edge:** the bottom edge doesn't have the double rounded rim the reference shows.

The final side-by-side comparison of all three views is `C:\Users\user_\AppData\Local\Temp\claude\a588671ab0a8e38a\616fb780-477a-46ee-a2ef-0e37bbe4c92b\scratchpad\r4_all.png`. The script that renders the views and builds the comparison is `C:\Users\user_\AppData\Local\Temp\claude\a588671ab0a8e38a\616fb780-477a-46ee-a2ef-0e37bbe4c92b\scratchpad\render.mjs`.