// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  MAX_WEAPON_PERMANENT_LEVEL,
  applyWeaponPermanentUpgradesToBaseWeapon,
  getAllWeaponPermanentUpgradeLevels,
  getWeaponPermanentUpgradeLevel,
  getWeaponPermanentUpgradePrice,
  getWeaponPermanentUpgradePlan,
  purchaseWeaponPermanentUpgrade,
  resetWeaponPermanentUpgradeLevels,
} from './weaponPermanentUpgrades.js'
import { WEAPON_CATALOG } from './weaponCatalog.js'
import { setUnlocked, _resetForTests as resetWeaponUnlocks } from './weaponUnlocks.js'
import { getFirebaseProgressRuntimeSnapshot, updateFirebasePlayerProgress } from './firebaseProgress.js'

describe('weaponPermanentUpgrades storage layer', () => {
  beforeEach(() => {
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
    expect(getFirebaseProgressRuntimeSnapshot().progress.weaponPermanentUpgrades).toMatchObject({ pencilThrow: 1 })
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

  it('applies permanent cooldown, range, and duration bonuses to base weapon stats', () => {
    let gold = 999_999
    for (let level = 1; level <= 4; level += 1) {
      gold = purchaseWeaponPermanentUpgrade('boxCutter', gold).nextGold
      gold = purchaseWeaponPermanentUpgrade('schoolBag', gold).nextGold
      gold = purchaseWeaponPermanentUpgrade('scienceFlask', gold).nextGold
    }

    const cutter = applyWeaponPermanentUpgradesToBaseWeapon('boxCutter', WEAPON_CATALOG.boxCutter.base)
    const ruler = applyWeaponPermanentUpgradesToBaseWeapon('schoolBag', WEAPON_CATALOG.schoolBag.base)
    const flask = applyWeaponPermanentUpgradesToBaseWeapon('scienceFlask', WEAPON_CATALOG.scienceFlask.base)

    expect(cutter.cooldown).toBeCloseTo(624, 1)
    expect(ruler.range).toBeCloseTo(0.684, 3)
    expect(flask.zoneDurationMs).toBe(5600)
  })

  it('keeps split Lv.6-Lv.9 plan summaries aligned with the canonical design', () => {
    expect(getWeaponPermanentUpgradePlan('stunGun').levels[9].summary).toBe('치명타 확률 +8%')
    expect(getWeaponPermanentUpgradePlan('onigiri').levels[9].summary).toBe('치명타 확률 +8%')
    expect(getWeaponPermanentUpgradePlan('scienceFlask').levels[9].summary).toBe('치명타 확률 +8%')
    expect(getWeaponPermanentUpgradePlan('sharkMissile').levels[9].summary).toBe('폭발 피해 +16%')
    expect(getWeaponPermanentUpgradePlan('studentLantern').levels[9].summary).toBe('치명타 확률 +8%')
  })

  it('assigns base critical chance only to non-explosive critical-capable weapon damage profiles', () => {
    expect(WEAPON_CATALOG.pencilThrow.base.critChance).toBe(0.08)
    expect(WEAPON_CATALOG.schoolBag.base.critChance).toBe(0.07)
    expect(WEAPON_CATALOG.boxCutter.base.critChance).toBe(0.1)
    expect(WEAPON_CATALOG.tumbler.base.critChance).toBe(0.04)
    expect(WEAPON_CATALOG.scienceFlask.base.critChance).toBe(0.03)
    expect(WEAPON_CATALOG.bell.base.critChance).toBe(0.05)
    expect(WEAPON_CATALOG.stunGun.base.critChance).toBe(0.06)
    expect(WEAPON_CATALOG.onigiri.base.critChance).toBe(0.08)
    expect(WEAPON_CATALOG.chibiko.base.critChance).toBe(0.05)
    expect(WEAPON_CATALOG.starlink.base.critChance).toBe(0.07)
    expect(WEAPON_CATALOG.compassBlade.base.critChance).toBe(0.05)
    expect(WEAPON_CATALOG.studentLantern.base.critChance).toBe(0.03)

    expect(WEAPON_CATALOG.guidedMissile.base.critChance).toBeUndefined()
    expect(WEAPON_CATALOG.sharkMissile.base.critChance).toBeUndefined()
    expect(WEAPON_CATALOG.umbrellaGuard.base.critChance).toBeUndefined()
    expect(WEAPON_CATALOG.eraserBomb.base.critChance).toBeUndefined()
  })

  it('places critical chance upgrades in weapon permanent upgrade plans for crit-capable weapons', () => {
    expect(getWeaponPermanentUpgradePlan('pencilThrow').levels[6].summary).toBe('치명타 확률 +2%')
    expect(getWeaponPermanentUpgradePlan('boxCutter').levels[9].summary).toBe('치명타 확률 +8%')
    expect(getWeaponPermanentUpgradePlan('studentLantern').levels[9].summary).toBe('치명타 확률 +8%')
    expect(getWeaponPermanentUpgradePlan('guidedMissile').levels[9].summary).toBe('폭발 피해 +16%')
    expect(getWeaponPermanentUpgradePlan('eraserBomb').levels[9].summary).toBe('폭발 범위 +16%')
  })

  it('applies permanent critical chance bonuses to critical-capable weapon stats', () => {
    const setLevel = (id, level) => {
      updateFirebasePlayerProgress((progress) => {
        progress.weaponPermanentUpgrades = {
          ...(progress.weaponPermanentUpgrades ?? {}),
          [id]: level,
        }
        return progress
      })
    }

    setLevel('pencilThrow', 9)
    setLevel('boxCutter', 9)
    setLevel('studentLantern', 9)
    setLevel('guidedMissile', 9)

    expect(applyWeaponPermanentUpgradesToBaseWeapon('pencilThrow', WEAPON_CATALOG.pencilThrow.base).critChance).toBe(0.16)
    expect(applyWeaponPermanentUpgradesToBaseWeapon('boxCutter', WEAPON_CATALOG.boxCutter.base).critChance).toBe(0.18)
    expect(applyWeaponPermanentUpgradesToBaseWeapon('studentLantern', WEAPON_CATALOG.studentLantern.base).critChance).toBe(0.11)
    expect(applyWeaponPermanentUpgradesToBaseWeapon('guidedMissile', WEAPON_CATALOG.guidedMissile.base).critChance).toBeUndefined()
  })

  it('applies every deterministic Lv.5 and Lv.10 numeric perk to runtime weapon fields', () => {
    const setLevel = (id, level) => {
      updateFirebasePlayerProgress((progress) => {
        progress.weaponPermanentUpgrades = {
          ...(progress.weaponPermanentUpgrades ?? {}),
          [id]: level,
        }
        return progress
      })
    }
    const upgraded = (id, level = 10) => {
      setLevel(id, level)
      return applyWeaponPermanentUpgradesToBaseWeapon(id, WEAPON_CATALOG[id].base)
    }

    expect(upgraded('schoolBag')).toMatchObject({ damage: 13, range: 0.684, swingMs: 286, critChance: 0.15 })
    expect(upgraded('tumbler')).toMatchObject({ damage: 6.5, orbitSpeed: 3.08, count: 2, critChance: 0.12 })
    expect(upgraded('scienceFlask')).toMatchObject({ damage: 7.5, zoneRadius: 1.54, zoneDurationMs: 6100, zoneTickDamage: 6, critChance: 0.11 })
    expect(upgraded('bell')).toMatchObject({ damage: 10.8, radius: 2.04, critChance: 0.13 })
    expect(upgraded('stunGun')).toMatchObject({ damage: 19.4, cooldown: 3000, chainCount: 3, permanentStunChance: 0.08, critChance: 0.14 })
    expect(upgraded('onigiri')).toMatchObject({ damage: 21, bounces: 4, critChance: 0.16 })
    expect(upgraded('chibiko')).toMatchObject({ damage: 5.5, cooldown: 1056, projectileCount: 2, critChance: 0.13 })
    expect(upgraded('guidedMissile')).toMatchObject({ damage: 18.6, radius: 1.76, homingStrength: 1.1 })
    expect(upgraded('sharkMissile')).toMatchObject({ damage: 24.1, speed: 9.18, retargetIntervalMs: 270, permanentHomingStartMultiplier: 0.9, radius: 2.016 })
    expect(upgraded('starlink')).toMatchObject({ damage: 30.2, strikeRadius: 1.32, permanentBonusStrikeChance: 0.1, critChance: 0.15 })
    expect(upgraded('compassBlade')).toMatchObject({ damage: 7.6, orbitSpeed: 3.74, permanentExplosionRadiusMultiplier: 1.1, critChance: 0.13 })
    expect(upgraded('umbrellaGuard')).toMatchObject({ cooldown: 3240, radius: 1.375, knockbackMs: 273 })
    expect(upgraded('eraserBomb')).toMatchObject({ damage: 28.6, radius: 1.566, permanentSlowDust: true })
    expect(upgraded('studentLantern')).toMatchObject({ damage: 0.6, lightLength: 2.246, lightWidth: 3.888, permanentSlowChance: 0.1, critChance: 0.11 })
  })
})
