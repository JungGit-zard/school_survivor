import { beforeEach, describe, expect, it, vi } from 'vitest'
const ranking = vi.hoisted(() => ({ submitRun: vi.fn(), registerRankingEntry: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), ...ranking }))
import { useGameStore } from './useGameStore.js'
import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, buildCloudProgressSnapshot, readFirebasePlayerProgress } from '../lib/firebaseProgress.js'
import { getStageConfig, getNextStageId, isStageUnlocked, getStageBounds } from '../lib/stageConfig.js'
import { getDefaultWavePhases } from '../lib/waveTimelines.js'
import { getRuntimeSpawnEventsForStage, getBossSpawnSec } from '../lib/burstEvents.js'
import { getRankingScore, getBossClearBonus } from '../lib/rankingScorePolicy.js'
import { load } from '../lib/playerRecords.js'
import { playerPos } from '../lib/refs.js'
import { getStageVendingPlacement } from '../lib/stageVending.js'

beforeEach(() => {
  _resetFirebaseProgressForTests()
  _seedHydratedFirebaseProgressForTests({ uid: 'stage5-offline-test' }, { progress: { goldTotal: 30, records: { stage3BossDefeats: 1, stage4BossDefeats: 1 } } })
  installProgressTransactionTestClient()
  ranking.submitRun.mockResolvedValue({ written: [], skipped: [], failed: [] })
  ranking.registerRankingEntry.mockResolvedValue({ written: [], skipped: [], failed: [] })
  useGameStore.getState().reloadPersistentProgress()
})

describe('Stage5 playable store vertical slice', () => {
  it('selects Stage5 after Stage4, retains independent config/spawn/timeline and terminal progression', () => {
    expect(isStageUnlocked('stage5', {})).toBe(false)
    expect(isStageUnlocked('stage5', { stage4Clears: 1 })).toBe(false)
    expect(isStageUnlocked('stage5', { stage4BossDefeats: 1 })).toBe(true)
    expect(getNextStageId('stage4')).toBe('stage5')
    expect(getNextStageId('stage5')).toBe('stage6')
    useGameStore.getState().resetGame('stage5')
    expect(useGameStore.getState()).toMatchObject({ currentStageId: 'stage5', phase: 'playing', bossSpawnSec: 150 })
    expect(getStageConfig('stage5')).toMatchObject({ id: 'stage5', bossType: 'B03', durationSec: 240, escapePortalSec: 210 })
    expect(getStageBounds('stage5')).toEqual({ halfX: 7.5, halfZ: 19.2 })
    expect(getDefaultWavePhases('stage5')[0].weights).toEqual({ E01: 1 })
    expect(getDefaultWavePhases('stage5').at(-1).end).toBe(240)
    expect(getBossSpawnSec('stage5')).toBe(150)
    expect(getRuntimeSpawnEventsForStage('stage5').filter(e => e.type === 'B03')).toEqual([{ sec: 150, type: 'B03', count: 1 }])
  })

  it('runs Stage4 portal→Stage5 purchase/milestones/boss→terminal portal→durable clear/best payload; retry resets', async () => {
    const store = () => useGameStore.getState()
    store().resetGame('stage4')
    useGameStore.setState({ elapsedMs: 210_000 })
    store().activateEscapePortal()
    const oldKey = store().gameKey
    expect(store().clearStage()).toBe(true)
    expect(store()).toMatchObject({phase:'cleared',currentStageId:'stage4',gameKey:oldKey})
    expect(await store().continueToNextStage()).toBe(true)
    expect(store()).toMatchObject({ currentStageId: 'stage5', phase: 'playing', elapsedMs: 0, gameKey: oldKey + 1 })
    const placement = getStageVendingPlacement('stage5')
    expect(placement).not.toBeNull()
    playerPos.set(placement.position.x, 0, placement.position.z)
    useGameStore.setState(s => ({ player: { ...s.player, hp: 90 } }))
    const gold = store().goldTotal
    expect(store().purchaseStageVendingItem('recoveryDrink', { stageId: 'stage5', gameKey: store().gameKey, machineId: placement.id })).toMatchObject({ ok: true, hpRestored: 10, nextGold: gold - 5 })
    useGameStore.setState({ elapsedMs: 150_000 })
    store().checkSurvivalMilestone()
    store().spawnBoss()
    expect(store().recordBossDefeat()).toBe(true)
    expect(store().phase).toBe('playing')
    useGameStore.setState({ elapsedMs: 210_000 })
    store().checkSurvivalMilestone()
    store().activateEscapePortal()
    expect(store().clearStage()).toBe(true)
    expect(store()).toMatchObject({ currentStageId: 'stage5', phase: 'cleared', stageVendingPurchasedItemIds: [] })
    expect(await store().continueToNextStage()).toBe(true)
    expect(store().currentStageId).toBe('stage6')
    expect(load()).toMatchObject({ stage5Clears: 1, stage5BestSurvivalSec: 210 })
    expect(readFirebasePlayerProgress().records).toMatchObject({ stage5Clears: 1, stage5BestSurvivalSec: 210 })
    expect(buildCloudProgressSnapshot().progress.records).toMatchObject({ stage5Clears: 1, stage5BestSurvivalSec: 210 })
    expect(getBossClearBonus({ stageId: 'stage5', survivalSeconds: 210, cleared: true, bossDefeated: true })).toBe(103)
    expect(getRankingScore({ stageId: 'stage5', survivalSeconds: 210, cleared: true, bossBonus: 103 })).toBe(620)
    expect(await store().clearStageAndStartNext()).toBe(false)
    expect(load().stage5Clears).toBe(1)
    store().resetGame('stage5')
    expect(store()).toMatchObject({ phase: 'playing', currentStageId: 'stage5', escapePortalActive: false, bossDefeated: false, stageVendingPurchasedItemIds: [] })
  })
})
