// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { UPGRADE_EFFECTS, isUpgradeAvailable } from '../lib/upgrades.js'
import { WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { _resetForTests as _resetRecords } from '../lib/playerRecords.js'
import {
  _resetForTests as _resetUnlocks,
  getAllUnlocked,
  setUnlocked,
} from '../lib/weaponUnlocks.js'
import { _seedHydratedFirebaseProgressForTests, _setFirebaseProgressClientForTests } from '../lib/firebaseProgress.js'

describe('sharkMissile unlock and card access', () => {
  beforeEach(() => {
    _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
    _seedHydratedFirebaseProgressForTests()
    _resetRecords()
    _resetUnlocks()
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
    expect(getAllUnlocked()).toContain('sharkMissile')
  })

  it('unlocks after the 8th completed run as a fallback path', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'shark-run-user' }, {
      schemaVersion: 1,
      profile: { uid: 'shark-run-user', displayName: '', nickname: '' },
      progress: { records: { totalRuns: 7 } },
    })

    useGameStore.getState()._onRunEnd('gameover')

    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('sharkMissile')
    expect(getAllUnlocked()).toContain('sharkMissile')
  })

  it('can enter the level-up card pool from level 8 after account unlock', () => {
    setUnlocked('sharkMissile')
    const weapons = useGameStore.getState().weapons

    expect(WEAPON_CATALOG.sharkMissile.minLevelToAppear).toBe(8)
    expect(UPGRADE_EFFECTS.acquireSharkMissile.minLevel).toBe(8)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireSharkMissile, 8, weapons, useGameStore.getState().player)).toBe(true)
  })
})
