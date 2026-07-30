// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const e2eAuth = vi.hoisted(() => ({ enabled: false }))
const firebaseProgressSpies = vi.hoisted(() => ({
  requestCloudProgressSave: vi.fn(),
}))

vi.mock('./e2eAuth.js', () => ({
  isE2EAuthBypass: () => e2eAuth.enabled,
}))

vi.mock('./firebaseProgress.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    requestCloudProgressSave: async (...args) => {
      firebaseProgressSpies.requestCloudProgressSave(...args)
      return actual.requestCloudProgressSave(...args)
    },
  }
})

// legalDocuments.js의 실제 버전(TERMS_VERSION=1/PRIVACY_VERSION=1)만으로는 "저장된
// 버전이 현재보다 낮다"는 케이스를 만들 수 없다(버전은 firebaseProgress.js 정규화 규칙상
// 1 미만이 될 수 없다). 이 파일에서만 버전을 2로 올려 낡은 버전(1)의 동의 기록이
// 재동의를 요구하는지 검증한다. consent.js는 이 상수만 소비하므로 다른 모듈에는 영향이 없다.
vi.mock('./legalDocuments.js', () => ({ TERMS_VERSION: 2, PRIVACY_VERSION: 2 }))

const { needsConsent, recordConsent, readConsent, _resetForTests } = await import('./consent.js')
const { TERMS_VERSION, PRIVACY_VERSION } = await import('./legalDocuments.js')
const {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  applyCloudProgressSnapshot,
  hydrateCloudProgress,
} = await import('./firebaseProgress.js')

const USER = { uid: 'consent-user', displayName: 'Tester' }

function remoteSnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    updatedAt: '2026-07-18T00:00:00.000Z',
    profile: { uid: USER.uid, displayName: USER.displayName, nickname: '' },
    progress: {
      goldTotal: 0,
      records: {},
      weaponUnlocks: {},
      weaponPermanentUpgrades: {},
      passiveUpgrades: {},
      titleSettings: { vibration: true, reducedEffects: false, unlockAllWeaponsCheat: false, unlockAllStagesCheat: false },
    },
    ...overrides,
  }
}

describe('consent.js', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    e2eAuth.enabled = false
    _resetFirebaseProgressForTests()
    _resetForTests()
  })

  it('requires consent when the progress runtime has not hydrated for this user', () => {
    expect(needsConsent(USER)).toBe(true)
    expect(readConsent(USER)).toBeNull()
  })

  it('requires consent when hydrated but no consent record exists yet', async () => {
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async () => {}),
    })
    await hydrateCloudProgress(USER)

    expect(needsConsent(USER)).toBe(true)
  })

  it('does not need consent after a successful recordConsent, and readConsent reflects it', async () => {
    const save = vi.fn(async () => {})
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save,
    })
    await hydrateCloudProgress(USER)

    await expect(recordConsent(USER)).resolves.toBe(true)

    expect(needsConsent(USER)).toBe(false)
    const consent = readConsent(USER)
    expect(consent.terms.version).toBe(TERMS_VERSION)
    expect(consent.privacy.version).toBe(PRIVACY_VERSION)
    expect(Number.isNaN(Date.parse(consent.terms.acceptedAt))).toBe(false)
    expect(save).toHaveBeenCalled()
  })

  it('requires consent again when the stored version is lower than the current legal document version', async () => {
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async () => {}),
    })
    await hydrateCloudProgress(USER)
    applyCloudProgressSnapshot(remoteSnapshot({
      consent: {
        terms: { version: 1, acceptedAt: '2020-01-01T00:00:00.000Z' },
        privacy: { version: PRIVACY_VERSION, acceptedAt: '2020-01-01T00:00:00.000Z' },
      },
    }), USER)

    expect(needsConsent(USER)).toBe(true)
  })

  it('rolls back the runtime consent record and returns false when the remote save fails', async () => {
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async () => { throw new Error('network down') }),
    })
    await hydrateCloudProgress(USER)

    await expect(recordConsent(USER)).resolves.toBe(false)

    expect(needsConsent(USER)).toBe(true)
    expect(readConsent(USER)).toBeNull()
  })

  it('records E2E consent in the hydrated memory runtime without requesting a Firebase save', async () => {
    e2eAuth.enabled = true
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async () => {}),
    })
    applyCloudProgressSnapshot(remoteSnapshot(), USER, { keepCloudUserNull: true })

    await expect(recordConsent(USER)).resolves.toBe(true)

    expect(firebaseProgressSpies.requestCloudProgressSave).not.toHaveBeenCalled()
    expect(readConsent(USER)).toMatchObject({
      terms: { version: TERMS_VERSION },
      privacy: { version: PRIVACY_VERSION },
    })
  })

  it('never persists consent to browser storage', async () => {
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async () => {}),
    })
    await hydrateCloudProgress(USER)

    await recordConsent(USER)

    expect(sessionStorage.length).toBe(0)
  })

  it('does not hard-code needsConsent to always return false (no leftover scaffold behavior)', async () => {
    // 미하이드레이트 상태에서 이미 true를 반환하지만, 하이드레이트 이후에도 실제
    // 동의 상태에 따라 값이 바뀌는지까지 확인해 "항상 false" 스캡폴드 회귀를 잡는다.
    _setFirebaseProgressClientForTests({
      loadOrCreate: vi.fn(async () => remoteSnapshot()),
      save: vi.fn(async () => {}),
    })
    await hydrateCloudProgress(USER)
    expect(needsConsent(USER)).toBe(true)

    await recordConsent(USER)
    expect(needsConsent(USER)).toBe(false)
  })
})
