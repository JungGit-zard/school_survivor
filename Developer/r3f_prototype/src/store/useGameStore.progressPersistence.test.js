// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { applyCloudProgressSnapshot, buildCloudProgressSnapshot, buildCloudUserProfile, getUserProgressPath } from '../lib/firebaseProgress.js'
import { RECORD_KEYS } from '../lib/playerRecords.js'
import { saveNicknameForUser } from '../lib/userNickname.js'
import { useGameStore } from './useGameStore.js'
import { purchaseWeaponPermanentUpgrade, STORAGE_KEY as WEAPON_PERMANENT_STORAGE_KEY } from '../lib/weaponPermanentUpgrades.js'

const GOLD_KEY = 'school_survivor:goldTotal'

function resetProgressState(stageId = 'stage1') {
  localStorage.clear()
  useGameStore.getState().resetGame(stageId)
  useGameStore.setState({
    elapsedMs: 0,
    goldSession: 0,
    goldTotal: 0,
    runKills: 0,
    runLevelUps: 0,
    currentStageId: stageId,
    survivalMilestonesHit: [],
    recentMilestone: null,
    newlyUnlockedWeaponIds: [],
  })
}

describe('Google user progress persistence snapshot', () => {
  beforeEach(() => {
    resetProgressState()
  })

  it('uses the Google uid path and snapshots every player record key', () => {
    const user = { uid: ' google-uid ', displayName: 'Tester', email: 't@example.com', photoURL: '' }
    saveNicknameForUser(user, 'Rookie')
    localStorage.setItem(GOLD_KEY, '12')

    const snapshot = buildCloudProgressSnapshot()

    expect(getUserProgressPath(user)).toBe('users/google-uid')
    expect(buildCloudUserProfile(user)).toMatchObject({
      uid: ' google-uid ',
      displayName: 'Tester',
      nickname: 'Rookie',
    })
    expect(snapshot.progress.goldTotal).toBe(12)
    expect(Object.keys(snapshot.progress.records).sort()).toEqual([...RECORD_KEYS].sort())
  })

  it('keeps picked-up and milestone coins in local storage and cloud gold before run end', () => {
    useGameStore.getState().gainGold(3)
    useGameStore.setState({ elapsedMs: 48_000 })
    useGameStore.getState().checkSurvivalMilestone()

    const state = useGameStore.getState()
    const snapshot = buildCloudProgressSnapshot()

    expect(state.goldSession).toBe(4)
    expect(state.goldTotal).toBe(4)
    expect(localStorage.getItem(GOLD_KEY)).toBe('4')
    expect(snapshot.progress.goldTotal).toBe(4)
    expect(snapshot.progress.records.totalGold).toBe(0)
  })

  it('snapshots and restores weapon permanent upgrade levels', () => {
    purchaseWeaponPermanentUpgrade('pencilThrow', 300)

    const snapshot = buildCloudProgressSnapshot()
    expect(snapshot.progress.weaponPermanentUpgrades).toMatchObject({ pencilThrow: 1 })

    localStorage.removeItem(WEAPON_PERMANENT_STORAGE_KEY)
    expect(localStorage.getItem(WEAPON_PERMANENT_STORAGE_KEY)).toBeNull()

    expect(applyCloudProgressSnapshot(snapshot, { uid: 'tester' })).toBe(true)
    expect(JSON.parse(localStorage.getItem(WEAPON_PERMANENT_STORAGE_KEY))).toMatchObject({ pencilThrow: 1 })
  })

  it('writes earned run gold and run records into the cloud snapshot at run end', () => {
    useGameStore.getState().gainGold(30)
    expect(useGameStore.getState().spendGold(5)).toBe(true)
    useGameStore.setState({ elapsedMs: 120_000, runKills: 7, runLevelUps: 2 })

    useGameStore.getState()._onRunEnd('gameover')

    const snapshot = buildCloudProgressSnapshot()
    expect(snapshot.progress.goldTotal).toBe(25)
    expect(snapshot.progress.records).toMatchObject({
      totalRuns: 1,
      totalKills: 7,
      totalGold: 30,
      totalLevelUps: 2,
      totalSurvivalSeconds: 120,
      bestSurvivalSeconds: 120,
    })
  })

  it('writes stage-specific clear records for signed-in cloud snapshots', () => {
    resetProgressState('stage2')
    useGameStore.getState().gainGold(5)
    useGameStore.setState({ elapsedMs: 240_000, runKills: 11 })

    useGameStore.getState()._onRunEnd('cleared')

    const snapshot = buildCloudProgressSnapshot()
    expect(snapshot.progress.records).toMatchObject({
      totalRuns: 1,
      totalKills: 11,
      totalGold: 5,
      bestSurvivalSeconds: 240,
      stage2BestSurvivalSec: 240,
      stage2Clears: 1,
      stage1Clears: 0,
    })
  })
})
