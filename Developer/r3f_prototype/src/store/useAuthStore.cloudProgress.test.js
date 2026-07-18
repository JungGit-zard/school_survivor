import { beforeEach, describe, expect, it, vi } from 'vitest'

const authUser = Object.freeze({
  uid: 'uid-1',
  displayName: 'Tester',
  email: 'tester@example.com',
  photoURL: '',
})

let authChange = null
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
  loadCloudProgressFromCloud: vi.fn(async () => false),
  saveLocalProgressToCloud: vi.fn(async () => true),
}))

const { useAuthStore, _resetAuthStoreForTests } = await import('./useAuthStore.js')
const { setCloudProgressUser, loadCloudProgressFromCloud, saveLocalProgressToCloud } = await import('../lib/firebaseProgress.js')

describe('useAuthStore cloud progress integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authChange = null
    _resetAuthStoreForTests()
  })

  it('registers and saves the authenticated user when auth state is restored', async () => {
    await useAuthStore.getState().initializeAuth()
    authChange(authUser)

    expect(setCloudProgressUser).toHaveBeenCalledWith(authUser)
    await vi.waitFor(() => expect(loadCloudProgressFromCloud).toHaveBeenCalledWith(authUser))
    await vi.waitFor(() => expect(saveLocalProgressToCloud).toHaveBeenCalledWith(authUser))
  })

  it('registers and saves the authenticated user after Google sign in', async () => {
    await useAuthStore.getState().signInWithGoogle()

    expect(setCloudProgressUser).toHaveBeenCalledWith(authUser)
    await vi.waitFor(() => expect(loadCloudProgressFromCloud).toHaveBeenCalledWith(authUser))
    await vi.waitFor(() => expect(saveLocalProgressToCloud).toHaveBeenCalledWith(authUser))
  })
})
