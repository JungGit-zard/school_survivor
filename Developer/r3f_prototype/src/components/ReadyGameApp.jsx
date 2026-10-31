import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import ErrorBoundary from './ErrorBoundary.jsx'
import TapFeedbackBurst from './TapFeedbackBurst.jsx'
import { getFirebaseProgressRuntimeSnapshot, isFirebaseProgressHydrated } from '../lib/firebaseProgress.js'
import { initPlaytestLogger } from '../lib/playtestLogger.js'
import { isMobileJoystickEnvironment } from '../lib/mobileInput.js'
import { initKeyboardInput } from '../lib/keyboardInput.js'
import { applyLanguage, loadTitleSettings } from '../lib/titleSettings.js'
import { t } from '../lib/i18n.js'
import { clearPendingStartAfterLogin, hasPendingStartAfterLogin } from '../lib/loginContinuation.js'
import LobbyBgm from './LobbyBgm.jsx'

const LOBBY_MUSIC_SUB_SCREENS = new Set(['coinShop', 'ranking', 'missionCenter'])
// 런 종료 후 로비 이동은 클라우드 저장을 기다리되, 저장이 실패·지연(오프라인)돼도 막지 않는다.
// 진행도는 checkpointRun으로 로컬에 남고 5초 재시도 루프가 이어서 올린다.
const LEAVE_GAMEPLAY_SAVE_WAIT_MS = 4000
const GAME_HISTORY_KEY = 'ezsGame'

function pushGameHistoryEntry() {
  if (typeof window === 'undefined' || window.history.state?.[GAME_HISTORY_KEY]) return
  window.history.pushState({ ...(window.history.state || {}), [GAME_HISTORY_KEY]: true }, '')
}

const RosariRoom = lazy(() => import('./RosariRoom.jsx'))
const TitleScreen = lazy(() => import('./TitleScreen.jsx'))
const Lobby = lazy(() => import('./Lobby.jsx'))
const GameplayScreen = lazy(() => import('./GameplayScreen.jsx'))
const SfxLayer = lazy(() => import('./SfxLayer.jsx'))
const CoinShop = lazy(() => import('./CoinShop.jsx'))
const UserRanking = lazy(() => import('./UserRanking.jsx'))
const StageRanking = lazy(() => import('./StageRanking.jsx'))
const MissionCenter = lazy(() => import('./MissionCenter.jsx'))

let runtimeUtilitiesInitialized = false

// 스테이지1 스토리 컷은 처음 한 번만 보여준다. 새 저장 키 없이 이미 저장되는 데이터로 판단한다:
// 계정 진행도에 플레이 기록(activity.lastStageId — 스테이지 입장 시 기록)이나 런 기록(totalRuns·
// stage1Clears)이 있으면 이미 본 것이다. 게스트·하이드레이션 전에는 기록이 없으니 이 세션 안에서만
// 한 번 본 것으로 기억한다(새로고침하면 새 게스트라 다시 본다).
function hasPersistedStageEntry(authUser) {
  try {
    if (!authUser?.uid || !isFirebaseProgressHydrated(authUser)) return false
    const { activity, progress } = getFirebaseProgressRuntimeSnapshot()
    const records = progress?.records ?? {}
    return !!activity?.lastStageId || (records.totalRuns ?? 0) > 0 || (records.stage1Clears ?? 0) > 0
  } catch {
    return false
  }
}

function initializeRuntimeUtilities() {
  if (runtimeUtilitiesInitialized) return
  runtimeUtilitiesInitialized = true
  initPlaytestLogger()
  initKeyboardInput()
}

export default function ReadyGameApp({
  authStatus,
  authUser,
  progressStatus,
}) {
  const [screen, setScreen] = useState(() => hasPendingStartAfterLogin() ? 'auth-return' : 'title')
  const [prevScreen, setPrevScreen] = useState('title')
  const [rankingStageId, setRankingStageId] = useState(null)
  const [mobileJoystickEnabled, setMobileJoystickEnabled] = useState(false)
  const [devCheatsVisible, setDevCheatsVisible] = useState(false)
  const [devAllStagesUnlocked, setDevAllStagesUnlocked] = useState(false)
  const [showGameoverResultImmediately, setShowGameoverResultImmediately] = useState(false)
  const [weaponEncyclopediaRequest, setWeaponEncyclopediaRequest] = useState(null)
  const phoneFrameRef = useRef(null)
  const stage1IntroSeenRef = useRef(new Set())

  useEffect(() => {
    let stopped = false
    const retry = () => {
      void import('../store/useGameStore.js').then(({useGameStore}) => {
        if (stopped) return
        if (authUser?.uid) void useGameStore.getState().reconcileCloudProgress()
        return useGameStore.getState().retryRankingSubmission()
      }).catch(() => {})
    }
    const timer = window.setInterval(retry,5000)
    window.addEventListener('online',retry)
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('online',retry) }
  },[authUser?.uid])

  // 랭킹은 런이 끝날 때 한 번만 쓴다(0점 런 포함, useGameStore.finishRankingRun). 타이틀·로사리 방만
  // 보고 나간 방문은 학교에 들어간 게 아니라 랭킹에 쓰지 않는다(2026-10-27 쓰기 폭주 정리).

  useEffect(() => {
    let stopped = false
    const recordVisit = () => {
      void import('../lib/firebaseAdminVisitors.js').then(({ recordAdminVisitor }) => (
        stopped ? undefined : recordAdminVisitor(authUser ?? null)
      )).catch(() => {
        if (stopped) return
        void import('../store/useGameStore.js').then(({ useGameStore }) => {
          if (!stopped) useGameStore.setState({ progressSaveWarning: t('persistence.saveFailed') })
        })
      })
    }
    recordVisit()
    window.addEventListener('online', recordVisit)
    return () => { stopped = true; window.removeEventListener('online', recordVisit) }
  }, [authUser?.uid, screen])

  useEffect(() => {
    initializeRuntimeUtilities()
  }, [])

  useEffect(() => {
    if (screen !== 'auth-return') return
    if (authStatus === 'signedIn' && authUser?.uid) {
      clearPendingStartAfterLogin()
      setScreen('lobby')
      return
    }
    if (['signedOut', 'unconfigured', 'error'].includes(authStatus)) {
      clearPendingStartAfterLogin()
      setScreen('title')
    }
  }, [authStatus, authUser?.uid, screen])

  useEffect(() => {
    const ready = progressStatus === 'ready' && isFirebaseProgressHydrated(authUser)
    const settings = ready ? loadTitleSettings() : null
    setDevAllStagesUnlocked(settings ? settings.unlockAllStagesCheat : false)
    // 계정 진행도가 준비되면 저장된 언어를 적용한다. 로그인 전에는 브라우저 언어를 쓴다.
    if (settings) applyLanguage(settings.language)
  }, [authUser?.uid, progressStatus])

  const [fullBleedViewport, setFullBleedViewport] = useState(isPortraitViewport)

  useEffect(() => {
    const update = () => setFullBleedViewport(isPortraitViewport())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  useEffect(() => {
    function updateMobileInputMode() {
      setMobileJoystickEnabled(isMobileJoystickEnvironment())
    }

    updateMobileInputMode()
    const media = window.matchMedia?.('(pointer: coarse)')
    media?.addEventListener?.('change', updateMobileInputMode)
    window.addEventListener('resize', updateMobileInputMode)
    return () => {
      media?.removeEventListener?.('change', updateMobileInputMode)
      window.removeEventListener('resize', updateMobileInputMode)
    }
  }, [])

  const startGame = async (stageId) => {
    // Stage entry must never be blocked by Google/Firebase progress hydration.
    // Guest or failed-cloud sessions run on in-memory default progress; cloud save is optional.
    try {
      const { useGameStore } = await import('../store/useGameStore.js')
      // resetGame이 activity를 이번 입장으로 갱신하므로 "이미 봤는지"는 그 전에 읽는다.
      const introOwner = authUser?.uid ?? 'guest'
      const introAlreadySeen = stage1IntroSeenRef.current.has(introOwner) || hasPersistedStageEntry(authUser)
      if (useGameStore.getState().resetGame(stageId) === false) return
      if (stageId === 'stage1' && !introAlreadySeen) {
        stage1IntroSeenRef.current.add(introOwner)
        useGameStore.getState().startStage1Intro()
      }
      setShowGameoverResultImmediately(false)
      setScreen('game')
    } catch {
      setScreen('game-load-failed')
    }
  }

  const setImmediateGameoverResultForGameReturn = (from) => {
    if (from === 'game') {
      void import('../store/useGameStore.js').then(({ useGameStore }) => {
        setShowGameoverResultImmediately(useGameStore.getState().phase === 'gameover')
      })
    } else {
      setShowGameoverResultImmediately(false)
    }
  }

  const openCoinShopFrom = (from) => {
    setImmediateGameoverResultForGameReturn(from)
    setPrevScreen(from)
    setScreen('coinShop')
  }

  const openRankingFrom = (from, stageId = null) => {
    setImmediateGameoverResultForGameReturn(from)
    setPrevScreen(from)
    setRankingStageId(stageId)
    setScreen('ranking')
  }

  const openMissionCenterFrom = (from) => {
    setImmediateGameoverResultForGameReturn(from)
    setPrevScreen(from)
    setScreen('missionCenter')
  }

  const openWeaponEncyclopedia = (weaponId = null) => {
    setWeaponEncyclopediaRequest({ weaponId })
    setScreen('lobby')
  }

  const returnToPreviousScreen = () => {
    const nextScreen = prevScreen === 'game' || prevScreen === 'lobby' ? prevScreen : 'title'
    setScreen(nextScreen)
  }

  // 모든 런 종료 출구(결과창·탈출 성공·일시정지 로비 복귀·뒤로가기)는 무조건 로비로 간다.
  // 저장 실패(false)·예외·무응답 어느 것도 이동을 막지 않는다. 실패 경고는 store가 이미 띄운다.
  const leavingGameplayRef = useRef(false)
  const leaveGameplay = async () => {
    if (leavingGameplayRef.current) return
    leavingGameplayRef.current = true
    let timer = null
    try {
      const { useGameStore } = await import('../store/useGameStore.js')
      // Leaving to the lobby ends the run (e.g. a clear the player did not continue): its one ranking write.
      useGameStore.getState().finishRankingRun?.('end')
      await Promise.race([
        Promise.resolve(useGameStore.getState().flushProgressBeforeTransition?.()),
        new Promise((resolve) => { timer = window.setTimeout(resolve, LEAVE_GAMEPLAY_SAVE_WAIT_MS) }),
      ])
    } catch {
      // 저장 실패는 로비 이동을 막지 않는다.
    } finally {
      if (timer) window.clearTimeout(timer)
      leavingGameplayRef.current = false
      setScreen('lobby')
    }
  }

  // 브라우저/안드로이드 뒤로가기: 게임 진입 시 history 항목을 하나 쌓아 앱 밖(빈 화면·이전 사이트)으로
  // 나가지 않게 한다. 플레이 중이면 먼저 일시정지, 그 외(일시정지·레벨업·결과창)는 런을 끝내고 로비로.
  const screenRef = useRef(screen)
  const prevScreenRef = useRef(prevScreen)
  screenRef.current = screen
  prevScreenRef.current = prevScreen
  const leaveGameplayRef = useRef(leaveGameplay)
  leaveGameplayRef.current = leaveGameplay

  useEffect(() => {
    if (screen === 'game') pushGameHistoryEntry()
  }, [screen])

  useEffect(() => {
    const onPopState = () => {
      const current = screenRef.current
      const inRunSubScreen = prevScreenRef.current === 'game' && LOBBY_MUSIC_SUB_SCREENS.has(current)
      if (current !== 'game' && !inRunSubScreen) return
      if (inRunSubScreen) {
        setImmediateGameoverResultForGameReturn('game')
        setScreen('game')
        pushGameHistoryEntry()
        return
      }
      void import('../store/useGameStore.js').then(({ useGameStore }) => {
        const store = useGameStore.getState()
        if (store.phase === 'playing') {
          store.pauseGame?.('manual')
          pushGameHistoryEntry()
          return
        }
        if (store.phase === 'levelup') useGameStore.setState({ phase: 'paused', pauseSource: 'manual' })
        if (useGameStore.getState().phase === 'paused') useGameStore.getState().quitPausedRun?.()
        return leaveGameplayRef.current()
      }).catch(() => setScreen('lobby'))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // 넓은 웹 화면: 좌우 흰색 단색 여백 + 중앙 9:16 세로 프레임(6a72e281 복원 구조). 2026-10-31 Terry: 거터 그림 제거.
  // 세로로 긴 화면(실제 휴대폰·TWA)은 프레임 없이 전체화면 그대로 쓴다.
  const viewportStyle = {
    ...styles.viewport,
    ...(fullBleedViewport ? null : { backgroundColor: '#ffffff' }),
  }
  const phoneFrameStyle = fullBleedViewport
    ? { ...styles.phoneFrame, ...styles.phoneFrameFullBleed }
    : styles.phoneFrame

  return (
    <div style={viewportStyle} data-viewport-mode={fullBleedViewport ? 'full' : 'framed'}>
      <ErrorBoundary fallback={null}>
        <TapFeedbackBurst />
        <Suspense fallback={null}><SfxLayer /></Suspense>
        {/* Lobby music keeps playing on lobby-side sub screens; LobbyBgm shares one stream by URL.
            Sub screens opened from a run (results/pause -> shop, ranking, missions) play it too,
            so music never goes silent mid-session (owner rule 2026-10-27). */}
        {/* 로자리의 방은 로비 좌상단에서 들어오는 로비의 자식 화면이라 로비 곡을 그대로 유지한다.
            단, 'rosariRoom'을 LOBBY_MUSIC_SUB_SCREENS에 넣지는 않는다 — 그 Set은 아래 뒤로가기
            판정(inRunSubScreen = prevScreenRef.current === 'game' && LOBBY_MUSIC_SUB_SCREENS.has(current))과
            공유되므로, Set에 넣으면 런이 끝난 뒤 방에서 뒤로가기 할 때 이미 끝난 런의 게임 화면으로 튄다. */}
        {(LOBBY_MUSIC_SUB_SCREENS.has(screen) || screen === 'rosariRoom') && <LobbyBgm />}
      </ErrorBoundary>
      <div ref={phoneFrameRef} style={phoneFrameStyle}>
        {screen === 'auth-return' && <ScreenLoading label={t('loading.game')} />}
        {screen === 'title' && (
          <ErrorBoundary fallback={({ error, retry, reload }) => <ScreenFailure label={t('loading.game')} error={error} retry={retry} reload={reload} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.game')} />}>
              <TitleScreen
                onEnterLobby={() => setScreen('lobby')}
                devCheatsVisible={devCheatsVisible}
                onRevealDevCheats={() => setDevCheatsVisible(true)}
                onUnlockAllStages={() => setDevAllStagesUnlocked(true)}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* 로자리의 방은 로비(스테이지 선택) 좌상단에서 들어온다 → 나갈 때도 로비로 돌아간다.
            타이틀로 보내면 스테이지 선택으로 되돌아갈 길이 없어진다(2026-10-29 Terry 지시). */}
        {screen === 'rosariRoom' && (
          <ErrorBoundary fallback={({ error, retry, reload }) => <ScreenFailure label="로자리의 방" error={error} retry={retry} reload={reload} onBack={() => setScreen('lobby')} />}>
            <Suspense fallback={<ScreenLoading label="로자리의 방" />}>
              <RosariRoom onBack={() => setScreen('lobby')} />
            </Suspense>
          </ErrorBoundary>
        )}

        {screen === 'lobby' && (
          <ErrorBoundary fallback={({ error, retry, reload }) => <ScreenFailure label={t('loading.game')} error={error} retry={retry} reload={reload} onBack={() => setScreen('title')} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.game')} />}>
              <Lobby
                onStartStage={startGame}
                onOpenCoinShop={() => openCoinShopFrom('lobby')}
                onOpenRanking={(stageId) => openRankingFrom('lobby', stageId)}
                onOpenMissionCenter={() => openMissionCenterFrom('lobby')}
                onOpenRosariRoom={() => setScreen('rosariRoom')}
                onLogoutToTitle={() => setScreen('title')}
                devAllStagesUnlocked={devAllStagesUnlocked}
                weaponEncyclopediaRequest={weaponEncyclopediaRequest}
                onWeaponEncyclopediaRequestHandled={() => setWeaponEncyclopediaRequest(null)}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* 상점·랭킹·미션도 화면 단위 경계로 감싼다. 경계가 없으면 이 화면의 오류가 앱 전체를
            빈 화면으로 만들고, 게임에서 왔을 때는 결과 화면까지 잃는다. 이전 화면으로 돌아갈 길을 둔다. */}
        {screen === 'coinShop' && (
          <ErrorBoundary fallback={({ error, retry, reload }) => <ScreenFailure label={t('lobby.shop')} error={error} retry={retry} reload={reload} onBack={returnToPreviousScreen} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.shop')} />}>
              <CoinShop
                onBack={returnToPreviousScreen}
                backLabel={prevScreen === 'game' ? t('back.toResult') : prevScreen === 'lobby' ? t('back.toLobby') : t('back.toTitle')}
                onOpenWeaponDetails={openWeaponEncyclopedia}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {screen === 'ranking' && (
          <ErrorBoundary fallback={({ error, retry, reload }) => <ScreenFailure label={t('lobby.ranking')} error={error} retry={retry} reload={reload} onBack={returnToPreviousScreen} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.ranking')} />}>
              {rankingStageId
                ? <StageRanking stageId={rankingStageId} onBack={returnToPreviousScreen} />
                : <UserRanking onBack={returnToPreviousScreen} />}
            </Suspense>
          </ErrorBoundary>
        )}

        {screen === 'missionCenter' && (
          <ErrorBoundary fallback={({ error, retry, reload }) => <ScreenFailure label={t('lobby.missions')} error={error} retry={retry} reload={reload} onBack={returnToPreviousScreen} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.missions')} />}>
              <MissionCenter onBack={returnToPreviousScreen} />
            </Suspense>
          </ErrorBoundary>
        )}

        {(screen === 'game' || (screen === 'ranking' && prevScreen === 'game')) && (
          <div hidden={screen !== 'game'} style={{ display: screen === 'game' ? 'contents' : 'none' }}>
          <ErrorBoundary fallback={({ error, retry, reload }) => <ScreenFailure label={t('loading.game')} error={error} retry={retry} reload={reload} onBack={() => setScreen('lobby')} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.game')} />}>
              <GameplayScreen
                isActive={screen === 'game'}
                mobileJoystickEnabled={mobileJoystickEnabled}
                phoneFrameRef={phoneFrameRef}
                onOpenCoinShop={() => openCoinShopFrom('game')}
                onGoToTitle={leaveGameplay}
                onGoToLobby={leaveGameplay}
                onGoToRanking={() => openRankingFrom('game')}
                onOpenMissionCenter={() => openMissionCenterFrom('game')}
                onOpenWeaponEncyclopedia={openWeaponEncyclopedia}
                devCheatsVisible={devCheatsVisible}
                showGameoverResultImmediately={showGameoverResultImmediately}
              />
            </Suspense>
          </ErrorBoundary>
          </div>
        )}

        {screen === 'game-load-failed' && (
          <ScreenFailure label={t('loading.game')} onBack={() => setScreen('lobby')} />
        )}

      </div>
    </div>
  )
}

function ScreenLoading({ label }) {
  return <div style={styles.screenLoading}>{label}</div>
}

// error를 화면에 그대로 띄운다. 릴리스 AAB에는 WebView 콘솔이 없어서(webContentsDebugging
// 비활성) 실기기에서 터지면 원인을 볼 방법이 이 화면밖에 없다 — 2026-08-11 v40에서
// 로비 설정 버튼이 이 폴백으로 떨어졌는데 메시지가 없어 원인 추적이 막혔다.
function ScreenFailure({ label, error = null, retry = null, reload = () => window.location.reload(), onBack = null }) {
  const detail = error ? (error.stack || error.message || String(error)) : ''
  return (
    <main role="alert" data-testid="deferred-screen-failure" style={styles.screenFailure}>
      <h1 style={styles.screenFailureTitle}>{label}</h1>
      <p style={styles.screenFailureMessage}>이 화면을 불러오지 못했습니다.</p>
      {detail && <pre data-testid="screen-failure-detail" style={styles.screenFailureDetail}>{detail}</pre>}
      <div style={styles.screenFailureActions}>
        {retry && <button type="button" style={styles.screenFailureButton} onClick={retry}>다시 시도</button>}
        {onBack && <button type="button" style={styles.screenFailureButton} onClick={onBack}>이전 화면</button>}
        <button type="button" style={styles.screenFailureButton} onClick={reload}>새로고침</button>
      </div>
    </main>
  )
}

const styles = {
  screenFailureDetail: {
    maxWidth: '92vw', maxHeight: '38vh', overflow: 'auto', margin: 0, padding: '10px 12px',
    background: '#140f24', border: '1px solid #4c3a7a', borderRadius: 8, color: '#ffd0d0',
    fontSize: 11, lineHeight: 1.45, textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  viewport: {
    width: '100vw',
    height: '100vh',
    maxHeight: '100dvh',
    backgroundColor: '#0a0810',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  screenLoading: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: '#16121d',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: 800,
    zIndex: 20,
  },
  screenFailure: {
    position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', gap: 16, padding: 24,
    background: '#16121d', color: '#f8fafc', textAlign: 'center', zIndex: 20,
  },
  screenFailureTitle: { margin: 0, fontSize: 'clamp(24px, 5vw, 34px)' },
  screenFailureMessage: { margin: 0, fontWeight: 700 },
  screenFailureActions: { display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  screenFailureButton: {
    minHeight: 44, padding: '10px 22px', border: '2px solid #f8fafc', borderRadius: 10,
    background: '#2b145b', color: '#f8fafc', fontWeight: 800, cursor: 'pointer',
  },
  phoneFrame: {
    position: 'relative',

    // 100dvh를 지원하는 프로젝트의 웹 지원 범위에서 동적 주소창 높이를 반영한다.
    width: 'min(100vw, 720px, 56.25dvh)',
    aspectRatio: '9 / 16',
    height: 'auto',
    maxHeight: 'min(100vh, 100dvh, 1280px)',
    flex: '0 0 auto',
    touchAction: 'none',
    overscrollBehavior: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    overflow: 'hidden',
    background: '#16121d',
  },
  phoneFrameFullBleed: {
    width: '100vw',
    height: '100dvh',
    aspectRatio: 'auto',
    maxHeight: 'none',
  },
}

// 가로:세로가 3:4 이하(세로로 긴 화면)면 휴대폰/TWA로 보고 전체화면으로 쓴다.
function isPortraitViewport() {
  if (typeof window === 'undefined') return true
  const w = window.innerWidth || 0
  const h = window.innerHeight || 0
  if (!w || !h) return true
  return w / h <= 0.75
}
