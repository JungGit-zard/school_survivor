import { describe, expect, it, vi } from 'vitest'
import {
  getFirebaseConfig,
  getLocalFirebaseAuthRedirect,
  GRAPHICS_STUDIO_FIREBASE_APP_NAME,
  resolveFirebaseAppForRoute,
  setFirebaseAuthLocalPersistence,
  setFirebaseAuthMemoryPersistence,
  isFirebaseAuthConfigured,
  shouldUseNativeGoogleSignIn,
  toAuthUser,
  createFirebaseAuthClient,
  isGraphicsStudioLocation,
} from './firebaseAuth.js'

const firebaseAuthMock = vi.hoisted(() => ({
  app: { initializeApp: vi.fn(), getApp: vi.fn(), getApps: vi.fn(() => []) },
  auth: {
    getAuth: vi.fn(() => ({ currentUser: null })),
    setPersistence: vi.fn(async () => {}),
    inMemoryPersistence: { type: 'MEMORY' },
    browserLocalPersistence: { type: 'LOCAL' },
    browserSessionPersistence: { type: 'SESSION' },
    getRedirectResult: vi.fn(async () => null),
    onAuthStateChanged: vi.fn(() => vi.fn()),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    signOut: vi.fn(),
    reauthenticateWithPopup: vi.fn(),
    deleteUser: vi.fn(),
    GoogleAuthProvider: class {
      setCustomParameters = vi.fn()
      constructor() {}
      static credential = vi.fn(() => ({}))
    },
  },
}))

vi.mock('firebase/app', () => ({
  initializeApp: (...args) => firebaseAuthMock.app.initializeApp(...args),
  getApp: (...args) => firebaseAuthMock.app.getApp(...args),
  getApps: (...args) => firebaseAuthMock.app.getApps(...args),
}))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: firebaseAuthMock.auth.GoogleAuthProvider,
  getAuth: (...args) => firebaseAuthMock.auth.getAuth(...args),
  inMemoryPersistence: firebaseAuthMock.auth.inMemoryPersistence,
  browserLocalPersistence: firebaseAuthMock.auth.browserLocalPersistence,
  browserSessionPersistence: firebaseAuthMock.auth.browserSessionPersistence,
  setPersistence: (...args) => firebaseAuthMock.auth.setPersistence(...args),
  getRedirectResult: (...args) => firebaseAuthMock.auth.getRedirectResult(...args),
  onAuthStateChanged: (...args) => firebaseAuthMock.auth.onAuthStateChanged(...args),
  signInWithPopup: (...args) => firebaseAuthMock.auth.signInWithPopup(...args),
  signInWithRedirect: (...args) => firebaseAuthMock.auth.signInWithRedirect(...args),
  signOut: (...args) => firebaseAuthMock.auth.signOut(...args),
  reauthenticateWithPopup: (...args) => firebaseAuthMock.auth.reauthenticateWithPopup(...args),
  deleteUser: (...args) => firebaseAuthMock.auth.deleteUser(...args),
}))

const COMPLETE_ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
  VITE_FIREBASE_DATABASE_URL: 'https://school-survivor-default-rtdb.asia-southeast1.firebasedatabase.app',
  VITE_FIREBASE_STORAGE_BUCKET: 'school-survivor.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-TEST',
}

describe('firebase auth configuration', () => {
  it('detects missing Firebase auth configuration', () => {
    expect(isFirebaseAuthConfigured({})).toBe(false)
    expect(isFirebaseAuthConfigured({ ...COMPLETE_ENV, VITE_FIREBASE_APP_ID: '' })).toBe(false)
  })

  it('builds Firebase config from Vite environment variables', () => {
    expect(isFirebaseAuthConfigured(COMPLETE_ENV)).toBe(true)
    expect(getFirebaseConfig(COMPLETE_ENV)).toEqual({
      apiKey: 'api-key',
      authDomain: 'school-survivor.firebaseapp.com',
      databaseURL: 'https://school-survivor-default-rtdb.asia-southeast1.firebasedatabase.app',
      projectId: 'school-survivor',
      appId: '1:123:web:abc',
      storageBucket: 'school-survivor.appspot.com',
      messagingSenderId: '123',
      measurementId: 'G-TEST',
    })
  })

  it('normalizes Firebase user data for UI state', () => {
    expect(toAuthUser(null)).toBeNull()
    expect(toAuthUser({
      uid: 'uid-1',
      displayName: 'Tester',
      email: 'tester@example.com',
      photoURL: 'https://example.com/me.png',
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }],
    })).toEqual({
      uid: 'uid-1',
      displayName: 'Tester',
      email: 'tester@example.com',
      photoURL: 'https://example.com/me.png',
      emailVerified: true,
      providerIds: ['google.com'],
      isProjectMaster: false,
    })
  })

  it('derives project master state from Firebase verification and Google provider data only', () => {
    expect(toAuthUser({
      uid: 'master',
      displayName: 'Master',
      email: 'zard5388@gmail.com',
      photoURL: '',
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }],
    }).isProjectMaster).toBe(true)

    expect(toAuthUser({
      uid: 'unverified-master',
      email: 'zard5388@gmail.com',
      emailVerified: false,
      providerData: [{ providerId: 'google.com' }],
    }).isProjectMaster).toBe(false)
  })

  it('uses native Google sign-in inside Capacitor shells only', () => {
    expect(shouldUseNativeGoogleSignIn({
      location: { protocol: 'capacitor:' },
      navigator: { userAgent: 'Mozilla/5.0' },
    })).toBe(true)
    expect(shouldUseNativeGoogleSignIn({
      Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
      location: { protocol: 'http:' },
      navigator: { userAgent: 'Mozilla/5.0' },
    })).toBe(true)
    expect(shouldUseNativeGoogleSignIn({
      location: { protocol: 'https:' },
      navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15; Mobile)' },
    })).toBe(false)
  })

  it('redirects loopback dev URLs to the Firebase-authorized localhost origin', () => {
    expect(getLocalFirebaseAuthRedirect({ href: 'http://127.0.0.1:5175/?tab=audio#pencil' }, true))
      .toBe('http://localhost:5175/?tab=audio#pencil')
    expect(getLocalFirebaseAuthRedirect({ href: 'http://0.0.0.0:5175/' }, true)).toBe('http://localhost:5175/')
    expect(getLocalFirebaseAuthRedirect({ href: 'http://localhost:5175/' }, true)).toBeNull()
    expect(getLocalFirebaseAuthRedirect({ href: 'http://127.0.0.1:5175/' }, false)).toBeNull()
    expect(getLocalFirebaseAuthRedirect({ href: 'http://127.0.0.1:5175/graphics-studio' }, true)).toBeNull()
  })

  it('switches Firebase Auth to memory-only persistence without browser storage', async () => {
    const auth = { name: 'test-auth' }
    const inMemoryPersistence = { type: 'NONE' }
    const calls = []

    await setFirebaseAuthMemoryPersistence({
      browserLocalPersistence: { type: 'LOCAL' },
      browserSessionPersistence: { type: 'SESSION' },
      inMemoryPersistence,
      setPersistence: async (...args) => {
        calls.push(args)
      },
    }, auth)

    expect(calls).toEqual([[auth, inMemoryPersistence]])
  })

  it('fails closed instead of selecting browser persistence when memory-only persistence is unavailable', async () => {
    await expect(setFirebaseAuthMemoryPersistence({
      browserLocalPersistence: { type: 'LOCAL' },
      browserSessionPersistence: { type: 'SESSION' },
    }, { name: 'test-auth' })).rejects.toThrow('memory-only persistence is unavailable')
  })

  it('uses browser-local persistence for the game auth client only', async () => {
    const auth = { name: 'game-auth' }
    const browserLocalPersistence = { type: 'LOCAL' }
    const calls = []

    await setFirebaseAuthLocalPersistence({
      browserLocalPersistence,
      setPersistence: async (...args) => {
        calls.push(args)
      },
    }, auth)

    expect(calls).toEqual([[auth, browserLocalPersistence]])
  })

  it('uses an isolated named Firebase app for Studio and the default app for the game', () => {
    const defaultApp = { name: '[DEFAULT]' }
    const studioApp = { name: GRAPHICS_STUDIO_FIREBASE_APP_NAME }
    const firebaseAppModule = {
      getApps: vi.fn(() => [defaultApp]),
      getApp: vi.fn(() => defaultApp),
      initializeApp: vi.fn(() => studioApp),
    }
    const studioScope = { location: { pathname: '/graphics-studio' } }
    const gameScope = { location: { pathname: '/' } }

    expect(resolveFirebaseAppForRoute(firebaseAppModule, COMPLETE_ENV, studioScope)).toBe(studioApp)
    expect(firebaseAppModule.initializeApp).toHaveBeenCalledWith(
      getFirebaseConfig(COMPLETE_ENV),
      GRAPHICS_STUDIO_FIREBASE_APP_NAME,
    )
    firebaseAppModule.initializeApp.mockClear()
    expect(resolveFirebaseAppForRoute(firebaseAppModule, COMPLETE_ENV, gameScope)).toBe(defaultApp)
    expect(firebaseAppModule.getApp).toHaveBeenCalledWith()
    expect(firebaseAppModule.initializeApp).not.toHaveBeenCalled()
  })

  it('recognizes graphics-studio paths with the route helper', () => {
    expect(isGraphicsStudioLocation({ pathname: '/graphics-studio' })).toBe(true)
    expect(isGraphicsStudioLocation({ pathname: '/graphics-studio/workspace' })).toBe(true)
    expect(isGraphicsStudioLocation({ pathname: '/admin' })).toBe(false)
  })

  it('skips pending redirect-result handling when creating auth client on /graphics-studio', async () => {
    firebaseAuthMock.app.getApps.mockReturnValue([])
    firebaseAuthMock.auth.getRedirectResult.mockReset()

    const client = await createFirebaseAuthClient(COMPLETE_ENV, {
      location: { pathname: '/graphics-studio', protocol: 'http:', href: 'http://localhost:5173/graphics-studio' },
      sessionStorage: {},
      navigator: { userAgent: 'test-agent' },
    })

    client.configured
    expect(client.configured).toBe(true)
    expect(firebaseAuthMock.auth.getRedirectResult).not.toHaveBeenCalled()
    expect(firebaseAuthMock.auth.setPersistence).toHaveBeenLastCalledWith(
      expect.anything(),
      firebaseAuthMock.auth.inMemoryPersistence,
    )
  })

  it('rethrows popup errors on /graphics-studio instead of redirect fallback and keeps ordinary game fallback behavior', async () => {
    firebaseAuthMock.app.getApps.mockReturnValue([])
    firebaseAuthMock.auth.getRedirectResult.mockReset()
    firebaseAuthMock.auth.signInWithPopup.mockReset().mockRejectedValueOnce(Object.assign(
      new Error('popup blocked'),
      { code: 'auth/popup-blocked' },
    ))
    firebaseAuthMock.auth.signInWithRedirect.mockReset()
    const studioClient = await createFirebaseAuthClient(COMPLETE_ENV, {
      location: { pathname: '/graphics-studio', protocol: 'http:', href: 'http://localhost:5173/graphics-studio' },
      sessionStorage: {},
      navigator: { userAgent: 'test-agent' },
    })
    await expect(studioClient.signInWithGoogle()).rejects.toThrow('popup blocked')
    expect(firebaseAuthMock.auth.signInWithRedirect).not.toHaveBeenCalled()

    const gameClient = await createFirebaseAuthClient(COMPLETE_ENV, {
      location: { pathname: '/game', protocol: 'http:', href: 'http://localhost:5173/game' },
      sessionStorage: {},
      navigator: { userAgent: 'test-agent' },
    })
    firebaseAuthMock.auth.signInWithPopup.mockRejectedValueOnce(Object.assign(
      new Error('popup blocked'),
      { code: 'auth/popup-blocked' },
    ))
    firebaseAuthMock.auth.signInWithRedirect.mockResolvedValueOnce()
    await expect(gameClient.signInWithGoogle()).resolves.toBeNull()
    expect(firebaseAuthMock.auth.signInWithRedirect).toHaveBeenCalled()
    expect(firebaseAuthMock.auth.setPersistence).toHaveBeenLastCalledWith(
      expect.anything(),
      firebaseAuthMock.auth.browserLocalPersistence,
    )
  })
})
