import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import GoogleAccountPanel from './components/GoogleAccountPanel.jsx'
import { hydrateFirebaseStudio, setFirebaseStudioUser } from './lib/firebaseStudio.js'
import { installPlayerStorageFatalGuard, isFirebaseProgressHydrated } from './lib/firebaseProgress.js'
import { STUDIO_GAME_SYNC_MESSAGE, isAllowedStudioGameOrigin } from './lib/studioGameBridge.js'
import { useAuthStore } from './store/useAuthStore.js'
import { isFirebaseStudioRuntimeReady } from './lib/studioRuntimeState.js'

const AdminPage = lazy(() => import('./components/AdminPage.jsx'))
const GraphicsStudio = lazy(() => import('./components/GraphicsStudio.jsx'))
const ReadyGameApp = lazy(() => import('./components/ReadyGameApp.jsx'))

installPlayerStorageFatalGuard()

export async function handleStudioGameSyncMessage(event) {
  if (event?.data?.type !== STUDIO_GAME_SYNC_MESSAGE) return false
  if (!event.origin || !isAllowedStudioGameOrigin(event.origin)) return false
  if (typeof window !== 'undefined' && window.opener && event.source !== window.opener) return false
  const user = useAuthStore.getState().user
  setFirebaseStudioUser(user)
  const result = await hydrateFirebaseStudio({ user })
  return result?.status === 'remote-applied'
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    void handleStudioGameSyncMessage(event)
  })
}

export default function App() {
  const authStatus = useAuthStore((state) => state.status)
  const authUser = useAuthStore((state) => state.user)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const progressStatus = useAuthStore((state) => state.progressStatus)
  const progressError = useAuthStore((state) => state.progressError)
  const [studioCloudStatus, setStudioCloudStatus] = useState(
    () => isFirebaseStudioRuntimeReady() ? 'remote-applied' : 'idle',
  )
  const hydratedUidRef = useRef('')
  const hydrationRef = useRef(null)

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  const ensureStudioCloudReady = useCallback(async (user = authUser) => {
    const uid = typeof user?.uid === 'string' ? user.uid.trim() : ''
    if (!uid) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      hydrationRef.current = null
      setStudioCloudStatus('unauthenticated')
      return false
    }
    if (hydratedUidRef.current === uid && isFirebaseStudioRuntimeReady()) return true
    if (hydrationRef.current?.uid === uid) return hydrationRef.current.promise

    setFirebaseStudioUser(user)
    setStudioCloudStatus('loading')
    const promise = hydrateFirebaseStudio({ user })
      .then((result) => {
        const ready = result?.status === 'remote-applied'
        hydratedUidRef.current = ready ? uid : ''
        setStudioCloudStatus(result?.status ?? 'read-failed')
        return ready
      })
      .catch(() => {
        hydratedUidRef.current = ''
        setStudioCloudStatus('read-failed')
        return false
      })
      .finally(() => {
        if (hydrationRef.current?.promise === promise) hydrationRef.current = null
      })
    hydrationRef.current = { uid, promise }
    return promise
  }, [authUser])

  useEffect(() => {
    if (authStatus === 'signedIn' && authUser?.uid) {
      void ensureStudioCloudReady(authUser)
      return
    }
    if (['signedOut', 'unconfigured', 'error'].includes(authStatus)) {
      void ensureStudioCloudReady(null)
    }
  }, [authStatus, authUser, ensureStudioCloudReady])

  const studioReady = studioCloudStatus === 'remote-applied'
    && isFirebaseStudioRuntimeReady()
  const isGraphicsStudioRoute = typeof window !== 'undefined'
    && window.location.pathname.startsWith('/graphics-studio')
  if (isGraphicsStudioRoute && !studioReady) {
    return (
      <AppBootstrap message={getStudioBootstrapMessage(authStatus, studioCloudStatus)} />
    )
  }

  if (isGraphicsStudioRoute) {
    return (
      <Suspense fallback={<div style={styles.routeLoading}>그래픽 스튜디오 불러오는 중…</div>}>
        <GraphicsStudio />
      </Suspense>
    )
  }

  const playerProgressReady = isFirebaseProgressHydrated(authUser)
  if (authStatus === 'signedIn' && progressStatus === 'error' && !playerProgressReady) {
    return <FirebaseProgressFailureDialog error={progressError} />
  }
  if (!playerProgressReady) {
    return (
      <AppBootstrap
        message={getPlayerProgressBootstrapMessage(authStatus, progressStatus, progressError)}
      />
    )
  }

  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  if (isAdminRoute) {
    return (
      <Suspense fallback={<div style={styles.routeLoading}>관리 도구 불러오는 중…</div>}>
        <AdminPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div style={styles.routeLoading}>게임 데이터를 준비하는 중…</div>}>
      <ReadyGameApp
        authUser={authUser}
        studioReady={studioReady}
        ensureStudioCloudReady={ensureStudioCloudReady}
      />
    </Suspense>
  )
}

function getStudioBootstrapMessage(authStatus, studioCloudStatus) {
  if (authStatus === 'checking') return 'Google 로그인 상태를 확인하는 중입니다.'
  if (authStatus !== 'signedIn') return 'Google 로그인 후 Firebase Studio 데이터를 불러옵니다.'
  if (studioCloudStatus === 'loading') return 'Firebase Studio 데이터를 불러오는 중입니다.'
  return 'Firebase Studio 데이터를 불러오지 못했습니다. 로그인 상태와 연결을 확인해 주세요.'
}

function getPlayerProgressBootstrapMessage(authStatus, progressStatus, progressError) {
  if (authStatus === 'checking') return 'Google 로그인 상태를 확인하는 중입니다.'
  if (authStatus !== 'signedIn') return 'Google 로그인 후 Firebase 계정 데이터를 불러옵니다.'
  if (progressStatus === 'loading') return 'Firebase 계정 데이터를 불러오는 중입니다.'
  if (progressStatus === 'error') return `Firebase 계정 데이터를 불러오지 못했습니다: ${progressError ?? '원격 저장소를 확인해 주세요.'}`
  return 'Firebase 계정 데이터 준비가 끝나야 로비와 게임에 들어갈 수 있습니다.'
}

function AppBootstrap({ message }) {
  return (
    <main style={styles.studioBootstrap}>
      <GoogleAccountPanel />
      <p style={styles.studioBootstrapMessage}>{message}</p>
    </main>
  )
}

function FirebaseProgressFailureDialog({ error }) {
  return (
    <main style={styles.studioBootstrap}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="firebase-progress-failure-title"
        aria-describedby="firebase-progress-failure-description"
        style={styles.fatalDialog}
      >
        <h1 id="firebase-progress-failure-title" style={styles.fatalTitle}>
          Firebase 계정 데이터 연결 오류
        </h1>
        <p id="firebase-progress-failure-description" style={styles.fatalMessage}>
          원격 계정 데이터를 불러오지 못해 실행을 중단했습니다.
          로컬 데이터로 대체하지 않습니다.
        </p>
        <p style={styles.fatalDetail}>{error ?? 'Firebase 원격 저장소를 확인해 주세요.'}</p>
        <GoogleAccountPanel />
      </section>
    </main>
  )
}

const styles = {
  studioBootstrap: {
    width: '100vw',
    minHeight: '100vh',
    display: 'grid',
    placeContent: 'center',
    gap: 16,
    padding: 24,
    color: '#f7f3e8',
    background: '#180101',
    textAlign: 'center',
  },
  studioBootstrapMessage: {
    margin: 0,
    fontWeight: 800,
  },
  fatalDialog: {
    width: 'min(560px, calc(100vw - 32px))',
    display: 'grid',
    gap: 14,
    padding: 24,
    border: '4px solid #ff355d',
    borderRadius: 20,
    background: '#250108',
    textAlign: 'left',
  },
  fatalTitle: {
    margin: 0,
    color: '#ff5a77',
    fontSize: 'clamp(24px, 5vw, 34px)',
  },
  fatalMessage: {
    margin: 0,
    fontWeight: 900,
    lineHeight: 1.5,
  },
  fatalDetail: {
    margin: 0,
    color: '#ffd5dc',
    overflowWrap: 'anywhere',
  },
  viewport: {
    width: '100vw',
    height: '100vh',
    background: '#0a0810',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLoading: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#111827',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
    fontWeight: 800,
  },
}
