import { describe, expect, it, vi } from 'vitest'
import {
  getFirebaseConfig,
  getLocalFirebaseAuthRedirect,
  GRAPHICS_STUDIO_FIREBASE_APP_NAME,
  resolveFirebaseAppForRoute,
  setFirebaseAuthBrowserLocalPersistence,
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
    browserLocalPersistence: { type: 'LOCAL' },
    getRedirectResult: vi.fn(async () => null),
    onAuthStateChanged: vi.fn(() => vi.fn()),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    signInWithCredential: vi.fn(),
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
  browserLocalPersistence: firebaseAuthMock.auth.browserLocalPersistence,
  setPersistence: (...args) => firebaseAuthMock.auth.setPersistence(...args),
  getRedirectResult: (...args) => firebaseAuthMock.auth.getRedirectResult(...args),
  onAuthStateChanged: (...args) => firebaseAuthMock.auth.onAuthStateChanged(...args),
  signInWithPopup: (...args) => firebaseAuthMock.auth.signInWithPopup(...args),
  signInWithRedirect: (...args) => firebaseAuthMock.auth.signInWithRedirect(...args),
  signInWithCredential: (...args) => firebaseAuthMock.auth.signInWithCredential(...args),
  signOut: (...args) => firebaseAuthMock.auth.signOut(...args),
  reauthenticateWithPopup: (...args) => firebaseAuthMock.auth.reauthenticateWithPopup(...args),
  deleteUser: (...args) => firebaseAuthMock.auth.deleteUser(...args),
}))

const nativeAuthMock = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@capacitor-firebase/authentication', () => ({
  FirebaseAuthentication: nativeAuthMock,
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

  it('keeps Firebase Auth in browser-local persistence until explicit logout', async () => {
    const auth = { name: 'test-auth' }
    const browserLocalPersistence = { type: 'LOCAL' }
    const calls = []

    await setFirebaseAuthBrowserLocalPersistence({
      browserLocalPersistence,
      setPersistence: async (...args) => {
        calls.push(args)
      },
    }, auth)

    expect(calls).toEqual([[auth, browserLocalPersistence]])
  })

  it('fails closed when browser-local persistence is unavailable', async () => {
    await expect(setFirebaseAuthBrowserLocalPersistence({}, { name: 'test-auth' }))
      .rejects.toThrow('browser-local persistence is unavailable')
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
      firebaseAuthMock.auth.browserLocalPersistence,
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

  it('uses only a native Google credential inside Capacitor without web popup or redirect calls', async () => {
    firebaseAuthMock.app.getApps.mockReturnValue([])
    firebaseAuthMock.auth.getRedirectResult.mockReset()
    firebaseAuthMock.auth.signInWithPopup.mockReset()
    firebaseAuthMock.auth.signInWithRedirect.mockReset()
    firebaseAuthMock.auth.signInWithCredential.mockReset().mockResolvedValueOnce({
      user: {
        uid: 'native-user', displayName: 'Native', email: 'native@example.com', photoURL: '',
        emailVerified: true, providerData: [{ providerId: 'google.com' }],
      },
    })
    nativeAuthMock.signInWithGoogle.mockReset().mockResolvedValueOnce({
      credential: { idToken: 'native-id-token', accessToken: 'native-access-token' },
    })

    const client = await createFirebaseAuthClient(COMPLETE_ENV, {
      Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
      location: { pathname: '/game', protocol: 'http:', href: 'http://localhost/game' },
    })

    await expect(client.signInWithGoogle()).resolves.toMatchObject({ uid: 'native-user' })
    expect(nativeAuthMock.signInWithGoogle).toHaveBeenCalledWith({ skipNativeAuth: true })
    expect(firebaseAuthMock.auth.signInWithCredential).toHaveBeenCalledOnce()
    expect(firebaseAuthMock.auth.signInWithPopup).not.toHaveBeenCalled()
    expect(firebaseAuthMock.auth.signInWithRedirect).not.toHaveBeenCalled()
    expect(firebaseAuthMock.auth.getRedirectResult).not.toHaveBeenCalled()
    expect(firebaseAuthMock.auth.setPersistence).toHaveBeenLastCalledWith(
      expect.anything(),
      firebaseAuthMock.auth.browserLocalPersistence,
    )
  })
})
