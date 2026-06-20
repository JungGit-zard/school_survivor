import { describe, expect, it } from 'vitest'
import { getFirebaseConfig, isFirebaseAuthConfigured, toAuthUser } from './firebaseAuth.js'

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
    })).toEqual({
      uid: 'uid-1',
      displayName: 'Tester',
      email: 'tester@example.com',
      photoURL: 'https://example.com/me.png',
    })
  })
})
