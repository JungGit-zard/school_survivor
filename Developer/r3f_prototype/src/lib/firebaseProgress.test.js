// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const firebaseSdk = vi.hoisted(() => ({
  getApps: vi.fn(() => {
    throw new Error('Firebase SDK must not be constructed by Vitest.')
  }),
  getApp: vi.fn(),
  initializeApp: vi.fn(),
}))

vi.mock('firebase/app', () => firebaseSdk)
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(),
  ref: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  runTransaction: vi.fn(),
}))
import {
  _resetFirebaseProgressForTests,
  _selectInitialProgressValueForTransaction,
  _setFirebaseProgressClientForTests,
  applyCloudProgressSnapshot,
  buildCloudProgressSnapshot,
  buildCloudUserProfile,
  getFirebaseProgressRuntimeSnapshot,
  getUserProgressPath,
  hydrateCloudProgress,
  installPlayerStorageFatalGuard,
  isFirebaseProgressConfigured,
  isFirebaseProgressHydrated,
  recordPlayActivity,
  requestCloudProgressSave,
  setCloudProgressUser,
} from './firebaseProgress.js'
import { RECORD_KEYS } from './playerRecords.js'
import { setUnlocked } from './weaponUnlocks.js'
import { purchase as purchasePassive } from './passiveUpgrades.js'
import { saveNicknameForUser } from './userNickname.js'

const COMPLETE_ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://school-survivor-default-rtdb.asia-southeast1.firebasedatabase.app',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}

const USER = { uid: 'uid-1', displayName: 'Tester', email: 'tester@example.com', photoURL: 'https://example.com/me.png' }

function remoteSnapshot(overrides = {}) {
  const progressOverrides = overrides.progress ?? {}
  const { progress: _ignoredProgress, ...topLevelOverrides } = overrides
  return {
    schemaVersion: 1,
    updatedAt: '2026-07-18T00:00:00.000Z',
    profile: { uid: USER.uid, displayName: USER.displayName, nickname: '생존왕' },
    activity: { lastStageId: 'stage1', lastStartedAt: '2026-07-18T00:00:00.000Z' },
    progress: {
      goldTotal: 42,
      records: Object.fromEntries(RECORD_KEYS.map((key) => [key, key === 'totalRuns' ? 3 : 0])),
      weaponUnlocks: { guidedMissile: 1 },
      weaponPermanentUpgrades: { pencilThrow: 2 },
      passiveUpgrades: { magnet: 2 },
      titleSettings: { vibration: false, reducedEffects: true, unlockAllWeaponsCheat: false },
      ...progressOverrides,
    },
    ...topLevelOverrides,
  }
}

describe('firebase-only player progress runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetFirebaseProgressForTests()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires a Realtime Database URL in addition to auth config', () => {
    expect(isFirebaseProgressConfigured(COMPLETE_ENV)).toBe(true)
    expect(isFirebaseProgressConfigured({ ...COMPLETE_ENV, VITE_FIREBASE_DATABASE_URL: '' })).toBe(false)
  })

  it('keeps a reset Vitest runtime on the injected test client even when Firebase is configured', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', COMPLETE_ENV.VITE_FIREBASE_API_KEY)
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', COMPLETE_ENV.VITE_FIREBASE_AUTH_DOMAIN)
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', COMPLETE_ENV.VITE_FIREBASE_DATABASE_URL)
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', COMPLETE_ENV.VITE_FIREBASE_PROJECT_ID)
    vi.stubEnv('VITE_FIREBASE_APP_ID', COMPLETE_ENV.VITE_FIREBASE_APP_ID)
    _resetFirebaseProgressForTests()
    applyCloudProgressSnapshot(remoteSnapshot(), USER)

    await expect(requestCloudProgressSave(USER)).resolves.toBe(true)

    expect(firebaseSdk.getApps).not.toHaveBeenCalled()
  })

  it('builds a private per-user database path', () => {
    expect(getUserProgressPath({ uid: ' user-123 ' })).toBe('users/user-123')
    expect(getUserProgressPath(null)).toBe('')
  })

  it('makes the production transaction create only for null and abort for every existing value', () => {
    const initialValue = { schemaVersion: 1 }

    expect(_selectInitialProgressValueForTransaction(null, initialValue)).toBe(initialValue)
    expect(_selectInitialProgressValueForTransaction(remoteSnapshot(), initialValue)).toBeUndefined()
    expect(_selectInitialProgressValueForTransaction(false, initialValue)).toBeUndefined()
  })

  it('hydrates an existing remote account without overwriting it', async () => {
    const saved = remoteSnapshot()
    const savedBeforeHydrate = structuredClone(saved)
    const save = vi.fn(async () => {})
    const loadOrCreate = vi.fn(async () => saved)
    _setFirebaseProgressClientForTests({ loadOrCreate, save })

    await expect(hydrateCloudProgress(USER)).resolves.toBe(true)

    expect(loadOrCreate).toHaveBeenCalledTimes(1)
    expect(loadOrCreate.mock.calls[0][0]).toBe('users/uid-1')
    expect(saved).toEqual(savedBeforeHydrate)
    expect(save).not.toHaveBeenCalled()
    expect(isFirebaseProgressHydrated(USER)).toBe(true)
    expect(getFirebaseProgressRuntimeSnapshot().progress.goldTotal).toBe(42)
    expect(buildCloudUserProfile(USER)).toEqual({ uid: 'uid-1', displayName: 'Tester', nickname: '생존왕' })
  })

  it('atomically creates and hydrates a schema-valid default account when users/{uid} is missing', async () => {
    let remote = null
    const loadOrCreate = vi.fn(async (_path, initialValue) => {
      if (remote === null) remote = structuredClone(initialValue)
      return structuredClone(remote)
    })
    _setFirebaseProgressClientForTests({ loadOrCreate, save: vi.fn(async () => {}) })

    await expect(hydrateCloudProgress(USER)).resolves.toBe(true)

    expect(loadOrCreate).toHaveBeenCalledTimes(1)
    expect(remote).toEqual({
      schemaVersion: 1,
      updatedAt: expect.any(String),
      profile: { uid: USER.uid, displayName: USER.displayName, nickname: '' },
      progress: {
        goldTotal: 0,
        records: Object.fromEntries(RECORD_KEYS.map((key) => [key, 0])),
        weaponUnlocks: {},
        weaponPermanentUpgrades: {},
        passiveUpgrades: {},
        titleSettings: {
          language: null,
          vibration: true,
          reducedEffects: false,
          hitCameraShake: true,
          unlockAllWeaponsCheat: false,
          unlockAllStagesCheat: false,
        },
      },
    })
    expect(Number.isNaN(Date.parse(remote.updatedAt))).toBe(false)
    expect(remote).not.toHaveProperty('email')
    expect(remote).not.toHaveProperty('token')
    expect(remote).not.toHaveProperty('password')
    expect(isFirebaseProgressHydrated(USER)).toBe(true)
    expect(getFirebaseProgressRuntimeSnapshot().progress).toEqual(remote.progress)
  })

  it('creates a missing account only once across two concurrent hydrates and both use the final remote canonical value', async () => {
    let remote = null
    let creationCount = 0
    const loadOrCreate = vi.fn(async (_path, initialValue) => {
      await Promise.resolve()
      if (remote === null) {
        creationCount += 1
        remote = structuredClone(initialValue)
      }
      return structuredClone(remote)
    })
    _setFirebaseProgressClientForTests({ loadOrCreate, save: vi.fn(async () => {}) })

    await expect(Promise.all([
      hydrateCloudProgress(USER),
      hydrateCloudProgress(USER),
    ])).resolves.toEqual([true, true])

    expect(loadOrCreate).toHaveBeenCalledTimes(2)
    expect(creationCount).toBe(1)
    expect(isFirebaseProgressHydrated(USER)).toBe(true)
    expect(buildCloudProgressSnapshot().profile).toEqual(remote.profile)
    expect(buildCloudProgressSnapshot().progress).toEqual(remote.progress)
  })

  it('fails closed when the create transaction returns no remote snapshot and never uploads defaults', async () => {
    const save = vi.fn(async () => {})
    _setFirebaseProgressClientForTests({ loadOrCreate: vi.fn(async () => null), save })

    await expect(hydrateCloudProgress(USER)).rejects.toThrow(/missing/i)
    await expect(requestCloudProgressSave()).resolves.toBe(false)

    expect(isFirebaseProgressHydrated(USER)).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('fails closed on remote read failure and never keeps stale account data for the next account', async () => {
    applyCloudProgressSnapshot(remoteSnapshot(), USER)
    const failingUser = { uid: 'uid-2', displayName: 'Other' }
    const save = vi.fn(async () => {})
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => { throw new Error('permission denied') }),
      save,
    })

    await expect(hydrateCloudProgress(failingUser)).rejects.toThrow(/permission denied/)
    await expect(requestCloudProgressSave(failingUser)).resolves.toBe(false)

    expect(isFirebaseProgressHydrated(failingUser)).toBe(false)
    expect(getFirebaseProgressRuntimeSnapshot().uid).toBe('')
    expect(save).not.toHaveBeenCalled()
  })

  it('fails closed when the final transaction snapshot is malformed', async () => {
    const save = vi.fn(async () => {})
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => ({ schemaVersion: 1, profile: { uid: USER.uid } })),
      save,
    })

    await expect(hydrateCloudProgress(USER)).rejects.toMatchObject({ code: 'invalid-remote' })
    await expect(requestCloudProgressSave(USER)).resolves.toBe(false)

    expect(isFirebaseProgressHydrated(USER)).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps account runtime data isolated when switching accounts', () => {
    applyCloudProgressSnapshot(remoteSnapshot({ progress: { goldTotal: 7 } }), USER)
    expect(getFirebaseProgressRuntimeSnapshot().progress.goldTotal).toBe(7)

    setCloudProgressUser({ uid: 'uid-2' })

    expect(isFirebaseProgressHydrated({ uid: 'uid-2' })).toBe(false)
    expect(getFirebaseProgressRuntimeSnapshot().progress.goldTotal).toBe(0)
  })

  it('keeps the newest account runtime when an older hydrate resolves last', async () => {
    let resolveA
    let resolveB
    const a = { uid: 'uid-a', displayName: 'A' }
    const b = { uid: 'uid-b', displayName: 'B' }
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn((path) => new Promise((resolve) => {
        if (path.includes(a.uid)) resolveA = resolve
        else resolveB = resolve
      })),
      save: vi.fn(async () => {}),
    })

    const pendingA = hydrateCloudProgress(a)
    const pendingB = hydrateCloudProgress(b)
    await Promise.resolve()
    resolveB(remoteSnapshot({ profile: { uid: b.uid, displayName: 'B' }, progress: { goldTotal: 22 } }))
    await expect(pendingB).resolves.toBe(true)
    resolveA(remoteSnapshot({ profile: { uid: a.uid, displayName: 'A' }, progress: { goldTotal: 11 } }))
    await expect(pendingA).resolves.toBe(false)

    expect(getFirebaseProgressRuntimeSnapshot()).toMatchObject({ uid: b.uid, hydrated: true, progress: { goldTotal: 22 } })
  })

  it('keeps the E2E memory runtime hydrated without registering a Firebase write user', async () => {
    const e2eUser = { uid: 'e2e-local-test', displayName: 'E2E테스트' }
    const save = vi.fn(async () => {})
    _setFirebaseProgressClientForTests({ save, loadOrCreate: vi.fn() })

    expect(applyCloudProgressSnapshot({
      ...remoteSnapshot(),
      profile: { uid: e2eUser.uid, displayName: e2eUser.displayName, nickname: 'E2E 생존자' },
    }, e2eUser, { keepCloudUserNull: true })).toBe(true)

    expect(isFirebaseProgressHydrated(e2eUser)).toBe(true)
    expect(getUserProgressPath()).toBe('')
    await expect(requestCloudProgressSave()).resolves.toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('covers every player account data key in the cloud snapshot without localStorage reads', () => {
    applyCloudProgressSnapshot(remoteSnapshot({ progress: { goldTotal: 500 } }), USER)
    setUnlocked('sharkMissile')
    purchasePassive('maxHp', 500)
    saveNicknameForUser(USER, 'Firebase왕')
    recordPlayActivity('stage2', Date.UTC(2026, 6, 18, 1, 2, 3))

    const snapshot = buildCloudProgressSnapshot()

    expect(snapshot.progress).toEqual(expect.objectContaining({
      goldTotal: 500,
      records: expect.objectContaining({ totalRuns: 3, bestSurvivalSeconds: 0 }),
      weaponUnlocks: expect.objectContaining({ guidedMissile: 1, sharkMissile: 1 }),
      weaponPermanentUpgrades: expect.objectContaining({ pencilThrow: 2 }),
      passiveUpgrades: expect.objectContaining({ magnet: 2, maxHp: 1 }),
      titleSettings: expect.objectContaining({ vibration: false, reducedEffects: true }),
    }))
    expect(snapshot.profile.nickname).toBe('Firebase왕')
    expect(snapshot.activity).toEqual({ lastStageId: 'stage2', lastStartedAt: '2026-07-18T01:02:03.000Z' })
  })

  it('serializes debounced writes and uses the latest runtime values without lost updates', async () => {
    const saved = []
    let releaseFirst
    const firstSave = new Promise((resolve) => { releaseFirst = resolve })
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async (_path, value) => {
        saved.push(value.progress.goldTotal)
        if (saved.length === 1) await firstSave
      }),
    })
    await hydrateCloudProgress(USER)

    const p1 = requestCloudProgressSave()
    applyCloudProgressSnapshot(remoteSnapshot({ progress: { goldTotal: 99 } }), USER)
    const p2 = requestCloudProgressSave()
    releaseFirst()
    await Promise.all([p1, p2])

    expect(saved).toEqual([42, 99])
  })

  // 회귀: 저장 큐가 rejected 상태로 남으면 이후 .then 핸들러가 실행되지 않아 그 세션의
  // 코인·업그레이드 저장이 전부 조용히 사라진다. 순간 오프라인 한 번으로 진행도가 날아갔다.
  it('keeps saving coins and upgrades after one transient save failure', async () => {
    const saved = []
    let failNextSave = true
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async (_path, value) => {
        if (failNextSave) {
          failNextSave = false
          throw new Error('transient network failure')
        }
        saved.push(value.progress.goldTotal)
      }),
    })
    await hydrateCloudProgress(USER)

    await expect(requestCloudProgressSave()).resolves.toBe(false)

    applyCloudProgressSnapshot(remoteSnapshot({ progress: { goldTotal: 120 } }), USER)
    await expect(requestCloudProgressSave()).resolves.toBe(true)
    applyCloudProgressSnapshot(remoteSnapshot({ progress: { goldTotal: 340 } }), USER)
    await expect(requestCloudProgressSave()).resolves.toBe(true)

    expect(saved).toEqual([120, 340])
  })

  it('throws a fatal error for browser durable storage attempts using player-data keys', () => {
    installPlayerStorageFatalGuard()

    expect(() => localStorage.setItem('school_survivor:goldTotal', '1')).toThrow(/Firebase-only player data/)
    expect(() => sessionStorage.setItem('school_survivor:playerRecords', '{}')).toThrow(/Firebase-only player data/)
    expect(() => localStorage.getItem('school_survivor:passiveUpgrades')).toThrow(/Firebase-only player data/)
    expect(() => localStorage.setItem('school_survivor:adminConfig', '{}')).not.toThrow()
  })
})
