import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  apps: [], auth: { currentUser: null },
  initializeApp: vi.fn(), initializeAuth: vi.fn(), signInAnonymously: vi.fn(), getDatabase: vi.fn(),
  memory: { type: 'NONE' }, indexedDB: { type: 'LOCAL', name: 'idb' }, local: { type: 'LOCAL', name: 'ls' },
  get: vi.fn(), set: vi.fn(), rename: vi.fn(),
}))
vi.mock('firebase/app', () => ({ getApps: () => sdk.apps, initializeApp: sdk.initializeApp }))
vi.mock('firebase/auth', () => ({
  initializeAuth: sdk.initializeAuth, inMemoryPersistence: sdk.memory, signInAnonymously: sdk.signInAnonymously,
  indexedDBLocalPersistence: sdk.indexedDB, browserLocalPersistence: sdk.local,
}))
vi.mock('firebase/database', () => ({ getDatabase: sdk.getDatabase, ref: (db, path) => ({ db, path }), get: sdk.get, set: sdk.set }))
vi.mock('./firebaseRanking.js', () => ({ renameRankingEntriesForUser: sdk.rename }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  for (const key of ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID', 'DATABASE_URL']) {
    vi.stubEnv(`VITE_FIREBASE_${key}`, `test-${key}`)
  }
  sdk.apps = []
  sdk.auth = { currentUser: null }
  sdk.initializeApp.mockImplementation((config, name = '[DEFAULT]') => {
    const app = { name, options: config }
    sdk.apps.push(app)
    return app
  })
  sdk.initializeAuth.mockImplementation(() => sdk.auth)
  sdk.signInAnonymously.mockImplementation(async () => {
    sdk.auth.currentUser = { uid: 'firebase-opaque-abc123', isAnonymous: true }
    return { user: sdk.auth.currentUser }
  })
  sdk.getDatabase.mockImplementation((app) => ({ app }))
  sdk.get.mockResolvedValue({ exists: () => false, val: () => null })
  sdk.set.mockResolvedValue(undefined)
  sdk.rename.mockResolvedValue(undefined)
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('guest ranking identity', () => {
  it('reads only the requested UID confirmed nickname after a saved rename', async () => {
    const { getRankingUser, saveGuestRankingNickname, getGuestRankingNicknameForUid } = await import('./guestRankingIdentity.js')
    expect(getGuestRankingNicknameForUid('firebase-opaque-abc123')).toBe('')
    const user = await getRankingUser(null)
    expect((await saveGuestRankingNickname('확인된 이름')).ok).toBe(true)
    expect(getGuestRankingNicknameForUid(user.uid)).toBe('확인된 이름')
    expect(getGuestRankingNicknameForUid('another-guest')).toBe('')
    expect(getGuestRankingNicknameForUid(undefined)).toBe('')
  })

  it('returns Google identity unchanged without initializing any Firebase client', async () => {
    const { getRankingUser } = await import('./guestRankingIdentity.js')
    const google = { uid: 'google-uid', displayName: '내 이름' }
    expect(await getRankingUser(google)).toBe(google)
    expect(sdk.initializeApp).not.toHaveBeenCalled()
    expect(sdk.initializeAuth).not.toHaveBeenCalled()
  })

  it('shares concurrent sign-in and authenticates the database on the isolated persistent guest app', async () => {
    const defaultApp = { name: '[DEFAULT]' }
    const studio = { name: 'graphics-studio' }
    sdk.apps = [defaultApp, studio]
    const { getRankingUser, getGuestRankingClient } = await import('./guestRankingIdentity.js')
    const [first, second, client] = await Promise.all([
      getRankingUser(null), getRankingUser(null), getGuestRankingClient(),
    ])
    expect(first).toEqual({ uid: 'firebase-opaque-abc123', isAnonymous: true, displayName: '생존자-abc123' })
    expect(second).toEqual(first)
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(1)
    expect(sdk.get).toHaveBeenCalledTimes(1)
    expect(sdk.set).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ path: 'rankingService/v1/guestProfiles/firebase-opaque-abc123/nickname' }), '생존자-abc123')
    expect(sdk.initializeApp).toHaveBeenCalledTimes(1)
    expect(sdk.initializeAuth).toHaveBeenCalledExactlyOnceWith(client.db.app, { persistence: [sdk.indexedDB, sdk.local, sdk.memory] })
    expect(client.db.app.name).toBe('guest-ranking')
    expect(sdk.apps.slice(0, 2)).toEqual([defaultApp, studio])
    expect(await getRankingUser(null)).toEqual(first)
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(1)
  })

  it('reserves a default app when guest starts first but never initializes its authentication', async () => {
    const { getRankingUser } = await import('./guestRankingIdentity.js')
    await getRankingUser(null)
    expect(sdk.apps.map((app) => app.name)).toEqual(['[DEFAULT]', 'guest-ranking'])
    expect(sdk.initializeAuth).toHaveBeenCalledExactlyOnceWith(sdk.apps[1], { persistence: [sdk.indexedDB, sdk.local, sdk.memory] })
  })

  it('surfaces disabled provider failure and allows a subsequent attempt', async () => {
    const error = Object.assign(new Error('Anonymous provider disabled'), { code: 'auth/operation-not-allowed' })
    sdk.signInAnonymously.mockRejectedValueOnce(error)
    const { getRankingUser } = await import('./guestRankingIdentity.js')
    await expect(getRankingUser(null)).rejects.toBe(error)
    expect(sdk.auth.currentUser).toBeNull()
    expect((await getRankingUser(null)).uid).toBe('firebase-opaque-abc123')
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(2)
  })

  it('rejects missing configuration without inventing a UID', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    const { getRankingUser } = await import('./guestRankingIdentity.js')
    await expect(getRankingUser(null)).rejects.toThrow('not configured')
    expect(sdk.signInAnonymously).not.toHaveBeenCalled()
  })

  it('uses Auth currentUser as canonical and signs in again after it is lost', async () => {
    const { getRankingUser } = await import('./guestRankingIdentity.js')
    await getRankingUser(null)
    sdk.auth.currentUser = null
    await getRankingUser(null)
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(2)
  })

  it('loads a saved Firebase nickname without rewriting it', async () => {
    sdk.get.mockResolvedValue({ exists: () => true, val: () => '내 생존자' })
    const { getRankingUser, getGuestRankingNickname } = await import('./guestRankingIdentity.js')
    expect(getGuestRankingNickname()).toBe('')
    expect((await getRankingUser(null)).displayName).toBe('내 생존자')
    expect(getGuestRankingNickname()).toBe('내 생존자')
    expect(sdk.set).not.toHaveBeenCalled()
  })

  it('saves a valid nickname before updating existing ranking entry names', async () => {
    const { getRankingUser, saveGuestRankingNickname, getGuestRankingNickname } = await import('./guestRankingIdentity.js')
    await getRankingUser(null)
    sdk.rename.mockImplementation(async () => { expect(getGuestRankingNickname()).toBe('새 이름') })
    expect(await saveGuestRankingNickname('  새 이름  ')).toEqual({ ok: true, nickname: '새 이름', error: '' })
    expect(sdk.set).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'rankingService/v1/guestProfiles/firebase-opaque-abc123/nickname' }), '새 이름')
    expect(sdk.rename).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ uid: 'firebase-opaque-abc123', isAnonymous: true }), '새 이름')
    expect((await getRankingUser(null)).displayName).toBe('새 이름')
  })

  it('rejects invalid names before authentication or writes', async () => {
    const { saveGuestRankingNickname } = await import('./guestRankingIdentity.js')
    expect((await saveGuestRankingNickname('a')).ok).toBe(false)
    expect((await saveGuestRankingNickname('1234567890123')).ok).toBe(false)
    expect(sdk.initializeApp).not.toHaveBeenCalled()
    expect(sdk.set).not.toHaveBeenCalled()
  })

  it('preserves the confirmed name when profile saving fails and never renames rankings', async () => {
    const { getRankingUser, saveGuestRankingNickname, getGuestRankingNickname } = await import('./guestRankingIdentity.js')
    await getRankingUser(null)
    sdk.set.mockRejectedValueOnce(new Error('permission denied'))
    expect(await saveGuestRankingNickname('새 이름')).toEqual({ ok: false, nickname: '생존자-abc123', error: 'permission denied' })
    expect(getGuestRankingNickname()).toBe('생존자-abc123')
    expect(sdk.rename).not.toHaveBeenCalled()
  })

  it('does not cache a failed initial profile write and retries it without a second signup', async () => {
    const { getRankingUser, getGuestRankingNickname } = await import('./guestRankingIdentity.js')
    sdk.set.mockRejectedValueOnce(new Error('offline'))
    await expect(getRankingUser(null)).rejects.toThrow('offline')
    expect(getGuestRankingNickname()).toBe('')
    await getRankingUser(null)
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(1)
    expect(sdk.get).toHaveBeenCalledTimes(2)
  })

  it('reports rename failure while keeping the Firebase-confirmed new name', async () => {
    const { getRankingUser, saveGuestRankingNickname, getGuestRankingNickname } = await import('./guestRankingIdentity.js')
    await getRankingUser(null)
    sdk.rename.mockRejectedValueOnce(new Error('ranking offline'))
    expect(await saveGuestRankingNickname('새 이름')).toEqual({ ok: false, nickname: '새 이름', error: 'ranking offline' })
    expect(getGuestRankingNickname()).toBe('새 이름')
  })

  it('does not report a partial ranking rename as complete', async () => {
    const { saveGuestRankingNickname } = await import('./guestRankingIdentity.js')
    sdk.rename.mockResolvedValueOnce({ updated: ['stage'], failed: ['global'] })
    const result = await saveGuestRankingNickname('새 이름')
    expect(result.ok).toBe(false)
    expect(result.nickname).toBe('새 이름')
    expect(result.error).toContain('랭킹 이름')
  })

  it('restores the persisted guest of this device instead of creating a new anonymous account', async () => {
    const restored = { uid: 'persisted-guest-xyz789', isAnonymous: true }
    sdk.auth = { currentUser: null, authStateReady: vi.fn(async () => { sdk.auth.currentUser = restored }) }
    sdk.get.mockResolvedValue({ exists: () => true, val: () => '생존자-xyz789' })
    const { getRankingUser } = await import('./guestRankingIdentity.js')
    expect(await getRankingUser(null)).toEqual({ uid: 'persisted-guest-xyz789', isAnonymous: true, displayName: '생존자-xyz789' })
    expect(sdk.auth.authStateReady).toHaveBeenCalledTimes(1)
    expect(sdk.signInAnonymously).not.toHaveBeenCalled()
    expect(sdk.set).not.toHaveBeenCalled()
  })

  it('requests device storage first and falls back to memory when storage persistence is missing', async () => {
    const { getGuestPersistence } = await import('./guestRankingIdentity.js')
    expect(getGuestPersistence({ indexedDBLocalPersistence: sdk.indexedDB, browserLocalPersistence: sdk.local, inMemoryPersistence: sdk.memory }))
      .toEqual([sdk.indexedDB, sdk.local, sdk.memory])
    expect(getGuestPersistence({ inMemoryPersistence: sdk.memory })).toEqual([sdk.memory])
    expect(getGuestPersistence({})).toEqual([])
  })
})
