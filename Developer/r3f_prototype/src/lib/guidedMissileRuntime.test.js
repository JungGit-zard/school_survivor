import { describe, expect, it } from 'vitest'
import { GUIDED_MISSILE_CONTROL_TIME_SEC, getGuidedMissileControlTime } from './guidedMissileRuntime.js'

describe('guided missile permanent homing strength', () => {
  it('keeps the base control time without a perk', () => {
    expect(getGuidedMissileControlTime()).toBe(GUIDED_MISSILE_CONTROL_TIME_SEC)
  })

  it('converges on the target faster with +10% homing strength', () => {
    expect(getGuidedMissileControlTime(1.1)).toBeCloseTo(GUIDED_MISSILE_CONTROL_TIME_SEC / 1.1)
  })
})
