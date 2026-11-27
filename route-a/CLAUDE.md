# Project notes

- `assets/<asset>/front.png`, `left.png`, `back.png` are three views of the same asset on a white background, cut from one turnaround sheet at one scale.
- `left.png` is seen from the asset's own left side: a character that faces the front camera appears in `left.png` facing image-left.
- Route A modules in `route-a/`: the asset stands on y = 0, faces +Z, up is +Y. So the front camera sits on +Z, the left camera on +X, the back camera on -Z.
- `three` and `playwright` are installed (node_modules one folder up, ES modules). Playwright's Chromium is installed and runs WebGL headless.
