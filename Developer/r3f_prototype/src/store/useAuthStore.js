import { create } from 'zustand'
import { createFirebaseAuthClient, isFirebaseAuthConfigured } from '../lib/firebaseAuth.js'
import { hydrateCloudProgress, isFirebaseProgressHydrated, setCloudProgressUser } from '../lib/firebaseProgress.js'

let authClientPromise = null
let unsubscribeAuth = null
let googleSignInInFlight = null

export const useAuthStore = create((set, get) => ({
  status: isFirebaseAuthConfigured() ? 'checking' : 'unconfigured',
  user: null,
  error: null,
  signingIn: false,
  initialized: false,
  progressStatus: 'idle',
  progressError: null,

  initializeAuth: async () => {
    if (get().initialized) return
    // DEV 전용 E2E 우회 — 가짜 유저로 즉시 signedIn. syncCloudProgressUser를
    // 호출하지 않아 클라우드 저장/로드는 전부 no-op.
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

  signInWithGoogle: () => {
    // 타이틀 시작·계정 패널 등 여러 진입점에서 같은 순간 요청해도 OAuth 팝업은 하나만 연다.
    // 진행도 로딩이나 세션 상태를 재해석하지 않는, 로그인 요청 자체의 단일화 가드다.
    if (googleSignInInFlight) return googleSignInInFlight
    if (!isFirebaseAuthConfigured()) {
      set({ status: 'unconfigured', user: null, error: null, signingIn: false })
      return Promise.resolve(null)
    }

    set({ signingIn: true, error: null })
    googleSignInInFlight = (async () => {
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
      } finally {
        googleSignInInFlight = null
      }
    })()
    return googleSignInInFlight
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
  googleSignInInFlight = null
  useAuthStore.setState({
    status: isFirebaseAuthConfigured() ? 'checking' : 'unconfigured',
    user: null,
    error: null,
    signingIn: false,
    initialized: false,
    progressStatus: 'idle',
    progressError: null,
  })
}

function getAuthClient() {
  if (!authClientPromise) authClientPromise = createFirebaseAuthClient()
  return authClientPromise
}

function syncCloudProgressUser(user) {
  setCloudProgressUser(user)
  if (!user) {
    useAuthStore.setState({ progressStatus: 'idle', progressError: null })
    return
  }
  if (isFirebaseProgressHydrated(user)) {
    useAuthStore.setState({ progressStatus: 'ready', progressError: null })
    return
  }
  useAuthStore.setState({ progressStatus: 'loading', progressError: null })
  const requestedUid = user.uid
  const isCurrentHydratedUser = () => (
    useAuthStore.getState().user?.uid === requestedUid
    && isFirebaseProgressHydrated(user)
  )
  void (async () => {
    await hydrateCloudProgress(user)
    if (!isCurrentHydratedUser()) return
    await refreshGameStoreFromStorage().catch(() => {})
    if (!isCurrentHydratedUser()) return
    useAuthStore.setState({ progressStatus: 'ready', progressError: null })
  })().catch((error) => {
    if (useAuthStore.getState().user?.uid !== requestedUid) return
    useAuthStore.setState({ progressStatus: 'error', progressError: getErrorMessage(error) })
    if (typeof console !== 'undefined') {
      console.warn('Firebase progress hydrate failed.', error)
    }
  })
}

async function refreshGameStoreFromStorage() {
  const mod = await import('./useGameStore.js')
  mod.useGameStore.getState().reloadPersistentProgress?.()
}

function getErrorMessage(error) {
  const code = typeof error?.code === 'string' ? error.code : ''
  const status = Number(error?.status ?? error?.response?.status)
  if (
    status === 401
    || code === 'auth/id-token-expired'
    || code === 'auth/user-token-expired'
    || code === 'auth/invalid-user-token'
    || code === 'auth/requires-recent-login'
    || code === 'auth/reauthentication-required'
  ) {
    return '인증이 만료되었습니다. 다시 인증해 주세요.'
  }
  if (code === 'auth/network-request-failed') {
    return '네트워크 문제로 로그인하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.'
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google 로그인이 취소되었습니다. 다시 시도해 주세요.'
  }
  return 'Google 로그인에 실패했습니다. 다시 시도해 주세요.'
}
