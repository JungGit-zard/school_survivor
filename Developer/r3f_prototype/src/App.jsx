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
import { isFirebaseStudioRuntimeReady } from './lib/studioRuntimeState.js'
import { isProjectMaster } from './lib/projectAdmin.js'
import { isE2EAuthBypass } from './lib/e2eAuth.js'
import { t } from './lib/i18n.js'

const AdminPage = lazy(() => import('./components/AdminPage.jsx'))
const GraphicsStudio = lazy(() => import('./components/GraphicsStudio.jsx'))

installPlayerStorageFatalGuard()

export async function handleStudioGameSyncMessage(event) {
  if (event?.data?.type !== STUDIO_GAME_SYNC_MESSAGE) return false
  if (!event.origin || !isAllowedStudioGameOrigin(event.origin)) return false
  if (typeof window !== 'undefined' && window.opener && event.source !== window.opener) return false
  const result = await hydrateCanonicalTitlePlayer({})
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

  // ?�튜?�오??마스??계정 ?�용?�다. ?�른 구�? 계정??/graphics-studio�??�어?�면
  // ?�집�?근처까�? 가??�??�체가 치명?�이므�?창을 즉시 ?�는??
  // (?�크립트�???창이 ?�니�?브라?��?가 close�?막으므�??�래 거�? ?�면??최종 방어?�이??)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.pathname.startsWith('/graphics-studio')) return
    if (authStatus !== 'signedIn' || isProjectMaster(authUser)) return
    window.close()
  }, [authStatus, authUser])

  const ensureStudioCloudReady = useCallback(async (user = authUser) => {
    // DEV E2E??가�??�용??workspace�??��? ?�거???��? ?�는?? 공개 ?�본�??�어
    // ?�효???�격 revision???�용?�야 로비?� 게임??Studio ?�존 모델??fail-closed ?�태??
    // 빠�?지 ?�는?? ?�반 로그??Graphics Studio???�용?�별 hydrate 경로???�래 그�?�??�다.
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
    // ?�튜?�오 주소?�서??마스?��? ?�니�??�크?�페?�스�??��????�는?? 게이?��? ?�면??
    // 막아???�기???�으�??��? ?�린 것이?? (게임 주소???�레?�어 ?�이?�레?�트??무�?.)
    if (isGraphicsStudioRouteNow && !isProjectMaster(user)) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      studioRuntimeSourceRef.current = 'none'
      hydrationRef.current = null
      setStudioCloudStatus('unauthenticated')
      return false
    }
    // ?��? ??uid�??�이?�레?�트???��??�이 준비된 ?�태. 구독 ?�류 ?�으�??�태�??�패�?
    // ?�아 ?�을 ???�으므�??�태???�께 ?�돌린다 ????그러�??�시?��? ?�무 ?�도 ???�다.
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

  // 로그????uid ?�음): 공개 ?�본 ?�드(���� ����)?�서 주인�??�닝???�이?�레?�트?�다.
  // ?�공 ??studioVisualsReady가 true가 ?�어 ?��? ?�?�제�?지?�며 로그???�에???�닝??주인공이 보인??
  // ?�패(미배??미게??�?remote ?�님 ??주인공�? fail-closed�??��?(�??�즈 ?�더 금�?).
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
    // 마스?��? ?�닌 로그??계정?� ?�기???�이????부?�스?�랩?? ?�집기도 보여주�? ?�는??
  if (isGraphicsStudioRoute
    && authStatus === 'signedIn' && !isProjectMaster(authUser)) {
    return null
  }
  // ?�튜?�오 ?�구 로그?? /graphics-studio??로그?�해??진입?�다(로그??지??2�?�??�나).
  // ���� ���� ?�이?�레?�트�?studioReady가 로그???�에??true가 ?????�으므�?
  // 로그???�이 ?�집기�? ?�려 Apply가 unauthenticated�??�패?��? ?�도�?signedIn???�께 ?�구?�다.
  if (isGraphicsStudioRoute
    && (!isProjectMaster(authUser) || authStatus !== 'signedIn' || !studioReady)) {
    // ?�이?�레?�트가 ?�패�??�나�????�면??막다�?길이 ?�다(?�과??authStatus/uid 변?�로�??�실??.
    // ?�로고침 ?�이 같�? 로그?�으�??�시 ?�도?????�게 ?�시?�만 ?�어?�다 ??fail-closed??그�?로다.
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

  // ?�반 게임 주소??진입 규칙:
  // 주소 ?�속 ??ReadyGameApp 즉시 ?�성 ??초기 title ?�면 ??TitleSceneCanvas.
  // Google 로그???�태?????�더�?막�? ?��?�? ?�?��???게임 ?�작?� 미로그인 ?�용?��?
  // Google 로그?�으�?보낸?? 로그???�공 ?�에??Firebase 진행??Studio 준�??�패가 ?�어??
  // 로비·?�테?��? 진입??조용???��? ?�고 계속 진행?�다.
  return (
    <ReadyGameApp
      authUser={authUser}
      progressStatus={progressStatus}
      studioVisualsReady={studioReady}
    />
  )
}

function getStudioBootstrapMessage(authStatus, studioCloudStatus) {
  if (authStatus === 'checking') return t('app.checkingAuth')
  if (authStatus !== 'signedIn') return t('app.studioNeedsSignIn')
  if (studioCloudStatus === 'loading') return t('app.studioLoading')
  // ??계정???�크?�페?�스가 ?�직 ?�는 것과, ?�는??�??��? 것�? ?�용?��? ??조치가 ?�르??
  if (studioCloudStatus === 'missing-remote') return t('app.studioNoWorkspace')
  if (studioCloudStatus === 'account-conflict') return t('app.studioAccountConflict')
  // 마스???�용 ?�면?�라 ?�인 코드�?그�?�??�출?�다 ??뭉뚱그린 문구로는 ?�인??�?좁힌??
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





