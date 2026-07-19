import { describe, expect, it } from 'vitest'
import { resolveCriticalHit, canDamageCrit } from './criticalHits.js'

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

  it('explosive damage never crits even with critChance 1 and critMultiplier 5 (배율 성장 축 도입 후에도 폭발 무기는 비크리 유지)', () => {
    expect(canDamageCrit({ canCrit: true, damageType: 'explosive' })).toBe(false)
    expect(resolveCriticalHit({
      baseDamage: 20,
      damageType: 'explosive',
      critChance: 1,
      critMultiplier: 5,
      rng: () => 0,
    })).toEqual({
      damage: 20,
      isCritical: false,
    })
  })

  it('clamps critMultiplier to MAX_CRIT_MULTIPLIER(5): multiplier 99 → damage 50 (baseDamage 10 상한 5 클램프)', () => {
    expect(resolveCriticalHit({ baseDamage: 10, critMultiplier: 99, rng: () => 0, critChance: 1 })).toEqual({
      damage: 50,
      isCritical: true,
    })
  })

  it('critMultiplier 4.5 (크리 카드 성장 축 상한)은 클램프 없이 그대로 적용: baseDamage 10 → damage 45', () => {
    expect(resolveCriticalHit({ baseDamage: 10, critMultiplier: 4.5, rng: () => 0, critChance: 1 })).toEqual({
      damage: 45,
      isCritical: true,
    })
  })
})
