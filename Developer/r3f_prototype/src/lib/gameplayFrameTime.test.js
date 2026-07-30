import { describe, expect, it } from 'vitest'
import {
  GAMEPLAY_FIXED_STEP,
  MAX_GAMEPLAY_FRAME_DELTA,
  clampGameplayFrameDelta,
  createGameplayFixedStepClock,
  runGameplayFixedSteps,
} from './gameplayFrameTime.js'

function simulateAtHz(hz, seconds = 12) {
  const clock = createGameplayFixedStepClock()
  let elapsed = 0
  let cooldown = 2
  let position = 0
  for (let frame = 0; frame < hz * seconds; frame += 1) {
    runGameplayFixedSteps(clock, 1 / hz, (dt) => {
      elapsed += dt
      cooldown = Math.max(0, cooldown - dt)
      position += 3 * dt
    })
  }
  return { elapsed, cooldown, position }
}

describe('gameplay frame time policy', () => {
  it('uses Rapier-compatible 60 Hz fixed steps at 15/30/60/120 Hz', () => {
    const baseline = simulateAtHz(60)
    for (const hz of [15, 30, 60, 120]) {
      const result = simulateAtHz(hz)
      expect(result.elapsed).toBeCloseTo(baseline.elapsed, 8)
      expect(result.cooldown).toBeCloseTo(baseline.cooldown, 8)
      expect(result.position).toBeCloseTo(baseline.position, 8)
    }
  })

  it('preserves the Rapier 0.5s resume cap instead of replaying an unbounded hidden-tab delta', () => {
    const clock = createGameplayFixedStepClock()
    let simulated = 0
    const steps = runGameplayFixedSteps(clock, 3, (dt) => { simulated += dt })

    expect(clampGameplayFrameDelta(3)).toBe(MAX_GAMEPLAY_FRAME_DELTA)
    expect(steps).toBe(30)
    expect(simulated).toBeCloseTo(MAX_GAMEPLAY_FRAME_DELTA, 8)
    expect(GAMEPLAY_FIXED_STEP).toBe(1 / 60)
  })

  it('keeps the residual at 120 Hz so two renders produce one fixed gameplay step', () => {
    const clock = createGameplayFixedStepClock()
    expect(runGameplayFixedSteps(clock, 1 / 120, () => {})).toBe(0)
    expect(runGameplayFixedSteps(clock, 1 / 120, () => {})).toBe(1)
  })
})
