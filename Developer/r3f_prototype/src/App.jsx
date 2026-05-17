import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls } from '@react-three/drei'
import Game from './components/Game.jsx'
import HUD from './components/HUD.jsx'
import VirtualJoystick from './components/VirtualJoystick.jsx'
import { useGameStore } from './store/useGameStore.js'
import { initPlaytestLogger } from './lib/playtestLogger.js'

initPlaytestLogger()

const keyMap = [
  { name: 'up',    keys: ['ArrowUp',    'KeyW'] },
  { name: 'down',  keys: ['ArrowDown',  'KeyS'] },
  { name: 'left',  keys: ['ArrowLeft',  'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
]

// iPhone 12 Pro logical resolution: 390 × 844
const IPHONE_W = 390
const IPHONE_H = 844

export default function App() {
  const [screen, setScreen] = useState('title')
  const gameKey = useGameStore((s) => s.gameKey)
  const phase = useGameStore((s) => s.phase)
  const resetGame = useGameStore((s) => s.resetGame)
  const goldTotal = useGameStore((s) => s.goldTotal)

  const startGame = () => {
    resetGame()
    setScreen('game')
  }

  const openCoinShop = () => {
    setScreen('coinShop')
  }

  return (
    <div style={styles.viewport}>
      <div style={styles.phoneFrame}>
        {screen === 'title' && (
          <TitleScreen onStart={startGame} onCoinShop={openCoinShop} />
        )}

        {screen === 'coinShop' && (
          <CoinShopScreen goldTotal={goldTotal} onBack={() => setScreen('title')} />
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
                {/* gameKey 변경 시 Physics 트리 전체 재마운트 → 리셋 */}
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

function TitleScreen({ onStart, onCoinShop }) {
  return (
    <div style={styles.blankScreen}>
      <button type="button" style={styles.primaryButton} onClick={onStart}>
        게임 시작
      </button>
      <button type="button" style={styles.secondaryButton} onClick={onCoinShop}>
        코인상점
      </button>
    </div>
  )
}

function CoinShopScreen({ goldTotal, onBack }) {
  return (
    <div style={styles.blankScreen}>
      <div style={styles.coinText}>보유 코인 {goldTotal}</div>
      <button type="button" style={styles.secondaryButton} onClick={onBack}>
        돌아가기
      </button>
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
  },
  blankScreen: {
    width: '100%',
    height: '100%',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  primaryButton: {
    width: 180,
    height: 48,
    border: '1px solid #111111',
    borderRadius: 6,
    background: '#111111',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    width: 180,
    height: 48,
    border: '1px solid #111111',
    borderRadius: 6,
    background: '#ffffff',
    color: '#111111',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
  },
  coinText: {
    color: '#111111',
    fontSize: 18,
    fontWeight: 700,
  },
}
