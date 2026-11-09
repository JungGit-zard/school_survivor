// @vitest-environment jsdom
// Ranking write budget at the store seam, with the real GameplayScreen lifecycle listeners mounted.
// 2026-10-27 live QA (guest, escapezombie.com): during play the client wrote all 6 ranking boards about
// once a second (77 per path in ~4 minutes). Terry's rule (2026-10-28): the score accumulates locally
// while the run is played and the ranking is written ONCE per run, when the run ends. The only other
// write is a real page unload (pagehide) before the run ended. A hidden tab never writes.
// 2026-11-10 Terry ("0점이라도 스테이지에 진입했으면 누적랭킹에 남겨 — 그 순간에 무조건 기록해"): each
// stage entry also writes one 0-point entry at the moment the stage starts. Play itself still never writes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ranking = vi.hoisted(() => ({ submitRun: vi.fn(async () => ({ written: ['x'], skipped: [], failed: [] })) }))
vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  submitRun: ranking.submitRun,
}))
vi.mock('../lib/guestRankingIdentity.js', () => ({ getRankingUser: vi.fn(async (user) => user ?? { uid: 'guest', isAnonymous: true }) }))
vi.mock('../components/gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('../components/HUD.jsx', () => ({ default: () => null }))
vi.mock('../components/VirtualJoystick.jsx', () => ({ default: () => null }))
vi.mock('../components/Stage1Bgm.jsx', () => ({ default: () => null }))

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import GameplayScreen from '../components/GameplayScreen.jsx'

import { useGameStore } from './useGameStore.js'
import { useAuthStore } from './useAuthStore.js'
import { _resetFirebaseProgressForTests } from '../lib/firebaseProgress.js'
import { advanceRuntimeTime } from '../lib/gameRuntimeTime.js'
import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'

const RUN_MS = 240_000
const TICK_MS = 100 // Game publishes the runtime clock at 10 Hz.

function playFor(ms, { killEveryMs = 500 } = {}) {
  for (let t = TICK_MS; t <= ms; t += TICK_MS) {
    advanceRuntimeTime(TICK_MS)
    useGameStore.getState().publishRuntimeElapsedMs()
    if (t % killEveryMs === 0) useGameStore.getState().recordKill()
  }
}

// Let the async submit chain (identity lookup -> submitRun) settle.
async function settle() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve()
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root = null
let container = null
async function mountGameplayScreen() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root.render(React.createElement(GameplayScreen, { isActive: true })) })
}
function unmountGameplayScreen() {
  if (root) act(() => root.unmount())
  container?.remove()
  root = null
  container = null
}

function setDocumentHidden(hidden) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' })
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
}

function submittedRuns(call) {
  const runs = call[1]
  return Array.isArray(runs) ? runs : [runs]
}

// Starts a stage and consumes its one unconditional 0-point entry write, so the run-end budget below
// is counted on its own.
async function enterStage(stageId) {
  expect(useGameStore.getState().resetGame(stageId)).toBe(true)
  await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
  expect(ranking.submitRun.mock.calls[0][1]).toMatchObject({ stageId, score: 0, stageScore: 0, timeMs: 0, cleared: false })
  ranking.submitRun.mockClear()
}

describe('ranking write budget: one 0-point write per stage entry, one write per run end', () => {
  beforeEach(async () => {
    useAuthStore.setState({ user: null })
    _resetFirebaseProgressForTests()
    // Close whatever run an earlier test left open, then start counting.
    useGameStore.getState().finishRankingRun('end')
    await settle()
    ranking.submitRun.mockClear()
  })
  afterEach(() => {
    unmountGameplayScreen()
    setDocumentHidden(false)
    useAuthStore.setState({ user: null })
  })

  it('a 4-minute run with 10 Hz clock updates and kills writes 0 times during play and exactly once at the end', async () => {
    await enterStage('stage1')
    playFor(RUN_MS)
    await settle()
    expect(ranking.submitRun).not.toHaveBeenCalled()

    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    expect(ranking.submitRun.mock.calls[0][1]).toMatchObject({ stageId: 'stage1', cleared: false })
    expect(ranking.submitRun.mock.calls[0][1].score).toBeGreaterThan(1)

    // A second end signal for the same run (or leaving to the lobby afterwards) does not write again.
    useGameStore.getState()._onRunEnd('gameover')
    useGameStore.getState().finishRankingRun('end')
    await settle()
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)
  })

  it('stage entry writes exactly one 0-point entry, and leaves the run-end guard untouched', async () => {
    useGameStore.getState().resetGame('stage1')
    await settle()
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)
    expect(ranking.submitRun.mock.calls[0][1]).toMatchObject({ stageId: 'stage1', score: 0, stageScore: 0, timeMs: 0, globalTimeMs: 0, cleared: false })
    expect(useGameStore.getState().rankingRun).toMatchObject({ written: null, writtenScore: 0 })
  })

  // 2026-10-29 production: mobile players background the browser and the OS kills it without
  // pagehide, so runs that never reached game over/lobby were never registered.
  it('a hidden tab writes the run once (pagehide flush) and pauses; an unchanged end adds none', async () => {
    await mountGameplayScreen()
    await enterStage('stage1')
    playFor(10_000)
    setDocumentHidden(true)
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    expect(ranking.submitRun.mock.calls[0][1].score).toBeGreaterThan(0)
    expect(useGameStore.getState().phase).toBe('paused')
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    setDocumentHidden(false)
    useGameStore.getState().quitPausedRun()
    await settle()
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)
  })

  it('pagehide mid-run makes exactly 1 submit; a repeat pagehide or an unchanged end adds none', async () => {
    await mountGameplayScreen()
    await enterStage('stage1')
    playFor(10_000)
    await act(async () => { window.dispatchEvent(new Event('pagehide')) })
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    const flushedScore = ranking.submitRun.mock.calls[0][1].score
    expect(flushedScore).toBeGreaterThan(0)
    expect(useGameStore.getState().phase).toBe('paused')

    await act(async () => { window.dispatchEvent(new Event('pagehide')) })
    useGameStore.getState().quitPausedRun()
    await settle()
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)
  })

  it('after a pagehide flush, a run that continues (bfcache restore) writes again at the end only if the score improved', async () => {
    await enterStage('stage1')
    playFor(10_000)
    useGameStore.getState().finishRankingRun('pagehide')
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    const flushedScore = ranking.submitRun.mock.calls[0][1].score

    playFor(20_000)
    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(2))
    expect(ranking.submitRun.mock.calls[1][1].score).toBeGreaterThan(flushedScore)
  })

  it('a 0-point run is registered at entry and again once at the end (no score>0 filter)', async () => {
    await enterStage('stage1')

    useGameStore.getState()._onRunEnd('gameover')
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    expect(ranking.submitRun.mock.calls[0][1]).toMatchObject({ stageId: 'stage1', score: 0, stageScore: 0, cleared: false })
  })

  it('restarting an unfinished run writes that run once plus the new stage entry, then the new run starts clean', async () => {
    await enterStage('stage1')
    playFor(5_000)
    useGameStore.getState().resetGame('stage1')
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(2))
    expect(ranking.submitRun.mock.calls[0][1].score).toBeGreaterThan(0) // the abandoned run's end
    expect(ranking.submitRun.mock.calls[1][1]).toMatchObject({ stageId: 'stage1', score: 0, timeMs: 0 }) // the new entry
    playFor(5_000)
    await settle()
    expect(ranking.submitRun).toHaveBeenCalledTimes(2)
  })

  it('a stage continuation is the same run for the session run count; a new run increments it', () => {
    const before = useGameStore.getState().sessionRunCount
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState().sessionRunCount).toBe(before + 2)
  })
})

describe('multi-stage run: every stage keeps its entry, all in one batched write', () => {
  afterEach(() => { vi.unstubAllEnvs() })
  beforeEach(async () => {
    // continueToNextStage는 이어 가기 전에 클라우드 진행도를 flush한다(flushProgressBeforeTransition).
    // isFirebaseProgressConfigured는 Auth 키 4개 + DATABASE_URL을 요구하므로, 로컬 .env가 없는 작업
    // 트리에서는 flush가 'unconfigured'로 실패해 이어 가기가 거부됐다. 테스트가 .env에 기대지 않게 고정한다.
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'qa-key')
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'qa.invalid')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'qa-project')
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:0:web:qa')
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://qa.invalid')
    installProgressTransactionTestClient()
    useGameStore.getState().resetGame('stage1')
    useGameStore.getState().finishRankingRun('end')
    useGameStore.getState().resetGame('stage1')
    await settle()
    ranking.submitRun.mockClear()
  })

  function clearAt(elapsedMs) {
    useGameStore.setState({ elapsedMs, bossDefeated: true })
    expect(useGameStore.getState().clearStage()).toBe(true)
  }

  it('clear -> continue -> die: the clear writes nothing, entering stage 2 registers it at once, the death writes both stages once', async () => {
    clearAt(240_000)
    await settle()
    expect(ranking.submitRun).not.toHaveBeenCalled()

    expect(await useGameStore.getState().continueToNextStage()).toBe(true)
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    // Stage 2 entry (2026-11-10 Terry): the cleared stage 1 record plus the stage 2 entry at 0 seconds,
    // in one batch. The entry is the same snapshot a run end at 0 seconds would write (stage 2's base
    // stage bonus counts, no survival time), on top of the run's score so far.
    const entryRuns = submittedRuns(ranking.submitRun.mock.calls[0])
    expect(entryRuns.map(run => run.stageId)).toEqual(['stage1', 'stage2'])
    expect(entryRuns[0]).toMatchObject({ cleared: true })
    expect(entryRuns[1]).toMatchObject({ timeMs: 0, cleared: false, score: entryRuns[0].score + entryRuns[1].stageScore })
    expect(entryRuns[1].globalTimeMs).toBe(entryRuns[0].globalTimeMs)
    expect(useGameStore.getState().rankingRun.written).toBe(null)

    useGameStore.setState((s) => ({ elapsedMs: 60_000, player: { ...s.player, hp: 1 } }))
    useGameStore.getState().damagePlayer(100, { ignoreInvulnerability: true })
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(2))

    const runs = submittedRuns(ranking.submitRun.mock.calls[1])
    expect(runs.map(run => run.stageId)).toEqual(['stage1', 'stage2'])
    expect(runs[0]).toMatchObject({ cleared: true })
    expect(runs[1]).toMatchObject({ cleared: false })
    expect(runs[1].score).toBeGreaterThan(runs[0].score)
  })

  it('a no-boss exit escape cannot continue, so the clear itself ends the run with exactly one write', async () => {
    // 2026-10-28 Terry: 보스 미처치 탈출구 탈출은 로비만 허용 — 이어 갈 수 없으니 그 클리어가 런의 끝이다.
    useGameStore.setState({ elapsedMs: 240_000, bossDefeated: false })
    expect(useGameStore.getState().clearStage()).toBe(true)
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    expect(submittedRuns(ranking.submitRun.mock.calls[0])).toEqual([expect.objectContaining({ stageId: 'stage1', cleared: true })])
    expect(await useGameStore.getState().continueToNextStage()).toBe(false)
    // 로비 복귀(leaveGameplay)가 다시 finishRankingRun('end')를 불러도 추가 쓰기는 없다.
    expect(useGameStore.getState().finishRankingRun('end')).toBe(false)
    await settle()
    expect(ranking.submitRun).toHaveBeenCalledTimes(1)
  })

  it('clear then leaving to the lobby (no continuation) writes the cleared stage once', async () => {
    clearAt(240_000)
    expect(useGameStore.getState().finishRankingRun('end')).toBe(true)
    await vi.waitFor(() => expect(ranking.submitRun).toHaveBeenCalledTimes(1))
    expect(submittedRuns(ranking.submitRun.mock.calls[0])).toEqual([expect.objectContaining({ stageId: 'stage1', cleared: true })])
    expect(useGameStore.getState().finishRankingRun('end')).toBe(false)
  })
})
