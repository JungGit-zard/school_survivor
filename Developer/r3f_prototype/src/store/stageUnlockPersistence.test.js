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
import { isStageUnlocked } from '../lib/stageConfig.js'
import { useGameStore } from './useGameStore.js'
import { useAuthStore, _resetAuthStoreForTests } from './useAuthStore.js'

const user = { uid: 'clear-persistence-user', displayName: 'Player' }
let stored

// Exercise the new transactional/readback contract with the existing delayed
// transport. The mutator runs against the shared remote node, not local state.
function _setFirebaseProgressClientForTests(client) {
  setProgressClient({ ...client, transaction: client.save ? async (path, mutate) => {
    const next = mutate(structuredClone(stored))
    if (next === undefined) return { committed: false, snapshot: { val: () => stored } }
    await client.save(path,next)
    stored = structuredClone(next)
    return { committed: true, snapshot: { val: () => structuredClone(stored) } }
  } : client.transaction })
}

beforeEach(() => {
  vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.invalid')
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
  stored = buildCloudProgressSnapshot()
  useAuthStore.setState({ user, status: 'signedIn' })
})

afterEach(() => vi.unstubAllEnvs())

it('waits for the stage clear and all user data to persist before logout, then restores the unlock', async () => {
  let releaseSave
  _setFirebaseProgressClientForTests({
    load: async () => structuredClone(stored),
    save: vi.fn((_path, payload) => new Promise((resolve) => {
      releaseSave = () => { stored = structuredClone(payload); resolve() }
    })),
  })
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState({ currentStageId: 'stage1', phase: 'playing', elapsedMs: 240_000,
    runKills: 0, runLevelUps: 0, goldSession: 0, missionSpecialEnemySpawns: [] })
  useGameStore.getState().clearStage()
  const expected = buildCloudProgressSnapshot().progress
  // Reconciliation must retain a pre-existing mission counter omitted by the
  // game store's current batch rather than erase it on the next full save.
  expected.missions.counters.kills = 23
  expect(isStageUnlocked('stage2', expected.records)).toBe(true)
  const logout = useAuthStore.getState().signOutOfGoogle()
  await vi.waitFor(() => expect(releaseSave).toBeTypeOf('function'))
  expect(authClient.signOut).not.toHaveBeenCalled()
  // Run-end and mission saves share the serial queue.
  for (let i = 0; i < 10 && !authClient.signOut.mock.calls.length; i++) {
    releaseSave()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  await logout
  expect(authClient.signOut).toHaveBeenCalledTimes(1)
  await hydrateCloudProgress(user)
  expect(readFirebasePlayerProgress()).toEqual(expected)
  expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(true)
})

it('keeps the signed-in session and clear on save failure so logout can retry', async () => {
  _setFirebaseProgressClientForTests({ save: async () => { throw new Error('offline') } })
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1 })
  await useAuthStore.getState().signOutOfGoogle()
  expect(authClient.signOut).not.toHaveBeenCalled()
  expect(useAuthStore.getState()).toMatchObject({ user, status: 'signedIn' })
  expect(useGameStore.getState().progressSaveWarning).toBe('save-failed')
  expect(readFirebasePlayerProgress().records.stage1Clears).toBe(1)
})

it('saves changes made while logout is waiting before releasing the authenticated session', async () => {
  const releases = []
  _setFirebaseProgressClientForTests({
    load: async () => structuredClone(stored),
    save: (_path, payload) => new Promise((resolve) => {
      releases.push(() => { stored = structuredClone(payload); resolve() })
    }),
  })
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1 })
  const logout = useAuthStore.getState().signOutOfGoogle()
  await vi.waitFor(() => expect(releases).toHaveLength(1))
  updateFirebasePlayerProgress((progress) => {
    progress.goldTotal += 7
    progress.weaponPermanentUpgrades.pencilThrow += 1
    progress.titleSettings.vibration = true
  })
  const expected = buildCloudProgressSnapshot().progress
  releases[0]()
  await vi.waitFor(() => expect(releases).toHaveLength(2))
  expect(authClient.signOut).not.toHaveBeenCalled()
  releases[1]()
  await logout
  expect(authClient.signOut).toHaveBeenCalledTimes(1)
  await hydrateCloudProgress(user)
  expect(readFirebasePlayerProgress()).toEqual(expected)
})

it('does not replace a new clear with an older in-flight same-account hydrate', async () => {
  let resolveLoad
  _setFirebaseProgressClientForTests({ load: () => new Promise((resolve) => { resolveLoad = resolve }) })
  const hydration = hydrateCloudProgress(user)
  await vi.waitFor(() => expect(resolveLoad).toBeTypeOf('function'))
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1; progress.goldTotal += 5 })
  const expected = readFirebasePlayerProgress()
  resolveLoad(stored)
  await hydration
  expect(readFirebasePlayerProgress()).toEqual(expected)
  expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(true)
})

it('keeps a player who has not cleared Stage 1 locked', () => {
  expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(false)
})

it('keeps newly earned progress when an older same-account hydrate rejects', async () => {
  let rejectLoad
  _setFirebaseProgressClientForTests({ load: () => new Promise((_, reject) => { rejectLoad = reject }) })
  const hydration = hydrateCloudProgress(user)
  await vi.waitFor(() => expect(rejectLoad).toBeTypeOf('function'))
  updateFirebasePlayerProgress((progress) => { progress.records.stage1Clears = 1; progress.goldTotal += 5 })
  const expected = readFirebasePlayerProgress()
  rejectLoad(new Error('late network failure'))
  await hydration
  expect(readFirebasePlayerProgress()).toEqual(expected)
})

it('does not sign out a different user who replaces the user waiting for a save', async () => {
  let releaseSave
  _setFirebaseProgressClientForTests({ save: () => new Promise((resolve) => { releaseSave = resolve }) })
  const logout = useAuthStore.getState().signOutOfGoogle()
  await vi.waitFor(() => expect(releaseSave).toBeTypeOf('function'))
  const otherUser = { uid: 'another-user', displayName: 'Other Player' }
  applyCloudProgressSnapshot({ progress: { goldTotal: 17, records: {} } }, otherUser)
  const expected = readFirebasePlayerProgress()
  useAuthStore.setState({ user: otherUser, status: 'signedIn' })
  releaseSave()
  expect(await logout).toBe(false)
  expect(authClient.signOut).not.toHaveBeenCalled()
  expect(useAuthStore.getState().user).toEqual(otherUser)
  expect(readFirebasePlayerProgress()).toEqual(expected)
})
