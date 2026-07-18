import { describe, expect, it } from 'vitest'
import { resolveCriticalHit } from './criticalHits.js'

describe('resolveCriticalHit', () => {
  it('keeps the original damage when critical hits are disabled for the attack', () => {
    expect(resolveCriticalHit({ baseDamage: 20, canCrit: false, critChance: 1, critMultiplier: 3, rng: () => 0 })).toEqual({
      damage: 20,
      isCritical: false,
    })
  })

  it('keeps explosive damage from critically hitting even at guaranteed crit chance', () => {
    expect(resolveCriticalHit({ baseDamage: 20, damageType: 'explosive', critChance: 1, critMultiplier: 3, rng: () => 0 })).toEqual({
      damage: 20,
      isCritical: false,
    })
  })

  it('multiplies damage when the random roll is inside the crit chance', () => {
    expect(resolveCriticalHit({ baseDamage: 20, critChance: 0.25, critMultiplier: 1.5, rng: () => 0.24 })).toEqual({
      damage: 30,
      isCritical: true,
    })
  })

  it('does not crit when the random roll is outside the crit chance', () => {
    expect(resolveCriticalHit({ baseDamage: 20, critChance: 0.25, critMultiplier: 1.5, rng: () => 0.25 })).toEqual({
      damage: 20,
      isCritical: false,
    })
  })

  it('does not crit when no weapon-specific crit chance is provided', () => {
    expect(resolveCriticalHit({ baseDamage: 10, rng: () => 0 })).toEqual({
      damage: 10,
      isCritical: false,
    })
  })

  it('sanitizes invalid damage to zero without rolling a critical hit', () => {
    expect(resolveCriticalHit({ baseDamage: Number.NaN, critChance: 1, critMultiplier: 3, rng: () => 0 })).toEqual({
      damage: 0,
      isCritical: false,
    })
  })
})
