import { describe, expect, it } from 'vitest'
import {
  HANAKO_HEAL_INTERVAL_MS,
  HANAKO_HEAL_RATIO,
  HANAKO_TRAIL_FOLLOW_DISTANCE,
  computeHanakoHealAmount,
  getHanakoCritDamageBonus,
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
    expect(HANAKO_HEAL_RATIO).toBe(0.1)
    expect(computeHanakoHealAmount(0)).toBe(0)
    expect(computeHanakoHealAmount(Number.NaN)).toBe(0)
  })

  it('Terry 2026-10-31: Lv1~5 heals 10/15/20/25/30% of CURRENT hp, not max hp', () => {
    ;[0.10, 0.15, 0.20, 0.25, 0.30].forEach((ratio, i) => {
      expect(computeHanakoHealAmount(40, i + 1)).toBeCloseTo(40 * ratio)
    })
    // 현재 HP 40 / 최대 HP 100 — 최대 HP 기준이었다면 Lv1에서 10이 나온다.
    expect(computeHanakoHealAmount(40, 1)).toBeCloseTo(4)
  })

  it('crit damage bonus follows Hanako level only while she is on the field', () => {
    const on = (level) => ({ hanako: { active: true, level }, chibiko: { active: true } })
    expect(getHanakoCritDamageBonus(on(1))).toBeCloseTo(0.10)
    expect(getHanakoCritDamageBonus(on(5))).toBeCloseTo(0.30)
    expect(getHanakoCritDamageBonus({ hanako: { active: false, level: 5 }, chibiko: { active: true } })).toBe(0)
    expect(getHanakoCritDamageBonus({ hanako: { active: true, level: 5 }, chibiko: { active: false } })).toBe(0)
  })
})
