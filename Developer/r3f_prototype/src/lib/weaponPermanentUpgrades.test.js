// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  MAX_WEAPON_PERMANENT_LEVEL,
  getAllWeaponPermanentUpgradeLevels,
  getWeaponPermanentUpgradeLevel,
  getWeaponPermanentUpgradePrice,
  getWeaponPermanentUpgradePlan,
  purchaseWeaponPermanentUpgrade,
  resetWeaponPermanentUpgradeLevels,
} from './weaponPermanentUpgrades.js'
import { setUnlocked, _resetForTests as resetWeaponUnlocks } from './weaponUnlocks.js'

describe('weaponPermanentUpgrades storage layer', () => {
  beforeEach(() => {
    localStorage.clear()
    resetWeaponUnlocks()
    resetWeaponPermanentUpgradeLevels()
  })

  it('빈 저장소에서 모든 무기 영구 강화 레벨을 0으로 채워 반환한다', () => {
    const levels = getAllWeaponPermanentUpgradeLevels()

    expect(levels.pencilThrow).toBe(0)
    expect(levels.studentLantern).toBe(0)
    expect(Object.keys(levels).length).toBe(16)
  })

  it('starter 무기는 해금 저장값 없이도 구매되고 코인을 차감한다', () => {
    const result = purchaseWeaponPermanentUpgrade('pencilThrow', 300)

    expect(result).toMatchObject({ ok: true, nextLevel: 1, price: 300, nextGold: 0 })
    expect(getWeaponPermanentUpgradeLevel('pencilThrow')).toBe(1)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toMatchObject({ pencilThrow: 1 })
  })

  it('미해금 비스타터 무기는 구매할 수 없다', () => {
    const result = purchaseWeaponPermanentUpgrade('guidedMissile', 9999)

    expect(result).toMatchObject({ ok: false, reason: 'locked' })
    expect(getWeaponPermanentUpgradeLevel('guidedMissile')).toBe(0)
  })

  it('해금한 비스타터 무기는 구매할 수 있다', () => {
    setUnlocked('guidedMissile')

    const result = purchaseWeaponPermanentUpgrade('guidedMissile', 300)

    expect(result).toMatchObject({ ok: true, nextLevel: 1, price: 300, nextGold: 0 })
    expect(getWeaponPermanentUpgradeLevel('guidedMissile')).toBe(1)
  })

  it('Lv.10까지만 구매 가능하고 이후는 maxLevel로 차단된다', () => {
    let gold = 999_999
    for (let level = 1; level <= MAX_WEAPON_PERMANENT_LEVEL; level += 1) {
      const result = purchaseWeaponPermanentUpgrade('pencilThrow', gold)
      expect(result.ok).toBe(true)
      gold = result.nextGold
    }

    const blocked = purchaseWeaponPermanentUpgrade('pencilThrow', gold)

    expect(blocked).toMatchObject({ ok: false, reason: 'maxLevel' })
    expect(getWeaponPermanentUpgradeLevel('pencilThrow')).toBe(MAX_WEAPON_PERMANENT_LEVEL)
  })

  it('가격표와 다음 강화 설명을 제공한다', () => {
    expect(getWeaponPermanentUpgradePrice(1)).toBe(300)
    expect(getWeaponPermanentUpgradePrice(10)).toBe(8000)

    const plan = getWeaponPermanentUpgradePlan('pencilThrow')
    expect(plan.label).toBe('연필')
    expect(plan.maxLevel).toBe(10)
    expect(plan.levels[5].summary).toContain('투사체 속도')
    expect(plan.levels[10].summary).toContain('투사체 수')
  })
})
