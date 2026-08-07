import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import GoogleAccountPanel from './components/GoogleAccountPanel.jsx'
import ReadyGameApp from './components/ReadyGameApp.jsx'
import {
  hydrateFirebaseStudio,
  initializeFirebaseStudioIfMissing,
  hydrateCanonicalTitlePlayer,
  setFirebaseStudioUser,
  subscribeFirebaseStudio,
} from './lib/firebaseStudio.js'
import { installPlayerStorageFatalGuard } from './lib/firebaseProgress.js'
import { STUDIO_GAME_SYNC_MESSAGE, isAllowedStudioGameOrigin } from './lib/studioGameBridge.js'
import { useAuthStore } from './store/useAuthStore.js'
import { commitFirebaseStudioRuntime, isFirebaseStudioRuntimeReady } from './lib/studioRuntimeState.js'
import { isProjectMaster } from './lib/projectAdmin.js'
import { isE2EAuthBypass, isE2EGraphicsStudioBypass } from './lib/e2eAuth.js'
import { t } from './lib/i18n.js'

const AdminPage = lazy(() => import('./components/AdminPage.jsx'))
const GraphicsStudio = lazy(() => import('./components/GraphicsStudio.jsx'))

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
  const progressStatus = useAuthStore((state) => state.progressStatus)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const [studioCloudStatus, setStudioCloudStatus] = useState(
    () => isFirebaseStudioRuntimeReady() ? 'remote-applied' : 'idle',
  )
  const hydratedUidRef = useRef('')
  const studioRuntimeSourceRef = useRef(isFirebaseStudioRuntimeReady() ? 'unknown' : 'none')
  const hydrationRef = useRef(null)

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  // 스튜디오는 마스터 계정 전용이다. 다른 구글 계정이 /graphics-studio로 들어오면
  // 편집기 근처까지 가는 것 자체가 치명적이므로 창을 즉시 닫는다.
  // (스크립트로 연 창이 아니면 브라우저가 close를 막으므로 아래 거부 화면이 최종 방어선이다.)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.pathname.startsWith('/graphics-studio')) return
    if (isE2EGraphicsStudioBypass() || isE2EAuthBypass()) return
    if (authStatus !== 'signedIn' || isProjectMaster(authUser)) return
    window.close()
  }, [authStatus, authUser])

  const ensureStudioCloudReady = useCallback(async (user = authUser) => {
    // DEV E2E는 가짜 사용자 workspace를 절대 읽거나 쓰지 않는다. 공개 정본만 읽어
    // 유효한 원격 revision을 적용해야 로비와 게임의 Studio 의존 모델이 fail-closed 상태에
    // 빠지지 않는다. 일반 로그인/Graphics Studio의 사용자별 hydrate 경로는 아래 그대로 둔다.
    if (isE2EAuthBypass()) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      studioRuntimeSourceRef.current = 'none'
      hydrationRef.current = null
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/graphics-studio')) {
        setStudioCloudStatus('unauthenticated')
        return false
      }
      setStudioCloudStatus('loading')
      const result = await hydrateCanonicalTitlePlayer({}).catch(() => ({ status: 'read-failed' }))
      const ready = result?.status === 'remote-applied'
      studioRuntimeSourceRef.current = ready ? 'canonical' : 'none'
      setStudioCloudStatus(result?.status ?? 'read-failed')
      return ready
    }
    const uid = typeof user?.uid === 'string' ? user.uid.trim() : ''
    if (!uid) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      studioRuntimeSourceRef.current = 'none'
      hydrationRef.current = null
      setStudioCloudStatus('unauthenticated')
      return false
    }
    const isGraphicsStudioRouteNow = typeof window !== 'undefined'
      && window.location.pathname.startsWith('/graphics-studio')
    // 스튜디오 주소에서는 마스터가 아니면 워크스페이스를 읽지도 않는다. 게이트가 화면을
    // 막아도 여기서 읽으면 이미 뚫린 것이다. (게임 주소의 플레이어 하이드레이트는 무관.)
    if (isGraphicsStudioRouteNow && !isProjectMaster(user)) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      studioRuntimeSourceRef.current = 'none'
      hydrationRef.current = null
      setStudioCloudStatus('unauthenticated')
      return false
    }
    // 이미 이 uid로 하이드레이트돼 런타임이 준비된 상태. 구독 오류 등으로 상태만 실패로
    // 남아 있을 수 있으므로 상태도 함께 되돌린다 — 안 그러면 재시도가 아무 일도 안 한다.
    if (hydratedUidRef.current === uid && isFirebaseStudioRuntimeReady()) {
      setStudioCloudStatus('remote-applied')
      return true
    }
    if (!isGraphicsStudioRouteNow && studioRuntimeSourceRef.current === 'canonical' && isFirebaseStudioRuntimeReady()) {
      setStudioCloudStatus('remote-applied')
      return true
    }
    if (hydrationRef.current?.uid === uid) return hydrationRef.current.promise

    setFirebaseStudioUser(user)
    setStudioCloudStatus('loading')
    const promise = hydrateFirebaseStudio({ user })
      .then(async (result) => {
        const ready = result?.status === 'remote-applied'
        if (ready) {
          hydratedUidRef.current = uid
          studioRuntimeSourceRef.current = 'user'
          setStudioCloudStatus('remote-applied')
          return true
        }
        hydratedUidRef.current = ''

        if (isGraphicsStudioRouteNow && isProjectMaster(user) && result?.status === 'missing-remote') {
          const initialized = await initializeFirebaseStudioIfMissing({ user }).catch(() => ({ status: 'write-failed' }))
          if (initialized?.status === 'created' || initialized?.status === 'already-exists') {
            const hydrated = await hydrateFirebaseStudio({ user })
            if (hydrated?.status === 'remote-applied') {
              hydratedUidRef.current = uid
              studioRuntimeSourceRef.current = 'user'
              setStudioCloudStatus('remote-applied')
              return true
            }
            setStudioCloudStatus(hydrated?.status ?? 'read-failed')
            return false
          }
          setStudioCloudStatus(initialized?.status ?? 'write-failed')
          return false
        }
        if (!isGraphicsStudioRouteNow && result?.status === 'missing-remote') {
          if (studioRuntimeSourceRef.current === 'canonical' && isFirebaseStudioRuntimeReady()) {
            setStudioCloudStatus('remote-applied')
            return true
          }
          const canonical = await hydrateCanonicalTitlePlayer({}).catch(() => ({ status: 'read-failed' }))
          const canonicalReady = canonical?.status === 'remote-applied'
          studioRuntimeSourceRef.current = canonicalReady ? 'canonical' : 'none'
          setStudioCloudStatus(canonicalReady ? 'remote-applied' : (canonical?.status ?? 'read-failed'))
          return canonicalReady
        }
        studioRuntimeSourceRef.current = 'none'
        setStudioCloudStatus(result?.status ?? 'read-failed')
        return false
      })
      .catch(() => {
        hydratedUidRef.current = ''
        studioRuntimeSourceRef.current = 'none'
        setStudioCloudStatus('read-failed')
        return false
      })
      .finally(() => {
        if (hydrationRef.current?.promise === promise) hydrationRef.current = null
      })
    hydrationRef.current = { uid, promise }
    return promise
  }, [authUser])

  // 로그인 전(uid 없음): 공개 정본 노드(canonicalTitlePlayer)에서 주인공 튜닝을 하이드레이트한다.
  // 성공 시 studioVisualsReady가 true가 되어 절대 대전제를 지키며 로그인 전에도 튜닝된 주인공이 보인다.
  // 실패(미배포/미게시)면 remote 아님 → 주인공은 fail-closed로 숨김(맨 포즈 렌더 금지).
  const hydratePreLoginCanonicalPlayer = useCallback(async () => {
    setFirebaseStudioUser(null)
    hydratedUidRef.current = ''
    hydrationRef.current = null
    const result = await hydrateCanonicalTitlePlayer({}).catch(() => ({ status: 'read-failed' }))
    studioRuntimeSourceRef.current = result?.status === 'remote-applied' ? 'canonical' : 'none'
    setStudioCloudStatus(result?.status === 'remote-applied'
      ? 'remote-applied'
      : (result?.status ?? 'unauthenticated'))
    return result?.status === 'remote-applied'
  }, [])

  useEffect(() => {
    if (authStatus === 'signedIn' && authUser?.uid) {
      void ensureStudioCloudReady(authUser)
      return
    }
    if (['signedOut', 'unconfigured', 'error'].includes(authStatus)) {
      void hydratePreLoginCanonicalPlayer()
    }
  }, [authStatus, authUser, ensureStudioCloudReady, hydratePreLoginCanonicalPlayer])

  useEffect(() => {
    if (isE2EAuthBypass()) return undefined
    if (
      authStatus !== 'signedIn'
      || !authUser?.uid
      || studioCloudStatus !== 'remote-applied'
      || !isFirebaseStudioRuntimeReady()
      || studioRuntimeSourceRef.current !== 'user'
      || hydratedUidRef.current !== authUser.uid
    ) return undefined

    let cancelled = false
    let unsubscribe = null
    void subscribeFirebaseStudio({
      user: authUser,
      onResult: (result) => {
        if (cancelled) return
        if (['remote-applied', 'current-revision', 'deferred-local-dirty'].includes(result?.status)) {
          setStudioCloudStatus('remote-applied')
          return
        }
        if (result?.status !== 'stale-user') {
          setStudioCloudStatus(result?.status ?? 'subscription-error')
        }
      },
    }).then((result) => {
      if (cancelled) {
        result?.unsubscribe?.()
        return
      }
      if (result?.status === 'subscribed') {
        unsubscribe = result.unsubscribe
      } else {
        setStudioCloudStatus(result?.status ?? 'subscription-error')
      }
    }).catch(() => {
      if (!cancelled) setStudioCloudStatus('subscription-error')
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [authStatus, authUser?.uid, studioCloudStatus])

  const studioReady = studioCloudStatus === 'remote-applied'
    && isFirebaseStudioRuntimeReady()
  const isGraphicsStudioRoute = typeof window !== 'undefined'
    && window.location.pathname.startsWith('/graphics-studio')
  const isDevGraphicsStudioBypass = isGraphicsStudioRoute && isE2EGraphicsStudioBypass()
  if (isDevGraphicsStudioBypass && !isFirebaseStudioRuntimeReady()) {
    commitFirebaseStudioRuntime({}, { revision: 0 })
  }
  // 마스터가 아닌 로그인 계정은 여기서 끝이다 — 부트스트랩도, 편집기도 보여주지 않는다.
  if (isGraphicsStudioRoute && !isDevGraphicsStudioBypass
    && authStatus === 'signedIn' && !isProjectMaster(authUser)) {
    return null
  }
  // 스튜디오 입구 로그인: /graphics-studio는 로그인해야 진입한다(로그인 지점 2곳 중 하나).
  // canonicalTitlePlayer 하이드레이트로 studioReady가 로그인 전에도 true가 될 수 있으므로,
  // 로그인 없이 편집기가 열려 Apply가 unauthenticated로 실패하지 않도록 signedIn을 함께 요구한다.
  if (isGraphicsStudioRoute && !isDevGraphicsStudioBypass && (authStatus !== 'signedIn' || !studioReady)) {
    // 하이드레이트가 실패로 끝나면 이 화면이 막다른 길이 된다(효과는 authStatus/uid 변화로만 재실행).
    // 새로고침 없이 같은 로그인으로 다시 시도할 수 있게 재시도만 열어둔다 — fail-closed는 그대로다.
    const canRetryStudio = authStatus === 'signedIn'
      && !['loading', 'idle'].includes(studioCloudStatus)
    return (
      <AppBootstrap
        message={getStudioBootstrapMessage(authStatus, studioCloudStatus)}
        onRetry={canRetryStudio ? () => { void ensureStudioCloudReady(authUser) } : null}
      />
    )
  }

  if (isGraphicsStudioRoute) {
    return (
      <Suspense fallback={<div style={styles.routeLoading}>{t('loading.studio')}</div>}>
        <GraphicsStudio />
      </Suspense>
    )
  }

  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  if (isAdminRoute) {
    if (authStatus === 'checking') {
      return <AppBootstrap message={t('app.checkingAuth')} />
    }
    if (authStatus === 'error' || authStatus === 'unconfigured') {
      return <AdminAccessDenied reason={authStatus === 'error'
        ? t('app.authFailed')
        : t('app.authUnconfigured')}
      />
    }
    if (authStatus !== 'signedIn' || !authUser?.uid) {
      return <AppBootstrap message={t('app.adminGoogleOnly')} />
    }
    if (!isProjectMaster(authUser)) {
      return <AdminAccessDenied reason={t('app.adminDeniedReason')} />
    }
    return (
      <Suspense fallback={<div style={styles.routeLoading}>{t('loading.admin')}</div>}>
        <AdminPage />
      </Suspense>
    )
  }

  // 일반 게임 주소의 진입 규칙:
  // 주소 접속 → ReadyGameApp 즉시 생성 → 초기 title 화면 → TitleSceneCanvas.
  // Google 로그인/Firebase 진행도/Studio 데이터 준비 상태는 일반 게임 렌더·로비·스테이지 진입을
  // 절대 차단하지 않는다. 로그인은 계정 연동/클라우드 저장을 위한 선택 기능이고,
  // 미로그인·하이드레이트 실패 세션은 메모리 기본 진행도로 즉시 플레이한다.
  return (
    <ReadyGameApp
      authUser={authUser}
      progressStatus={progressStatus}
      studioVisualsReady={studioReady}
      ensureStudioCloudReady={ensureStudioCloudReady}
    />
  )
}

function getStudioBootstrapMessage(authStatus, studioCloudStatus) {
  if (authStatus === 'checking') return t('app.checkingAuth')
  if (authStatus !== 'signedIn') return t('app.studioNeedsSignIn')
  if (studioCloudStatus === 'loading') return t('app.studioLoading')
  // 이 계정에 워크스페이스가 아직 없는 것과, 있는데 못 읽은 것은 사용자가 할 조치가 다르다.
  if (studioCloudStatus === 'missing-remote') return t('app.studioNoWorkspace')
  if (studioCloudStatus === 'account-conflict') return t('app.studioAccountConflict')
  // 마스터 전용 화면이라 원인 코드를 그대로 노출한다 — 뭉뚱그린 문구로는 원인을 못 좁힌다.
  return `${t('app.studioFailed')} (${studioCloudStatus})`
}

function AppBootstrap({ message, onRetry = null }) {
  return (
    <main style={styles.studioBootstrap}>
      <GoogleAccountPanel />
      <p style={styles.studioBootstrapMessage}>{message}</p>
      {onRetry && (
        <button type="button" style={styles.studioBootstrapRetry} onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </main>
  )
}

function AdminAccessDenied({ reason }) {
  return (
    <main style={styles.studioBootstrap}>
      <section role="alertdialog" aria-modal="true" style={styles.fatalDialog}>
        <h1 style={styles.fatalTitle}>{t('app.adminDeniedTitle')}</h1>
        <p style={styles.fatalMessage}>{reason}</p>
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
  studioBootstrapRetry: {
    justifySelf: 'center',
    minHeight: 44,
    padding: '10px 22px',
    border: '3px solid #f7f3e8',
    borderRadius: 12,
    background: '#3a0d0d',
    color: '#f7f3e8',
    fontWeight: 900,
    cursor: 'pointer',
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
