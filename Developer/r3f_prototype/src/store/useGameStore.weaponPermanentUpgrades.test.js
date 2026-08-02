// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { _resetForTests as resetWeaponUnlocks, setUnlocked } from '../lib/weaponUnlocks.js'
import { resetWeaponPermanentUpgradeLevels } from '../lib/weaponPermanentUpgrades.js'
import { _seedHydratedFirebaseProgressForTests, getFirebaseProgressRuntimeSnapshot } from '../lib/firebaseProgress.js'

function resetStore() {
  _seedHydratedFirebaseProgressForTests()
  resetWeaponUnlocks()
  resetWeaponPermanentUpgradeLevels()
  useGameStore.setState({ goldTotal: 0, passiveVersion: 0 })
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({ goldTotal: 0, passiveVersion: 0 })
}

describe('useGameStore weapon permanent upgrades', () => {
  beforeEach(() => {
    resetStore()
  })

  it('purchaseWeaponPermanentUpgrade spends gold, bumps version, and persists the level', () => {
    useGameStore.setState({ goldTotal: 300 })

    const result = useGameStore.getState().purchaseWeaponPermanentUpgrade('pencilThrow')

    expect(result).toMatchObject({ ok: true, nextLevel: 1, price: 300, nextGold: 0 })
    expect(useGameStore.getState().goldTotal).toBe(0)
    expect(useGameStore.getState().passiveVersion).toBe(1)
    expect(getFirebaseProgressRuntimeSnapshot().progress.goldTotal).toBe(0)
  })

  it('blocks locked non-starter weapon permanent upgrade purchases', () => {
    useGameStore.setState({ goldTotal: 9999 })

    const result = useGameStore.getState().purchaseWeaponPermanentUpgrade('guidedMissile')

    expect(result).toMatchObject({ ok: false, reason: 'locked' })
    expect(useGameStore.getState().goldTotal).toBe(9999)
  })

  it('applies permanent damage upgrades when a new run builds initial weapons', () => {
    useGameStore.setState({ goldTotal: 9999 })
    useGameStore.getState().purchaseWeaponPermanentUpgrade('pencilThrow')
    useGameStore.getState().purchaseWeaponPermanentUpgrade('pencilThrow')
    useGameStore.getState().resetGame('stage1')

    expect(useGameStore.getState().weapons.pencilThrow.damage).toBeCloseTo(2.5, 1) // base 2.4 기준 (2026-08-01)
  })

  it('allows unlocked non-starter weapon permanent upgrades through the store action', () => {
    setUnlocked('guidedMissile')
    useGameStore.setState({ goldTotal: 300 })

    const result = useGameStore.getState().purchaseWeaponPermanentUpgrade('guidedMissile')

    expect(result).toMatchObject({ ok: true, nextLevel: 1, price: 300, nextGold: 0 })
  })

  it('치비코 획득 시 현재 무기와 이후 획득 무기에 전체 능력 보너스를 적용한다', () => {
    useGameStore.getState().applyUpgrade('acquireChibiko')

    expect(useGameStore.getState().weapons.pencilThrow).toMatchObject({
      damage: 2.64,   // 2.4 * 1.10 (치비코 전체 능력 +10%)
      cooldown: 495,  // 550 * 0.90
      chibikoBoostPercent: 0.1,
    })

    useGameStore.getState().applyUpgrade('acquireBag')
    expect(useGameStore.getState().weapons.schoolBag).toMatchObject({
      active: true,
      damage: 13.2,
      chibikoBoostPercent: 0.1,
    })
  })

  it('치비코가 있는 동안 무기 레벨업 증가분에도 10% 보너스를 유지한다', () => {
    useGameStore.getState().applyUpgrade('acquireChibiko')
    useGameStore.getState().applyUpgrade('pencilDamage')

    expect(useGameStore.getState().weapons.pencilThrow.damage).toBe(3.465) // (2.4 + 0.75) * 1.10
  })
})
