// @vitest-environment jsdom
// Stage 3 escape → Nikuo choice → Sltera racer bonus (Terry 2026-11-22, "오케이 진행").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ranking = vi.hoisted(() => ({ submit: vi.fn(), identity: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), submitRun: ranking.submit }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: ranking.identity }))

import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'
import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  hydrateCloudProgress,
  readFirebasePlayerProgress,
  updateFirebasePlayerProgress,
} from '../lib/firebaseProgress.js'
import { readStoredStageSlot, listPendingStageResults, _resetStageSlotForTests } from '../lib/stageSlot.js'
import { isStageUnlocked } from '../lib/stageConfig.js'
import { SLTERA_RACER_MAX_KILLS, clampSlteraRacerKills } from '../lib/slteraRacerBonus.js'
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'

const ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://example-rtdb.firebaseio.com',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}
const UID = 'test-user'

const rowWrites = db => db.writes.filter(write => write.kind === 'update' && Object.keys(write.values).some(key => key.startsWith('runLedger/')))
const runEndSubmits = () => ranking.submit.mock.calls.filter(([, run]) => (Array.isArray(run) ? run : [run]).some(stage => stage.cleared === true))
const stage3Of = run => (Array.isArray(run) ? run : [run]).find(stage => stage.stageId === 'stage3')

let db
function enterStage3() {
  db = installProgressTransactionTestClient()
  updateFirebasePlayerProgress(progress => { progress.records.stage2BossDefeats = 1 })
  expect(useGameStore.getState().resetGame('stage3')).toBe(true)
}
// Escape Stage 3 without killing the boss (time portal) — the case that never opened Stage 4 before.
function escapeStage3({ boss = false } = {}) {
  useGameStore.setState({ runKills: 12, elapsedMs: 215_000, ...(boss ? { bossAliveCount: 1 } : {}) })
  if (boss) expect(useGameStore.getState().recordBossDefeat()).toBe(true)
  expect(useGameStore.getState().clearStage()).toBe(true)
  return useGameStore.getState().escapeResult.totalScore
}

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value)
  localStorage.clear()
  useGameStore.setState({ rankingRun: null, deferredStageResult: null })
  ranking.submit.mockReset().mockResolvedValue({ written: ['allTime'], skipped: [], failed: [] })
  ranking.identity.mockReset().mockResolvedValue({ uid: 'guest', displayName: 'Guest' })
})
afterEach(() => vi.unstubAllEnvs())

describe('racer kill cap', () => {
  it('clamps to the course maximum and drops junk', () => {
    expect(clampSlteraRacerKills(37)).toBe(37)
    expect(clampSlteraRacerKills(37.9)).toBe(37)
    expect(clampSlteraRacerKills(SLTERA_RACER_MAX_KILLS + 5000)).toBe(SLTERA_RACER_MAX_KILLS)
    for (const junk of [-3, NaN, Infinity, '1e9x', null, undefined, {}]) expect(clampSlteraRacerKills(junk)).toBe(0)
  })
})

describe('Stage 3 escape defers the ranking write until the Nikuo choice', () => {
  it('「타지 않습니다」: no bonus, one ranking write, one result row, Stage 4 opens', async () => {
    enterStage3()
    const score = escapeStage3()
    await Promise.resolve()
    expect(useGameStore.getState().deferStage3Result()).toBe(true)
    expect(runEndSubmits()).toHaveLength(0)

    const out = useGameStore.getState().finalizeDeferredStageResult({ racerKills: 0 })
    expect(out).toMatchObject({ ok: true, bonus: 0, written: true })
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(stage3Of(runEndSubmits()[0][1])).toMatchObject({ score, cleared: true })

    // Leaving to the lobby afterwards does not write again; a second finalize is a no-op.
    useGameStore.getState().finishRankingRun('end')
    expect(useGameStore.getState().finalizeDeferredStageResult({ racerKills: 50 })).toMatchObject({ ok: false, reason: 'not-deferred' })
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    await Promise.resolve()
    expect(runEndSubmits()).toHaveLength(1)
    expect(rowWrites(db)).toHaveLength(1)
    expect(isStageUnlocked('stage4', readFirebasePlayerProgress().records)).toBe(true)
  })

  it('「탑니다」: racer kills × 1 join the Stage 3 score (even without arriving), capped', async () => {
    enterStage3()
    const score = escapeStage3()
    const out = useGameStore.getState().finalizeDeferredStageResult({ racerKills: 41 })
    expect(out).toMatchObject({ ok: true, bonus: 41, written: true })
    expect(useGameStore.getState().escapeResult).toMatchObject({ totalScore: score + 41, racerBonus: 41 })
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(stage3Of(runEndSubmits()[0][1]).score).toBe(score + 41)
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    expect(rowWrites(db)).toHaveLength(1)
  })

  it('a forged kill count is capped at the course maximum', async () => {
    enterStage3()
    const score = escapeStage3()
    expect(useGameStore.getState().finalizeDeferredStageResult({ racerKills: 9_999_999 }).bonus).toBe(SLTERA_RACER_MAX_KILLS)
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(stage3Of(runEndSubmits()[0][1]).score).toBe(score + SLTERA_RACER_MAX_KILLS)
  })

  it('leaving without a choice (back button / lobby) writes the run once without the bonus', async () => {
    enterStage3()
    const score = escapeStage3()
    useGameStore.getState().finishRankingRun('end')
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(stage3Of(runEndSubmits()[0][1]).score).toBe(score)
    expect(useGameStore.getState().finalizeDeferredStageResult({ racerKills: 10 })).toMatchObject({ ok: false })
    await Promise.resolve()
    expect(runEndSubmits()).toHaveLength(1)
  })

  it('hidden page during the choice writes without the bonus; the bonus follows only as a higher score', async () => {
    enterStage3()
    const score = escapeStage3()
    useGameStore.getState().finishRankingRun('pagehide')
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(stage3Of(runEndSubmits()[0][1]).score).toBe(score)
    // Came back and declined: nothing new to write.
    expect(useGameStore.getState().finalizeDeferredStageResult({ racerKills: 0 })).toMatchObject({ ok: true, written: false })
    await Promise.resolve()
    expect(runEndSubmits()).toHaveLength(1)
  })

  it('a new run started during the choice settles the old run without the bonus', async () => {
    enterStage3()
    escapeStage3()
    expect(useGameStore.getState().resetGame('stage1')).toBe(true)
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(useGameStore.getState().deferredStageResult).toBeNull()
  })

  it('the Stage 3 result row is written at the escape — a reload during the choice loses nothing', async () => {
    enterStage3()
    escapeStage3()
    // The row went out at clear (it holds no score, so it never waits for the racer).
    await vi.waitFor(() => expect(rowWrites(db)).toHaveLength(1))
    expect(readStoredStageSlot(UID)).toBeNull()
    expect(listPendingStageResults(UID)).toHaveLength(0)
    // "Reload": a fresh session sees Stage 4 open from the synced stage3Clears record.
    _resetFirebaseProgressForTests()
    _resetStageSlotForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress({ uid: UID })
    const records = readFirebasePlayerProgress().records
    expect(records.stage3Clears).toBe(1)
    expect(records.stage3BossDefeats ?? 0).toBe(0)
    expect(isStageUnlocked('stage4', records)).toBe(true)
  })

  it('a reload while the row is still unconfirmed flushes the device copy once, without any bonus field', async () => {
    enterStage3()
    // Offline: the row write never lands, so the result stays on the device.
    const update = db.update
    db.update = () => new Promise(() => {})
    escapeStage3()
    await Promise.resolve()
    const pending = listPendingStageResults(UID)
    expect(pending).toHaveLength(1)
    expect(pending[0].records.stage3Clears).toBe(1)
    expect(JSON.stringify(pending[0])).not.toMatch(/racer|score/i)
    // Reload: a new tab of the same account recovers it once.
    db.update = update
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress({ uid: UID })
    await vi.waitFor(() => expect(rowWrites(db)).toHaveLength(1))
    await vi.waitFor(() => expect(listPendingStageResults(UID)).toHaveLength(0))
    expect(isStageUnlocked('stage4', readFirebasePlayerProgress().records)).toBe(true)
  })

  it('Stage 3 boss kill + escape also opens Stage 4 (both choices)', async () => {
    for (const racerKills of [0, 7]) {
      enterStage3()
      escapeStage3({ boss: true })
      expect(useGameStore.getState().finalizeDeferredStageResult({ racerKills }).ok).toBe(true)
      expect(isStageUnlocked('stage4', readFirebasePlayerProgress().records)).toBe(true)
    }
  })

  it('other stages are unchanged: Stage 2 escape without a boss does not open Stage 3 and is not deferred', async () => {
    db = installProgressTransactionTestClient()
    updateFirebasePlayerProgress(progress => { progress.records.stage1BossDefeats = 1 })
    expect(useGameStore.getState().resetGame('stage2')).toBe(true)
    useGameStore.setState({ elapsedMs: 215_000 })
    expect(useGameStore.getState().clearStage()).toBe(true)
    expect(useGameStore.getState().deferredStageResult).toBeNull()
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(isStageUnlocked('stage3', readFirebasePlayerProgress().records)).toBe(false)
    expect(isStageUnlocked('stage5', { stage4Clears: 1 })).toBe(false)
  })

  it('guest: same ranking deferral, no save', async () => {
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ user: null })
    // A guest reaches Stage 3 only by continuing; seat the store there directly.
    useGameStore.setState({ phase: 'playing', currentStageId: 'stage3', rankingRun: { id: 'guest-run-000000', stages: [], written: null, writtenScore: 0 }, progressRunId: 'guest-run-000000', elapsedMs: 215_000, runKills: 3, bossDefeated: false, continuousScoreBase: 0, continuousTimeBase: 0, bossBonus: 0 })
    const score = escapeStage3()
    expect(runEndSubmits()).toHaveLength(0)
    expect(useGameStore.getState().finalizeDeferredStageResult({ racerKills: 5 })).toMatchObject({ ok: true, bonus: 5 })
    await vi.waitFor(() => expect(runEndSubmits()).toHaveLength(1))
    expect(stage3Of(runEndSubmits()[0][1]).score).toBe(score + 5)
  })
})
