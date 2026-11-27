I added the idle and walk animations to `route-a/20-dragon.js`, written entirely in code. No fix rounds were needed: the first version rendered correctly in headless Chromium and passed the numeric checks.

**How it's built**
- **Grouping:** the torso, neck, head, tail, wings and dorsal spikes now sit in one group that bobs, sways and rolls around the torso. The legs and paws stay in the root group so the feet can be placed on the ground.
- **Neck and tail:** the body is one continuous mesh, so I bend it section by section along its spine. The neck tilts forward and sideways. The tail sways in a travelling wave, and its back part is pinned to the ground so it doesn't sink when the body dips. The spikes and head follow the section they're attached to.
- **Legs:** each leg bends at a knee joint so the paw reaches its target spot on the ground. Front elbows bend backward and hind knees forward, and each leg can stretch by up to 10% if a target is just out of reach. Paws stay flat while planted and their toes droop while lifted.
- **Extras:** the wings rock gently about their root, and the eyes blink every 4 seconds.

**The two animations**
- **`idle`:** the dragon breathes, its head looks slowly from side to side, its neck sways and its tail swishes. All four feet stay planted in a slightly staggered stance. It loops every 8 s.
- **`walk`:** a four-beat walk on the spot (left hind, left front, right hind, right front) that loops every 1.3 s. Each foot slides back along the ground, then lifts and swings forward. The body bobs twice per cycle and sways side to side, the head counter-bobs, and the tail swings in time.
- **Switching:** the interface is the one you specified, `group.userData.play('idle' | 'walk')` and `group.userData.update(dt)`. Each animation's clock restarts at its beginning when you select it, so a recording starts at a clean point. Switching mid-animation blends over 0.35 s, and the very first `play()` switches instantly.

**Checks**
- **Renders:** the walk at four points in its cycle and the idle at 0, 2, 4 and 6 s, from the left, front, 3/4 and a low side view. Feet plant and lift correctly and the tail stays on the ground.
- **Ground:** across a full cycle of each animation, the lowest point is −0.004 (claw tips) for walk and 0 for idle.
- **Loops:** the last frame matches the first frame to within 3e-7, so both loops are seamless.

There are two compromises:
- The original model was posed mid-step with its front-left paw lifted. Both animations now plant that paw, so the starting pose differs slightly from the turnaround.
- In the walk, the right hind knee now bends forward like the left one; in the original model it bent backward.

The check pictures are in `C:\Users\user_\AppData\Local\Temp\claude\f399ac7202b1e53f\c2f394da-1f3c-4e5f-9a6d-a110a9d486ce\scratchpad\check\walk.png` and `C:\Users\user_\AppData\Local\Temp\claude\f399ac7202b1e53f\c2f394da-1f3c-4e5f-9a6d-a110a9d486ce\scratchpad\check\idle.png`.