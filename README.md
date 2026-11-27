# Code it or generate it? 25 game assets, both ways

The same 25 game assets, made twice from the same concept images and measured the same way. The brief started with six; the client asked for twenty, then for a fifth, harder tier of 5 statues. The first six kept their ids (01 to 06). `assets.json` holds the display order, simple to hard, in 5 tiers of 5.

- **Code**: Claude Opus 5.5 writes each asset as a three.js module (`route-a/`).
- **Tripo API**: `tripo.js` sends the same three views to the [Tripo API](https://developers.tripo3d.ai/?invite=CKBGEQ5JCM), multiview to model (`route-b/`).

Live page: switch every asset between Code and Tripo API → `index.html`.
Numbers: [`results.csv`](results.csv), 25 assets × 2 routes.

## Rules

1. Both routes start from the same concept images.
2. Route A: the same LLM and the same starting prompt for all 25. One build, then at most 3 fix rounds.
3. Route B: one generation per asset, the same settings for all 25. If a task fails or the result is clearly broken, at most 2 retries with a new seed. Every attempt is logged.
4. Four numbers for every asset on both routes: time, cost, triangle count, silhouette match.
5. LLM tokens count as money. "Free" tools are not free if the LLM ran for 40 minutes.
6. Nothing is left out. If an asset looks bad on one route, it stays in.

## Layout

```
sheets/              the 25 turnaround sheets as generated (sheets/_v1: the 2 statue drafts that were redrawn before any route saw them)
assets/NN-name/      front.png left.png back.png, cut from the sheet
prompts/             the image prompts, word for word
route-a/             one three.js module per asset, notes.json (minutes, cost, fix rounds per session)
route-a/sessions/    each session's own render script, round-by-round comparisons and final message
route-b/             one .glb per asset, the rigged and animated golem, tasks.json (every Tripo task result)
measure/             side-by-side images, aligned renders, silhouette overlays, results.json
clips/               the golem walk clips, the turntable reel, the live page recordings
results.csv          the 50 rows
approval/            the tier 5 concept board made for the client before the build
```

## How each step ran

**Concept images.** Nano Banana Pro, 21:9, 2K, one generation per asset (`prompts/step1_sheet_*.txt`, only the asset line changes). `cut_sheets.py` cuts each sheet into three square 1024 px views, one scale per asset.
In every `left.png` the camera sits on the object's own left, so the object faces image-left. Tripo uses the same convention (checked with one image-to-multiview call, logged as `00-left-view-check` in `tasks.json`). The image model drew the side view of the lantern and the wolf from the other side, so those two `left.png` files are mirrored; an orthographic silhouette seen from the opposite side is an exact mirror image, so the silhouette match is unaffected.
The wolf sheet disagrees with itself: its tail points to the image right in both the front and the back view. No 3D model can match both, and both routes are measured against the same sheet.

**Route A, code.** One fresh headless Claude Code session per asset (`claude -p`, model `claude-opus-5-5`), each in its own clean folder with a copy of `assets/`, the same prompt (`route-a/PROMPT.txt`) and a 4-line note on axes and on which way `left.png` faces (`route-a/CLAUDE.md`). Minutes and cost come from the session's result (`duration_ms`, `total_cost_usd`, the same figure `/cost` shows). `collect_route_a.js` pulls them into `route-a/notes.json`.

**Route B, Tripo API.** `tripo.js`: upload front, left and back, one multiview-to-model task per asset with `model P2-20260801, face_limit 20000, texture true, pbr true, model_seed 42`, poll every 5 s, save the .glb, log every attempt. All 25 succeeded on the first attempt. `face_limit` is a target: 20 of the 25 came back above it, between 20,023 and 23,438 triangles.
Credits are converted at the published API price, 1 credit = $0.01 ([developers.tripo3d.ai/en/pricing](https://developers.tripo3d.ai/en/pricing)).

**Measuring.** `measure.js` loads each model into three.js in headless Chromium, scales it to height 1, centers it, and renders front, left and back with the same orthographic camera on white. Silhouettes: every material is swapped to black, the background is everything white connected to the border (so glass and enclosed gaps count as the object), on both the render and the reference. The render mask is scaled to the reference's height and centered on it, then IoU = overlap / union. Triangles are counted from the index buffers (instances included).
IoU is strict on thin shapes: a branch that is a few pixels off counts as a miss on both sides. The tree scores 0.46 on both routes for that reason.

**Route B setup.** Route B needs a script. A fresh Claude Code session wrote `tripo.js` from the brief's step 2 and step 4 prompts, with no API key and no API calls, in 3.2 minutes for $0.64 (`route-b/setup-session/`). That is a one-time cost for all 25. The `tripo.js` in the repo root is the script that made the runs.

**Walk test.** Tripo: `walk_tripo.js`, three calls (rig-check, rig `v3.0-20260909` biped glb, retarget `preset:idle` + `preset:walk`, retargeted in place so it stays on the turntable). Code: one more fresh session adds idle and walk in code to `route-a/06-golem.js`, at most 3 fix rounds. `walk_clip.js` renders 5 s of each from the same side-on camera.
After the brief, the wolf and the dragon got the same walk test for the live page: `animate_tripo.js full 05-wolf 20-dragon` (rig-check reports quadruped, rig, retarget `preset:quadruped:walk`) and one fresh session each (`05-wolf-walk`, `20-dragon-walk`) with the golem's instruction. The page shows both standing, from their measured builds. rig-check found the tree, the slime and all 5 statues not riggable (logged in `tasks.json`); the page sways the tree and squashes the slime the same way on both routes. Every extended module keeps its measured build as `<asset>.step3.js`, which `measure.js` and the studio renders use.

## The fourteen added assets

- Same prompt, same image model, same cut. In `left.png` of the round shield and the slime the camera was on the wrong side too, so they are mirrored like the lantern and the wolf.
- The first signpost sheet came back with a fictional pub's name painted on the signs, so it was generated again with "blank" signs before any route saw it.
- The sheets for the shield and the war hammer draw their side view at three quarters, and the dragon's side view walks with its tail curled while its front and back views sit. Both routes are measured against the same sheets; these rows score low on both sides.
- The 14 code sessions ran on Claude Code 2.1.331 (the first six on 2.1.330), same model `claude-opus-5-5`, same prompt, same note.
- The coded potion draws its glass and liquid with custom shaders, which glTF cannot carry. For the studio renders only, `export_code_glb.js` swaps them for unlit materials in the shaders' own colours; the measurements and the live page run the module as written.
- The studio renders of the new assets were made on a rented RTX 5090 (`blender/batch.py` through `3d/cloud/runpod.py`), same Blender version, same scene script.

## Tier 5, the statues

- 5 collectible statues added last: alchemist, dwarf blacksmith, mounted knight, goblin and troll, dragon's hoard. The concept sheets went on one board for the client before the build (`approval/tier5-board.png`).
- The first knight sheet drew all 3 views at three quarters and the first goblin sheet put its views out of order, so both prompts spell out each view (`prompts/step1_sheet_23-knight.txt`, `24-goblin`) and were drawn again. The goblin's side view faces image-right, so its `left.png` is mirrored like the lantern, the wolf, the shield and the slime.
- Every statue sheet looks down at the statue from slightly above, so each round base shows as a tall ellipse; `measure.js` renders dead level. All 5 code sessions noted it, and the 3 fix rounds fitted their outlines to the sheet, bases included. Code took 4 of the 5 on silhouette; the side-by-sides in `measure/side-by-side/21-*` to `25-*` show the detail IoU does not read.
- Same model, same prompt, same note, Claude Code 2.1.331. Tripo: 5 tasks, 409 s, 550 credits, no retries.
- Studio renders: `blender/batch.py` gained a `hero:<asset>` job; `lib/place_cloud_renders.py` moves a RunPod batch into `renders/blender/`. `3d/cloud/box.sh` now falls back to the official Blender mirrors when download.blender.org answers 403.

## Run it

```
npm install
echo TRIPO_API_KEY=... > .env          # never commit it
node --env-file=.env tripo.js          # route B
node collect_route_a.js <runs folder>  # route A notes
node measure.js                        # results.csv + images
node --env-file=.env walk_tripo.js     # golem walk, route B
node --env-file=.env animate_tripo.js full 05-wolf 20-dragon   # wolf and dragon walk, route B (check = rig-check only)
node walk_clip.js                      # walk clips
node lib/serve.js 5173                 # live page at http://127.0.0.1:5173
node build_site.js                     # dist/ for deploy (Tripo models: textures to 1024 px WebP via lib/shrink_glb.py, meshopt)
node export_code_glb.js                # Code modules -> route-a/glb/*.glb (GLTFExporter, unchanged geometry)
blender -b --factory-startup -P blender/studio.py -- 06-golem card 256   # Cycles studio, both routes, same light
node cards.js && node hero.js          # article cards; hero.js uses the Blender renders when they exist
node bake_code_walk.js 5.2             # the coded walk sampled at 30 fps into a glTF animation (4 strides, loops)
blender -b --factory-startup -P blender/walk.py -- 96 156          # both golems walking in the studio
blender -b --factory-startup -P blender/turntable.py -- 01-crate 96 90   # one asset pair turning, for the reel
node compose_video.js walk && node compose_video.js reel   # labels over the frames, encode, crossfade
node record_switch.js                  # frame-exact screen recording of the live page
node record_reel.js                    # reel: every asset flips from Code to Tripo API (page in ?reel mode), 2 s each
node perf.js "" 1                       # frame times of the built page: idle, each switch, mesh view
```

The live page loads web copies of the Tripo models (`dist/route-b/`): textures scaled to 1024 px and re-encoded as WebP, geometry meshopt-compressed and never simplified (15 MB for all 25). Every measurement uses the originals in `route-b/`.

The live page opens on Tripo API (`?route=code` opens it on Code). To hold 60 fps it does a few things that change how the frame is drawn and never what is drawn:
- The static Code modules have their meshes merged per material once they are built (the blacksmith goes from 581 meshes to 35): the same triangles and materials in a tenth of the draw calls. The animated golem stays as built. Measurements and studio renders run the modules as written.
- A light a module carries (the staff's crystal) stays in the scene for good and only its intensity follows the switch, so switching never changes the light count.
- Every model keeps one clipping plane for the scan, opened all the way when idle, and every shader and texture is prepared before the model goes on show. No click compiles anything.
- The loader waits for the room, the 25 Code modules and the first Tripo model. The other Tripo models stream in behind it in showroom order and scan onto their turntables as they land; an empty turntable shows a breathing ring.
- The frame is drawn with 4x MSAA. The mirror only draws the front tier (the steps hide the rest from it), and the shadow map redraws every other frame.
- Resolution goes up to 1.5x and steps down by itself on a GPU that cannot hold the frame rate (`?hq` keeps it fixed, for recordings).
