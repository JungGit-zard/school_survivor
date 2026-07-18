// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { UPGRADE_EFFECTS, isUpgradeAvailable } from '../lib/upgrades.js'
import { WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { STORAGE_KEY as RECORDS_KEY, _resetForTests as _resetRecords } from '../lib/playerRecords.js'
import {
  STORAGE_KEY as UNLOCKS_KEY,
  _resetForTests as _resetUnlocks,
  setUnlocked,
} from '../lib/weaponUnlocks.js'

describe('guidedMissile run-count unlock', () => {
  beforeEach(() => {
    _resetRecords()
    _resetUnlocks()
    localStorage.removeItem('school_survivor:goldTotal')
    localStorage.removeItem('school_survivor:passiveUpgrades')
    useGameStore.getState().resetGame()
    useGameStore.setState({
      runKills: 0,
      runLevelUps: 0,
      goldSession: 0,
      newlyUnlockedWeaponIds: [],
      elapsedMs: 0,
    })
  })

  it('unlocks after the 5th completed run, including the just-ended run', () => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify({ totalRuns: 4 }))

    useGameStore.getState()._onRunEnd('gameover')

    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('guidedMissile')
    const unlocks = JSON.parse(localStorage.getItem(UNLOCKS_KEY))
    expect(unlocks.guidedMissile).toBe(1)
  })

  it('can enter the level-up card pool from level 4 before weapon slots are usually full', () => {
    setUnlocked('guidedMissile')
    const weapons = useGameStore.getState().weapons

    expect(WEAPON_CATALOG.guidedMissile.minLevelToAppear).toBe(4)
    expect(UPGRADE_EFFECTS.acquireMissile.minLevel).toBe(4)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireMissile, 4, weapons, useGameStore.getState().player)).toBe(true)
  })

  it('syncs existing totalRuns records into weapon unlock storage on reset', () => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify({ totalRuns: 5 }))

    useGameStore.getState().resetGame()

    const unlocks = JSON.parse(localStorage.getItem(UNLOCKS_KEY))
    expect(unlocks.guidedMissile).toBe(1)
  })
})
