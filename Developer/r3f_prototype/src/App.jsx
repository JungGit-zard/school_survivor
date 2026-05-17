import { useEffect, useState } from 'react'
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

initPlaytestLogger()

const keyMap = [
  { name: 'up', keys: ['ArrowUp', 'KeyW'] },
  { name: 'down', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
]

// iPhone 12 Pro logical resolution: 390 x 844
const IPHONE_W = 390
const IPHONE_H = 844

export default function App() {
  const [screen, setScreen] = useState('title')
  const gameKey = useGameStore((s) => s.gameKey)
  const phase = useGameStore((s) => s.phase)
  const resetGame = useGameStore((s) => s.resetGame)

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

  const startGame = () => {
    resetGame()
    setScreen('game')
  }

  return (
    <div style={styles.viewport}>
      <div style={styles.phoneFrame}>
        {screen === 'title' && (
          <TitleScreen
            onStart={startGame}
            onCoinShop={() => setScreen('coinShop')}
          />
        )}

        {screen === 'coinShop' && (
          <CoinShop onBack={() => setScreen('title')} />
        )}

        {screen === 'game' && (
          <>
            <KeyboardControls map={keyMap}>
              <Canvas
                orthographic
                camera={{ zoom: 60, position: [0, 20, 20], near: 0.1, far: 500 }}
                shadows
                gl={{ stencil: true }}
                style={{ width: '100%', height: '100%', background: '#c8c4bc', display: 'block' }}
              >
                <Physics key={gameKey} gravity={[0, 0, 0]} timeStep="vary" paused={phase !== 'playing'}>
                  <Game />
                </Physics>
              </Canvas>
            </KeyboardControls>
            <HUD />
            <VirtualJoystick />
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
    width: `min(100vw, calc(100vh * ${IPHONE_W} / ${IPHONE_H}))`,
    height: `min(100vh, calc(100vw * ${IPHONE_H} / ${IPHONE_W}))`,
    aspectRatio: `${IPHONE_W} / ${IPHONE_H}`,
    overflow: 'hidden',
    background: '#16121d',
  },
}
