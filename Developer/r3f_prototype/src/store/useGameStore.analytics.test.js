// GA4 run lifecycle at the store seam: run_start once per new run, run_end exactly once per run,
// mirroring the once-per-run ranking write. lib/analytics.js is mocked; no PII in params.
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ track: vi.fn(), submit: vi.fn(), identity: vi.fn() }))
vi.mock('../lib/analytics.js', () => ({ trackEvent: mocks.track }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), submitRun: mocks.submit }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: mocks.identity }))
import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests } from '../lib/firebaseProgress.js'

const events = (name) => mocks.track.mock.calls.filter(([n]) => n === name).map(([, params]) => params)

beforeEach(() => {
  _resetFirebaseProgressForTests()
  useAuthStore.setState({ user: null })
  useGameStore.getState().finishRankingRun('end') // close any run left by a previous test
  mocks.track.mockReset()
  mocks.submit.mockReset().mockResolvedValue({ written: ['allTime'], skipped: [], failed: [] })
  mocks.identity.mockReset().mockResolvedValue({ uid: 'guest', isAnonymous: true })
})

describe('GA4 run events', () => {
  it('pause quit: one run_start and one run_end(quit), however many end paths fire', async () => {
    useGameStore.getState().resetGame('stage1')
    expect(events('run_start')).toEqual([{ stage_id: 'stage1', mode: 'guest' }])
    useGameStore.getState().pauseGame('manual')
    useGameStore.getState().quitPausedRun()
    useGameStore.getState().quitPausedRun()
    useGameStore.getState().finishRankingRun('end')
    useGameStore.getState().finishRankingRun('pagehide')
    const ends = events('run_end')
    expect(ends).toHaveLength(1)
    expect(ends[0]).toMatchObject({ stage_id: 'stage1', result: 'quit', level: 1 })
    expect(Object.keys(ends[0]).sort()).toEqual(['duration_sec', 'level', 'result', 'score', 'stage_id'])
    await vi.waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1))
  })

  it('death: run_end(dead) once; the next run gets its own run_start/run_end', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().killPlayer('test')
    useGameStore.getState().finishRankingRun('end')
    expect(events('run_end')).toEqual([expect.objectContaining({ result: 'dead', stage_id: 'stage1' })])
    useGameStore.getState().resetGame('stage1')
    expect(events('run_start')).toHaveLength(2)
    expect(events('run_end')).toHaveLength(1)
    useGameStore.getState().resetGame('stage1') // restart mid-play ends that run as quit
    expect(events('run_end')).toHaveLength(2)
    expect(events('run_end')[1]).toMatchObject({ result: 'quit' })
  })

  it('pagehide mid-run counts as the run_end; a later death does not add a second one', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().recordKill()
    useGameStore.getState().finishRankingRun('pagehide')
    useGameStore.getState().killPlayer('test')
    expect(events('run_end')).toHaveLength(1)
    expect(events('run_end')[0]).toMatchObject({ result: 'quit' })
  })

  it('stage clear with continuation: stage_clear, no run_end until the continued run ends', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ bossDefeated: true })
    expect(useGameStore.getState().clearStage()).toBe(true)
    expect(events('stage_clear')).toEqual([{ stage_id: 'stage1', boss_defeated: true }])
    expect(events('run_end')).toHaveLength(0)
    expect(useGameStore.getState().resetGame('stage2', { preserveQuestJourney: true, preserveContinuousScore: true, unlockedByRunBossDefeat: true })).toBe(true)
    expect(events('run_start')).toHaveLength(1) // continuation is the same run
    useGameStore.getState().killPlayer('test')
    expect(events('run_end')).toEqual([expect.objectContaining({ result: 'dead', stage_id: 'stage2' })])
  })

  it('escape without the boss ends the run as escaped', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().clearStage() // bossDefeated false -> no continuation -> run ends
    expect(events('stage_clear')).toEqual([{ stage_id: 'stage1', boss_defeated: false }])
    expect(events('run_end')).toEqual([expect.objectContaining({ result: 'escaped' })])
    useGameStore.getState().finishRankingRun('end')
    expect(events('run_end')).toHaveLength(1)
  })

  it('signed-in run reports mode google without any identity param', () => {
    useAuthStore.setState({ user: { uid: 'u1', email: 'a@b.c', displayName: 'X' } })
    useGameStore.getState().resetGame('stage1')
    expect(events('run_start')).toEqual([{ stage_id: 'stage1', mode: 'google' }])
  })
})
