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
    ranking.submit.mockReset().mockResolvedValue({ written: ['allTime'], skipped: [], failed: [] })
    ranking.identity.mockReset().mockResolvedValue({ uid: 'guest', displayName: 'Guest' })
  })
  it.each(['stage1'])('stage entry on %s writes nothing; an unhydrated guest 0-point run is registered once at the end', async (stageId) => {
    useGameStore.getState().resetGame(stageId)
    expect(useGameStore.getState().phase).toBe('playing')
    await Promise.resolve()
    expect(ranking.submit).not.toHaveBeenCalled()
    const endedBefore = Date.now()
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledWith({ uid: 'guest', displayName: 'Guest' }, expect.objectContaining({
      stageId, score: 0, stageScore: 0, timeMs: 0, globalTimeMs: 0, cleared: false,
      lastPlayedAt: expect.any(Number),
    })))
    expect(ranking.submit).toHaveBeenCalledTimes(1)
    expect(ranking.submit.mock.calls[0][1].lastPlayedAt).toBeGreaterThanOrEqual(endedBefore)
    expect(ranking.submit.mock.calls[0][1].lastPlayedAt).toBeLessThanOrEqual(Date.now())
  })
  it('registers a Google player at run end without waiting for progress', () => {
    useAuthStore.setState({ user: { uid: 'google' } })
    expect(useGameStore.getState().resetGame('stage2')).toBe(false)
    expect(ranking.submit).not.toHaveBeenCalled()
    useGameStore.getState().resetGame('stage1')
    expect(ranking.submit).not.toHaveBeenCalled()
    useGameStore.getState()._onRunEnd('gameover')
    expect(ranking.submit).toHaveBeenCalledWith({ uid: 'google' }, expect.objectContaining({ score: 0, stageScore: 0, timeMs: 0 }))
    expect(ranking.identity).not.toHaveBeenCalled()
  })
  it('submits a guest run once at the end without account progress, not on kills', async () => {
    useGameStore.getState().resetGame()
    useGameStore.getState().recordKill()
    await Promise.resolve()
    expect(ranking.submit).not.toHaveBeenCalled()
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledWith(
      { uid: 'guest', displayName: 'Guest' }, expect.objectContaining({ score: 1, cleared: false }),
    ))
    expect(ranking.submit).toHaveBeenCalledTimes(1)
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
