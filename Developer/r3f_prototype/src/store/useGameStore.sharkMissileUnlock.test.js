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

describe('sharkMissile unlock and card access', () => {
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
      currentStageId: 'stage1',
    })
  })

  it('unlocks after the first Stage 1 clear', () => {
    useGameStore.getState().clearStage()

    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('sharkMissile')
    const unlocks = JSON.parse(localStorage.getItem(UNLOCKS_KEY))
    expect(unlocks.sharkMissile).toBe(1)
  })

  it('unlocks after the 8th completed run as a fallback path', () => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify({ totalRuns: 7 }))

    useGameStore.getState()._onRunEnd('gameover')

    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('sharkMissile')
    const unlocks = JSON.parse(localStorage.getItem(UNLOCKS_KEY))
    expect(unlocks.sharkMissile).toBe(1)
  })

  it('can enter the level-up card pool from level 8 after account unlock', () => {
    setUnlocked('sharkMissile')
    const weapons = useGameStore.getState().weapons

    expect(WEAPON_CATALOG.sharkMissile.minLevelToAppear).toBe(8)
    expect(UPGRADE_EFFECTS.acquireSharkMissile.minLevel).toBe(8)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireSharkMissile, 8, weapons, useGameStore.getState().player)).toBe(true)
  })
})
