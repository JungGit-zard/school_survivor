import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls } from '@react-three/drei'
import Game from './components/Game.jsx'
import HUD from './components/HUD.jsx'
import TitleScreen from './components/TitleScreen.jsx'
import VirtualJoystick from './components/VirtualJoystick.jsx'
import CoinShop from './components/CoinShop.jsx'
import { useGameStore } from './store/useGameStore.js'
import { initPlaytestLogger } from './lib/playtestLogger.js'
import { isMobileJoystickEnvironment } from './lib/mobileInput.js'

initPlaytestLogger()

const keyMap = [
  { name: 'up', keys: ['ArrowUp', 'KeyW'] },
  { name: 'down', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
]

export default function App() {
  const [screen, setScreen] = useState('title')
  const [mobileJoystickEnabled, setMobileJoystickEnabled] = useState(false)
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

  return (
    <div style={styles.viewport}>
      <div ref={phoneFrameRef} style={styles.phoneFrame}>
        {screen === 'title' && (
          <TitleScreen onStart={startGame} />
        )}

        {screen === 'coinShop' && (
          <CoinShop onBack={() => setScreen('game')} />
        )}

        {screen === 'game' && (
          <>
            <KeyboardControls map={keyMap}>
              <Canvas
                // 살짝 원근(perspective) — 좁은 화각(fov)으로 직교에 가깝되,
                // 상단(먼 쪽)으로 갈수록 아주 미세하게 멀어지는 3D 깊이감을 준다.
                // 화각이 좁을수록 원근감이 약해지고(직교에 가까움), 넓을수록 강해진다.
                camera={{ fov: 30, position: [0, 17, 17], near: 0.1, far: 500 }}
                shadows
                gl={{ stencil: true }}
                style={{ width: '100%', height: '100%', background: '#c8c4bc', display: 'block' }}
              >
                <Physics key={gameKey} gravity={[0, 0, 0]} timeStep="vary" paused={phase !== 'playing'}>
                  <Game />
                </Physics>
              </Canvas>
            </KeyboardControls>
            <HUD onOpenCoinShop={() => setScreen('coinShop')} />
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
