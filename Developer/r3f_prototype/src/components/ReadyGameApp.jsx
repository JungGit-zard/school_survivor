import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import ErrorBoundary from './ErrorBoundary.jsx'
import { isFirebaseProgressHydrated } from '../lib/firebaseProgress.js'
import { initPlaytestLogger } from '../lib/playtestLogger.js'
import { isMobileJoystickEnvironment } from '../lib/mobileInput.js'
import { initKeyboardInput } from '../lib/keyboardInput.js'
import { applyLanguage, loadTitleSettings } from '../lib/titleSettings.js'
import { t, useT } from '../lib/i18n.js'

const TitleScreen = lazy(() => import('./TitleScreen.jsx'))
const Lobby = lazy(() => import('./Lobby.jsx'))
const GameplayScreen = lazy(() => import('./GameplayScreen.jsx'))
const SfxLayer = lazy(() => import('./SfxLayer.jsx'))
const CoinShop = lazy(() => import('./CoinShop.jsx'))
const UserRanking = lazy(() => import('./UserRanking.jsx'))
const StageRanking = lazy(() => import('./StageRanking.jsx'))

let runtimeUtilitiesInitialized = false

function initializeRuntimeUtilities() {
  if (runtimeUtilitiesInitialized) return
  runtimeUtilitiesInitialized = true
  initPlaytestLogger()
  initKeyboardInput()
}

export default function ReadyGameApp({
  authUser,
  progressStatus,
  studioVisualsReady,
}) {
  useT()
  const [screen, setScreen] = useState('title')
  const [prevScreen, setPrevScreen] = useState('title')
  const [rankingStageId, setRankingStageId] = useState(null)
  const [mobileJoystickEnabled, setMobileJoystickEnabled] = useState(false)
  const [devCheatsVisible, setDevCheatsVisible] = useState(false)
  const [devAllStagesUnlocked, setDevAllStagesUnlocked] = useState(false)
  const phoneFrameRef = useRef(null)

  useEffect(() => {
    initializeRuntimeUtilities()
  }, [])

  useEffect(() => {
    const ready = progressStatus === 'ready' && isFirebaseProgressHydrated(authUser)
    const settings = ready ? loadTitleSettings() : null
    setDevAllStagesUnlocked(settings ? settings.unlockAllStagesCheat : false)
    // 계정 진행도가 준비되면 저장된 언어를 적용한다. 로그인 전에는 브라우저 언어를 쓴다.
    if (settings) applyLanguage(settings.language)
  }, [authUser?.uid, progressStatus])

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
      useGameStore.getState().resetGame(stageId)
      if (stageId === 'stage1') useGameStore.getState().startStage1Intro()
      setScreen('game')
    } catch {
      setScreen('game-load-failed')
    }
  }

  const openCoinShopFrom = (from) => {
    setPrevScreen(from)
    setScreen('coinShop')
  }

  const openRankingFrom = (from, stageId = null) => {
    setPrevScreen(from)
    setRankingStageId(stageId)
    setScreen('ranking')
  }

  const returnToPreviousScreen = () => {
    setScreen(prevScreen === 'game' || prevScreen === 'lobby' ? prevScreen : 'title')
  }

  return (
    <div style={styles.viewport}>
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}><SfxLayer /></Suspense>
      </ErrorBoundary>
      <div ref={phoneFrameRef} style={styles.phoneFrame}>
        {screen === 'title' && (
          <ErrorBoundary fallback={({ retry, reload }) => <ScreenFailure label={t('loading.game')} retry={retry} reload={reload} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.game')} />}>
              <TitleScreen
                onEnterLobby={() => setScreen('lobby')}
                devCheatsVisible={devCheatsVisible}
                onRevealDevCheats={() => setDevCheatsVisible(true)}
                onUnlockAllStages={() => setDevAllStagesUnlocked(true)}
                studioVisualsReady={studioVisualsReady}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {screen === 'lobby' && (
          <ErrorBoundary fallback={({ retry, reload }) => <ScreenFailure label="로비" retry={retry} reload={reload} onBack={() => setScreen('title')} />}>
            <Suspense fallback={<ScreenLoading label="로비" />}>
              <Lobby
                onStartStage={startGame}
                onOpenCoinShop={() => openCoinShopFrom('lobby')}
                onOpenRanking={(stageId) => openRankingFrom('lobby', stageId)}
                onLogoutToTitle={() => setScreen('title')}
                devAllStagesUnlocked={devAllStagesUnlocked}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {screen === 'coinShop' && (
          <Suspense fallback={<ScreenLoading label={t('loading.shop')} />}>
            <CoinShop
              onBack={returnToPreviousScreen}
              backLabel={prevScreen === 'game' ? t('back.toResult') : prevScreen === 'lobby' ? t('back.toLobby') : t('back.toTitle')}
            />
          </Suspense>
        )}

        {screen === 'ranking' && (
          <Suspense fallback={<ScreenLoading label={t('loading.ranking')} />}>
            {rankingStageId
              ? <StageRanking stageId={rankingStageId} onBack={returnToPreviousScreen} />
              : <UserRanking onBack={returnToPreviousScreen} />}
          </Suspense>
        )}

        {screen === 'game' && (
          <ErrorBoundary fallback={({ retry, reload }) => <ScreenFailure label={t('loading.game')} retry={retry} reload={reload} onBack={() => setScreen('lobby')} />}>
            <Suspense fallback={<ScreenLoading label={t('loading.game')} />}>
              <GameplayScreen
                mobileJoystickEnabled={mobileJoystickEnabled}
                phoneFrameRef={phoneFrameRef}
                onOpenCoinShop={() => openCoinShopFrom('game')}
                onGoToTitle={() => setScreen('title')}
                onGoToLobby={() => setScreen('lobby')}
                onGoToRanking={() => openRankingFrom('game')}
                devCheatsVisible={devCheatsVisible}
              />
            </Suspense>
          </ErrorBoundary>
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

function ScreenFailure({ label, retry = null, reload = () => window.location.reload(), onBack = null }) {
  return (
    <main role="alert" data-testid="deferred-screen-failure" style={styles.screenFailure}>
      <h1 style={styles.screenFailureTitle}>{label}</h1>
      <p style={styles.screenFailureMessage}>이 화면을 불러오지 못했습니다.</p>
      <div style={styles.screenFailureActions}>
        {retry && <button type="button" style={styles.screenFailureButton} onClick={retry}>다시 시도</button>}
        {onBack && <button type="button" style={styles.screenFailureButton} onClick={onBack}>이전 화면</button>}
        <button type="button" style={styles.screenFailureButton} onClick={reload}>새로고침</button>
      </div>
    </main>
  )
}

const styles = {
  viewport: {
    width: '100vw',
    height: '100vh',
    background: '#0a0810',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#16121d',
  },
}
