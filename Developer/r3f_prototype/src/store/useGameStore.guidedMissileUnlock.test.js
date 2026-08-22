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

describe('guidedMissile boss-kill unlock', () => {
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
    })
  })

  it('unlocks after the first recorded boss defeat', () => {
    useGameStore.getState().recordBossKill('B01')

    useGameStore.getState()._onRunEnd('gameover')

    expect(useGameStore.getState().newlyUnlockedWeaponIds).toContain('guidedMissile')
    expect(getAllUnlocked()).toContain('guidedMissile')
  })

  it('can enter the level-up card pool from level 4 before weapon slots are usually full', () => {
    setUnlocked('guidedMissile')
    const weapons = useGameStore.getState().weapons

    expect(WEAPON_CATALOG.guidedMissile.minLevelToAppear).toBe(4)
    expect(UPGRADE_EFFECTS.acquireMissile.minLevel).toBe(4)
    expect(isUpgradeAvailable(UPGRADE_EFFECTS.acquireMissile, 4, weapons, useGameStore.getState().player)).toBe(true)
  })

  it('syncs existing bossKills records into weapon unlock storage on reset', () => {
    _seedHydratedFirebaseProgressForTests({ uid: 'guided-sync-user' }, {
      schemaVersion: 1,
      profile: { uid: 'guided-sync-user', displayName: '', nickname: '' },
      progress: { records: { bossKills: 1 } },
    })

    useGameStore.getState().resetGame()

    expect(getAllUnlocked()).toContain('guidedMissile')
  })
})
