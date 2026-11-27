I've added an idle and a walk animation to `route-a/06-golem.js`. It took one fix round of the three allowed.

**How it works**
- **Skeleton:** the golem used to be built as one solid group. I split it into joints: pelvis, hips, waist, neck, and left and right shoulders, elbows, hips, knees and ankles. When every joint is left unposed, all 191 parts sit exactly where they were in the original, so the model looks the same at rest.
- **Walk:** the walk stays on the spot, as `CLAUDE.md` asks, and one full stride takes 1.3 seconds.
  - Each foot sits flat on the ground for part of the stride and slides back under the body, then lifts and swings forward. It strikes heel-first, and the heel lifts before the toe pushes off.
  - Hip and knee angles are calculated from where each foot should be, so the planted foot stays on the ground.
  - The body dips at each step, the hips and chest twist against each other, and the arms swing opposite the legs. The loincloth flaps move with the legs.
- **Idle:** slow breathing, a gentle weight shift from side to side, a slow look around, and a pulsing glow in the eyes and runes.
- **Interface:** it uses `group.userData.play('idle' | 'walk')` and `group.userData.update(dt)`, as described in `CLAUDE.md`. Switching between the two blends over 0.35 seconds, and it starts in the idle pose.

**Checks I ran**
- **Fix round:** the first test showed the whole figure about 400 units too low. The pelvis's resting height was being replaced by the bob instead of having the bob added to it. That's fixed.
- **Rest pose:** with the joints unposed, it matches the original file exactly.
- **Ground contact:** through both animations, the planted foot stays at the same height as the original model's lowest point (-0.005). That small dip below the floor comes from the angled toe piece and was already in the original.
- **Switching clips:** going back and forth between walk and idle mid-motion produced no errors (NaN values) and no sudden jumps.
- **Renders:** I rendered both clips in headless Chromium from the side, front and three-quarter views and looked over the frames.

The temporary test files are deleted, and a copy of the original file is at `C:\Users\user_\AppData\Local\Temp\claude\437013432b3fa6c4\a371bd69-e0b6-4946-8788-5251b77a14d6\scratchpad\06-golem.orig.js`.