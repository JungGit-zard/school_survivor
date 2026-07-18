// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetFirebaseProgressForTests,
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
    localStorage.clear()
    vi.clearAllMocks()
    _resetFirebaseProgressForTests()
  })

  it('requires a Realtime Database URL in addition to auth config', () => {
    expect(isFirebaseProgressConfigured(COMPLETE_ENV)).toBe(true)
    expect(isFirebaseProgressConfigured({ ...COMPLETE_ENV, VITE_FIREBASE_DATABASE_URL: '' })).toBe(false)
  })

  it('builds a private per-user database path', () => {
    expect(getUserProgressPath({ uid: ' user-123 ' })).toBe('users/user-123')
    expect(getUserProgressPath(null)).toBe('')
  })

  it('hydrates only from an existing remote users/{uid} snapshot', async () => {
    const saved = remoteSnapshot()
    _setFirebaseProgressClientForTests({ load: vi.fn(async () => saved), save: vi.fn(async () => {}) })

    await expect(hydrateCloudProgress(USER)).resolves.toBe(true)

    expect(isFirebaseProgressHydrated(USER)).toBe(true)
    expect(getFirebaseProgressRuntimeSnapshot().progress.goldTotal).toBe(42)
    expect(buildCloudUserProfile(USER)).toEqual({ uid: 'uid-1', displayName: 'Tester', nickname: '생존왕' })
  })

  it('fails closed when the remote user snapshot is missing and never uploads defaults', async () => {
    const save = vi.fn(async () => {})
    _setFirebaseProgressClientForTests({ load: vi.fn(async () => null), save })

    await expect(hydrateCloudProgress(USER)).rejects.toThrow(/missing/i)
    await expect(requestCloudProgressSave()).resolves.toBe(false)

    expect(isFirebaseProgressHydrated(USER)).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('fails closed on remote read failure and never keeps stale account data for the next account', async () => {
    applyCloudProgressSnapshot(remoteSnapshot(), USER)
    const failingUser = { uid: 'uid-2', displayName: 'Other' }
    _setFirebaseProgressClientForTests({ load: vi.fn(async () => { throw new Error('permission denied') }), save: vi.fn(async () => {}) })

    await expect(hydrateCloudProgress(failingUser)).rejects.toThrow(/permission denied/)

    expect(isFirebaseProgressHydrated(failingUser)).toBe(false)
    expect(getFirebaseProgressRuntimeSnapshot().uid).toBe('')
  })

  it('keeps account runtime data isolated when switching accounts', () => {
    applyCloudProgressSnapshot(remoteSnapshot({ progress: { goldTotal: 7 } }), USER)
    expect(getFirebaseProgressRuntimeSnapshot().progress.goldTotal).toBe(7)

    setCloudProgressUser({ uid: 'uid-2' })

    expect(isFirebaseProgressHydrated({ uid: 'uid-2' })).toBe(false)
    expect(getFirebaseProgressRuntimeSnapshot().progress.goldTotal).toBe(0)
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
    expect(localStorage.length).toBe(0)
  })

  it('serializes debounced writes and uses the latest runtime values without lost updates', async () => {
    const saved = []
    let releaseFirst
    const firstSave = new Promise((resolve) => { releaseFirst = resolve })
    _setFirebaseProgressClientForTests({
      load: vi.fn(async () => remoteSnapshot()),
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

  it('throws a fatal error for browser durable storage attempts using player-data keys', () => {
    installPlayerStorageFatalGuard()

    expect(() => localStorage.setItem('school_survivor:goldTotal', '1')).toThrow(/Firebase-only player data/)
    expect(() => sessionStorage.setItem('school_survivor:playerRecords', '{}')).toThrow(/Firebase-only player data/)
    expect(() => localStorage.getItem('school_survivor:passiveUpgrades')).toThrow(/Firebase-only player data/)
    expect(() => localStorage.setItem('school_survivor:adminConfig', '{}')).not.toThrow()
  })
})
