// Stage 5 전교 호출 방송 바닥 표시(스펙 Part B §7-2 · §7-3 · §12-3).
//
// 호출 레인 직사각형 x[minX, maxX] × z[−halfZ, +halfZ]를 바닥에 칠한다. 피해 텔레그래프 색(노랑·빨강)이 아니라
// 유입 경고 전용 파랑을 쓴다 — 이 레인은 피해 지대가 아니라 스폰 지대다.
//   chiming(경고 3s): 채움 #5B8CFF α 0.20, 1Hz 깜빡임
//   calling(호출 10s): 채움 α 0.30, 0.5Hz 맥동
//   2026-11-14 Terry "굵은테두리 없애고 … 속도를 절반으로": 점선·실선 테두리를 없애고 채움만 남겼다.
//   깜빡임·맥동은 이전(2Hz/1Hz)의 절반이고, 테두리가 빠진 만큼 채움 α를 0.12/0.22 → 0.20/0.30으로 올렸다.
//   스트림 종료: 300ms 페이드아웃. 게임오버·클리어·gameKey 변경은 즉시 숨김.
// 같은 레인의 교내 방송 스피커 2개(userData.stage5CallLaneLamp)의 램프도 같은 리듬으로 파랗게 켠다.
//
// 상태는 lib/stage5CallLaneRuntime.js(단일 발행자 = Enemies.jsx)를 읽기만 한다. 레인 선택·타이밍은 거기서 정한다.
// 프랍 스케일·회전과 무관하게 월드 좌표로 그리도록 씬에 portal한다(Stage4CauldronGroundWarning과 같은 방식).
import { useEffect, useMemo, useRef } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../store/useGameStore.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { STAGE5_CALL_LANES } from '../../lib/stage5CallLane.js'
import { getStage5CallLaneState } from '../../lib/stage5CallLaneRuntime.js'

export const STAGE5_CALL_LANE_WARNING = Object.freeze({
  fill: '#5B8CFF',
  lamp: '#5B8CFF',
  chimingFillOpacity: 0.2,
  callingFillOpacity: 0.3,
  chimingHz: 1,
  callingHz: 0.5,
  fadeOutMs: 300,
  y: 0.03,
})

const VISIBLE_GAME_PHASES = new Set(['playing', 'paused', 'levelup'])

// [cx, cz, w, d] 사각형 목록 → XZ 평면 삼각형 하나의 BufferGeometry(드로우콜 1).
export function buildLaneQuadGeometry(quads) {
  const positions = []
  for (const [cx, cz, w, d] of quads) {
    const x0 = cx - w / 2
    const x1 = cx + w / 2
    const z0 = cz - d / 2
    const z1 = cz + d / 2
    positions.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geometry
}

// 레인 하나의 채움 사각형(레인 폭 × 맵 전체 깊이). 테두리는 없다.
export function getStage5CallLaneQuads(lane, halfZ) {
  const width = lane.maxX - lane.minX
  const cx = (lane.minX + lane.maxX) / 2
  return { fill: [[cx, 0, width, halfZ * 2]] }
}

// 경고 단계와 시간(초)에서 채움 불투명도 배수(0~1). fade는 스트림 종료 후 페이드 진행(0 → 1).
export function getStage5CallLaneWarningIntensity(phase, timeSec, fade = 0) {
  const W = STAGE5_CALL_LANE_WARNING
  if (phase === 'chiming') return Math.sin(timeSec * Math.PI * 2 * W.chimingHz) >= 0 ? 1 : 0.25
  if (phase === 'calling') return 0.75 + 0.25 * Math.sin(timeSec * Math.PI * 2 * W.callingHz)
  if (phase === 'fading') return Math.max(0, 1 - fade)
  return 0
}

export default function Stage5CallLaneGroundWarning() {
  const scene = useThree((state) => state.scene)
  const root = useRef(null)
  const laneRefs = useRef([])
  const view = useRef({ laneIndex: -1, mode: 'idle', fadeMs: 0, gameKey: -1, cycle: -1, lamps: [] })
  const { halfZ } = getStageBounds('stage5')
  const W = STAGE5_CALL_LANE_WARNING

  const resources = useMemo(() => {
    const fillMat = new THREE.MeshBasicMaterial({ color: W.fill, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    const lampMat = new THREE.MeshBasicMaterial({ color: W.lamp, toneMapped: false })
    const lanes = STAGE5_CALL_LANES.map((lane) => {
      const quads = getStage5CallLaneQuads(lane, halfZ)
      return { id: lane.id, fill: buildLaneQuadGeometry(quads.fill) }
    })
    return { fillMat, lampMat, lanes }
  }, [W.fill, W.lamp, halfZ])

  useEffect(() => () => {
    restoreLamps(view.current)
    resources.fillMat.dispose()
    resources.lampMat.dispose()
    for (const lane of resources.lanes) {
      lane.fill.dispose()
    }
  }, [resources])

  function restoreLamps(v) {
    for (const { mesh, material } of v.lamps) mesh.material = material
    v.lamps = []
  }

  function lightLamps(v, laneId) {
    restoreLamps(v)
    scene.traverse((object) => {
      if (object.isMesh && object.userData.stage5CallLaneLamp === laneId) {
        v.lamps.push({ mesh: object, material: object.material })
        object.material = resources.lampMat
      }
    })
  }

  useFrame(({ clock }, delta) => {
    const group = root.current
    if (!group) return
    const v = view.current
    const store = useGameStore.getState()
    const call = getStage5CallLaneState()
    const active = store.currentStageId === 'stage5'
      && VISIBLE_GAME_PHASES.has(store.phase)
      && call.gameKey === store.gameKey
    const laneIndex = call.laneIndex
    const calledPhase = active && laneIndex >= 0 && laneIndex < resources.lanes.length && (call.phase === 'chiming' || call.phase === 'calling')
      ? call.phase
      : null

    let mode = 'idle'
    if (calledPhase) {
      mode = calledPhase
      v.fadeMs = 0
      v.laneIndex = laneIndex
      v.cycle = call.cycle
    } else if (active && v.mode === 'calling' && call.cycle === v.cycle) {
      // 스트림이 끝난 직후: 300ms 페이드아웃(같은 회차일 때만).
      mode = 'fading'
    } else if (active && v.mode === 'fading' && v.fadeMs < W.fadeOutMs) {
      mode = 'fading'
    }
    if (mode === 'fading') v.fadeMs += delta * 1000
    if (mode === 'fading' && v.fadeMs >= W.fadeOutMs) mode = 'idle'
    if (!active || store.gameKey !== v.gameKey) {
      // 게임오버·클리어·재시작은 페이드 없이 즉시 숨긴다.
      if (v.mode !== 'idle' || v.lamps.length) restoreLamps(v)
      v.lampLaneId = null
      v.gameKey = store.gameKey
      if (!active) mode = 'idle'
    }

    const intensity = getStage5CallLaneWarningIntensity(mode, clock.getElapsedTime(), v.fadeMs / W.fadeOutMs)
    const visibleLane = mode === 'idle' ? -1 : v.laneIndex
    group.visible = visibleLane >= 0
    laneRefs.current.forEach((lane, index) => {
      if (!lane) return
      lane.visible = index === visibleLane
    })
    resources.fillMat.opacity = (mode === 'chiming' ? W.chimingFillOpacity : W.callingFillOpacity) * intensity

    // 스피커 램프: 호출 레인 2개만 켜고, 점멸 위상은 바닥과 같다.
    const lampLaneId = (mode === 'chiming' || mode === 'calling') ? resources.lanes[v.laneIndex].id : null
    if (lampLaneId && v.lampLaneId !== lampLaneId) {
      lightLamps(v, lampLaneId)
      v.lampLaneId = lampLaneId
    } else if (!lampLaneId && v.lampLaneId) {
      restoreLamps(v)
      v.lampLaneId = null
    }
    if (v.lamps.length) resources.lampMat.color.set(W.lamp).multiplyScalar(0.35 + 0.65 * intensity)
    v.mode = mode
  })

  return createPortal(
    <group ref={root} name="stage5-call-lane-ground-warning" visible={false} userData={{ studioRenderOutline: false }}>
      {resources.lanes.map((lane, index) => (
        <group
          key={lane.id}
          name={`stage5-call-lane-${lane.id}`}
          position={[0, W.y, 0]}
          visible={false}
          ref={(node) => { laneRefs.current[index] = node }}
        >
          <mesh name="lane-fill" geometry={lane.fill} material={resources.fillMat} renderOrder={8} />
        </group>
      ))}
    </group>,
    scene,
  )
}
