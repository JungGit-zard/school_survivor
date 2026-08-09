# Stage 2 red charger GO speech-bubble runtime fix (2026-08-09)

## Scope
- Target runtime path: pooled red charger enemy warning cue (`E05`, runtime type code `5`).
- Non-target paths intentionally preserved: Stage 2 guard chase `RZT`/`RZG` (`13`/`14`), Stage 2 boss-v2 no-legacy-gate behavior, and non-HTML 3D toon cue rendering.

## Fix contract
- The pooled charger speech-bubble runtime geometry is exported as `POOLED_CHARGE_CUE_PARTS` and consumed by `ZombieInstanceLayer`'s actual instanced CUE path.
- The pooled CUE now matches the canonical `ChargeToonCue` GO! layout: bubble `1.05 × 0.46 × 0.08` local units, tail `0.22 × 0.18 × 0.08` local units, and block-letter `G`, `O`, `!` parts all inside the bubble width.
- The pooled cue selection is bound to `POOLED_CHARGE_CUE_TYPE_CODE = 5`, avoiding magic-number drift in `selectChargeCueSlots`, `fillChargeCueSlots`, and `fillVisibleChargeCueSlots`.
- Runtime selection must not treat Stage 2 guard-chase zombies as GO cue owners unless a future design intentionally changes their warning state.

## Acceptance criteria
1. Red charger (`E05` / type code `5`) in warn state (`state === 2`) and after reveal (`spawnTimer >= 300 ms`) is eligible for the pooled GO cue.
2. A Stage 2 guard (`RZG` / type code `14`) in warn-like state is not selected by the pooled red charger GO cue path.
3. Pooled cue capacity remains fixed at 16 simultaneous cues.
4. GO cue vertical anchor remains `1.75` local units above the enemy root, scaled by `0.333` world visual scale.
5. No HTML sprite cue is reintroduced; the existing 3D/instanced cue path remains the active runtime path.
6. The old pooled half-width bubble `0.52 × 0.30 × 0.04` local units is forbidden because it pushed the red exclamation mark outside the visible speech bubble.

## Verification
- RED: `npm test -- --run src/components/PooledEnemyVisuals.test.js` failed before the runtime layout export/fix because `POOLED_CHARGE_CUE_PARTS` did not exist and the old CUE layout was still private to `ZombieInstanceLayer`.
- GREEN: `npm test -- --run src/components/PooledEnemyVisuals.test.js` passed, 1 test file / 22 tests.
- Focused suite: `npm test -- --run src/components/PooledEnemyVisuals.test.js src/components/EnemyVisual.test.js src/components/Enemies.test.jsx`
- Result: 3 test files passed, 130 tests passed.
- Pretest gates passed: branch guard, legacy B02 source gate, dialogue store gate.

## QA handoff for Balance_QA_Mini
- In Stage 2, force/observe an `E05` charger warning and confirm the bubble reads exactly `GO!` above the charger after the 300 ms reveal window.
- Geometry expectation for visual QA: the beige speech bubble is visibly wider than the old pooled version and contains the black `G`, black `O`, red `!`, and red dot inside the bubble; no bang mark should sit outside the bubble edge.
- Also observe a Stage 2 guard chase (`RZT` fugitive + `RZG` guards) and confirm the guard-chase crew does not incorrectly receive red-charger GO bubbles.
- Mobile readability check: cue should remain above the zombie head by at least the existing tested 0.08 world-unit clearance at the largest pulse.
