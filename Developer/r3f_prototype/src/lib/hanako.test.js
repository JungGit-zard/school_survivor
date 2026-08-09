import { describe, expect, it } from 'vitest'
import {
  HANAKO_HEAL_INTERVAL_MS,
  HANAKO_HEAL_RATIO,
  HANAKO_TRAIL_FOLLOW_DISTANCE,
  computeHanakoHealAmount,
  shouldRenderHanakoCompanion,
} from './hanako.js'

describe('hanako companion helpers', () => {
  it('renders only after Hanako and Chibiko are both active', () => {
    expect(shouldRenderHanakoCompanion({ hanako: { active: true }, chibiko: { active: true } })).toBe(true)
    expect(shouldRenderHanakoCompanion({ hanako: { active: true }, chibiko: { active: false } })).toBe(false)
    expect(shouldRenderHanakoCompanion({ hanako: { active: false }, chibiko: { active: true } })).toBe(false)
    expect(shouldRenderHanakoCompanion({})).toBe(false)
  })

  it('uses the second companion trail distance and 20 second heal cadence contract', () => {
    expect(HANAKO_TRAIL_FOLLOW_DISTANCE).toBe(1.44)
    expect(HANAKO_HEAL_INTERVAL_MS).toBe(20000)
    expect(HANAKO_HEAL_RATIO).toBe(0.05)
    expect(computeHanakoHealAmount(100)).toBe(5)
    expect(computeHanakoHealAmount(37)).toBeCloseTo(1.85)
    expect(computeHanakoHealAmount(0)).toBe(0)
    expect(computeHanakoHealAmount(Number.NaN)).toBe(0)
  })
})
