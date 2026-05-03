import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls } from '@react-three/drei'
import Game from './components/Game.jsx'
import HUD from './components/HUD.jsx'
import { useGameStore } from './store/useGameStore.js'

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
  const gameKey = useGameStore((s) => s.gameKey)
  const phase = useGameStore((s) => s.phase)

  return (
    <div style={styles.viewport}>
      <div style={styles.phoneFrame}>
        <KeyboardControls map={keyMap}>
          <Canvas
            orthographic
            camera={{ zoom: 60, position: [0, 20, 20], near: 0.1, far: 500 }}
            shadows
            style={{ width: '100%', height: '100%', background: '#c8c4bc', display: 'block' }}
          >
            {/* gameKey 변경 시 Physics 트리 전체 재마운트 → 리셋 */}
            <Physics key={gameKey} gravity={[0, 0, 0]} timeStep="vary" paused={phase !== 'playing'}>
              <Game />
            </Physics>
          </Canvas>
        </KeyboardControls>
        <HUD />
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
  },
}
