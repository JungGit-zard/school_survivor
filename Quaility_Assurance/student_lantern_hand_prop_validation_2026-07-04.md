# Student Lantern Hand Prop Validation - 2026-07-04

- RED: `npm test -- src/components/PlayerMesh.test.js -t "lantern prop"` failed before implementation because lantern layout did not exist.
- GREEN: the same test passed after adding the hand-mounted lantern layout and mesh.
- Regression: `npm test -- src/components/PlayerMesh.test.js src/lib/playerArmAction.test.js src/components/Weapons/StudentLantern.test.jsx -t "lantern|PlayerMesh layout|arm action"` passed.
- Build: `npm run build` passed with existing Vite dynamic import and chunk-size warnings.
- Follow-up RED/GREEN: tightened the layout test to require hand-tip position `[0, -0.76, 0.18]` and visible body size `[0.28, 0.30, 0.22]`; test passed after repositioning.
- Graphics Studio RED/GREEN: added failing checks for `lantern` Motion normalization and select option, then passed after wiring the player preview to `lanternAim`.
