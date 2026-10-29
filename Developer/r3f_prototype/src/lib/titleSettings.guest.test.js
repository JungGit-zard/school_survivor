import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { vibrateFeedback, saveTitleSettings } from './titleSettings.js'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
  getFirebaseProgressRuntimeSnapshot,
  setCloudProgressUser,
} from './firebaseProgress.js'

beforeEach(() => {
  _resetFirebaseProgressForTests()
  vi.stubGlobal('navigator', { vibrate: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())

describe('account-owned vibration setting', () => {
  it('does not read or fabricate account settings for guest clicks', () => {
    const before = getFirebaseProgressRuntimeSnapshot()
    expect(() => vibrateFeedback(18)).not.toThrow()
    expect(navigator.vibrate).not.toHaveBeenCalled()
    expect(getFirebaseProgressRuntimeSnapshot()).toEqual(before)
  })
  // a1f9bbbc: 계정 진행도가 아직 수화되지 않은 동안 설정 읽기는 던지지 않고 진동만 건너뛴다.
  it('skips vibration without throwing while an authenticated account is still unhydrated', () => {
    setCloudProgressUser({ uid: 'waiting-for-remote' })
    expect(() => vibrateFeedback(18)).not.toThrow()
    expect(navigator.vibrate).not.toHaveBeenCalled()
  })
  it('honors the hydrated account setting exactly', () => {
    _seedHydratedFirebaseProgressForTests()
    saveTitleSettings({ vibration: true })
    vibrateFeedback(27)
    expect(navigator.vibrate).toHaveBeenCalledExactlyOnceWith(27)
    saveTitleSettings({ vibration: false })
    vibrateFeedback(31)
    expect(navigator.vibrate).toHaveBeenCalledTimes(1)
  })
})
