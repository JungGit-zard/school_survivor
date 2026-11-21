// @vitest-environment jsdom
// ============================================================================================
// SIGNED-IN IDLE GUARD (app level) — DO NOT DELETE OR LOOSEN WITHOUT THE OWNER'S (Terry's) WORD.
//
// Incident 2026-11-17 ~ 2026-11-19: ReadyGameApp's 5-second tick ran a cloud progress save for every
// signed-in account, on the title too, re-writing the whole users/{uid} node (hundreds of KB of
// history) each time; signed-in players stuttered, guests did not. Fixed by d18ca46d (the tick only
// retries the ranking; progress is re-checked on 'online' only) and 3984b1b4 (saves never re-read or
// re-send history). See src/store/signedInPerformanceGuard.test.js for the store-level guards.
//
// This renders the real app shell (screens mocked, real stores and progress module, rules-faithful
// fake database) signed in on the title and lets ten minutes of timers run. Nothing may ask the
// progress module to save, and nothing may reach the database.
// ============================================================================================
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const progressCalls = vi.hoisted(() => new Map())
const rankingRetries = vi.hoisted(() => ({ count: 0 }))

vi.mock('./TitleScreen.jsx', () => ({ default: () => <div data-testid="title-screen" /> }))
vi.mock('./Lobby.jsx', () => ({ default: () => null }))
vi.mock('./MissionCenter.jsx', () => ({ default: () => null }))
vi.mock('./CoinShop.jsx', () => ({ default: () => null }))
vi.mock('./UserRanking.jsx', () => ({ default: () => null }))
vi.mock('./StageRanking.jsx', () => ({ default: () => null }))
vi.mock('./RosariRoom.jsx', () => ({ default: () => null }))
vi.mock('./GameplayScreen.jsx', () => ({ default: () => null }))
vi.mock('./HUD.jsx', () => ({ default: () => null }))
vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('./SfxLayer.jsx', () => ({ default: () => null }))
vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
vi.mock('../lib/firebaseAdminVisitors.js', () => ({ recordAdminVisitor: async () => ({ recorded: true }) }))
vi.mock('../lib/playtestLogger.js', () => ({ initPlaytestLogger: vi.fn() }))
vi.mock('../lib/keyboardInput.js', () => ({ initKeyboardInput: vi.fn() }))
vi.mock('../lib/mobileInput.js', () => ({ isMobileJoystickEnvironment: () => false }))
vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  submitRun: async () => ({ written: [], skipped: [], failed: [] }),
  retryPendingRankings: async () => { rankingRetries.count += 1; return { written: [], skipped: [], failed: [] } },
}))
vi.mock('../lib/firebaseProgress.js', async (importOriginal) => {
  const actual = await importOriginal()
  const wrapped = {}
  for (const [name, value] of Object.entries(actual)) {
    wrapped[name] = typeof value === 'function' && /^[a-z]/.test(name)
      ? (...args) => { progressCalls.set(name, (progressCalls.get(name) ?? 0) + 1); return value(...args) }
      : value
  }
  return wrapped
})

const progress = await import('../lib/firebaseProgress.js')
const { createControllableProgressDatabase, TEST_FIREBASE_ENV } = await import('../../test/controllableProgressDatabase.js')
const { useAuthStore } = await import('../store/useAuthStore.js')
const { default: ReadyGameApp } = await import('./ReadyGameApp.jsx')

const SAVE_CALLS = ['requestCloudProgressSave', 'saveLocalProgressToCloud', 'flushCloudProgressBeforeSignOut', 'commitFirebaseStageResult', 'saveFirebaseMissionProgress', 'hydrateCloudProgress', 'loadCloudProgressFromCloud']

let root
let host
beforeEach(() => {
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  localStorage.clear()
})
afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

it('signed in on the title for ten minutes: no save request, no database read or write', async () => {
  const user = { uid: 'idle-guard-owner', displayName: 'Owner' }
  progress._resetFirebaseProgressForTests()
  progress.applyCloudProgressSnapshot({ progress: { goldTotal: 50, weaponUnlockSchemaVersion: 2, records: { totalRuns: 3 } } }, user)
  const checkpointLedger = Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`session-${i}`, { gold: i, sequence: i + 1, note: 'x'.repeat(200) }]))
  const db = createControllableProgressDatabase({ users: { [user.uid]: { ...progress.buildCloudProgressSnapshot(), checkpointLedger } } })
  progress._resetFirebaseProgressForTests()
  progress._setFirebaseProgressClientForTests(db)
  useAuthStore.setState({ user, status: 'signedIn' })
  await progress.hydrateCloudProgress(user)
  db.reads.length = 0
  db.writes.length = 0
  progressCalls.clear()
  rankingRetries.count = 0

  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => { root.render(<ReadyGameApp authStatus="signedIn" authUser={user} progressStatus="ready" />); await vi.dynamicImportSettled() })
  expect(host.querySelector('[data-testid="title-screen"]')).not.toBeNull()

  for (let minute = 0; minute < 10; minute++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); await vi.dynamicImportSettled() })
  }

  // The app's 5-second tick really ran (it retries the ranking) — and it never touched progress.
  expect(rankingRetries.count).toBeGreaterThanOrEqual(100)
  expect(Object.fromEntries(SAVE_CALLS.map(name => [name, progressCalls.get(name) ?? 0]))).toEqual(Object.fromEntries(SAVE_CALLS.map(name => [name, 0])))
  expect(db.writes).toEqual([])
  expect(db.reads).toEqual([])
  expect(Object.keys(localStorage)).toEqual([])
})
