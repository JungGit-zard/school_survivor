// @react-three/rapier Physics uses this exact fixed timestep and clamps a raw
// render delta to 0.5s before adding it to its accumulator. Gameplay must use
// the same contract or low-FPS devices move physics ahead of timers/weapons.
export const GAMEPLAY_FIXED_STEP = 1 / 60
export const MAX_GAMEPLAY_FRAME_DELTA = 0.5

const STEP_EPSILON = 1e-9

export function clampGameplayFrameDelta(delta) {
  if (!Number.isFinite(delta) || delta <= 0) return 0
  return Math.min(delta, MAX_GAMEPLAY_FRAME_DELTA)
}

export function createGameplayFixedStepClock() {
  return { accumulator: 0 }
}

// Returns the number of whole fixed steps to simulate for one render frame.
// Keeping the residual is essential at 120Hz, where two renders make one
// gameplay/Rapier step. A capped resume frame follows Rapier's 0.5s policy.
export function consumeGameplayFixedSteps(clock, rawDelta) {
  if (!clock || typeof clock !== 'object') return 0
  const delta = clampGameplayFrameDelta(rawDelta)
  if (delta === 0) return 0
  clock.accumulator = Math.max(0, Number(clock.accumulator) || 0) + delta
  const steps = Math.floor((clock.accumulator + STEP_EPSILON) / GAMEPLAY_FIXED_STEP)
  if (steps > 0) clock.accumulator -= steps * GAMEPLAY_FIXED_STEP
  if (clock.accumulator < STEP_EPSILON) clock.accumulator = 0
  return steps
}

export function runGameplayFixedSteps(clock, rawDelta, callback) {
  const steps = consumeGameplayFixedSteps(clock, rawDelta)
  for (let index = 0; index < steps; index += 1) callback(GAMEPLAY_FIXED_STEP)
  return steps
}
