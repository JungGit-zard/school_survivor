import { describe, expect, it } from 'vitest'
import {
  LEGACY_ACCOUNT_ENTITLEMENT_IDS,
  WEAPON_UNLOCK_SCHEMA_VERSION,
  getLegacyAccountEntitlementIds,
  mergeLegacyAccountEntitlements,
} from './weaponUnlockMigration.js'

describe('weapon unlock legacy migration contract', () => {
  it('v2 이전 대상은 조건 잠금으로 바뀐 과거 starter 6종뿐이다', () => {
    expect(WEAPON_UNLOCK_SCHEMA_VERSION).toBe(2)
    expect(LEGACY_ACCOUNT_ENTITLEMENT_IDS).toEqual([
      'scienceFlask', 'bell', 'stunGun', 'onigiri', 'chibiko', 'inucon',
    ])
  })

  it('호출자 입력을 바꾸지 않고 미래 unlock을 보존하는 합집합을 만든다', () => {
    const raw = { guidedMissile: 1, futureWeapon: 1 }
    expect(mergeLegacyAccountEntitlements(raw)).toEqual({
      guidedMissile: 1,
      futureWeapon: 1,
      scienceFlask: 1,
      bell: 1,
      stunGun: 1,
      onigiri: 1,
      chibiko: 1,
      inucon: 1,
    })
    expect(raw).toEqual({ guidedMissile: 1, futureWeapon: 1 })
    expect(getLegacyAccountEntitlementIds()).not.toBe(LEGACY_ACCOUNT_ENTITLEMENT_IDS)
  })
})
