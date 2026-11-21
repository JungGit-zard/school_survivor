// @vitest-environment jsdom
// ============================================================================================
// SIGNED-IN PERFORMANCE GUARD — DO NOT DELETE OR LOOSEN WITHOUT THE OWNER'S (Terry's) WORD.
//
// Incident 2026-11-17 ~ 2026-11-19: the live game stuttered badly for signed-in players only
// (guests were smooth). The cloud-save code re-wrote the whole users/{uid} node (hundreds of KB of
// history: checkpointLedger, runLedger) every 5 s — on the title too — and on every kill, gold pickup
// and elapsed second during a run, and it cloned the whole progress object and recomputed every
// mission on each of those events. Fixed by d18ca46d and 3984b1b4: saves never re-read or re-send
// history and touch only changed sub-paths; in-run events stay in memory, mirrored to one one-stage
// device slot (src/lib/stageSlot.js) at most once a second and on page hide; the stage end writes the
// result once and clears the slot; a leftover slot is applied once at the next sign-in. Measured on
// the owner's phone afterwards: 60 fps signed in.
//
// These tests run as a SIGNED-IN, hydrated account with a large pre-existing history (guest runs
// prove nothing here). Every budget below is stated with the value measured on 2026-11-19 and the
// headroom chosen. If one fails, the stutter cause is coming back: fix the code, not the test.
// ============================================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const progressCalls = vi.hoisted(() => new Map())
const missionCalls = vi.hoisted(() => new Map())

vi.mock('../lib/firebaseRanking.js', async (importOriginal) => ({
  ...(await importOriginal()),
  submitRun: async () => ({ written: [], skipped: [], failed: [] }),
  retryPendingRankings: async () => ({ written: [], skipped: [], failed: [] }),
}))
// Count every call the game makes into the progress module, so per-event paths can be proven to
// stay out of it (no progress clone, no save request) without touching production code.
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
vi.mock('../lib/missionProgress.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    reconcileMissionProgress: (...args) => { missionCalls.set('reconcileMissionProgress', (missionCalls.get('reconcileMissionProgress') ?? 0) + 1); return actual.reconcileMissionProgress(...args) },
  }
})

import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  applyCloudProgressSnapshot,
  buildCloudProgressSnapshot,
  flushCloudProgressBeforeSignOut,
  hydrateCloudProgress,
  requestCloudProgressSave,
} from '../lib/firebaseProgress.js'
import { _resetStageSlotForTests, STAGE_SLOT_MAX_BYTES, getLiveStageSlot, readStoredStageSlot } from '../lib/stageSlot.js'
import { saveTitleSettings } from '../lib/titleSettings.js'
import { createControllableProgressDatabase, TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'
import { useAuthStore } from './useAuthStore.js'
import { useGameStore } from './useGameStore.js'

const SLOT_PREFIX = 'school_survivor:stageSlot:'
const HISTORY_PATH = /checkpointLedger|ledgerSummary|runLedger/

// --- budgets (measured 2026-11-19 on the 500 KB / 2,000-row account below) -----------------------
// Largest single write any save path sent: 4.4 KB (the users/{uid}/progress transaction carries the
// whole progress node, missions included). Budget 16 KB (~3.6x headroom). The incident wrote the
// ~650 KB users/{uid} node per save; no history copy can fit under this budget.
const MAX_BYTES_PER_WRITE = 16 * 1024
// All writes of one save action. Largest today: stage end, 3 writes / 5.6 KB. Budget 32 KB (~5.7x).
const MAX_BYTES_PER_SAVE_ACTION = 32 * 1024
// Signed-in per-kill handling vs guest per-kill handling (same store calls, 3,000 kills, best of 2).
// Measured 0.9x on a dev PC. Budget 4x: generous for a slow CI box, still far below the incident
// (whole-progress clone + full mission recompute + cloud save on every kill).
const MAX_SIGNED_IN_VS_GUEST_PER_KILL = 4
// Writes one stage end may send (today: 3, see test 2b). No headroom on purpose: a new write here
// must be a deliberate, reviewed change.
const MAX_WRITES_AT_STAGE_END = 3

function bigHistoryNode(uid) {
  // ~500 KB of old per-page checkpoint copies and 2,000 old run rows, like a long-time account.
  const checkpointLedger = {}
  const filler = 'x'.repeat(150)
  for (let i = 0; i < 2600; i++) {
    checkpointLedger[`session-${i}`] = { gold: i, sequence: i + 1, records: { totalKills: i }, missionCounters: { 'kills%2Etotal': i }, note: filler }
  }
  const runLedger = {}
  for (let i = 0; i < 2000; i++) {
    runLedger[`run-${String(i).padStart(5, '0')}`] = { stageId: 'stage1', records: { totalRuns: 1, totalKills: 30, totalGold: 5, bossKills: i % 50 === 0 ? 1 : 0, stage1BossDefeats: i % 50 === 0 ? 1 : 0 }, best: { bestSurvivalSeconds: 120 }, gold: 5, at: 1_700_000_000_000 + i }
  }
  _resetFirebaseProgressForTests()
  applyCloudProgressSnapshot({
    profile: { uid, displayName: 'Owner', nickname: 'Terry' },
    progress: {
      goldTotal: 5000,
      weaponUnlockSchemaVersion: 2,
      records: { totalRuns: 2000, totalKills: 60000, totalGold: 10000, totalSurvivalSeconds: 240000, bestSurvivalSeconds: 300, stage1Clears: 40 },
      titleSettings: { vibration: true, reducedEffects: false, unlockAllWeaponsCheat: false, unlockAllStagesCheat: false },
    },
  }, { uid })
  return { ...buildCloudProgressSnapshot(), checkpointLedger, runLedger, ledgerSummary: { compactedBefore: 0, runs: 0, bossDefeats: {} } }
}

const bytes = value => JSON.stringify(value ?? null).length
const writeBytes = write => bytes(write.values ?? write.value)

let db
let uid
let sequence = 0

async function signInWithHistory() {
  uid = `perf-guard-${++sequence}`
  const node = bigHistoryNode(uid)
  db = createControllableProgressDatabase({ users: { [uid]: node } })
  _resetFirebaseProgressForTests()
  _setFirebaseProgressClientForTests(db)
  useAuthStore.setState({ user: { uid, displayName: 'Owner' }, status: 'signedIn' })
  await hydrateCloudProgress({ uid, displayName: 'Owner' })
  useGameStore.getState().reloadPersistentProgress()
  useGameStore.getState().hydrateMissionProgress()
  await settle()
  return node
}

async function settle() {
  for (let i = 0; i < 5; i++) await requestCloudProgressSave({ uid })
  await new Promise(resolve => setTimeout(resolve, 0))
}

function resetCounters() {
  db.reads.length = 0
  db.writes.length = 0
  progressCalls.clear()
  missionCalls.clear()
}

function assertNoHistoryTouched(writes) {
  for (const write of writes) {
    expect(write.path).not.toMatch(HISTORY_PATH)
    for (const key of Object.keys(write.values ?? {})) {
      // The only history the game may ever write is the new row of the stage that just ended.
      if (key.startsWith('runLedger/')) continue
      expect(key).not.toMatch(HISTORY_PATH)
    }
    expect(JSON.stringify(write)).not.toMatch(/checkpointLedger|session-\d|run-\d{5}/)
  }
}

// One kill as the game reports it (Enemy.jsx -> store): run counter + mission counter.
let killSerial = 0
function simulateKill() {
  const s = useGameStore.getState()
  s.recordKill()
  s.recordMissionEnemyKill({ enemyType: 'E01', stageId: s.currentStageId, weaponKey: 'pencilThrow', gameKey: s.gameKey, killKey: `k${++killSerial}` })
}
function simulateCoin() {
  useGameStore.getState().gainGold(1)
  useGameStore.getState().recordMissionEvent({ type: 'pickup_collected', itemType: 'goldCoin', amount: 1 })
}

beforeEach(() => {
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  localStorage.clear()
  _resetStageSlotForTests()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('1. idle signed in (title/lobby) — no cloud traffic', () => {
  it('ten simulated minutes signed in: zero writes, zero transactions, zero reads (and no whole-node read at sign-in)', async () => {
    await signInWithHistory()
    // Sign-in itself never downloads the whole node or the old checkpoint copies.
    expect(db.reads).not.toContain(`users/${uid}`)
    expect(db.reads.some(path => /checkpointLedger/.test(path))).toBe(false)
    resetCounters()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    for (let second = 0; second < 600; second++) {
      await vi.advanceTimersByTimeAsync(1000)
      // What the title/lobby does with a signed-in account on its timers and screen changes:
      if (second % 5 === 0) await useGameStore.getState().retryRankingSubmission()
      if (second % 60 === 0) await useGameStore.getState().flushProgressBeforeTransition()
      if (second % 120 === 0) await useGameStore.getState().reconcileCloudProgress() // 'online'
      if (second % 90 === 0) document.dispatchEvent(new Event('visibilitychange'))
    }
    expect(db.writes).toEqual([])
    expect(db.writes.filter(write => write.kind === 'transaction')).toEqual([])
    expect(db.reads).toEqual([])
    expect(Object.keys(localStorage).filter(key => key.startsWith(SLOT_PREFIX))).toEqual([])
  })
})

describe('2. in-run — zero cloud traffic until the stage ends, then one result write', () => {
  it('3,000 kills, 500 coins, 30 level-ups, 300 s, quests/milestones/boss/missions: no cloud write or read mid-run; one result row at the end', async () => {
    await signInWithHistory()
    expect(useGameStore.getState().resetGame('stage1')).toBe(true)
    await settle() // run-start bookkeeping (play activity) is not part of the run
    resetCounters()

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    for (let second = 1; second <= 300; second++) {
      for (let k = 0; k < 10; k++) simulateKill()
      if (second % 3 < 2 && second <= 300) { simulateCoin(); simulateCoin() }
      if (second % 10 === 0) useGameStore.getState().gainXp(useGameStore.getState().player.xpToNext)
      useGameStore.setState({ elapsedMs: second * 1000 })
      useGameStore.getState().checkSurvivalMilestone()
      if (second === 60) {
        useGameStore.getState().startQuest('stage1-talk-book')
        useGameStore.getState().collectQuestItem('stage1-talk-book', 'stage1-desk-ne-01')
        useGameStore.getState().completeQuest('stage1-talk-book', 'user-classPresidentStudent-msl7serx-1')
      }
      if (second === 200) {
        useGameStore.getState().spawnBoss()
        useGameStore.getState().recordMissionEvent({ type: 'boss_spawned', bossId: 'B01' })
        useGameStore.getState().recordBossKill('B01')
        useGameStore.getState().recordBossDefeat('B01')
      }
      if (useGameStore.getState().phase === 'levelup') useGameStore.setState({ phase: 'playing', pendingLevelUps: 0 })
      await vi.advanceTimersByTimeAsync(1000)
    }
    const run = useGameStore.getState()
    expect(run.runKills).toBe(3000)
    expect(run.runLevelUps).toBeGreaterThanOrEqual(30)
    expect(run.goldSession).toBeGreaterThanOrEqual(400)

    // Mid-run: nothing reached the cloud, nothing was read from it.
    expect(db.writes).toEqual([])
    expect(db.reads).toEqual([])
    // The device slot is throttled to <= 1 write per second (+ a couple of boundary writes).
    const slotWrites = setItem.mock.calls.filter(([key]) => String(key).startsWith(SLOT_PREFIX))
    expect(slotWrites.length).toBeLessThanOrEqual(300 + 3)
    expect(Math.max(...slotWrites.map(([, value]) => String(value).length))).toBeLessThanOrEqual(STAGE_SLOT_MAX_BYTES)
    vi.useRealTimers()

    useGameStore.getState().damagePlayer(999999)
    expect(useGameStore.getState().phase).toBe('gameover')
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    await settle()
    const rowWrites = db.writes.filter(write => Object.keys(write.values ?? {}).some(key => key.startsWith('runLedger/')))
    expect(rowWrites).toHaveLength(1)
    expect(db.writes.filter(write => write.kind === 'transaction' && !/\/progress$/.test(write.path))).toEqual([])
    assertNoHistoryTouched(db.writes)
    for (const write of db.writes) expect(writeBytes(write)).toBeLessThanOrEqual(MAX_BYTES_PER_WRITE)
    expect(db.writes.reduce((sum, write) => sum + writeBytes(write), 0)).toBeLessThanOrEqual(MAX_BYTES_PER_SAVE_ACTION)
    expect(db.reads.filter(path => path === `users/${uid}` || HISTORY_PATH.test(path))).toEqual([])
    const node = db.get(`users/${uid}`)
    expect(node.progress.records.totalKills).toBe(60000 + 3000)
    expect(node.progress.records.totalRuns).toBe(2001)
    expect(readStoredStageSlot(uid)).toBeNull()
  })

  // Measured 2026-11-19: the stage end sends exactly one result (runLedger row + additive increments,
  // ~1.2 KB), then one users/{uid}/progress transaction (~2.8 KB: mission entries and best records are
  // not increments) and one top-level profile/activity update (~0.2 KB). Never more than these three.
  it('a short stage end: exactly one result row, at most three small writes in total', async () => {
    await signInWithHistory()
    // Settle every unlock a short run could trigger before measuring.
    expect(useGameStore.getState().resetGame('stage1')).toBe(true)
    useGameStore.getState().damagePlayer(999999)
    await useGameStore.getState().flushProgressBeforeTransition()
    await settle()
    expect(useGameStore.getState().resetGame('stage1')).toBe(true)
    await settle()
    resetCounters()
    simulateKill()
    simulateCoin()
    useGameStore.getState().damagePlayer(999999)
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    await settle()
    expect(db.writes.length).toBeLessThanOrEqual(MAX_WRITES_AT_STAGE_END)
    expect(db.writes.flatMap(write => Object.keys(write.values ?? {})).filter(key => key.startsWith('runLedger/'))).toHaveLength(1)
    expect(db.writes.filter(write => write.kind === 'transaction').map(write => write.path)).toEqual(
      db.writes.some(write => write.kind === 'transaction') ? [`users/${uid}/progress`] : [])
    assertNoHistoryTouched(db.writes)
  })
})

describe('3. history independence — every save path ignores the 500 KB / 2,000-row history', () => {
  async function measure(action) {
    resetCounters()
    await action()
    await settle()
    const writes = [...db.writes]
    const reads = [...db.reads]
    assertNoHistoryTouched(writes)
    expect(reads.filter(path => path === `users/${uid}` || HISTORY_PATH.test(path))).toEqual([])
    for (const write of writes) expect(writeBytes(write)).toBeLessThanOrEqual(MAX_BYTES_PER_WRITE)
    const total = writes.reduce((sum, write) => sum + writeBytes(write), 0)
    expect(total).toBeLessThanOrEqual(MAX_BYTES_PER_SAVE_ACTION)
    console.info(`[perf-guard] save action: ${writes.length} writes, ${total} bytes, largest ${Math.max(0, ...writes.map(writeBytes))} bytes`)
    return { writes, reads }
  }

  it('stage end, purchase, settings, sign-out flush: no history read or written, bytes under budget', async () => {
    await signInWithHistory()
    const before = db.get(`users/${uid}`)
    const stageEnd = await measure(async () => {
      useGameStore.getState().resetGame('stage1')
      for (let i = 0; i < 50; i++) simulateKill()
      useGameStore.getState().damagePlayer(999999)
      expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    })
    expect(stageEnd.writes.length).toBeGreaterThan(0)
    const purchase = await measure(async () => {
      expect(useGameStore.getState().purchasePassive('might').ok).toBe(true)
    })
    expect(purchase.writes.length).toBeGreaterThan(0)
    const settings = await measure(async () => {
      saveTitleSettings({ vibration: false })
      expect(await requestCloudProgressSave({ uid })).toBe(true)
    })
    expect(settings.writes.length).toBeGreaterThan(0)
    await measure(async () => {
      expect(await flushCloudProgressBeforeSignOut({ uid })).toBe(true)
    })
    const after = db.get(`users/${uid}`)
    expect(after.checkpointLedger).toEqual(before.checkpointLedger)
    for (const [key, row] of Object.entries(before.runLedger)) expect(after.runLedger[key]).toEqual(row)
    expect(after.ledgerSummary).toEqual(before.ledgerSummary)
  })

  it('sign-in hydration reads named children once — never the whole node, never checkpointLedger — and writes nothing', async () => {
    await signInWithHistory()
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    resetCounters()
    await hydrateCloudProgress({ uid })
    expect(db.writes).toEqual([])
    expect(db.reads).not.toContain(`users/${uid}`)
    expect(db.reads.some(path => /checkpointLedger/.test(path))).toBe(false)
    expect(new Set(db.reads).size).toBe(db.reads.length)
    // KNOWN (reported 2026-11-19): hydration downloads users/{uid}/runLedger in full, once per sign-in,
    // to count boss proof. It is bounded here to exactly one read so it can never move into a save path.
    expect(db.reads.filter(path => /runLedger/.test(path))).toEqual([`users/${uid}/runLedger`])
  })
})

describe('4. per-event cost — kills, coins and mission events stay out of the progress module', () => {
  it('signed-in kill / coin / mission handling: no progress clone, no save request, no full mission recompute', async () => {
    await signInWithHistory()
    useGameStore.getState().resetGame('stage1')
    await settle()
    for (let i = 0; i < 20; i++) simulateKill() // warm caches
    resetCounters()
    const structuredCloneSpy = vi.spyOn(globalThis, 'structuredClone')
    const stringifySpy = vi.spyOn(JSON, 'stringify')
    const before = useGameStore.getState().missionProgress
    for (let i = 0; i < 500; i++) {
      simulateKill()
      simulateCoin()
      useGameStore.getState().recordMissionEvent({ type: 'weapon_hit', weaponKey: 'pencilThrow' })
    }
    // Only cheap, clone-free checks are allowed on the per-event path.
    const CHEAP = new Set(['isFirebaseProgressHydrated', 'peekFirebaseProgress'])
    expect([...progressCalls.keys()].filter(name => !CHEAP.has(name))).toEqual([])
    expect(missionCalls.get('reconcileMissionProgress') ?? 0).toBe(0)
    const progressShaped = value => value && typeof value === 'object' && ('goldTotal' in value || 'progress' in value || 'checkpointLedger' in value)
    expect(structuredCloneSpy.mock.calls.filter(([value]) => progressShaped(value))).toEqual([])
    expect(stringifySpy.mock.calls.filter(([value]) => progressShaped(value))).toEqual([])
    // Incremental mission update: untouched missions keep their entry objects (no full recompute).
    const after = useGameStore.getState().missionProgress
    const untouched = Object.keys(before.active).filter(id => !/kill|e01|coin|gold|pencil|hit/i.test(id) && before.active[id])
    expect(untouched.length).toBeGreaterThan(0)
    for (const id of untouched) expect(after.active[id]).toBe(before.active[id])
    expect(db.writes).toEqual([])
  })

  it(`signed-in per-kill handling costs at most ${MAX_SIGNED_IN_VS_GUEST_PER_KILL}x guest per-kill handling`, async () => {
    const N = 3000
    const timeKills = () => {
      for (let i = 0; i < 200; i++) simulateKill()
      const start = performance.now()
      for (let i = 0; i < N; i++) simulateKill()
      return performance.now() - start
    }
    // Guest
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ user: null, status: 'signedOut' })
    useGameStore.getState().resetGame('stage1')
    const guest = Math.min(timeKills(), timeKills())
    // Signed in, hydrated, big history
    await signInWithHistory()
    useGameStore.getState().resetGame('stage1')
    await settle()
    const signedIn = Math.min(timeKills(), timeKills())
    const ratio = signedIn / Math.max(guest, 0.001)
    // Printed so a slow-down shows up in CI logs before it reaches the budget.
    console.info(`[perf-guard] per-kill guest ${(guest / N * 1000).toFixed(2)} us, signed-in ${(signedIn / N * 1000).toFixed(2)} us, ratio ${ratio.toFixed(2)}`)
    expect(ratio).toBeLessThanOrEqual(MAX_SIGNED_IN_VS_GUEST_PER_KILL)
  })
})

describe('5. no timer saves while nothing changes', () => {
  it('after a run ends and is saved, 30 quiet minutes signed in produce no write and leave no save timer armed', async () => {
    await signInWithHistory()
    useGameStore.getState().resetGame('stage1')
    simulateKill()
    useGameStore.getState().damagePlayer(999999)
    expect(useGameStore.getState().phase).toBe('gameover')
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    await settle()
    expect(getLiveStageSlot()).toBeNull()
    expect(readStoredStageSlot(uid)).toBeNull()
    resetCounters()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(vi.getTimerCount()).toBe(0)
    expect(db.writes).toEqual([])
    expect(db.reads).toEqual([])
    expect(setItem.mock.calls.map(([key, value]) => `${key}=${String(value).slice(0, 120)}`)).toEqual([])
  })

  it('a paused run with nothing changing writes nothing to the cloud and re-writes the device slot no more', async () => {
    await signInWithHistory()
    useGameStore.getState().resetGame('stage1')
    await settle()
    simulateKill()
    useGameStore.getState().pauseGame('manual')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    await vi.advanceTimersByTimeAsync(2000) // let the one pending slot write land
    resetCounters()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    expect(setItem).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    expect(db.writes).toEqual([])
    expect(db.reads).toEqual([])
  })
})

describe('6. device slot bound — one stage, one slot per account, cleared after the write, applied once', () => {
  const slotKeys = () => Object.keys(localStorage).filter(key => key.startsWith(SLOT_PREFIX))

  it('several stages in a row never hold more than one stage record, and the slot is gone once the result is written', async () => {
    await signInWithHistory()
    for (const stageId of ['stage1', 'stage1', 'stage1']) {
      expect(useGameStore.getState().resetGame(stageId)).toBe(true)
      for (let i = 0; i < 5; i++) simulateKill()
      expect(slotKeys()).toEqual([`${SLOT_PREFIX}${uid}`])
      const slot = JSON.parse(localStorage.getItem(`${SLOT_PREFIX}${uid}`))
      expect(slot.runKey).toBeTruthy()
      expect(Object.values(slot).some(value => Array.isArray(value))).toBe(false)
      expect(localStorage.getItem(`${SLOT_PREFIX}${uid}`).length).toBeLessThanOrEqual(STAGE_SLOT_MAX_BYTES)
    }
    useGameStore.getState().damagePlayer(999999)
    expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
    await settle()
    expect(slotKeys()).toEqual([])
    // No browser storage other than the slot was written by any of this.
    expect(Object.keys(localStorage)).toEqual([])
  })

  it('one slot per account; a slot left by a closed tab is applied exactly once at the next sign-in', async () => {
    await signInWithHistory()
    const firstUid = uid
    useGameStore.getState().resetGame('stage1')
    for (let i = 0; i < 7; i++) simulateKill()
    window.dispatchEvent(new Event('pagehide')) // the page-hide flush writes the latest numbers
    const leftover = readStoredStageSlot(firstUid)
    expect(leftover.records.totalKills).toBe(7)
    // Tab closes mid-stage: memory is gone, the device copy stays.
    _resetStageSlotForTests()
    const killsBefore = db.get(`users/${firstUid}/progress/records/totalKills`)
    const rowsBefore = Object.keys(db.get(`users/${firstUid}/runLedger`)).length

    _resetFirebaseProgressForTests(); _setFirebaseProgressClientForTests(db)
    resetCounters()
    await hydrateCloudProgress({ uid: firstUid })
    await settle()
    expect(Object.keys(db.get(`users/${firstUid}/runLedger`)).length).toBe(rowsBefore + 1)
    expect(db.get(`users/${firstUid}/progress/records/totalKills`)).toBe(killsBefore + leftover.records.totalKills)
    expect(readStoredStageSlot(firstUid)).toBeNull()

    // Signing in again applies nothing more.
    _resetFirebaseProgressForTests(); _setFirebaseProgressClientForTests(db)
    resetCounters()
    await hydrateCloudProgress({ uid: firstUid })
    await settle()
    expect(db.writes).toEqual([])
    expect(Object.keys(db.get(`users/${firstUid}/runLedger`)).length).toBe(rowsBefore + 1)

    // A second account on the same device gets its own single slot; the first account's is untouched.
    const other = `${firstUid}-other`
    db.root.users[other] = { ...db.get(`users/${firstUid}`), profile: { uid: other, displayName: 'Other', nickname: '' } }
    _resetFirebaseProgressForTests(); _setFirebaseProgressClientForTests(db)
    useAuthStore.setState({ user: { uid: other }, status: 'signedIn' })
    await hydrateCloudProgress({ uid: other })
    useGameStore.getState().resetGame('stage1')
    simulateKill()
    expect(slotKeys()).toEqual([`${SLOT_PREFIX}${other}`])
  })

  it('a guest never opens a device slot', () => {
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ user: null, status: 'signedOut' })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    useGameStore.getState().resetGame('stage1')
    for (let i = 0; i < 50; i++) simulateKill()
    useGameStore.getState().damagePlayer(999999)
    expect(setItem).not.toHaveBeenCalled()
  })
})
