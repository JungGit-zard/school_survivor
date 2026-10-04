// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFirebaseAuthClient, shouldUseNativeGoogleSignIn } from './firebaseAuth.js'

const ITERATIONS = 100_000

const firebaseAppMock = vi.hoisted(() => {
  const app = { name: '[DEFAULT]' }
  return {
    app,
    getApps: vi.fn(() => []),
    getApp: vi.fn(() => app),
    initializeApp: vi.fn(() => app),
  }
})

const firebaseAuthMock = vi.hoisted(() => {
  const firebaseUser = Object.freeze({
    uid: 'twa-stress-user',
    displayName: 'TWA Stress',
    email: 'twa-stress@example.com',
    photoURL: '',
    emailVerified: true,
    providerData: [{ providerId: 'google.com' }],
  })
  return {
    auth: { currentUser: null },
    inMemoryPersistence: { type: 'NONE' },
    setCustomParameters: vi.fn(),
    setPersistence: vi.fn(async () => {}),
    getRedirectResult: vi.fn(async () => ({ user: firebaseUser })),
    onAuthStateChanged: vi.fn((_auth, onChange) => {
      // Force the redirect result to be the sole restored-account source.
      onChange(null)
      return vi.fn()
    }),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(async () => {}),
    signInWithCredential: vi.fn(),
    signOut: vi.fn(),
    reauthenticateWithPopup: vi.fn(),
    deleteUser: vi.fn(),
  }
})

const nativeAuthMock = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/app', () => ({
  initializeApp: (...args) => firebaseAppMock.initializeApp(...args),
  getApp: (...args) => firebaseAppMock.getApp(...args),
  getApps: (...args) => firebaseAppMock.getApps(...args),
}))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters = (...args) => firebaseAuthMock.setCustomParameters(...args)
    static credential = vi.fn()
  },
  getAuth: vi.fn(() => firebaseAuthMock.auth),
  inMemoryPersistence: firebaseAuthMock.inMemoryPersistence,
  setPersistence: (...args) => firebaseAuthMock.setPersistence(...args),
  getRedirectResult: (...args) => firebaseAuthMock.getRedirectResult(...args),
  onAuthStateChanged: (...args) => firebaseAuthMock.onAuthStateChanged(...args),
  signInWithPopup: (...args) => firebaseAuthMock.signInWithPopup(...args),
  signInWithRedirect: (...args) => firebaseAuthMock.signInWithRedirect(...args),
  signInWithCredential: (...args) => firebaseAuthMock.signInWithCredential(...args),
  signOut: (...args) => firebaseAuthMock.signOut(...args),
  reauthenticateWithPopup: (...args) => firebaseAuthMock.reauthenticateWithPopup(...args),
  deleteUser: (...args) => firebaseAuthMock.deleteUser(...args),
}))

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: nativeAuthMock,
}))

const COMPLETE_ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'escape-zombie-school.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'escape-zombie-school',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
  VITE_FIREBASE_DATABASE_URL: 'https://escape-zombie-school-default-rtdb.asia-southeast1.firebasedatabase.app',
}

const TWA_SCOPE = {
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
  location: {
    pathname: '/game',
    protocol: 'https:',
    hostname: 'escapezombie.com',
    href: 'https://escapezombie.com/game',
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
  },
  sessionStorage: window.sessionStorage,
}

function snapshotStorage(storage) {
  return Object.fromEntries(
    Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter(Boolean)
      .map((key) => [key, storage.getItem(key)]),
  )
}

function restoreStorage(storage, snapshot) {
  storage.clear()
  Object.entries(snapshot).forEach(([key, value]) => storage.setItem(key, value))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Android TWA Firebase Google login 100,000회 격리 하네스', () => {
  it('매회 popup 없이 redirect→return/session 흐름을 유지하고 외부 상태를 오염시키지 않는다', async () => {
    const sessionStorageBefore = snapshotStorage(window.sessionStorage)
    const localStorageBefore = snapshotStorage(window.localStorage)
    const localSetItem = vi.spyOn(Storage.prototype, 'setItem')
    const localRemoveItem = vi.spyOn(Storage.prototype, 'removeItem')
    const localClear = vi.spyOn(Storage.prototype, 'clear')
    const fetchMock = vi.fn(() => Promise.reject(new Error('Network access is forbidden in this harness.')))
    const xmlHttpRequestMock = vi.fn(() => {
      throw new Error('XMLHttpRequest is forbidden in this harness.')
    })
    const webSocketMock = vi.fn(() => {
      throw new Error('WebSocket is forbidden in this harness.')
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('XMLHttpRequest', xmlHttpRequestMock)
    vi.stubGlobal('WebSocket', webSocketMock)

    expect(shouldUseNativeGoogleSignIn(TWA_SCOPE)).toBe(false)

    try {
      for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
        const client = await createFirebaseAuthClient(COMPLETE_ENV, TWA_SCOPE)
        let restoredUser = null
        const unsubscribe = client.subscribe((user) => {
          restoredUser = user
        })
        const popupResult = await client.signInWithGoogle()
        unsubscribe()

        if (popupResult !== null) {
          throw new Error(`TWA redirect fallback did not return null at iteration ${iteration + 1}.`)
        }
        if (
          restoredUser?.uid !== 'twa-stress-user'
          || restoredUser?.email !== 'twa-stress@example.com'
          || restoredUser?.providerIds?.[0] !== 'google.com'
        ) {
          throw new Error(`TWA returned-session user mapping failed at iteration ${iteration + 1}.`)
        }
      }

      expect(firebaseAuthMock.setPersistence).toHaveBeenCalledTimes(ITERATIONS)
      expect(firebaseAppMock.initializeApp).toHaveBeenCalledTimes(ITERATIONS)
      expect(firebaseAppMock.initializeApp).toHaveBeenLastCalledWith(expect.objectContaining({
        projectId: 'escape-zombie-school',
        authDomain: 'escapezombie.com',
      }))
      expect(firebaseAuthMock.setPersistence).toHaveBeenLastCalledWith(
        firebaseAuthMock.auth,
        firebaseAuthMock.inMemoryPersistence,
      )
      expect(firebaseAuthMock.getRedirectResult).toHaveBeenCalledTimes(ITERATIONS)
      expect(firebaseAuthMock.onAuthStateChanged).toHaveBeenCalledTimes(ITERATIONS)
      expect(firebaseAuthMock.signInWithPopup).not.toHaveBeenCalled()
      expect(firebaseAuthMock.signInWithRedirect).toHaveBeenCalledTimes(ITERATIONS)
      expect(firebaseAuthMock.signInWithCredential).not.toHaveBeenCalled()
      expect(nativeAuthMock.signInWithGoogle).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(xmlHttpRequestMock).not.toHaveBeenCalled()
      expect(webSocketMock).not.toHaveBeenCalled()

      const localSetCalls = localSetItem.mock.contexts.filter((context) => context === window.localStorage)
      const localRemoveCalls = localRemoveItem.mock.contexts.filter((context) => context === window.localStorage)
      const localClearCalls = localClear.mock.contexts.filter((context) => context === window.localStorage)
      expect(localSetCalls).toHaveLength(0)
      expect(localRemoveCalls).toHaveLength(0)
      expect(localClearCalls).toHaveLength(0)
      expect(snapshotStorage(window.localStorage)).toEqual(localStorageBefore)
    } finally {
      restoreStorage(window.sessionStorage, sessionStorageBefore)
    }

    expect(snapshotStorage(window.sessionStorage)).toEqual(sessionStorageBefore)
  }, 180_000)

  it('계정 A 로그아웃 뒤 select_account redirect로 계정 B 복귀를 정확히 반영한다', async () => {
    const accountA = {
      uid: 'account-a', displayName: 'Account A', email: 'a@example.com', photoURL: '',
      emailVerified: true, providerData: [{ providerId: 'google.com' }],
    }
    const accountB = {
      uid: 'account-b', displayName: 'Account B', email: 'b@example.com', photoURL: '',
      emailVerified: true, providerData: [{ providerId: 'google.com' }],
    }
    firebaseAuthMock.getRedirectResult
      .mockResolvedValueOnce({ user: accountA })
      .mockResolvedValueOnce({ user: accountB })
    firebaseAuthMock.onAuthStateChanged.mockImplementation((_auth, onChange) => {
      onChange(null)
      return vi.fn()
    })

    const clientA = await createFirebaseAuthClient(COMPLETE_ENV, TWA_SCOPE)
    let restoredUser = null
    clientA.subscribe((user) => { restoredUser = user })
    expect(restoredUser).toMatchObject({ uid: 'account-a' })

    await clientA.signOut()
    await expect(clientA.signInWithGoogle()).resolves.toBeNull()

    const clientB = await createFirebaseAuthClient(COMPLETE_ENV, TWA_SCOPE)
    clientB.subscribe((user) => { restoredUser = user })
    expect(restoredUser).toMatchObject({ uid: 'account-b' })
    expect(firebaseAuthMock.signOut).toHaveBeenCalledOnce()
    expect(firebaseAuthMock.signInWithPopup).not.toHaveBeenCalled()
    expect(firebaseAuthMock.signInWithRedirect).toHaveBeenCalledOnce()
    expect(firebaseAuthMock.setCustomParameters).toHaveBeenCalledWith({ prompt: 'select_account' })
  })
})
