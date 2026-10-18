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
  it.each(['stage1', 'stage4'])('registers an unhydrated guest at exactly zero on %s without holding the game', async (stageId) => {
    const startedBefore = Date.now()
    useGameStore.getState().resetGame(stageId)
    expect(useGameStore.getState().phase).toBe('playing')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledWith({ uid: 'guest', displayName: 'Guest' }, expect.objectContaining({
      stageId, score: 0, stageScore: 0, timeMs: 0, globalTimeMs: 0, cleared: false,
      lastPlayedAt: expect.any(Number),
    })))
    expect(ranking.submit.mock.calls[0][1].lastPlayedAt).toBeGreaterThanOrEqual(startedBefore)
    expect(ranking.submit.mock.calls[0][1].lastPlayedAt).toBeLessThanOrEqual(Date.now())
  })
  it('registers a Google player without waiting for progress', () => {
    useAuthStore.setState({ user: { uid: 'google' } })
    useGameStore.getState().resetGame('stage2')
    expect(ranking.submit).toHaveBeenCalledWith({ uid: 'google' }, expect.objectContaining({ score: 0, stageScore: 0, timeMs: 0 }))
    expect(ranking.identity).not.toHaveBeenCalled()
  })
  it('submits guest checkpoints and run end without account progress', async () => {
    useGameStore.getState().resetGame()
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledTimes(1))
    useGameStore.getState().recordKill()
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenLastCalledWith(
      { uid: 'guest', displayName: 'Guest' }, expect.objectContaining({ score: 1 }),
    ))
    ranking.submit.mockClear()
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submit).toHaveBeenCalledWith(
      { uid: 'guest', displayName: 'Guest' }, expect.objectContaining({ score: 1, cleared: false }),
    ))
  })
  it('keeps a newer checkpoint result when a delayed entry resolves', async () => {
    let finishEntry
    ranking.submit.mockImplementationOnce(() => new Promise((resolve) => { finishEntry = resolve }))
    useAuthStore.setState({ user: { uid: 'google' } })
    useGameStore.getState().resetGame()
    await useGameStore.getState().submitRunToRanking({ uid: 'google' }, { stageId: 'stage1', score: 100, timeMs: 100000 })
    finishEntry({ written: [], skipped: ['allTime'], failed: [] })
    await Promise.resolve()
    expect(useGameStore.getState().rankingSubmission).toMatchObject({ score: 100, status: 'recorded' })
  })
  it('leaves a newer run submission intact after old identity failure', async () => {
    let rejectOld
    ranking.identity.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject }))
    useGameStore.getState().resetGame()
    useGameStore.getState().resetGame()
    await vi.waitFor(() => expect(useGameStore.getState().rankingSubmission.status).toBe('recorded'))
    rejectOld(new Error('old identity failed'))
    await Promise.resolve()
    expect(useGameStore.getState().rankingSubmission.status).toBe('recorded')
  })
})
