import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import GoogleAccountPanel from './components/GoogleAccountPanel.jsx'
import {
  applyFirebaseStudioDatasets,
  hydrateFirebaseStudio,
  initializeFirebaseStudioIfMissing,
  hydrateCanonicalTitlePlayer,
  setFirebaseStudioUser,
  subscribeFirebaseStudio,
} from './lib/firebaseStudio.js'
import { installPlayerStorageFatalGuard } from './lib/firebaseProgress.js'
import {
  STUDIO_GAME_SYNC_ACK_MESSAGE,
  STUDIO_GAME_SYNC_CHANNEL,
  STUDIO_GAME_SYNC_MESSAGE,
  STUDIO_GAME_SYNC_READY_MESSAGE,
  isAllowedStudioGameOrigin,
} from './lib/studioGameBridge.js'
import { useAuthStore } from './store/useAuthStore.js'
import { isFirebaseStudioRuntimeReady } from './lib/studioRuntimeState.js'
import { isProjectMaster } from './lib/projectAdmin.js'
import { t } from './lib/i18n.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import {
  getInspectionPhase,
  subscribeInspectionMode,
} from './lib/firebaseInspectionMode.js'

const AdminPage = lazy(() => import('./components/AdminPage.jsx'))
const GraphicsStudio = lazy(() => import('./components/GraphicsStudio.jsx'))
const ReadyGameApp = lazy(() => import('./components/ReadyGameApp.jsx'))
const InspectionModeScreen = lazy(() => import('./components/InspectionModeScreen.jsx'))

installPlayerStorageFatalGuard()

export async function handleStudioGameSyncMessage(event) {
  if (event?.data?.type !== STUDIO_GAME_SYNC_MESSAGE) return false
  if (!event.origin || !isAllowedStudioGameOrigin(event.origin)) return false
  if (typeof window !== 'undefined' && window.opener && event.source !== window.opener) return false
  if (event.data.force && event.data.datasets) {
    // Studio Apply is allowed to force-refresh the game only after Firebase has
    // accepted the same datasets and returned the canonical revision. Falling
    // back to the current local revision (or 0) would let an unsaved draft look
    // committed and can desync every open game window.
    const revision = Number.isInteger(event.data.revision) && event.data.revision > 0
      ? event.data.revision
      : null
    if (applyFirebaseStudioDatasets(event.data.datasets, { revision })) {
      event.source?.postMessage?.({
        type: STUDIO_GAME_SYNC_ACK_MESSAGE,
        syncId: event.data.syncId ?? null,
        revision,
      }, event.origin)
      return true
    }
  }
  const result = await hydrateCanonicalTitlePlayer({})
  return result?.status === 'remote-applied'
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    void handleStudioGameSyncMessage(event)
  })
  window.addEventListener('load', () => {
    window.opener?.postMessage?.({ type: STUDIO_GAME_SYNC_READY_MESSAGE }, window.location.origin)
  })
  if (!window.location.pathname.startsWith('/graphics-studio') && typeof BroadcastChannel !== 'undefined') {
    const studioGameChannel = new BroadcastChannel(STUDIO_GAME_SYNC_CHANNEL)
    studioGameChannel.addEventListener('message', ({ data }) => {
      if (data?.type !== STUDIO_GAME_SYNC_MESSAGE || !data.force || !data.datasets) return
      const revision = Number.isInteger(data.revision) && data.revision > 0 ? data.revision : null
      applyFirebaseStudioDatasets(data.datasets, { revision })
    })
  }
}

export default function App() {
  const authStatus = useAuthStore((state) => state.status)
  const authUser = useAuthStore((state) => state.user)
  const progressStatus = useAuthStore((state) => state.progressStatus)
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const [studioCloudStatus, setStudioCloudStatus] = useState(
    () => isFirebaseStudioRuntimeReady() ? 'remote-applied' : 'idle',
  )
  const [inspectionState, setInspectionState] = useState(null)
  const [inspectionNowMs, setInspectionNowMs] = useState(() => Date.now())
  const hydratedUidRef = useRef('')
  const studioRuntimeSourceRef = useRef(isFirebaseStudioRuntimeReady() ? 'unknown' : 'none')
  const hydrationRef = useRef(null)
  const isGraphicsStudioRoute = typeof window !== 'undefined'
    && window.location.pathname.startsWith('/graphics-studio')
  const isAdminRoute = typeof window !== 'undefined'
    && window.location.pathname.startsWith('/admin')

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    let unsubscribe = null
    let disposed = false
    const result = subscribeInspectionMode({
      onState: (nextState) => {
        if (!disposed) setInspectionState(nextState ?? null)
      },
      onError: () => {
        // A subscription failure must not prevent normal game access.
        if (!disposed) setInspectionState(null)
      },
    })
    if (typeof result === 'function') {
      unsubscribe = result
    } else if (result?.then) {
      void result.then((nextUnsubscribe) => {
        if (disposed) nextUnsubscribe?.()
        else unsubscribe = nextUnsubscribe
      }).catch(() => {
        if (!disposed) setInspectionState(null)
      })
    }
    return () => {
      disposed = true
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    const phase = getInspectionPhase(inspectionState, inspectionNowMs)
    const transitionAt = phase === 'scheduled'
      ? Number(inspectionState?.startsAt)
      : phase === 'active'
        ? Number(inspectionState?.endsAt)
        : null
    if (!Number.isFinite(transitionAt)) return undefined
    const timer = window.setTimeout(
      () => setInspectionNowMs(Date.now()),
      Math.max(0, transitionAt - Date.now() + 1),
    )
    return () => window.clearTimeout(timer)
  }, [inspectionState, inspectionNowMs])

  // ?ㅽ뒠?붿삤??留덉뒪??怨꾩젙 ?꾩슜?대떎. ?ㅻⅨ 援ш? 怨꾩젙??/graphics-studio濡??ㅼ뼱?ㅻ㈃
  // ?몄쭛湲?洹쇱쿂源뚯? 媛??寃??먯껜媛 移섎챸?곸씠誘濡?李쎌쓣 利됱떆 ?ル뒗??
  // (?ㅽ겕由쏀듃濡???李쎌씠 ?꾨땲硫?釉뚮씪?곗?媛 close瑜?留됱쑝誘濡??꾨옒 嫄곕? ?붾㈃??理쒖쥌 諛⑹뼱?좎씠??)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.pathname.startsWith('/graphics-studio')) return
    if (authStatus !== 'signedIn' || isProjectMaster(authUser)) return
    window.close()
  }, [authStatus, authUser])

  const ensureStudioCloudReady = useCallback(async (user = authUser) => {
    const isGraphicsStudioRouteNow = typeof window !== 'undefined'
      && window.location.pathname.startsWith('/graphics-studio')
    if (!isGraphicsStudioRouteNow) return false
    // DEV E2E??媛吏??ъ슜??workspace瑜??덈? ?쎄굅???곗? ?딅뒗?? 怨듦컻 ?뺣낯留??쎌뼱
    // ?좏슚???먭꺽 revision???곸슜?댁빞 濡쒕퉬? 寃뚯엫??Studio ?섏〈 紐⑤뜽??fail-closed ?곹깭??
    // 鍮좎?吏 ?딅뒗?? ?쇰컲 濡쒓렇??Graphics Studio???ъ슜?먮퀎 hydrate 寃쎈줈???꾨옒 洹몃?濡??붾떎.
    const uid = typeof user?.uid === 'string' ? user.uid.trim() : ''
    if (!uid) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      studioRuntimeSourceRef.current = 'none'
      hydrationRef.current = null
      setStudioCloudStatus('unauthenticated')
      return false
    }
    // ?ㅽ뒠?붿삤 二쇱냼?먯꽌??留덉뒪?곌? ?꾨땲硫??뚰겕?ㅽ럹?댁뒪瑜??쎌????딅뒗?? 寃뚯씠?멸? ?붾㈃??
    // 留됱븘???ш린???쎌쑝硫??대? ?ル┛ 寃껋씠?? (寃뚯엫 二쇱냼???뚮젅?댁뼱 ?섏씠?쒕젅?댄듃??臾닿?.)
    if (!isProjectMaster(user)) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      studioRuntimeSourceRef.current = 'none'
      hydrationRef.current = null
      setStudioCloudStatus('unauthenticated')
      return false
    }
    // ?대? ??uid濡??섏씠?쒕젅?댄듃???고??꾩씠 以鍮꾨맂 ?곹깭. 援щ룆 ?ㅻ쪟 ?깆쑝濡??곹깭留??ㅽ뙣濡?
    // ?⑥븘 ?덉쓣 ???덉쑝誘濡??곹깭???④퍡 ?섎룎由곕떎 ????洹몃윭硫??ъ떆?꾧? ?꾨Т ?쇰룄 ???쒕떎.
    if (hydratedUidRef.current === uid && isFirebaseStudioRuntimeReady()) {
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
          studioRuntimeSourceRef.current = 'studio'
          setStudioCloudStatus('remote-applied')
          return true
        }
        hydratedUidRef.current = ''

        if (result?.status === 'missing-remote') {
          const initialized = await initializeFirebaseStudioIfMissing({ user }).catch(() => ({ status: 'write-failed' }))
          if (initialized?.status === 'created' || initialized?.status === 'already-exists') {
            const hydrated = await hydrateFirebaseStudio({ user })
            if (hydrated?.status === 'remote-applied') {
              hydratedUidRef.current = uid
              studioRuntimeSourceRef.current = 'studio'
              setStudioCloudStatus('remote-applied')
              return true
            }
            setStudioCloudStatus(hydrated?.status ?? 'read-failed')
            return false
          }
          setStudioCloudStatus(initialized?.status ?? 'write-failed')
          return false
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

  useEffect(() => {
    if (!isGraphicsStudioRoute) return
    if (authStatus === 'signedIn' && authUser?.uid) {
      void ensureStudioCloudReady(authUser)
      return
    }
    if (['signedOut', 'unconfigured', 'error'].includes(authStatus)) {
      setFirebaseStudioUser(null)
      hydratedUidRef.current = ''
      hydrationRef.current = null
      studioRuntimeSourceRef.current = 'none'
      setStudioCloudStatus('unauthenticated')
    }
  }, [isGraphicsStudioRoute, authStatus, authUser, ensureStudioCloudReady])

  useEffect(() => {
    if (!isGraphicsStudioRoute) return undefined
    if (
      authStatus !== 'signedIn'
      || !authUser?.uid
      || studioCloudStatus !== 'remote-applied'
      || !isFirebaseStudioRuntimeReady()
      || studioRuntimeSourceRef.current !== 'studio'
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
  }, [isGraphicsStudioRoute, authStatus, authUser?.uid, studioCloudStatus])

  const studioReady = studioCloudStatus === 'remote-applied'
    && isFirebaseStudioRuntimeReady()
  // 留덉뒪?곌? ?꾨땶 濡쒓렇??怨꾩젙? ?ш린???앹씠????遺?몄뒪?몃옪?? ?몄쭛湲곕룄 蹂댁뿬二쇱? ?딅뒗??
  if (isGraphicsStudioRoute
    && authStatus === 'signedIn' && !isProjectMaster(authUser)) {
    return null
  }
  // ?ㅽ뒠?붿삤 ?낃뎄 濡쒓렇?? /graphics-studio??濡쒓렇?명빐??吏꾩엯?쒕떎(濡쒓렇??吏??2怨?以??섎굹).
  // 공개 정본 ?섏씠?쒕젅?댄듃濡?studioReady媛 濡쒓렇???꾩뿉??true媛 ?????덉쑝誘濡?
  // 濡쒓렇???놁씠 ?몄쭛湲곌? ?대젮 Apply媛 unauthenticated濡??ㅽ뙣?섏? ?딅룄濡?signedIn???④퍡 ?붽뎄?쒕떎.
  if (isGraphicsStudioRoute && (authStatus !== 'signedIn' || !isProjectMaster(authUser) || !studioReady)) {
    // ?섏씠?쒕젅?댄듃媛 ?ㅽ뙣濡??앸굹硫????붾㈃??留됰떎瑜?湲몄씠 ?쒕떎(?④낵??authStatus/uid 蹂?붾줈留??ъ떎??.
    // ?덈줈怨좎묠 ?놁씠 媛숈? 濡쒓렇?몄쑝濡??ㅼ떆 ?쒕룄?????덇쾶 ?ъ떆?꾨쭔 ?댁뼱?붾떎 ??fail-closed??洹몃?濡쒕떎.
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
      <ErrorBoundary fallback={({ retry, reload }) => <RouteLoadFailure label={t('loading.studio')} retry={retry} reload={reload} />}>
        <Suspense fallback={<div style={styles.routeLoading}>{t('loading.studio')}</div>}>
          <GraphicsStudio />
        </Suspense>
      </ErrorBoundary>
    )
  }

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
      <ErrorBoundary fallback={({ retry, reload }) => <RouteLoadFailure label={t('loading.admin')} retry={retry} reload={reload} />}>
        <Suspense fallback={<div style={styles.routeLoading}>{t('loading.admin')}</div>}>
          <AdminPage user={authUser} />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (getInspectionPhase(inspectionState, inspectionNowMs) === 'active') {
    return (
      <Suspense fallback={<div style={styles.routeLoading}>점검 화면을 불러오는 중입니다.</div>}>
        <InspectionModeScreen state={inspectionState} />
      </Suspense>
    )
  }

  // ?쇰컲 寃뚯엫 二쇱냼??吏꾩엯 洹쒖튃:
  // 二쇱냼 ?묒냽 ??ReadyGameApp 利됱떆 ?앹꽦 ??珥덇린 title ?붾㈃ ??TitleSceneCanvas.
  // Google 濡쒓렇???곹깭?????뚮뜑瑜?留됱? ?딆?留? ??댄???寃뚯엫 ?쒖옉? 誘몃줈洹몄씤 ?ъ슜?먮?
  // Google 濡쒓렇?몄쑝濡?蹂대궦?? 濡쒓렇???깃났 ?ㅼ뿉??Firebase 吏꾪뻾??Studio 以鍮??ㅽ뙣媛 ?덉뼱??
  // 濡쒕퉬쨌?ㅽ뀒?댁? 吏꾩엯??議곗슜???뱀? ?딄퀬 怨꾩냽 吏꾪뻾?쒕떎.
  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={styles.routeLoading}>{t('loading.game')}</div>}>
        <ReadyGameApp
          authUser={authUser}
          progressStatus={progressStatus}
        />
      </Suspense>
    </ErrorBoundary>
  )
}

function RouteLoadFailure({ label, retry, reload }) {
  return (
    <main role="alert" style={styles.routeFailure}>
      <h1 style={styles.routeFailureTitle}>{label}</h1>
      <p style={styles.routeFailureMessage}>이 화면을 불러오지 못했습니다. 다시 시도하거나 새로고침해 주세요.</p>
      <div style={styles.routeFailureActions}>
        <button type="button" style={styles.studioBootstrapRetry} onClick={retry}>다시 시도</button>
        <button type="button" style={styles.studioBootstrapRetry} onClick={reload}>새로고침</button>
      </div>
    </main>
  )
}

function getStudioBootstrapMessage(authStatus, studioCloudStatus) {
  if (authStatus === 'checking') return t('app.checkingAuth')
  if (authStatus !== 'signedIn') return t('app.studioNeedsSignIn')
  if (studioCloudStatus === 'loading') return t('app.studioLoading')
  // ??怨꾩젙???뚰겕?ㅽ럹?댁뒪媛 ?꾩쭅 ?녿뒗 寃껉낵, ?덈뒗??紐??쎌? 寃껋? ?ъ슜?먭? ??議곗튂媛 ?ㅻⅤ??
  if (studioCloudStatus === 'missing-remote') return t('app.studioNoWorkspace')
  if (studioCloudStatus === 'account-conflict') return t('app.studioAccountConflict')
  // 留덉뒪???꾩슜 ?붾㈃?대씪 ?먯씤 肄붾뱶瑜?洹몃?濡??몄텧?쒕떎 ??萸됰슧洹몃┛ 臾멸뎄濡쒕뒗 ?먯씤??紐?醫곹엺??
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
  routeFailure: {
    minHeight: '100vh', display: 'grid', placeContent: 'center', gap: 16, padding: 24,
    background: '#111827', color: '#f8fafc', textAlign: 'center',
  },
  routeFailureTitle: {
    margin: 0, fontSize: 'clamp(24px, 5vw, 34px)',
  },
  routeFailureMessage: {
    margin: 0, fontWeight: 700,
  },
  routeFailureActions: {
    display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap',
  },
}


