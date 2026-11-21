// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

const authClient = vi.hoisted(() => ({ signOut: vi.fn(async () => {}) }))
vi.mock('../lib/firebaseRanking.js', () => ({
  prepareRankingSubmission: run => run, retryPendingRankings: async () => ({written:[],skipped:[],failed:[]}), submitRun: vi.fn(async () => ({ status: 'skipped' })),
  describeSubmission: () => ({ status: 'skipped' }),
}))
vi.mock('../lib/firebaseAuth.js', () => ({
  isFirebaseAuthConfigured: () => true,
  getFirebaseConfig: () => ({}),
  createFirebaseAuthClient: async () => authClient,
}))

import {
  _resetFirebaseProgressForTests, _setFirebaseProgressClientForTests as setProgressClient,
  applyCloudProgressSnapshot, buildCloudProgressSnapshot, hydrateCloudProgress,
  readFirebasePlayerProgress, setCloudProgressUser, updateFirebasePlayerProgress,
} from '../lib/firebaseProgress.js'
import { isStageUnlocked, isStageVisible } from '../lib/stageConfig.js'
import { useGameStore } from './useGameStore.js'
import { useAuthStore, _resetAuthStoreForTests } from './useAuthStore.js'
import { createControllableProgressDatabase, TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'

let user
let fixtureSequence = 0
let db
// 2026-11-19: rules-faithful, path-aware fake (users/{uid}/progress transaction, users/{uid} multi-path
// update, named-child reads) with switches for offline writes, held writes and held reads.
const stored = () => db.get(`users/${user.uid}`)
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  user = { uid: `clear-persistence-user-${++fixtureSequence}`, displayName: 'Player' }
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  localStorage.clear()
  _resetFirebaseProgressForTests()
  _resetAuthStoreForTests()
  authClient.signOut.mockReset().mockImplementation(async () => setCloudProgressUser(null))
  applyCloudProgressSnapshot({ progress: {
    goldTotal: 205, records: { totalRuns: 9, totalKills: 23 }, weaponUnlockSchemaVersion: 2,
    weaponUnlocks: { guidedMissile: 1 }, weaponPermanentUpgrades: { pencilThrow: 2 },
    passiveUpgrades: { magnet: 2 }, bossPassiveUnlocks: { b01SetSquare: true },
    encounteredZombieTypes: { E01: 1 }, titleSettings: { vibration: false, reducedEffects: true },
    missions: { counters: { kills: 23 } },
  } }, user)
  db = createControllableProgressDatabase({ users: { [user.uid]: buildCloudProgressSnapshot() } })
  setProgressClient(db)
  useAuthStore.setState({ user, status: 'signedIn' })
})

afterEach(() => vi.unstubAllEnvs())

it('waits for the stage clear and all user data to persist before logout, then restores the unlock', async () => {
  db.control.holdWrites = true
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({ currentStageId: 'stage1', phase: 'playing', elapsedMs: 240_000,
    runKills: 0, runLevelUps: 0, goldSession: 0, missionSpecialEnemySpawns: [] })
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossDefeat()
  useGameStore.getState().clearStage()
  const expected = readFirebasePlayerProgress()
  // Reconciliation must retain a pre-existing mission counter omitted by the
  // game store's current batch rather than erase it on the next full save.
  expected.missions.counters.kills = 23
  expect(isStageUnlocked('stage2', expected.records)).toBe(true)
  const logout = useAuthStore.getState().signOutOfGoogle()
  await vi.waitFor(() => expect(db.control.heldWrites.length).toBeGreaterThan(0))
  expect(authClient.signOut).not.toHaveBeenCalled()
  // Run-start, stage-end and logout saves share the serial queue.
  for (let i = 0; i < 30 && !authClient.signOut.mock.calls.length; i++) {
    db.releaseWrite()
    await tick()
  }
  await logout
  expect(authClient.signOut).toHaveBeenCalledTimes(1)
  db.control.holdWrites = false
  await hydrateCloudProgress(user)
  const restored = readFirebasePlayerProgress()
  // The stage-end write stamps the missions header time on the server; only that timestamp differs.
  expect(Number.isNaN(Date.parse(restored.missions.updatedAt))).toBe(false)
  expected.missions.updatedAt = restored.missions.updatedAt
  expect(restored).toEqual(expected)
  expect(isStageUnlocked('stage2', restored.records)).toBe(true)
})

it('keeps the signed-in session and clear on save failure so logout can retry', async () => {
  db.control.offline = true
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1 })
  await useAuthStore.getState().signOutOfGoogle()
  expect(authClient.signOut).not.toHaveBeenCalled()
  expect(useAuthStore.getState()).toMatchObject({ user, status: 'signedIn' })
  expect(useGameStore.getState().progressSaveWarning).toBe('save-failed')
  expect(readFirebasePlayerProgress().records.stage1Clears).toBe(1)
})

it('saves changes made while logout is waiting before releasing the authenticated session', async () => {
  db.control.holdWrites = true
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1 })
  const logout = useAuthStore.getState().signOutOfGoogle()
  await vi.waitFor(() => expect(db.control.heldWrites).toHaveLength(1))
  updateFirebasePlayerProgress((progress) => {
    progress.goldTotal += 7
    progress.weaponPermanentUpgrades.pencilThrow += 1
    progress.titleSettings.vibration = true
  })
  const expected = readFirebasePlayerProgress()
  db.releaseWrite()
  await vi.waitFor(() => expect(db.control.heldWrites).toHaveLength(1))
  expect(authClient.signOut).not.toHaveBeenCalled()
  for (let i = 0; i < 30 && !authClient.signOut.mock.calls.length; i++) {
    db.releaseWrite()
    await tick()
  }
  await logout
  expect(authClient.signOut).toHaveBeenCalledTimes(1)
  db.control.holdWrites = false
  await hydrateCloudProgress(user)
  expect(readFirebasePlayerProgress()).toEqual(expected)
})

it('does not replace a new clear with an older in-flight same-account hydrate', async () => {
  db.control.holdReads = true
  const hydration = hydrateCloudProgress(user)
  await vi.waitFor(() => expect(db.control.heldReads).toHaveLength(1))
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1; progress.records.stage1BossDefeats = 1; progress.goldTotal += 5 })
  const expected = readFirebasePlayerProgress()
  db.releaseRead()
  await hydration
  expect(readFirebasePlayerProgress()).toEqual(expected)
  expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(true)
})

it('keeps a player who has not cleared Stage 1 locked', () => {
  expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(false)
})

it('keeps newly earned progress when an older same-account hydrate rejects', async () => {
  db.control.holdReads = true
  const hydration = hydrateCloudProgress(user)
  await vi.waitFor(() => expect(db.control.heldReads).toHaveLength(1))
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1; progress.records.stage1BossDefeats = 1; progress.goldTotal += 5 })
  const expected = readFirebasePlayerProgress()
  db.releaseRead(new Error('late network failure'))
  await hydration
  expect(readFirebasePlayerProgress()).toEqual(expected)
})

it('does not sign out a different user who replaces the user waiting for a save', async () => {
  db.control.holdWrites = true
  // 2026-11-19: an unchanged account has nothing to flush, so give the logout something to save.
  updateFirebasePlayerProgress((progress) => { progress.goldTotal += 1 })
  const logout = useAuthStore.getState().signOutOfGoogle()
  await vi.waitFor(() => expect(db.control.heldWrites).toHaveLength(1))
  const otherUser = { uid: 'another-user', displayName: 'Other Player' }
  applyCloudProgressSnapshot({ progress: { goldTotal: 17, records: {} } }, otherUser)
  const expected = readFirebasePlayerProgress()
  useAuthStore.setState({ user: otherUser, status: 'signedIn' })
  db.control.holdWrites = false
  while (db.releaseWrite()) await tick()
  expect(await logout).toBe(false)
  expect(authClient.signOut).not.toHaveBeenCalled()
  expect(useAuthStore.getState().user).toEqual(otherUser)
  expect(readFirebasePlayerProgress()).toEqual(expected)
})


// Release entry boundary (a8ddfe0c, 1fcfc848): only visible stages can be entered through resetGame.
// REAL REGRESSION since 3984b1b4 (kept failing on purpose, 2026-11-19): when the stage-end result write
// is rejected, the boss proof (runLedger row) is never retried and the device slot is cleared by the
// fallback progress save, so after reload the next stage is locked again.
it.each([1,2,3,4,5,6,7,8,9].filter(n => isStageVisible(`stage${n}`)))('boss-only stage %i failed save retries, survives title/logout and synthetic reload', async n => {
  db.control.offline = true
  if(n>1) updateFirebasePlayerProgress(p => {p.records[`stage${n-1}BossDefeats`]=1})
  expect(useGameStore.getState().resetGame(`stage${n}`)).toBe(true)
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossDefeat()
  expect(isStageUnlocked(`stage${n+1}`,readFirebasePlayerProgress().records)).toBe(true)
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(false)
  expect(useGameStore.getState().progressSaveWarning).toBe('save-failed')
  expect(db.writes).toHaveLength(0)
  expect(authClient.signOut).not.toHaveBeenCalled()
  db.control.offline = false
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
  // Title return starts no new cleared run. Repeated flushes must stay idempotent.
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
  expect(stored().progress.records).not.toHaveProperty(`stage${n}BossDefeats`)
  expect(stored().progress.records[`stage${n}Clears`]).toBe(0)
  await useAuthStore.getState().signOutOfGoogle()
  expect(authClient.signOut).toHaveBeenCalledTimes(1)
  _resetFirebaseProgressForTests()
  setProgressClient(db)
  await hydrateCloudProgress(user)
  expect(isStageUnlocked(`stage${n+1}`,readFirebasePlayerProgress().records)).toBe(true)
  expect(stored().runLedger?.[useGameStore.getState().progressRunId]?.records?.[`stage${n}BossDefeats`]).toBe(1)
})

it('same-account stale hydrate cannot erase a boss-only unlock; account switch does not leak it', async () => {
  db.control.holdReads = true
  const hydration=hydrateCloudProgress(user)
  await vi.waitFor(() => expect(db.control.heldReads).toHaveLength(1))
  useGameStore.getState().resetGame('stage1')
  useGameStore.getState().spawnBoss()
  useGameStore.getState().recordBossDefeat()
  db.releaseRead()
  await hydration
  db.control.holdReads = false
  expect(isStageUnlocked('stage2',readFirebasePlayerProgress().records)).toBe(true)
  expect(await useGameStore.getState().flushProgressBeforeTransition()).toBe(true)
  const own=structuredClone(stored())
  const other={uid:'other-boss-only-account'}
  applyCloudProgressSnapshot({progress:{records:{}}},other)
  useAuthStore.setState({user:other,status:'signedIn'})
  expect(isStageUnlocked('stage2',readFirebasePlayerProgress().records)).toBe(false)
  expect(useGameStore.getState().resetGame('stage2')).toBe(false)
  applyCloudProgressSnapshot(own,user)
  useAuthStore.setState({user,status:'signedIn'})
  expect(isStageUnlocked('stage2',readFirebasePlayerProgress().records)).toBe(true)
})
