// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyCloudProgressSnapshot,
  buildCloudProgressSnapshot,
  buildCloudUserProfile,
  getUserProgressPath,
  isFirebaseProgressConfigured,
} from './firebaseProgress.js'
import { STORAGE_KEY as RECORDS_KEY } from './playerRecords.js'
import { STORAGE_KEY as PASSIVES_KEY } from './passiveUpgrades.js'
import { STORAGE_KEY as UNLOCKS_KEY } from './weaponUnlocks.js'
import { saveNicknameForUser } from './userNickname.js'

const COMPLETE_ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://school-survivor-default-rtdb.asia-southeast1.firebasedatabase.app',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}

describe('firebase progress cloud sync helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('requires a Realtime Database URL in addition to auth config', () => {
    expect(isFirebaseProgressConfigured(COMPLETE_ENV)).toBe(true)
    expect(isFirebaseProgressConfigured({
      ...COMPLETE_ENV,
      VITE_FIREBASE_DATABASE_URL: '',
    })).toBe(false)
  })

  it('builds a private per-user database path', () => {
    expect(getUserProgressPath({ uid: 'user-123' })).toBe('users/user-123')
    expect(getUserProgressPath(null)).toBe('')
  })

  it('normalizes the Google user profile stored under the user path', () => {
    saveNicknameForUser({ uid: 'uid-1' }, '생존왕')

    // 개인정보 최소화: email/photoURL은 입력에 있어도 프로필 결과에서 제외된다.
    expect(buildCloudUserProfile({
      uid: 'uid-1',
      displayName: 'Tester',
      email: 'tester@example.com',
      photoURL: 'https://example.com/me.png',
    })).toEqual({
      uid: 'uid-1',
      displayName: 'Tester',
      nickname: '생존왕',
    })
  })

  it('snapshots current local progress for Realtime Database writes', () => {
    localStorage.setItem('school_survivor:goldTotal', '42')
    localStorage.setItem(RECORDS_KEY, JSON.stringify({ totalRuns: 3, totalKills: 27 }))
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify({ guidedMissile: 1, unknownWeapon: 1 }))
    localStorage.setItem(PASSIVES_KEY, JSON.stringify({ maxHp: 2, disabledPassive: 99 }))

    expect(buildCloudProgressSnapshot()).toMatchObject({
      schemaVersion: 1,
      progress: {
        goldTotal: 42,
        records: expect.objectContaining({
          totalRuns: 3,
          totalKills: 27,
          bestSurvivalSeconds: 0,
        }),
        weaponUnlocks: {
          guidedMissile: 1,
        },
        passiveUpgrades: expect.objectContaining({
          maxHp: 2,
        }),
      },
    })
  })

  it('applies a cloud progress snapshot to local account storage', () => {
    applyCloudProgressSnapshot({
      profile: { nickname: 'Cloud Nick' },
      progress: {
        goldTotal: 77,
        records: { totalRuns: 4, totalKills: 9 },
        weaponUnlocks: { guidedMissile: 1 },
        passiveUpgrades: { magnet: 2 },
        titleSettings: { vibration: false },
      },
    }, { uid: 'uid-cloud' })

    expect(localStorage.getItem('school_survivor:goldTotal')).toBe('77')
    expect(JSON.parse(localStorage.getItem(RECORDS_KEY))).toMatchObject({ totalRuns: 4, totalKills: 9 })
    expect(JSON.parse(localStorage.getItem(UNLOCKS_KEY))).toEqual({ guidedMissile: 1 })
    expect(JSON.parse(localStorage.getItem(PASSIVES_KEY))).toMatchObject({ magnet: 2 })
    expect(buildCloudUserProfile({ uid: 'uid-cloud' }).nickname).toBe('Cloud Nick')
  })
})
