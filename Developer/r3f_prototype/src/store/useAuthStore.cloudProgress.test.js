// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = Object.freeze({
  uid: 'uid-1',
  displayName: 'Tester',
  email: 'tester@example.com',
  photoURL: '',
})

let authChange = null
const reloadPersistentProgress = vi.fn()
const authClient = {
  configured: true,
  subscribe: vi.fn((onChange) => {
    authChange = onChange
    return vi.fn()
  }),
  signInWithGoogle: vi.fn(async () => authUser),
  signOut: vi.fn(async () => {}),
}

vi.mock('../lib/firebaseAuth.js', () => ({
  isFirebaseAuthConfigured: vi.fn(() => true),
  createFirebaseAuthClient: vi.fn(async () => authClient),
}))

vi.mock('../lib/firebaseProgress.js', () => ({
  setCloudProgressUser: vi.fn(),
  hydrateCloudProgress: vi.fn(async () => true),
  isFirebaseProgressHydrated: vi.fn(() => false),
}))

vi.mock('./useGameStore.js', () => ({
  useGameStore: { getState: () => ({ reloadPersistentProgress }) },
}))

const { useAuthStore, _resetAuthStoreForTests } = await import('./useAuthStore.js')
const { setCloudProgressUser, hydrateCloudProgress, isFirebaseProgressHydrated } = await import('../lib/firebaseProgress.js')

describe('useAuthStore cloud progress integration', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    vi.clearAllMocks()
    reloadPersistentProgress.mockClear()
    authClient.signInWithGoogle.mockResolvedValue(authUser)
    authChange = null
    _resetAuthStoreForTests()
  })

  it('hydrates the authenticated user when auth state is restored', async () => {
    await useAuthStore.getState().initializeAuth()
    authChange(authUser)

    expect(setCloudProgressUser).toHaveBeenCalledWith(authUser)
    await vi.waitFor(() => expect(hydrateCloudProgress).toHaveBeenCalledWith(authUser))
  })

  it('hydrates the authenticated user after Google sign in', async () => {
    await useAuthStore.getState().signInWithGoogle()

    expect(setCloudProgressUser).toHaveBeenCalledWith(authUser)
    await vi.waitFor(() => expect(hydrateCloudProgress).toHaveBeenCalledWith(authUser))
  })

  it('동시에 두 번 요청해도 실제 Google 클라이언트 로그인 호출은 한 번만 한다', async () => {
    let resolveSignIn
    authClient.signInWithGoogle.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSignIn = resolve
    }))

    const first = useAuthStore.getState().signInWithGoogle()
    const second = useAuthStore.getState().signInWithGoogle()

    expect(first).toBe(second)
    await vi.waitFor(() => expect(authClient.signInWithGoogle).toHaveBeenCalledTimes(1))

    resolveSignIn(authUser)
    await expect(first).resolves.toEqual(authUser)
    await expect(second).resolves.toEqual(authUser)
  })

  it('does not fabricate an account or progress snapshot while initializing auth', async () => {
    await useAuthStore.getState().initializeAuth()

    expect(setCloudProgressUser).not.toHaveBeenCalled()
    expect(hydrateCloudProgress).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('preserves a real Google account and its progress hydrate', async () => {
    await useAuthStore.getState().signInWithGoogle()

    expect(useAuthStore.getState().user).toEqual(authUser)
    expect(setCloudProgressUser).toHaveBeenCalledWith(authUser)
    await vi.waitFor(() => expect(hydrateCloudProgress).toHaveBeenCalledWith(authUser))
  })

  it('ignores a stale account hydrate completion after the auth user switches', async () => {
    const userA = { uid: 'uid-a' }
    const userB = { uid: 'uid-b' }
    let resolveA
    let bHydrated = false
    hydrateCloudProgress.mockImplementation((user) => new Promise((resolve) => {
      if (user.uid === userA.uid) resolveA = resolve
      else resolve(true)
    }))
    isFirebaseProgressHydrated.mockImplementation((user) => user?.uid === userB.uid && bHydrated)

    await useAuthStore.getState().initializeAuth()
    authChange(userA)
    authChange(userB)
    bHydrated = true
    await vi.waitFor(() => expect(useAuthStore.getState().progressStatus).toBe('ready'))
    resolveA(false)
    await Promise.resolve()

    expect(useAuthStore.getState()).toMatchObject({ user: userB, progressStatus: 'ready', progressError: null })
    expect(reloadPersistentProgress).toHaveBeenCalledTimes(1)
  })
})
