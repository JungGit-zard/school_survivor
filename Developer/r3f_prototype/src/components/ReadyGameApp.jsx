import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import TitleScreen from './TitleScreen.jsx'
import Lobby from './Lobby.jsx'
import VirtualJoystick from './VirtualJoystick.jsx'
import SfxLayer from './SfxLayer.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { isFirebaseProgressHydrated } from '../lib/firebaseProgress.js'
import { initPlaytestLogger } from '../lib/playtestLogger.js'
import { isMobileJoystickEnvironment } from '../lib/mobileInput.js'
import { initKeyboardInput } from '../lib/keyboardInput.js'
import { loadTitleSettings } from '../lib/titleSettings.js'

const CoinShop = lazy(() => import('./CoinShop.jsx'))
const UserRanking = lazy(() => import('./UserRanking.jsx'))
const StageRanking = lazy(() => import('./StageRanking.jsx'))
const GameCanvas = lazy(() => import('./GameCanvas.jsx'))
const HUD = lazy(() => import('./HUD.jsx'))

let runtimeUtilitiesInitialized = false

function initializeRuntimeUtilities() {
  if (runtimeUtilitiesInitialized) return
  runtimeUtilitiesInitialized = true
  initPlaytestLogger()
  initKeyboardInput()
}

export default function ReadyGameApp({
  authUser,
  studioReady,
  ensureStudioCloudReady,
}) {
  const [screen, setScreen] = useState('title')
  const [prevScreen, setPrevScreen] = useState('title')
  const [rankingStageId, setRankingStageId] = useState(null)
  const [mobileJoystickEnabled, setMobileJoystickEnabled] = useState(false)
  const [devCheatsVisible, setDevCheatsVisible] = useState(false)
  const [devAllStagesUnlocked, setDevAllStagesUnlocked] = useState(() => loadTitleSettings().unlockAllStagesCheat)
  const phoneFrameRef = useRef(null)
  const gameKey = useGameStore((s) => s.gameKey)
  const phase = useGameStore((s) => s.phase)
  const resetGame = useGameStore((s) => s.resetGame)

  useEffect(() => {
    initializeRuntimeUtilities()
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

  useEffect(() => {
    if (screen !== 'game') return

    const pauseIfPlaying = () => {
      const { phase: currentPhase, pauseGame } = useGameStore.getState()
      if (currentPhase === 'playing') pauseGame('auto')
    }
    const handleVisibility = () => {
      if (document.hidden || document.visibilityState === 'hidden') pauseIfPlaying()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', pauseIfPlaying)
    window.addEventListener('blur', pauseIfPlaying)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', pauseIfPlaying)
      window.removeEventListener('blur', pauseIfPlaying)
    }
  }, [screen])

  const startGame = (stageId) => {
    if (!isFirebaseProgressHydrated(authUser)) return
    resetGame(stageId)
    if (stageId === 'stage1') useGameStore.getState().startStage1Intro()
    setScreen('game')
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
      <SfxLayer />
      <div ref={phoneFrameRef} style={styles.phoneFrame}>
        {screen === 'title' && (
          <TitleScreen
            onEnterLobby={() => setScreen('lobby')}
            devCheatsVisible={devCheatsVisible}
            onRevealDevCheats={() => setDevCheatsVisible(true)}
            onUnlockAllStages={() => setDevAllStagesUnlocked(true)}
            studioVisualsReady={studioReady}
            ensureStudioCloudReady={ensureStudioCloudReady}
          />
        )}

        {screen === 'lobby' && (
          <Lobby
            onStartStage={startGame}
            onOpenCoinShop={() => openCoinShopFrom('lobby')}
            onOpenRanking={(stageId) => openRankingFrom('lobby', stageId)}
            onLogoutToTitle={() => setScreen('title')}
            devAllStagesUnlocked={devAllStagesUnlocked}
          />
        )}

        {screen === 'coinShop' && (
          <Suspense fallback={<ScreenLoading label="상점 불러오는 중…" />}>
            <CoinShop
              onBack={returnToPreviousScreen}
              backLabel={prevScreen === 'game' ? '결과로 돌아가기' : prevScreen === 'lobby' ? '로비로 돌아가기' : '타이틀로 돌아가기'}
            />
          </Suspense>
        )}

        {screen === 'ranking' && (
          <Suspense fallback={<ScreenLoading label="랭킹 불러오는 중…" />}>
            {rankingStageId
              ? <StageRanking stageId={rankingStageId} onBack={returnToPreviousScreen} />
              : <UserRanking onBack={returnToPreviousScreen} />}
          </Suspense>
        )}

        {screen === 'game' && (
          <>
            <Suspense fallback={<ScreenLoading label="게임 불러오는 중…" />}>
              <GameCanvas gameKey={gameKey} phase={phase} />
              <HUD
                onOpenCoinShop={() => openCoinShopFrom('game')}
                onGoToTitle={() => setScreen('title')}
                onGoToLobby={() => setScreen('lobby')}
                onGoToRanking={() => openRankingFrom('game')}
                devCheatsVisible={devCheatsVisible}
              />
            </Suspense>
            {mobileJoystickEnabled && (
              <VirtualJoystick enabled phase={phase} playAreaRef={phoneFrameRef} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ScreenLoading({ label }) {
  return <div style={styles.screenLoading}>{label}</div>
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
  phoneFrame: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#16121d',
  },
}
