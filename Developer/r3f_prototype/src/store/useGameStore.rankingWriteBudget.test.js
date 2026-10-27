// 2026-10-27 live QA (guest, escapezombie.com): during play the client sent a ranking transaction to
// all 6 boards about once a second (77 per path in ~4 minutes, 233 datastale retries). The survival
// score rises every second and the checkpoint wrote whenever it improved. This file pins the write
// budget at the store seam: one registration at stage entry, a throttled crash-safety checkpoint,
// and one record at run end.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ranking = vi.hoisted(() => ({ submitRun: vi.fn(async () => ({ written: ['x'], skipped: [], failed: [] })) }))
vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  submitRun: ranking.submitRun,
}))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: vi.fn(async (user) => user ?? { uid: 'guest', isAnonymous: true }) }))

import { useGameStore, RANKING_CHECKPOINT_INTERVAL_MS } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { advanceRuntimeTime } from '../lib/gameRuntimeTime.js'

const RUN_MS = 240_000
const TICK_MS = 100 // Game publishes the runtime clock at 10 Hz.

// One registration + the first point + one per throttle window + run end.
const MAX_SUBMITS = 1 + 1 + Math.ceil(RUN_MS / RANKING_CHECKPOINT_INTERVAL_MS) + 1

function playFor(ms, { killEveryMs = 500 } = {}) {
  for (let t = TICK_MS; t <= ms; t += TICK_MS) {
    advanceRuntimeTime(TICK_MS)
    useGameStore.getState().publishRuntimeElapsedMs()
    if (t % killEveryMs === 0) useGameStore.getState().recordKill()
  }
}

describe('ranking write budget during gameplay', () => {
  beforeEach(() => {
    ranking.submitRun.mockClear()
    useAuthStore.setState({ user: null })
    _resetFirebaseProgressForTests()
  })
  afterEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('keeps a 4-minute guest run to a bounded number of ranking submissions, not one per second', async () => {
    expect(RANKING_CHECKPOINT_INTERVAL_MS).toBeGreaterThanOrEqual(30_000)
    useGameStore.getState().resetGame('stage1')
    playFor(RUN_MS)
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submitRun.mock.calls.at(-1)?.[1]?.score).toBeGreaterThan(1))

    const calls = ranking.submitRun.mock.calls
    expect(calls.length).toBeLessThanOrEqual(MAX_SUBMITS)
    // The stage-entry 0-point registration is still the first write (every school entry is ranked).
    expect(calls[0][1]).toMatchObject({ stageId: 'stage1', score: 0 })
    // The run end is recorded with the final score.
    const finalScore = calls.at(-1)[1].score
    expect(calls.every(([, run]) => run.score <= finalScore)).toBe(true)
  })

  it('writes the first point at once, then nothing more inside one throttle window', async () => {
    useGameStore.getState().resetGame('stage1')
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    useGameStore.getState().recordKill()
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(2))
    playFor(RANKING_CHECKPOINT_INTERVAL_MS - 1_000)
    await Promise.resolve()
    expect(ranking.submitRun).toHaveBeenCalledTimes(2)
  })

  it('page hide saves the latest score once, unthrottled, and never rewrites an unchanged score', async () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().recordKill()
    playFor(10_000)
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(2))
    expect(useGameStore.getState().flushRankingCheckpoint('lifecycle')).toBe(true)
    expect(useGameStore.getState().flushRankingCheckpoint('lifecycle')).toBe(false)
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(3))
  })

  it('a stage continuation is the same run for the session run count; a new run increments it', () => {
    const before = useGameStore.getState().sessionRunCount
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().sessionRunCount).toBe(before + 2)
  })
})
