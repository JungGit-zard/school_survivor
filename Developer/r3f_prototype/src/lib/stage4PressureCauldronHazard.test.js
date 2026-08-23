import { describe, expect, it } from 'vitest'
import {
  PRESSURE_CAULDRON_BURST_DURATION_MS,
  PRESSURE_CAULDRON_DAMAGE_RADIUS,
  PRESSURE_CAULDRON_DAMAGE_RATIO,
  PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS,
  getPressureCauldronHazardVisual,
  getPressureCauldronExplosionTimes,
  isInsidePressureCauldronBlastRadius,
} from './stage4PressureCauldronHazard.js'
import { advanceRuntimeTime, getRuntimeElapsedMs, resetRuntimeTime } from './gameRuntimeTime.js'
import { createGameplayFixedStepClock, runGameplayFixedSteps } from './gameplayFrameTime.js'

describe('Stage 4 pressure cauldron hazard', () => {
  it('first explodes exactly at 15 seconds and then every 15 seconds without a zero-second burst', () => {
    expect(PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS).toBe(15_000)
    expect(getPressureCauldronExplosionTimes(0, 14_999, 'stage4', 'playing')).toEqual([])
    expect(getPressureCauldronExplosionTimes(0, 15_000, 'stage4', 'playing')).toEqual([15_000])
    expect(getPressureCauldronExplosionTimes(15_000, 45_000, 'stage4', 'playing')).toEqual([30_000, 45_000])
  })

  it('only advances during active Stage 4 play and deduplicates a caught-up boundary', () => {
    expect(getPressureCauldronExplosionTimes(14_900, 15_100, 'stage4', 'paused')).toEqual([])
    expect(getPressureCauldronExplosionTimes(14_900, 15_100, 'stage3', 'playing')).toEqual([])
    expect(getPressureCauldronExplosionTimes(15_000, 15_000, 'stage4', 'playing')).toEqual([])
  })

  it('emits smoke and shivers for the three seconds before each burst and limits the burst visual to 250ms', () => {
    expect(getPressureCauldronHazardVisual(11_999, 'stage4', 'playing')).toEqual({ boiling: false, bursting: false })
    expect(getPressureCauldronHazardVisual(12_000, 'stage4', 'playing')).toEqual({ boiling: true, bursting: false })
    expect(getPressureCauldronHazardVisual(14_999, 'stage4', 'playing')).toEqual({ boiling: true, bursting: false })
    expect(getPressureCauldronHazardVisual(15_000, 'stage4', 'playing')).toEqual({ boiling: false, bursting: true })
    expect(getPressureCauldronHazardVisual(15_000 + PRESSURE_CAULDRON_BURST_DURATION_MS, 'stage4', 'playing')).toEqual({ boiling: false, bursting: false })
    expect(getPressureCauldronHazardVisual(14_000, 'stage4', 'paused')).toEqual({ boiling: false, bursting: false })
    expect(getPressureCauldronHazardVisual(14_000, 'stage4', 'gameover')).toEqual({ boiling: false, bursting: false })
  })

  it('fires each boundary once across continuous fixed steps without relying on a published store snapshot', () => {
    resetRuntimeTime()
    const clock = createGameplayFixedStepClock()
    const events = []
    for (let frame = 0; frame < 61; frame += 1) {
      runGameplayFixedSteps(clock, 0.5, (fixedDelta) => {
        const previousElapsedMs = getRuntimeElapsedMs()
        const elapsedMs = advanceRuntimeTime(fixedDelta * 1000)
        events.push(...getPressureCauldronExplosionTimes(previousElapsedMs, elapsedMs, 'stage4', 'playing'))
      })
    }
    expect(events).toEqual([15_000, 30_000])
    expect(getPressureCauldronExplosionTimes(14_900, 45_100, 'stage4', 'playing')).toEqual([15_000, 30_000, 45_000])
  })

  it('uses the exact max-health damage ratio and a 3.2-unit horizontal blast radius', () => {
    expect(PRESSURE_CAULDRON_DAMAGE_RATIO).toBe(0.20)
    expect(PRESSURE_CAULDRON_DAMAGE_RADIUS).toBe(3.2)
    expect(isInsidePressureCauldronBlastRadius(3.2, 0)).toBe(true)
    expect(isInsidePressureCauldronBlastRadius(3.201, 0)).toBe(false)
  })
})
