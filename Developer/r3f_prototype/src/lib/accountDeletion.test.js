import { beforeEach, describe, expect, it, vi } from 'vitest'

// vi.mock factory는 파일 최상단으로 호이스팅되므로, 팩토리 안에서 참조하는 바깥
// 변수는 반드시 "mock" 접두사를 붙여야 한다(이 저장소의 기존 관례 —
// useGameStore.cloudProgress.test.js의 mockProgress 참조).
let mockCallOrder = []
let mockRankingResult = { attempted: 10, deleted: ['a'], failed: [] }
let mockRankingThrow = null
let mockProgressThrow = null
let mockAuthConfigured = true
let mockDeleteAccountError = null
let mockReauthenticateError = null

vi.mock('./firebaseRanking.js', () => ({
  deleteRankingEntriesForUser: vi.fn(async () => {
    mockCallOrder.push('ranking')
    if (mockRankingThrow) throw mockRankingThrow
    return mockRankingResult
  }),
}))

vi.mock('./firebaseProgress.js', async () => {
  const actual = await vi.importActual('./firebaseProgress.js')
  return {
    ...actual,
    deleteFirebaseProgressDocument: vi.fn(async () => {
      mockCallOrder.push('progress')
      if (mockProgressThrow) throw mockProgressThrow
      return true
    }),
  }
})

vi.mock('./firebaseAuth.js', () => ({
  createFirebaseAuthClient: vi.fn(async () => ({
    configured: mockAuthConfigured,
    deleteAccount: vi.fn(async () => {
      mockCallOrder.push('auth')
      if (mockDeleteAccountError) throw mockDeleteAccountError
    }),
    reauthenticateWithGoogle: vi.fn(async () => {
      mockCallOrder.push('reauth')
      if (mockReauthenticateError) throw mockReauthenticateError
    }),
  })),
}))

vi.mock('./refs.js', () => ({
  resetRuntimeRefs: vi.fn(() => {
    mockCallOrder.push('reset')
  }),
}))

const { deleteAccountAndData, reauthenticateForDeletion } = await import('./accountDeletion.js')
const { FirebaseProgressError } = await import('./firebaseProgress.js')

const USER = { uid: 'delete-user' }

describe('accountDeletion.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCallOrder = []
    mockRankingResult = { attempted: 10, deleted: ['a'], failed: [] }
    mockRankingThrow = null
    mockProgressThrow = null
    mockAuthConfigured = true
    mockDeleteAccountError = null
    mockReauthenticateError = null
  })

  it('returns unauthenticated immediately without touching ranking/progress/auth when there is no user', async () => {
    const result = await deleteAccountAndData(null)

    expect(result).toEqual({ ok: false, reason: 'unauthenticated', message: expect.any(String) })
    expect(mockCallOrder).toEqual([])
  })

  it('deletes in order: ranking -> users/{uid} document -> Firebase Auth account -> local runtime reset', async () => {
    const result = await deleteAccountAndData(USER)

    expect(mockCallOrder).toEqual(['ranking', 'progress', 'auth', 'reset'])
    expect(result.ok).toBe(true)
    expect(result.ranking).toEqual({ attempted: 10, deleted: ['a'], failed: [] })
  })

  it('proceeds past a failed ranking deletion (best-effort) and still deletes progress + auth', async () => {
    mockRankingThrow = new Error('ranking permission denied')

    const result = await deleteAccountAndData(USER)

    expect(mockCallOrder).toEqual(['ranking', 'progress', 'auth', 'reset'])
    expect(result.ok).toBe(true)
    expect(result.ranking.error).toMatch(/ranking permission denied/)
  })

  it('stops before deleting the Firebase Auth account when the users/{uid} document delete fails', async () => {
    mockProgressThrow = new Error('rtdb write denied')

    const result = await deleteAccountAndData(USER)

    expect(mockCallOrder).toEqual(['ranking', 'progress'])
    expect(result).toMatchObject({ ok: false, reason: 'progressDeleteFailed' })
  })

  it('classifies an unauthenticated progress-delete failure distinctly from a generic failure', async () => {
    mockProgressThrow = new FirebaseProgressError('no uid', 'unauthenticated')

    const result = await deleteAccountAndData(USER)

    expect(result).toMatchObject({ ok: false, reason: 'unauthenticated' })
    expect(mockCallOrder).toEqual(['ranking', 'progress'])
  })

  it('classifies auth/requires-recent-login as reauthRequired and never resets local runtime', async () => {
    mockDeleteAccountError = Object.assign(new Error('recent login required'), { code: 'auth/requires-recent-login' })

    const result = await deleteAccountAndData(USER)

    expect(mockCallOrder).toEqual(['ranking', 'progress', 'auth'])
    expect(result).toMatchObject({ ok: false, reason: 'reauthRequired' })
  })

  it('classifies a network error on the auth delete step as network', async () => {
    mockDeleteAccountError = Object.assign(new Error('offline'), { code: 'auth/network-request-failed' })

    const result = await deleteAccountAndData(USER)

    expect(result).toMatchObject({ ok: false, reason: 'network' })
  })

  it('reauthenticateForDeletion resolves true on success and false on failure', async () => {
    await expect(reauthenticateForDeletion()).resolves.toBe(true)
    expect(mockCallOrder).toEqual(['reauth'])

    mockReauthenticateError = new Error('popup closed')
    await expect(reauthenticateForDeletion()).resolves.toBe(false)
  })
})
