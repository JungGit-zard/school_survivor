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

    expect(useGameStore.getState().weapons.pencilThrow.damage).toBeCloseTo(3.1, 1)
  })

  it('allows unlocked non-starter weapon permanent upgrades through the store action', () => {
    setUnlocked('guidedMissile')
    useGameStore.setState({ goldTotal: 300 })

    const result = useGameStore.getState().purchaseWeaponPermanentUpgrade('guidedMissile')

    expect(result).toMatchObject({ ok: true, nextLevel: 1, price: 300, nextGold: 0 })
  })
})
