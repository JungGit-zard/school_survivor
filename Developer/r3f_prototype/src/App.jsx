import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import TitleScreen from './components/TitleScreen.jsx'
import Lobby from './components/Lobby.jsx'
import VirtualJoystick from './components/VirtualJoystick.jsx'
import { useGameStore } from './store/useGameStore.js'
import SfxLayer from './components/SfxLayer.jsx'
import { initPlaytestLogger } from './lib/playtestLogger.js'
import { isMobileJoystickEnvironment } from './lib/mobileInput.js'
import { initKeyboardInput } from './lib/keyboardInput.js'
import { applyLocalStudioDatasets } from './lib/firebaseStudio.js'
import { STUDIO_GAME_SYNC_MESSAGE, isAllowedStudioGameOrigin } from './lib/studioGameBridge.js'

const AdminPage = lazy(() => import('./components/AdminPage.jsx'))
const GraphicsStudio = lazy(() => import('./components/GraphicsStudio.jsx'))
const CoinShop = lazy(() => import('./components/CoinShop.jsx'))
const UserRanking = lazy(() => import('./components/UserRanking.jsx'))
const StageRanking = lazy(() => import('./components/StageRanking.jsx'))
const GameCanvas = lazy(() => import('./components/GameCanvas.jsx'))
const HUD = lazy(() => import('./components/HUD.jsx'))

initPlaytestLogger()
// 이동 키 추적 — blur/숨김 시 키 상태 자동 리셋 (알트탭 keyup 유실 → 6시 자동 이동 버그 방지)
initKeyboardInput()

export function handleStudioGameSyncMessage(event) {
  if (event?.data?.type !== STUDIO_GAME_SYNC_MESSAGE) return false
  if (!event.origin || !isAllowedStudioGameOrigin(event.origin)) return false
  if (typeof window !== 'undefined' && window.opener && event.source !== window.opener) return false
  return applyLocalStudioDatasets({
    tunings: event.data.tunings ?? {},
    sfxTunings: event.data.sfxTunings ?? {},
    stageBossPreview: event.data.stageBossPreview ?? {},
    decals: event.data.decals ?? {},
    propPlacements: event.data.propPlacements ?? {},
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', handleStudioGameSyncMessage)
}

export default function App() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  if (isAdminRoute) {
    return (
      <Suspense fallback={<div style={styles.routeLoading}>관리 도구 불러오는 중…</div>}>
        <AdminPage />
      </Suspense>
    )
  }
  const isGraphicsStudioRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/graphics-studio')
  if (isGraphicsStudioRoute) {
    return (
      <Suspense fallback={<div style={styles.routeLoading}>그래픽 스튜디오 불러오는 중…</div>}>
        <GraphicsStudio />
      </Suspense>
    )
  }

  const [screen, setScreen] = useState('title')
  const [prevScreen, setPrevScreen] = useState('title')
  const [rankingStageId, setRankingStageId] = useState(null)
  const [mobileJoystickEnabled, setMobileJoystickEnabled] = useState(false)
  const [devCheatsVisible, setDevCheatsVisible] = useState(false)
  const phoneFrameRef = useRef(null)
  const gameKey = useGameStore((s) => s.gameKey)
  const phase = useGameStore((s) => s.phase)
  const resetGame = useGameStore((s) => s.resetGame)

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
      const { phase, pauseGame } = useGameStore.getState()
      if (phase === 'playing') pauseGame('auto')
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
    resetGame(stageId)
    // 스테이지1 진입 시에만 스토리 인트로 대화창을 띄운다(게임 멈춤 상태). 다른 스테이지는 인트로 없음.
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
          />
        )}

        {screen === 'lobby' && (
          <Lobby
            onStartStage={startGame}
            onOpenCoinShop={() => openCoinShopFrom('lobby')}
            onOpenRanking={(stageId) => openRankingFrom('lobby', stageId)}
            onLogoutToTitle={() => setScreen('title')}
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
  routeLoading: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#111827',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
    fontWeight: 800,
  },
  screenLoading: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background: '#16121d',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
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
