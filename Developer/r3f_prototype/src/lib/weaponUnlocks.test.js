// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  isUnlocked,
  setUnlocked,
  getAllUnlocked,
  _resetForTests,
} from './weaponUnlocks.js'
import { getFirebaseProgressRuntimeSnapshot, updateFirebasePlayerProgress } from './firebaseProgress.js'

describe('weaponUnlocks storage', () => {
  beforeEach(() => {
    _resetForTests()
  })

  it('starter 무기는 항상 unlocked', () => {
    expect(isUnlocked('pencilThrow')).toBe(true)
    expect(isUnlocked('schoolBag')).toBe(true)
    expect(isUnlocked('onigiri')).toBe(true)
  })

  it('비-starter 무기는 setUnlocked 호출 전 false', () => {
    expect(isUnlocked('compassBlade')).toBe(false)
    expect(isUnlocked('guidedMissile')).toBe(false)
  })

  it('setUnlocked round-trip', () => {
    setUnlocked('compassBlade')
    expect(isUnlocked('compassBlade')).toBe(true)
    setUnlocked('guidedMissile')
    expect(isUnlocked('guidedMissile')).toBe(true)
  })

  it('starter 무기에 setUnlocked는 no-op (disk에 안 씀)', () => {
    setUnlocked('pencilThrow')
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeNull() // 디스크 변경 없음
  })

  it('미지정 ID는 setUnlocked / isUnlocked 모두 무시', () => {
    setUnlocked('bogusWeapon')
    expect(isUnlocked('bogusWeapon')).toBe(false)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeNull()
  })

  it('getAllUnlocked는 카탈로그 키 중 unlock된 것만 (starter 제외)', () => {
    setUnlocked('compassBlade')
    setUnlocked('umbrellaGuard')
    const all = getAllUnlocked()
    expect(all.has('compassBlade')).toBe(true)
    expect(all.has('umbrellaGuard')).toBe(true)
    expect(all.has('pencilThrow')).toBe(false) // starter는 포함하지 않음
    expect(all.size).toBe(2)
  })

  it('미지정 키는 Firebase runtime에 보존하되 getAllUnlocked에는 노출 안 함', () => {
    updateFirebasePlayerProgress((progress) => {
      progress.weaponUnlocks = { compassBlade: 1, futureWeapon: 1 }
      return progress
    })
    const all = getAllUnlocked()
    expect(all.has('compassBlade')).toBe(true)
    expect(all.has('futureWeapon')).toBe(false)

    setUnlocked('umbrellaGuard')
    const raw = getFirebaseProgressRuntimeSnapshot().progress.weaponUnlocks
    expect(raw.futureWeapon).toBe(1)
    expect(raw.umbrellaGuard).toBe(1)
  })

  it('잘못된 Firebase weaponUnlocks 값이면 모두 unlocked-false (예외 안 던짐)', () => {
    updateFirebasePlayerProgress((progress) => {
      progress.weaponUnlocks = 'not-json'
      return progress
    })
    expect(() => isUnlocked('compassBlade')).not.toThrow()
    expect(isUnlocked('compassBlade')).toBe(false)
  })
})
