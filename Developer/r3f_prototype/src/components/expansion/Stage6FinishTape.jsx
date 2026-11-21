import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerPos, portalTarget } from '../../lib/refs.js'
import { clampGameplayFrameDelta } from '../../lib/gameplayFrameTime.js'
import { useGameStore } from '../../store/useGameStore.js'
import {
  createStage6FinishTapeMeshes,
  createStage6FinishTapeState,
  disposeStage6FinishTapeMeshes,
  getStage6FinishTapeLayout,
  stepStage6FinishTape,
  writeStage6FinishTapePose,
} from './stage6FinishTape.js'

// Stage 6 탈출구 결승 테이프(stage6FinishTape.js). 자리 = refs.js portalTarget(EscapePortal이 실제로 놓은 곳). 순수 장식 — 콜라이더 없음, Studio 튜닝 그룹 밖(바닥 Studio 파트 경로 불변).
// 스테이지 진입 셰이더 예열(compileAsync는 visible만 돈다)을 위해 처음 두 프레임은 count 0인 채 visible로 둔다.
const PREWARM_FRAMES = 2

function getReducedMotionQuery() {
  try { return typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null : null } catch { return null }
}

// 설정의 효과 줄이기(data-reduced-effects) 또는 OS 동작 줄이기. 매 프레임 호출 — 할당 없음(쿼리 객체는 한 번 만든다).
function isReducedMotion(query) {
  if (typeof document !== 'undefined' && document.documentElement?.hasAttribute?.('data-reduced-effects')) return true
  return query?.matches === true
}

export default function Stage6FinishTape({ stageId }) {
  const layout = useMemo(() => getStage6FinishTapeLayout(), [])
  const meshes = useMemo(() => createStage6FinishTapeMeshes(layout), [layout])
  useEffect(() => () => disposeStage6FinishTapeMeshes(meshes), [meshes])
  const stateRef = useRef(null)
  if (stateRef.current === null) stateRef.current = createStage6FinishTapeState()
  const reducedQuery = useMemo(getReducedMotionQuery, [])
  const frameRef = useRef(0)
  const inputRef = useRef({ stageId, gameKey: 0, portalActive: false, portalKnown: false, portalX: 0, portalZ: 0, playerX: 0, playerZ: 0, phase: 'playing', deltaSec: 0, reducedMotion: false })
  useLayoutEffect(() => {
    frameRef.current = 0
    stateRef.current.writtenShown = null
    writeStage6FinishTapePose(stateRef.current, layout, meshes, true)
  }, [layout, meshes])

  useFrame((_, delta) => {
    const s = useGameStore.getState()
    const input = inputRef.current
    input.stageId = stageId
    input.gameKey = s.gameKey
    input.portalActive = s.escapePortalActive === true
    input.portalKnown = portalTarget.active === true
    input.portalX = portalTarget.x
    input.portalZ = portalTarget.z
    input.playerX = playerPos.x
    input.playerZ = playerPos.z
    input.phase = s.phase
    input.deltaSec = clampGameplayFrameDelta(delta)
    input.reducedMotion = isReducedMotion(reducedQuery)
    stepStage6FinishTape(stateRef.current, input)
    frameRef.current += 1
    writeStage6FinishTapePose(stateRef.current, layout, meshes, frameRef.current <= PREWARM_FRAMES)
  })

  return (
    <group name="stage6-finish-tape">
      {/* dispose prop을 넘기지 않는다: R3F는 그 값을 객체의 dispose 속성에 써 버린다. 정리는 위 effect가 한다(primitive는 R3F가 자동 dispose하지 않음). */}
      <primitive object={meshes.solid} />
      <primitive object={meshes.hull} />
    </group>
  )
}
