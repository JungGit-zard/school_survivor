import { describe, expect, it } from 'vitest'
import {
  getFirebaseConfig,
  getLocalFirebaseAuthRedirect,
  isFirebaseAuthConfigured,
  setFirebaseAuthMemoryPersistence,
  shouldUseNativeGoogleSignIn,
  toAuthUser,
} from './firebaseAuth.js'

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

  it('keeps the Firebase login session in memory instead of browser storage', async () => {
    const auth = { name: 'test-auth' }
    const memoryPersistence = { type: 'NONE' }
    const calls = []

    await setFirebaseAuthMemoryPersistence({
      inMemoryPersistence: memoryPersistence,
      setPersistence: async (...args) => calls.push(args),
    }, auth)

    expect(calls).toEqual([[auth, memoryPersistence]])
  })

  it('fails closed when memory-only Firebase Auth persistence is unavailable', async () => {
    await expect(setFirebaseAuthMemoryPersistence({}, {}))
      .rejects.toThrow('Firebase Auth memory-only persistence is unavailable.')
  })
})
