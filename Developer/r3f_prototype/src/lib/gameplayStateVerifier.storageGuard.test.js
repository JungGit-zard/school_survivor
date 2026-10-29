// The QA verifier's localStorage guard allows only the guest-ranking Firebase Auth keys (the
// IndexedDB -> localStorage fallback of guestRankingIdentity.js); every other use is a touch.
import { afterEach, describe, expect, it } from 'vitest'
import { createLocalStorageGuard, isAllowedVerifierStorageKey } from './gameplayStateVerifier.js'

const GUEST_KEY = 'firebase:authUser:test-api-key:guest-ranking'
let guard = null
afterEach(() => { guard?.restore(); guard = null })

describe('verifier localStorage guard', () => {
  it('allowlists exactly the guest-ranking authUser key and the __sak probe', () => {
    expect(isAllowedVerifierStorageKey(GUEST_KEY)).toBe(true)
    expect(isAllowedVerifierStorageKey('__sak')).toBe(true)
    for (const key of [
      'firebase:authUser:test-api-key:[DEFAULT]', // Google sign-in app
      'firebase:persistence:test-api-key:guest-ranking', // redirect persistence hint
      'firebase:authUser:test-api-key:guest-ranking:x',
      'firebase:authUser::guest-ranking',
      'x__sak', '__sak2', 'escape-progress', undefined, null, 42,
    ]) expect(isAllowedVerifierStorageKey(key), String(key)).toBe(false)
  })

  it('lets Firebase probe, persist, read back and remove the guest user without a touch', () => {
    guard = createLocalStorageGuard()
    const storage = globalThis.localStorage
    expect(storage).toBeTruthy() // `if (!this.storage)` probe
    storage.setItem('__sak', '1')
    storage.removeItem('__sak')
    storage.setItem(GUEST_KEY, '{"uid":"anon"}')
    expect(storage.getItem(GUEST_KEY)).toBe('{"uid":"anon"}')
    storage.removeItem(GUEST_KEY)
    expect(storage.getItem(GUEST_KEY)).toBeNull()
    expect(guard.getTouches()).toBe(0)
  })

  it('counts every other key, method and assignment as a touch', () => {
    guard = createLocalStorageGuard()
    const storage = globalThis.localStorage
    storage.getItem('escape-progress')
    storage.setItem('firebase:authUser:test-api-key:[DEFAULT]', '{}')
    storage.key(0)
    storage.clear()
    void storage.length
    expect(() => { storage.foo = 'bar' }).toThrow(TypeError) // set trap refuses, still counted
    globalThis.localStorage = {}
    expect(guard.getTouches()).toBe(9) // getItem 1, setItem 1, key 2, clear 2, length 1, foo 1, assign 1
    expect(storage.getItem('firebase:authUser:test-api-key:[DEFAULT]')).toBeNull()
  })

  it('restores the original localStorage descriptor', () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    createLocalStorageGuard().restore()
    expect(Object.getOwnPropertyDescriptor(globalThis, 'localStorage')).toEqual(before)
  })
})
