// GA4 run lifecycle at the store seam: run_start once per new run, run_end exactly once per run,
// mirroring the once-per-run ranking write. lib/analytics.js is mocked; no PII in params.
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ track: vi.fn(), submit: vi.fn(), identity: vi.fn(), runOutfit: vi.fn(() => 'default') }))
vi.mock('../lib/analytics.js', () => ({ trackEvent: mocks.track }))
vi.mock('../lib/firebaseRanking.js', async (original) => ({ ...(await original()), submitRun: mocks.submit }))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: mocks.identity }))
// The run outfit is fixed once at run start from outfitUnlocks.resolveRunOutfitId (levelmini seam).
vi.mock('../lib/outfitUnlocks.js', async (original) => ({ ...(await original()), resolveRunOutfitId: () => mocks.runOutfit() }))
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
  mocks.runOutfit.mockReset().mockReturnValue('default')
})

describe('GA4 run events', () => {
  it('pause quit: one run_start and one run_end(quit), however many end paths fire', async () => {
    useGameStore.getState().resetGame('stage1')
    expect(events('run_start')).toEqual([{ stage_id: 'stage1', mode: 'guest', outfit_id: 'default' }])
    useGameStore.getState().pauseGame('manual')
    useGameStore.getState().quitPausedRun()
    useGameStore.getState().quitPausedRun()
    useGameStore.getState().finishRankingRun('end')
    useGameStore.getState().finishRankingRun('pagehide')
    const ends = events('run_end')
    expect(ends).toHaveLength(1)
    expect(ends[0]).toMatchObject({ stage_id: 'stage1', result: 'quit', level: 1 })
    expect(Object.keys(ends[0]).sort()).toEqual(['duration_sec', 'level', 'outfit_id', 'result', 'score', 'stage_id'])
    // 2026-11-10 Terry: the stage-entry 0-point write plus the one run-end write. The entry write is
    // not a run end, so it adds no run_end event (checked above: exactly one).
    await vi.waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2))
    expect(mocks.submit.mock.calls[0][1]).toMatchObject({ stageId: 'stage1', score: 0, timeMs: 0, cleared: false })
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

  it('pagehide mid-run is not a run_end; pagehide -> resume -> death sends exactly one run_end(dead)', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().recordKill()
    useGameStore.getState().pauseGame('auto') // GameplayScreen pauses on hide
    useGameStore.getState().finishRankingRun('pagehide')
    useGameStore.getState().finishRankingRun('pagehide') // visibilitychange + pagehide both fire
    expect(events('run_end')).toHaveLength(0)
    useGameStore.getState().resumeGame()
    expect(useGameStore.getState().phase).toBe('playing')
    useGameStore.getState().killPlayer('test')
    useGameStore.getState().finishRankingRun('end') // back to the lobby
    expect(events('run_end')).toEqual([expect.objectContaining({ stage_id: 'stage1', result: 'dead' })])
  })

  it('pagehide then a later escape or pause quit still sends its one run_end', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().finishRankingRun('pagehide')
    useGameStore.getState().clearStage() // no boss -> run ends as escaped
    expect(events('run_end')).toEqual([expect.objectContaining({ result: 'escaped' })])
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().finishRankingRun('pagehide')
    useGameStore.getState().pauseGame('manual')
    useGameStore.getState().quitPausedRun()
    expect(events('run_end')).toHaveLength(2)
    expect(events('run_end')[1]).toMatchObject({ result: 'quit' })
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

  it('lethal damagePlayer: run_end(dead) once, no stage_clear, lobby leave + tab hide add nothing', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().damagePlayer(9999, { ignoreInvulnerability: true, source: 'test' })
    expect(useGameStore.getState().phase).toBe('gameover')
    useGameStore.getState().damagePlayer(9999, { ignoreInvulnerability: true }) // corpse hit: phase guard
    useGameStore.getState().finishRankingRun('end') // ReadyGameApp.leaveGameplay
    useGameStore.getState().finishRankingRun('pagehide') // visibility hidden on the result screen
    expect(events('run_end')).toEqual([expect.objectContaining({ stage_id: 'stage1', result: 'dead' })])
    expect(events('stage_clear')).toHaveLength(0)
  })

  it('real boss defeat then portal: stage_clear once; returning to the lobby ends the run as escaped once', () => {
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().spawnBoss()
    expect(useGameStore.getState().recordBossDefeat()).toBe(true)
    expect(useGameStore.getState().recordBossDefeat()).toBe(false)
    expect(events('stage_clear')).toHaveLength(0) // boss defeat alone is not a clear
    expect(useGameStore.getState().clearStage()).toBe(true)
    expect(useGameStore.getState().clearStage()).toBe(false) // EscapePortal double-trigger guard
    expect(events('stage_clear')).toEqual([{ stage_id: 'stage1', boss_defeated: true }])
    expect(events('run_end')).toHaveLength(0) // continuation still possible
    useGameStore.getState().finishRankingRun('end') // player leaves to the lobby instead of continuing
    useGameStore.getState().finishRankingRun('end')
    expect(events('run_end')).toEqual([expect.objectContaining({ stage_id: 'stage1', result: 'escaped' })])
  })

  it('signed-in run reports mode google without any identity param', () => {
    useAuthStore.setState({ user: { uid: 'u1', email: 'a@b.c', displayName: 'X' } })
    useGameStore.getState().resetGame('stage1')
    expect(events('run_start')).toEqual([{ stage_id: 'stage1', mode: 'google', outfit_id: 'default' }])
  })

  // Rosari outfit system (S5): run_start/run_end carry outfit_id and the ranking run carries outfitId,
  // both read from state.runOutfitId (the outfit whose abilities the run uses, fixed at run start).
  it('reports the run outfit on run_end and in the ranking submission; unknown ids fall back safely', async () => {
    mocks.runOutfit.mockReturnValue('gym')
    useGameStore.getState().resetGame('stage1')
    expect(events('run_start')).toEqual([expect.objectContaining({ outfit_id: 'gym' })])
    useGameStore.getState().killPlayer('test')
    useGameStore.getState().finishRankingRun('end')
    expect(events('run_end')).toEqual([expect.objectContaining({ result: 'dead', outfit_id: 'gym' })])
    // beforeEach's cleanup of the previous test's run can also land here asynchronously; pick this run's call.
    const submittedRun = () => mocks.submit.mock.calls.map(([, run]) => run).filter((run) => run?.stageId === 'stage1')
    // This run writes twice with its outfit: the stage-entry 0-point write and the run-end write.
    await vi.waitFor(() => expect(submittedRun().filter((run) => run.outfitId === 'gym')).toHaveLength(2))
    const before = mocks.submit.mock.calls.length

    // Defensive: a non-canonical run outfit never reaches GA4 or the ranking payload.
    useGameStore.getState().resetGame('stage1')
    useGameStore.setState({ runOutfitId: 'summer', rankingRun: { ...useGameStore.getState().rankingRun, stages: [] } })
    useGameStore.getState().killPlayer('test')
    useGameStore.getState().finishRankingRun('end')
    expect(events('run_end')[1]).toMatchObject({ outfit_id: 'default' })
    // stage-entry 0-point write + the run-end write (2026-11-10 Terry)
    await vi.waitFor(() => expect(mocks.submit.mock.calls.length).toBe(before + 2))
    expect(mocks.submit.mock.calls.at(-1)[1]).not.toHaveProperty('outfitId')
  })
})
