import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore.js'
import { getStageDurationSec } from '../lib/stageConfig.js'
import { playerPos } from '../lib/refs.js'
import Player from './Player.jsx'
import Floor from './Floor.jsx'
import Enemies from './Enemies.jsx'
import LunchItems from './LunchItems.jsx'
import VFXLayer from './VFXLayer.jsx'
import { PencilThrow, SchoolBagSwing, BoxCutterWeapon, TumblerOrbit, BellShockwave, ScienceFlaskSplash, OnigiiriWeapon, StunGunWeapon, GuidedMissile, StarlinkWeapon, CompassBladeWeapon, UmbrellaGuardWeapon, EraserBombWeapon } from './Weapons/index.js'

const _camTarget = new THREE.Vector3()

// 카메라 경계 클램프 설정.
// MAP_HALF: 플레이 경계(벽, Floor.jsx의 ±48과 일치). 카메라 시야가 이 밖으로 안 나가게 한다.
// CAM_HEIGHT/CAM_BACK: 카메라가 focus 기준 (0, +17, +17) 오프셋 → 45° 내려다봄.
const MAP_HALF = 48
const CAM_HEIGHT = 17
const CAM_BACK = 17

// 카메라가 지면(y=0)에서 focus 기준 얼마나 멀리 보는지(반경)를 fov·aspect로 계산.
// reachUp: 화면 위(-z) 방향, reachDown: 화면 아래(+z), reachSide: 좌우(x).
function groundReach(camera) {
  const vfov = THREE.MathUtils.degToRad(camera.fov ?? 30)
  const pitch = Math.atan2(CAM_HEIGHT, CAM_BACK) // 45°
  const zTop = CAM_BACK - CAM_HEIGHT / Math.tan(pitch - vfov / 2) // 먼 쪽(음수)
  const zBot = CAM_BACK - CAM_HEIGHT / Math.tan(pitch + vfov / 2) // 가까운 쪽(양수)
  const rFar = Math.hypot(CAM_BACK - zTop, CAM_HEIGHT)
  return {
    reachUp: -zTop,
    reachDown: zBot,
    reachSide: rFar * Math.tan(vfov / 2) * (camera.aspect ?? 1),
  }
}

// 시야가 맵을 넘지 않도록 카메라 focus를 맵 안으로 클램프. 맵이 시야보다 좁은 축은 중앙 정렬.
function clampFocus(value, reachNeg, reachPos) {
  const lo = -MAP_HALF + reachNeg
  const hi = MAP_HALF - reachPos
  if (lo > hi) return (lo + hi) / 2
  return Math.min(hi, Math.max(lo, value))
}

export default function Game() {
  const { camera } = useThree()
  const tickTime   = useGameStore((s) => s.tickTime)
  const phase      = useGameStore((s) => s.phase)
  const currentStageId = useGameStore((s) => s.currentStageId)
  const clearStage = useGameStore((s) => s.clearStage)
  const checkSurvivalMilestone = useGameStore((s) => s.checkSurvivalMilestone)

  useFrame((_, delta) => {
    if (phase === 'playing') {
      tickTime(delta * 1000)
      checkSurvivalMilestone()
      // getState()로 최신 값 읽어 stale closure 방지
      if (useGameStore.getState().elapsedMs >= getStageDurationSec(currentStageId) * 1000) {
        clearStage()
      }
    }

    // smooth camera follow + 경계 클램프.
    // 플레이어를 따라가되, 카메라 시야가 맵(±48)을 넘으면 focus를 맵 안으로 고정한다.
    // → 가장자리에서 스크롤이 멈추고 캐릭터는 화면 끝(벽)까지만, 빈/잘린 바닥이 안 보인다.
    const reach = groundReach(camera)
    const fx = clampFocus(playerPos.x, reach.reachSide, reach.reachSide)
    const fz = clampFocus(playerPos.z, reach.reachUp, reach.reachDown)
    _camTarget.set(fx, CAM_HEIGHT, fz + CAM_BACK)
    camera.position.lerp(_camTarget, 0.08)
    camera.lookAt(fx, 0, fz)
  })

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.38} color={0x6d6780} />
      <directionalLight
        position={[-10, 22, 12]}
        intensity={3.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <directionalLight position={[10, 12, -10]} intensity={0.85} color={0xffe2b0} />

      {/* ── World ── */}
      <Floor stageId={currentStageId} />
      <LunchItems />

      {/* ── Player + weapons ── */}
      <Player />
      <PencilThrow />
      <SchoolBagSwing />
      <BoxCutterWeapon />
      <TumblerOrbit />
      <BellShockwave />
      <ScienceFlaskSplash />
      <OnigiiriWeapon />
      <StunGunWeapon />
      <GuidedMissile />
      <StarlinkWeapon />
      <CompassBladeWeapon />
      <UmbrellaGuardWeapon />
      <EraserBombWeapon />

      {/* ── Shared VFX Layer (적 위에 그릴 효과는 이쪽으로) ── */}
      <VFXLayer />

      {/* ── Enemies ── */}
      <Enemies />
    </>
  )
}
