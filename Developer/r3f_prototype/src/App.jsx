import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import Game from './components/Game.jsx'
import HUD from './components/HUD.jsx'
import TitleScreen from './components/TitleScreen.jsx'
import Lobby from './components/Lobby.jsx'
import VirtualJoystick from './components/VirtualJoystick.jsx'
import CoinShop from './components/CoinShop.jsx'
import UserRanking from './components/UserRanking.jsx'
import StageRanking from './components/StageRanking.jsx'
import AdminPage from './components/AdminPage.jsx'
import GraphicsStudio from './components/GraphicsStudio.jsx'
import { useGameStore } from './store/useGameStore.js'
import SfxLayer from './components/SfxLayer.jsx'
import { initPlaytestLogger } from './lib/playtestLogger.js'
import { isMobileJoystickEnvironment } from './lib/mobileInput.js'
import { initKeyboardInput } from './lib/keyboardInput.js'
import { saveStageBossPreview, saveStudioTunings, saveTextureDecals } from './lib/graphicsStudioConfig.js'
import { saveSfxTunings } from './lib/sfxRegistry.js'
import { STUDIO_GAME_SYNC_MESSAGE, isAllowedStudioGameOrigin } from './lib/studioGameBridge.js'

initPlaytestLogger()
// 이동 키 추적 — blur/숨김 시 키 상태 자동 리셋 (알트탭 keyup 유실 → 6시 자동 이동 버그 방지)
initKeyboardInput()

export function handleStudioGameSyncMessage(event) {
  if (event?.data?.type !== STUDIO_GAME_SYNC_MESSAGE) return false
  if (event.origin && !isAllowedStudioGameOrigin(event.origin)) return false
  if (event.data.tunings) saveStudioTunings(event.data.tunings)
  if (event.data.sfxTunings) saveSfxTunings(event.data.sfxTunings)
  if (event.data.stageBossPreview) saveStageBossPreview(event.data.stageBossPreview)
  if (event.data.decals) saveTextureDecals(event.data.decals)
  return true
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', handleStudioGameSyncMessage)
}

export default function App() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  if (isAdminRoute) return <AdminPage />
  const isGraphicsStudioRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/graphics-studio')
  if (isGraphicsStudioRoute) return <GraphicsStudio />

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
          <CoinShop
            onBack={returnToPreviousScreen}
            backLabel={prevScreen === 'game' ? '결과로 돌아가기' : prevScreen === 'lobby' ? '로비로 돌아가기' : '타이틀로 돌아가기'}
          />
        )}

        {screen === 'ranking' && (
          rankingStageId
            ? <StageRanking stageId={rankingStageId} onBack={returnToPreviousScreen} />
            : <UserRanking onBack={returnToPreviousScreen} />
        )}

        {screen === 'game' && (
          <>
            <Canvas
                // 살짝 원근(perspective) — 좁은 화각(fov)으로 직교에 가깝되,
                // 상단(먼 쪽)으로 갈수록 아주 미세하게 멀어지는 3D 깊이감을 준다.
                // 화각이 좁을수록 원근감이 약해지고(직교에 가까움), 넓을수록 강해진다.
                camera={{ fov: 30, position: [0, 17, 17], near: 0.1, far: 500 }}
                dpr={[1, 1.5]}
                shadows
                gl={{ stencil: true }}
                style={{ width: '100%', height: '100%', background: '#c8c4bc', display: 'block' }}
              >
                <Physics key={gameKey} gravity={[0, 0, 0]} timeStep="vary" paused={phase !== 'playing'}>
                  <Game />
                </Physics>
              </Canvas>
            <HUD
              onOpenCoinShop={() => openCoinShopFrom('game')}
              onGoToTitle={() => setScreen('title')}
              onGoToLobby={() => setScreen('lobby')}
              onGoToRanking={() => openRankingFrom('game')}
              devCheatsVisible={devCheatsVisible}
            />
            {mobileJoystickEnabled && (
              <VirtualJoystick enabled phase={phase} playAreaRef={phoneFrameRef} />
            )}
          </>
        )}
      </div>
    </div>
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
  phoneFrame: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#16121d',
  },
}
