import { beforeEach, describe, expect, it, vi } from 'vitest'
const ranking = vi.hoisted(() => ({ submit: vi.fn(), identity: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), submitRun: ranking.submit }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: ranking.identity }))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests } from '../lib/firebaseProgress.js'

describe('ranking entry registration', () => {
  beforeEach(() => {
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ user: null })
    // Drop any run an earlier test left open so its restart write never lands in this test's counts.
    useGameStore.setState({ rankingRun: null })
    ranking.submit.mockReset().mockResolvedValue({ written: ['allTime'], skipped: [], failed: [] })
    ranking.identity.mockReset().mockResolvedValue({ uid: 'guest', displayName: 'Guest' })
  })
  // 2026-11-10 Terry: "0점이라도 스테이지에 진입했으면 누적랭킹에 남겨 — 그 순간에 무조건 기록해."
  it('stage entry writes a 0-point entry at once for a guest; the run end still writes the real result', async () => {
    const enteredBefore = Date.now()
    expect(useGameStore.getState().resetGame('stage1')).toBe(true)
    expect(useGameStore.getState().phase).toBe('playing')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(1))
    expect(ranking.identity).toHaveBeenCalledTimes(1) // the guest ranking user is made at entry time
    expect(ranking.submit).toHaveBeenCalledWith({ uid: 'guest', displayName: 'Guest' }, expect.objectContaining({
      stageId: 'stage1', score: 0, stageScore: 0, timeMs: 0, globalTimeMs: 0, cleared: false,
      lastPlayedAt: expect.any(Number),
    }))
    expect(ranking.submit.mock.calls[0][1].lastPlayedAt).toBeGreaterThanOrEqual(enteredBefore)
    // The entry write is not the run's write: the end guard is untouched.
    expect(useGameStore.getState().rankingRun).toMatchObject({ written: null, writtenScore: 0 })

    useGameStore.getState().recordKill()
    useGameStore.setState({ elapsedMs: 30_000 })
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(2))
    const end = ranking.submit.mock.calls[1][1]
    expect(end).toMatchObject({ stageId: 'stage1', cleared: false, timeMs: 30_000 })
    expect(end.score).toBeGreaterThan(0)
  })
  it('a 0-point run is registered at entry and again at the end (no score filter anywhere)', async () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(2))
    for (const [, run] of ranking.submit.mock.calls) expect(run).toMatchObject({ stageId: 'stage1', score: 0, stageScore: 0, cleared: false })
  })
  it('pagehide after the entry write still writes once the score rose, without a second guest sign-in wait', async () => {
    useGameStore.getState().resetGame('stage1')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(1))
    useGameStore.getState().recordKill()
    useGameStore.setState({ elapsedMs: 12_000 })
    expect(useGameStore.getState().finishRankingRun('pagehide')).toBe(true)
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(2))
    expect(ranking.submit.mock.calls[1][1].score).toBeGreaterThan(0)
    expect(ranking.submit.mock.calls[1][1]).toMatchObject({ stageId: 'stage1', timeMs: 12_000 })
  })
  it('registers a Google player at entry and at run end without waiting for progress or guest identity', () => {
    useAuthStore.setState({ user: { uid: 'google' } })
    expect(useGameStore.getState().resetGame('stage2')).toBe(false) // locked stage = no entry, no write
    expect(ranking.submit).not.toHaveBeenCalled()
    useGameStore.getState().resetGame('stage1')
    expect(ranking.submit).toHaveBeenCalledTimes(1) // synchronous for a signed-in player
    expect(ranking.submit).toHaveBeenLastCalledWith({ uid: 'google' }, expect.objectContaining({ stageId: 'stage1', score: 0, timeMs: 0, cleared: false }))
    useGameStore.getState()._onRunEnd('gameover')
    expect(ranking.submit).toHaveBeenCalledTimes(2)
    expect(ranking.submit).toHaveBeenLastCalledWith({ uid: 'google' }, expect.objectContaining({ score: 0, stageScore: 0, timeMs: 0 }))
    expect(ranking.identity).not.toHaveBeenCalled()
  })
  it('writes the entry even if the guest identity is slow; the entry never blocks the game start', async () => {
    let resolveIdentity
    ranking.identity.mockImplementationOnce(() => new Promise((resolve) => { resolveIdentity = resolve }))
    expect(useGameStore.getState().resetGame('stage1')).toBe(true)
    expect(useGameStore.getState().phase).toBe('playing')
    await Promise.resolve()
    expect(ranking.submit).not.toHaveBeenCalled()
    resolveIdentity({ uid: 'guest', displayName: 'Guest' })
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledWith({ uid: 'guest', displayName: 'Guest' }, expect.objectContaining({ stageId: 'stage1', score: 0 })))
  })
  it('submits a guest run at entry and once at the end, never on kills', async () => {
    useGameStore.getState().resetGame()
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(1))
    useGameStore.getState().recordKill()
    await Promise.resolve()
    expect(ranking.submit).toHaveBeenCalledTimes(1)
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenLastCalledWith(
      { uid: 'guest', displayName: 'Guest' }, expect.objectContaining({ score: 1, cleared: false }),
    ))
    expect(ranking.submit).toHaveBeenCalledTimes(2)
  })
  it('keeps a newer submission result when a delayed earlier run-end write resolves', async () => {
    let finishEntry
    useAuthStore.setState({ user: { uid: 'google' } })
    useGameStore.getState().resetGame()
    ranking.submit.mockImplementationOnce(() => new Promise((resolve) => { finishEntry = resolve }))
    useGameStore.getState()._onRunEnd('gameover')
    await useGameStore.getState().submitRunToRanking({ uid: 'google' }, { stageId: 'stage1', score: 100, timeMs: 100000 })
    finishEntry({ written: [], skipped: ['allTime'], failed: [] })
    await Promise.resolve()
    expect(useGameStore.getState().rankingSubmission).toMatchObject({ score: 100, status: 'recorded' })
  })
  it('leaves a newer run submission intact after old identity failure', async () => {
    let rejectOld
    useGameStore.getState().resetGame()
    ranking.identity.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject }))
    useGameStore.getState()._onRunEnd('gameover')
    useGameStore.getState().resetGame()
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(useGameStore.getState().rankingSubmission.status).toBe('recorded'))
    rejectOld(new Error('old identity failed'))
    await Promise.resolve()
    expect(useGameStore.getState().rankingSubmission.status).toBe('recorded')
  })
})
