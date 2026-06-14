import { create } from 'zustand'
import { createFirebaseAuthClient, isFirebaseAuthConfigured } from '../lib/firebaseAuth.js'

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

function getErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message
  return 'Google login failed.'
}
