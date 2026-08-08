import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  INACTIVE_INSPECTION_STATE,
  INSPECTION_MODE_PATH,
  _resetFirebaseInspectionModeForTests,
  _setFirebaseInspectionClientFactoryForTests,
  getInspectionPhase,
  normalizeInspectionState,
  startInspection,
  stopInspection,
  subscribeInspectionMode,
} from './firebaseInspectionMode.js'

const NOW = Date.UTC(2026, 7, 8, 9, 0, 0)
const MASTER = {
  uid: 'master-uid',
  email: 'zard5388@gmail.com',
  emailVerified: true,
  providerData: [{ providerId: 'google.com' }],
}

function inspection(overrides = {}) {
  return {
    schemaVersion: 1,
    enabled: true,
    startsAt: NOW + 60_000,
    endsAt: NOW + 120_000,
    message: '점검 중입니다.',
    updatedAt: NOW,
    updatedByUid: MASTER.uid,
    ...overrides,
  }
}

function installClient(overrides = {}) {
  const client = {
    set: vi.fn(async () => {}),
    subscribe: vi.fn(() => vi.fn()),
    getServerNow: vi.fn(async () => NOW),
    ...overrides,
  }
  _setFirebaseInspectionClientFactoryForTests(async () => client)
  return client
}

afterEach(() => {
  _resetFirebaseInspectionModeForTests()
})

describe('Firebase inspection mode', () => {
  it('normalizes malformed remote state to a safe inactive state', () => {
    expect(normalizeInspectionState({ enabled: true })).toEqual(INACTIVE_INSPECTION_STATE)
    expect(normalizeInspectionState(inspection())).toEqual(inspection())
    expect(getInspectionPhase(inspection(), NOW)).toBe('scheduled')
    expect(getInspectionPhase(inspection(), NOW + 61_000)).toBe('active')
    expect(getInspectionPhase(inspection(), NOW + 120_000)).toBe('inactive')
    expect(getInspectionPhase({ ...inspection(), enabled: false }, NOW + 61_000)).toBe('inactive')
  })

  it('writes only a validated schedule using the server-time offset clock', async () => {
    const client = installClient()
    const state = await startInspection({
      user: MASTER,
      startsAt: NOW + 60_000,
      endsAt: NOW + 3_600_000,
      message: '서버 점검 안내',
    })

    expect(state.updatedAt).toBe(NOW)
    expect(client.set).toHaveBeenCalledWith(INSPECTION_MODE_PATH, state)
  })

  it('rejects a non-master account and invalid periods before writing', async () => {
    const client = installClient()
    await expect(startInspection({
      user: { ...MASTER, email: 'other@example.com' },
      startsAt: NOW,
      endsAt: NOW + 60_000,
      message: '',
    })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(startInspection({
      user: MASTER,
      startsAt: NOW - 300_001,
      endsAt: NOW + 60_000,
      message: '',
    })).rejects.toMatchObject({ code: 'invalid-period' })
    await expect(startInspection({
      user: MASTER,
      startsAt: NOW + 1,
      endsAt: NOW + 1 + 7 * 24 * 60 * 60 * 1000 + 1,
      message: '',
    })).rejects.toMatchObject({ code: 'invalid-period' })
    await expect(startInspection({
      user: MASTER,
      startsAt: NOW,
      endsAt: NOW + 60_000,
      message: 'x'.repeat(201),
    })).rejects.toMatchObject({ code: 'invalid-message' })
    expect(client.set).not.toHaveBeenCalled()
  })

  it('stops immediately with a valid disabled envelope', async () => {
    const client = installClient()
    const state = await stopInspection({ user: MASTER })

    expect(state).toMatchObject({ enabled: false, startsAt: NOW, endsAt: NOW + 1, updatedAt: NOW })
    expect(client.set).toHaveBeenCalledWith(INSPECTION_MODE_PATH, state)
  })

  it('provides inactive error state instead of throwing from a broken subscription', async () => {
    let emitError
    const unsubscribe = vi.fn()
    installClient({
      subscribe: vi.fn((_path, _onValue, onError) => {
        emitError = onError
        return unsubscribe
      }),
    })
    const onState = vi.fn()
    const onError = vi.fn()
    const stop = await subscribeInspectionMode({ onState, onError })

    emitError(new Error('permission denied'))
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({
      enabled: false,
      phase: 'inactive',
      status: 'error',
    }))
    expect(onError).toHaveBeenCalledOnce()
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
