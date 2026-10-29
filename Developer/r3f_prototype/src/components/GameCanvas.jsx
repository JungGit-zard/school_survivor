import { useEffect } from 'react'
import { Canvas, useStore } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import Game from './Game.jsx'
import DamageNumbersLayer from './DamageNumbersLayer.jsx'
import ZombieInstanceLayer from './ZombieInstanceLayer.jsx'
import ExpansionZombieInstanceLayer from './expansion/ExpansionZombieInstanceLayer.jsx'
import ExpansionHazardLayer from './expansion/ExpansionHazardLayer.jsx'
import { expansionAttackSnapshots } from '../lib/expansionAttackRuntime.js'
import ProceduralFaceZombieLayer from './ProceduralFaceZombieLayer.jsx'
import PooledEnemyProjectileLayer from './PooledEnemyProjectileLayer.jsx'
import StageEntryRuntimeDiagnostics from './StageEntryRuntimeDiagnostics.jsx'
import { useGameStore } from '../store/useGameStore.js'

// ponytail: dev-only QA handle. window.gameThree.getState() lets QA read gameplay materials
// directly instead of inferring colors from tone-mapped pixels. Live store, not a snapshot.
function DevQaHandle() {
  const store = useStore()
  useEffect(() => {
    window.gameThree = store
    return () => { delete window.gameThree }
  }, [store])
  return null
}

export default function GameCanvas({ gameKey, phase }) {
  const deathCause = useGameStore((state) => state.deathCause)
  const isMatildaContactDeath = phase === 'gameover' && deathCause === 'matilda'

  return (
    <Canvas
      // 살짝 원근(perspective) — 좁은 화각(fov)으로 직교에 가깝되,
      // 상단(먼 쪽)으로 갈수록 아주 미세하게 멀어지는 3D 깊이감을 준다.
      // 화각이 좁을수록 원근감이 약해지고(직교에 가까움), 넓을수록 강해진다.
      camera={{ fov: 30, position: [0, 17, 17], near: 0.1, far: 500 }}
      dpr={[1, 1.5]}
      shadows
      gl={{ stencil: true }}
      frameloop={isMatildaContactDeath ? 'never' : 'always'}
      style={{ width: '100%', height: '100%', background: '#c8c4bc', display: 'block', filter: isMatildaContactDeath ? 'grayscale(1)' : 'none' }}
    >
      {import.meta.env.DEV && <DevQaHandle />}
      <Physics key={gameKey} gravity={[0, 0, 0]} timeStep={1 / 60} paused={phase !== 'playing'}>
        <Game />
      </Physics>
      {/* These visual pools have no Rapier hooks.  Keeping them outside the keyed
          Physics subtree preserves GPU buffers across run resets; resetKey clears
          all prior-run matrices/events in place.  They mount after game logic so
          their frame update keeps the original simulation-then-visual order. */}
      <DamageNumbersLayer resetKey={gameKey} />
      <ZombieInstanceLayer resetKey={gameKey} />
      <ExpansionZombieInstanceLayer resetKey={gameKey} />
      {/* E07 웃는얼굴 좀비 몸통(셰이더 얼굴이라 인스턴싱 대상이 아님). 그림자·체력바·
          스폰 연기는 위 ZombieInstanceLayer가 그대로 담당한다. */}
      <ProceduralFaceZombieLayer />
      <PooledEnemyProjectileLayer resetKey={gameKey} />
      <ExpansionHazardLayer events={expansionAttackSnapshots} resetKey={gameKey} />
      <StageEntryRuntimeDiagnostics gameKey={gameKey} />
    </Canvas>
  )
}
