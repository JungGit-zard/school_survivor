import { create } from 'zustand'
import { createFirebaseAuthClient, isFirebaseAuthConfigured } from '../lib/firebaseAuth.js'
import { loadCloudProgressFromCloud, saveLocalProgressToCloud, setCloudProgressUser } from '../lib/firebaseProgress.js'

let authClientPromise = null
let unsubscribeAuth = null

export const useAuthStore = create((set, get) => ({
  status: isFirebaseAuthConfigured() ? 'checking' : 'unconfigured',
  user: null,
  error: null,
  signingIn: false,
  initialized: false,

  initializeAuth: async () => {
    if (get().initialized) return
    if (!isFirebaseAuthConfigured()) {
      set({ status: 'unconfigured', initialized: true, user: null, error: null })
      return
    }

    set({ status: 'checking', initialized: true, error: null })
    try {
      const client = await getAuthClient()
      if (!client.configured) {
        set({ status: 'unconfigured', user: null })
        return
      }

      unsubscribeAuth?.()
      unsubscribeAuth = client.subscribe((user) => {
        syncCloudProgressUser(user)
        set({
          status: user ? 'signedIn' : 'signedOut',
          user,
          error: null,
          signingIn: false,
        })
      })
    } catch (error) {
      set({
        status: 'error',
        error: getErrorMessage(error),
        user: null,
        signingIn: false,
      })
    }
  },

  signInWithGoogle: async () => {
    if (!isFirebaseAuthConfigured()) {
      set({ status: 'unconfigured', user: null, error: null, signingIn: false })
      return null
    }

    set({ signingIn: true, error: null })
    try {
      const client = await getAuthClient()
      const user = await client.signInWithGoogle()
      syncCloudProgressUser(user)
      set({ status: 'signedIn', user, signingIn: false, error: null })
      return user
    } catch (error) {
      set({
        status: 'error',
        error: getErrorMessage(error),
        signingIn: false,
      })
      return null
    }
  },

  signOutOfGoogle: async () => {
    set({ error: null })
    try {
      const client = await getAuthClient()
      await client.signOut()
      syncCloudProgressUser(null)
      set({ status: 'signedOut', user: null, signingIn: false, error: null })
    } catch (error) {
      set({ status: 'error', error: getErrorMessage(error), signingIn: false })
    }
  },
}))

export function _resetAuthStoreForTests() {
  unsubscribeAuth?.()
  unsubscribeAuth = null
  authClientPromise = null
  useAuthStore.setState({
    status: isFirebaseAuthConfigured() ? 'checking' : 'unconfigured',
    user: null,
    error: null,
    signingIn: false,
    initialized: false,
  })
}

function getAuthClient() {
  if (!authClientPromise) authClientPromise = createFirebaseAuthClient()
  return authClientPromise
}

function syncCloudProgressUser(user) {
  setCloudProgressUser(user)
  if (!user) return
  void (async () => {
    await loadCloudProgressFromCloud(user)
    await saveLocalProgressToCloud(user)
    await refreshGameStoreFromStorage().catch(() => {})
  })().catch((error) => {
    if (typeof console !== 'undefined') {
      console.warn('Firebase progress sync failed.', error)
    }
  })
}

async function refreshGameStoreFromStorage() {
  const mod = await import('./useGameStore.js')
  mod.useGameStore.getState().reloadPersistentProgress?.()
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message
  return 'Google login failed.'
}
