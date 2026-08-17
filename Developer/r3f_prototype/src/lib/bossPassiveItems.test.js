import { describe, expect, it } from 'vitest'
import {
  BOSS_PASSIVE_ITEMS,
  BOSS_PASSIVE_ITEM_UI_CAPACITY,
  applyBossPassiveDamageToBaseWeapon,
  getBossPassiveDamageMultiplier,
  isBossPassiveItemUnlocked,
  normalizeBossPassiveUnlocks,
  unlockBossPassiveItem,
} from './bossPassiveItems.js'

describe('B01 boss passive item catalog', () => {
  it('defines 삼각자 as the first of eight boss passive slots', () => {
    expect(BOSS_PASSIVE_ITEM_UI_CAPACITY).toBe(8)
    expect(BOSS_PASSIVE_ITEMS.b01SetSquare).toMatchObject({
      id: 'b01SetSquare',
      bossId: 'B01',
      name: '삼각자',
      description: '커터칼·30cm 자·바이키티 공격력 +5%',
      weaponIds: ['boxCutter', 'schoolBag', 'bikittyCutter'],
      damageMultiplier: 1.05,
    })
  })

  it('accepts only the currently implemented B01 unlock flag', () => {
    expect(normalizeBossPassiveUnlocks({ b01SetSquare: true, futureBossItem: true })).toEqual({ b01SetSquare: true })
    expect(isBossPassiveItemUnlocked({ b01SetSquare: 1 }, 'b01SetSquare')).toBe(false)
    expect(unlockBossPassiveItem({}, 'b01SetSquare')).toEqual({ b01SetSquare: true })
    expect(unlockBossPassiveItem({ b01SetSquare: true }, 'b02Unknown')).toEqual({ b01SetSquare: true })
  })

  it('raises damage by exactly five percent only for the three target weapons', () => {
    const unlocks = { b01SetSquare: true }

    expect(getBossPassiveDamageMultiplier('boxCutter', unlocks)).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('schoolBag', unlocks)).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('bikittyCutter', unlocks)).toBe(1.05)
    expect(getBossPassiveDamageMultiplier('tumbler', unlocks)).toBe(1)
    expect(applyBossPassiveDamageToBaseWeapon('boxCutter', { damage: 24 }, unlocks)).toMatchObject({ damage: 25.2 })
    expect(applyBossPassiveDamageToBaseWeapon('tumbler', { damage: 6 }, unlocks)).toEqual({ damage: 6 })
  })

  it('does not multiply the same runtime weapon twice', () => {
    const once = applyBossPassiveDamageToBaseWeapon('schoolBag', { damage: 12 }, { b01SetSquare: true })
    const twice = applyBossPassiveDamageToBaseWeapon('schoolBag', once, { b01SetSquare: true })

    expect(once.damage).toBe(12.6)
    expect(twice).toBe(once)
    expect(twice.damage).toBe(12.6)
  })
})
