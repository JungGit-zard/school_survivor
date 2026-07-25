import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import Game from './Game.jsx'
import DamageNumbersLayer from './DamageNumbersLayer.jsx'
import ZombieInstanceLayer from './ZombieInstanceLayer.jsx'
import PooledEnemyProjectileLayer from './PooledEnemyProjectileLayer.jsx'
import StageEntryRuntimeDiagnostics from './StageEntryRuntimeDiagnostics.jsx'

export default function GameCanvas({ gameKey, phase }) {
  return (
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
      {/* These visual pools have no Rapier hooks.  Keeping them outside the keyed
          Physics subtree preserves GPU buffers across run resets; resetKey clears
          all prior-run matrices/events in place.  They mount after game logic so
          their frame update keeps the original simulation-then-visual order. */}
      <DamageNumbersLayer resetKey={gameKey} />
      <ZombieInstanceLayer resetKey={gameKey} />
      <PooledEnemyProjectileLayer resetKey={gameKey} />
      <StageEntryRuntimeDiagnostics gameKey={gameKey} />
    </Canvas>
  )
}
