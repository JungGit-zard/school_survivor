import { useEffect, useLayoutEffect, useRef } from 'react'
import { Canvas, useStore, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import Game from './Game.jsx'
import DamageNumbersLayer from './DamageNumbersLayer.jsx'
import ZombieInstanceLayer from './ZombieInstanceLayer.jsx'
import PurifiedStudentLayer from './PurifiedStudentLayer.jsx'
import ExpansionZombieInstanceLayer from './expansion/ExpansionZombieInstanceLayer.jsx'
import ExpansionHazardLayer from './expansion/ExpansionHazardLayer.jsx'
import { expansionAttackSnapshots } from '../lib/expansionAttackRuntime.js'
import ProceduralFaceZombieLayer from './ProceduralFaceZombieLayer.jsx'
import BlockyZombieLayer from './BlockyZombieLayer.jsx'
import MiniZombieLayer from './MiniZombieLayer.jsx'
import MiniHumanLayer from './MiniHumanLayer.jsx'
import { getMiniHumanPlacements } from '../lib/miniHumanRoster.js'
import { novel2PickVariant, novel2PropScale } from './miniZombieHooks.js'
import LongRopeLayer from './LongRopeLayer.jsx'
import RollingBallLayer from './RollingBallLayer.jsx'
import PooledEnemyProjectileLayer from './PooledEnemyProjectileLayer.jsx'
import StageEntryRuntimeDiagnostics from './StageEntryRuntimeDiagnostics.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { EXPANSION_STAGE_VISUALS } from '../lib/expansionVisuals.js'

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

// frameloop 'never' (Matilda contact freeze) stops all rendering, but a resize or
// rotation still resizes — and clears — the drawing buffer. Redraw the scene once per
// size change (never on the freeze itself) without running useFrame, so the frozen
// frame stays frozen and visible.
function RedrawFrozenOnResize({ active }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const sizeKey = useThree((state) => `${state.size.width}x${state.size.height}@${state.viewport.dpr}`)
  const frozenSizeRef = useRef(null)
  useLayoutEffect(() => {
    if (!active) {
      frozenSizeRef.current = null
      return
    }
    if (frozenSizeRef.current === null) {
      frozenSizeRef.current = sizeKey
      return
    }
    if (frozenSizeRef.current === sizeKey) return
    frozenSizeRef.current = sizeKey
    gl.render(scene, camera)
  }, [active, sizeKey, gl, scene, camera])
  return null
}

export default function GameCanvas({ gameKey, phase }) {
  const deathCause = useGameStore((state) => state.deathCause)
  const isMatildaContactDeath = phase === 'gameover' && deathCause === 'matilda'
  // 야외 스테이지는 맵 밖 바닥 너머를 잔디색으로 칠한다(Stage 6 운동장). 실내 스테이지는 기존 회색.
  const canvasBackground = useGameStore((state) => EXPANSION_STAGE_VISUALS[state.currentStageId]?.canvasBackground ?? '#c8c4bc')
  const currentStageId = useGameStore((state) => state.currentStageId)

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
      style={{ width: '100%', height: '100%', background: canvasBackground, display: 'block', filter: isMatildaContactDeath ? 'grayscale(1)' : 'none' }}
    >
      {import.meta.env.DEV && <DevQaHandle />}
      <RedrawFrozenOnResize active={isMatildaContactDeath} />
      <Physics key={gameKey} gravity={[0, 0, 0]} timeStep={1 / 60} paused={phase !== 'playing'}>
        <Game />
      </Physics>
      {/* These visual pools have no Rapier hooks.  Keeping them outside the keyed
          Physics subtree preserves GPU buffers across run resets; resetKey clears
          all prior-run matrices/events in place.  They mount after game logic so
          their frame update keeps the original simulation-then-visual order. */}
      <DamageNumbersLayer resetKey={gameKey} />
      <ZombieInstanceLayer resetKey={gameKey} />
      <PurifiedStudentLayer resetKey={gameKey} />
      <ExpansionZombieInstanceLayer resetKey={gameKey} />
      {/* E07 웃는얼굴 좀비 몸통(셰이더 얼굴이라 인스턴싱 대상이 아님). 그림자·체력바·
          스폰 연기는 위 ZombieInstanceLayer가 그대로 담당한다. */}
      <ProceduralFaceZombieLayer />
      {/* 블록 좀비 18종(E71~E88, Kenney CC0) 몸통. 그림자·체력바·스폰 연기는 ZombieInstanceLayer가 담당한다. */}
      <BlockyZombieLayer resetKey={gameKey} />
      {/* 2차 신규 좀비 18종(E89~E106, Kenney Mini Characters CC0) 몸통. 그림자·체력바·스폰 연기는 ZombieInstanceLayer가 담당한다. */}
      <MiniZombieLayer resetKey={gameKey} pickVariant={novel2PickVariant} propScale={novel2PropScale} />
      {/* E95 긴줄넘기 줄: 줄 스냅샷의 고정 양끝에 그린다(InstancedMesh 1개 = 드로콜 1개, 줄이 없으면 0). */}
      <LongRopeLayer resetKey={gameKey} />
      {/* E104 공굴리기 대장의 큰 공: 손에 든 공·굴러가는 공·바닥의 공 모두(InstancedMesh 1개 = 드로콜 1개, 대장이 없으면 0).
          굴러가는 공의 중심 = 피해 판정 원의 중심(behavior ballStateInto). */}
      <RollingBallLayer resetKey={gameKey} />
      {/* 감염 안 된 사람 구경꾼(Kenney Mini 원래 색). 콜라이더·적 풀 없음, 목록이 비면 null — 지금은 구조만 있다. */}
      <MiniHumanLayer placements={getMiniHumanPlacements(currentStageId)} />
      <PooledEnemyProjectileLayer resetKey={gameKey} />
      <ExpansionHazardLayer events={expansionAttackSnapshots} resetKey={gameKey} />
      <StageEntryRuntimeDiagnostics gameKey={gameKey} />
    </Canvas>
  )
}
