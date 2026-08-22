// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isUnlocked,
  setUnlocked,
  getAllUnlocked,
  WEAPON_UNLOCK_SCHEMA_VERSION,
  LEGACY_ACCOUNT_ENTITLEMENT_IDS,
  getLegacyAccountEntitlementIds,
  mergeLegacyAccountEntitlements,
  _resetForTests,
} from './weaponUnlocks.js'
import { getFirebaseProgressRuntimeSnapshot, updateFirebasePlayerProgress } from './firebaseProgress.js'

describe('weaponUnlocks storage', () => {
  beforeEach(() => {
    _resetForTests()
  })

  it('기본군 4종만 항상 unlocked', () => {
    expect(isUnlocked('pencilThrow')).toBe(true)
    expect(isUnlocked('schoolBag')).toBe(true)
    expect(isUnlocked('boxCutter')).toBe(true)
    expect(isUnlocked('tumbler')).toBe(true)
    expect(isUnlocked('onigiri')).toBe(false)
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

  it('starter 무기에 setUnlocked는 Firebase runtime 변경 없이 no-op', () => {
    setUnlocked('pencilThrow')
    expect(getFirebaseProgressRuntimeSnapshot().progress.weaponUnlocks).toEqual({})
  })

  it('조합 3종은 계정 unlock flag 대상이 아니다', () => {
    for (const id of ['hanako', 'bikittyCutter', 'lineDraw']) {
      setUnlocked(id)
      expect(isUnlocked(id)).toBe(false)
    }
    expect(getFirebaseProgressRuntimeSnapshot().progress.weaponUnlocks).toEqual({})
  })

  it('legacy 계정 권리 이전은 조건 잠금으로 전환된 6종만 합집합으로 추가한다', () => {
    expect(WEAPON_UNLOCK_SCHEMA_VERSION).toBe(2)
    expect(LEGACY_ACCOUNT_ENTITLEMENT_IDS).toEqual(['scienceFlask', 'bell', 'stunGun', 'onigiri', 'chibiko', 'inucon'])
    expect(getLegacyAccountEntitlementIds()).toEqual(LEGACY_ACCOUNT_ENTITLEMENT_IDS)
    expect(getLegacyAccountEntitlementIds()).not.toBe(LEGACY_ACCOUNT_ENTITLEMENT_IDS)
    expect(mergeLegacyAccountEntitlements({ guidedMissile: 1, futureWeapon: 1 })).toEqual({
      guidedMissile: 1,
      futureWeapon: 1,
      scienceFlask: 1,
      bell: 1,
      stunGun: 1,
      onigiri: 1,
      chibiko: 1,
      inucon: 1,
    })
  })

  it('미지정 ID는 setUnlocked / isUnlocked 모두 무시', () => {
    setUnlocked('bogusWeapon')
    expect(isUnlocked('bogusWeapon')).toBe(false)
    expect(getFirebaseProgressRuntimeSnapshot().progress.weaponUnlocks).toEqual({})
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
