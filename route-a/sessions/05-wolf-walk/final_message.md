I added both animations to `route-a/05-wolf.js` using the interface in CLAUDE.md: `group.userData.play('idle' | 'walk')` and `group.userData.update(dt)`. The wolf starts in idle. I checked it by rendering the front, left and back views in headless Chromium. At rest it renders exactly like the original, and while walking each paw on the ground stays at its rest height (0.006) while the others lift in turn.

**How it works:** the wolf used to be one merged mesh. It's now split into separate parts that each turn at a joint: body, head (turning at the neck), a three-piece tail, and for each leg an upper part, a lower part and a paw. The shapes, colours and glowing markings haven't changed.

**Idle:**
- The body breathes slowly.
- The head looks around, turning, nodding and tilting a little.
- The tail sways lazily, with the movement passing down its length.

**Walk (on the spot, about 1.05 s per stride):**
- The legs move in a normal four-beat walking order (left hind, left front, right hind, right front).
- Each foot is placed by working the leg angles back from where the foot should be, so planted paws stay put on the ground. Lifted paws hang toes-down, and the toes always stay above the floor.
- The body sinks a little and bobs twice per stride, with some roll and side-to-side turn. The head bobs and balances the body's sway, and the tail swings in time with the steps.
- Switching between idle and walk blends over 0.35 s, in either direction.

**Fix rounds (2 of the 3 allowed):**
1. Paws were tilting with the lower leg. They now stay level with the ground.
2. Toes could dip below the floor as a paw lifted off. The toe curl is now tied to how high the paw is.

After round 2 the readings hadn't changed, and the remaining dips turned out to be an error in my own measuring script, not in the animation. Measured properly, nothing goes through the floor. I kept the round 2 change anyway.

The test page and scripts are in `C:\Users\user_\AppData\Local\Temp\claude\410c453d4e015a64\ce612cd8-037d-4f31-8b9a-5c4ee140e648\scratchpad`. They left nothing in the project folder.