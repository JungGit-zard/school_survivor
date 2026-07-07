import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore.js'
import { isE2EAuthBypass, applyE2EOverridesToStore } from '../lib/e2eAuth.js'
import { getStageBounds, getStageConfig } from '../lib/stageConfig.js'
import { playerPos, screenBounds } from '../lib/refs.js'
import Player from './Player.jsx'
import Floor from './Floor.jsx'
import Enemies from './Enemies.jsx'
import LunchItems from './LunchItems.jsx'
import VFXLayer from './VFXLayer.jsx'
import EscapePortal from './EscapePortal.jsx'
import { emitSfx } from '../lib/sfxEvents.js'
import { PencilThrow, SchoolBagSwing, BoxCutterWeapon, TumblerOrbit, BellShockwave, ScienceFlaskSplash, OnigiiriWeapon, StunGunWeapon, GuidedMissile, StarlinkWeapon, CompassBladeWeapon, UmbrellaGuardWeapon, EraserBombWeapon, ChibikoWeapon, SharkMissileWeapon, StudentLanternWeapon } from './Weapons/index.js'
import ZombieInstanceLayer from './ZombieInstanceLayer.jsx'

const _camTarget = new THREE.Vector3()

// 카메라 경계 클램프 설정.
// 카메라가 focus 기준 (0, +17, +17) 오프셋 → 45° 내려다봄.
// 맵 경계(halfX/halfZ)는 스테이지별로 다르므로 clampFocus에 half를 인자로 넘긴다.
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
function clampFocus(value, reachNeg, reachPos, half) {
  const lo = -half + reachNeg
  const hi = half - reachPos
  if (lo > hi) return (lo + hi) / 2
  return Math.min(hi, Math.max(lo, value))
}

export default function Game() {
  const { camera } = useThree()
  const tickTime   = useGameStore((s) => s.tickTime)
  const phase      = useGameStore((s) => s.phase)
  const currentStageId = useGameStore((s) => s.currentStageId)
  const escapePortalActive = useGameStore((s) => s.escapePortalActive)
  const activateEscapePortal = useGameStore((s) => s.activateEscapePortal)
  const spawnMatilda = useGameStore((s) => s.spawnMatilda)
  const matildaSpawned = useGameStore((s) => s.matildaSpawned)
  const checkSurvivalMilestone = useGameStore((s) => s.checkSurvivalMilestone)
  const gameKey = useGameStore((s) => s.gameKey)

  // DEV E2E 전용: resetGame이 상태를 초기화한 뒤(매 런 시작 = gameKey 증가) URL 쿼리로
  // 지정한 무기 무장·쿨다운·hp를 덮어쓴다. e2e 우회가 아니면 완전 no-op(프로덕션은 데드 브랜치).
  useEffect(() => {
    if (isE2EAuthBypass()) {
      applyE2EOverridesToStore(useGameStore)
    }
  }, [gameKey])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    if (phase === 'playing') {
      tickTime(dt * 1000)
      checkSurvivalMilestone()
      // getState()로 최신 값 읽기 — React 클로저 stale 방지
      const gs = useGameStore.getState()
      const { elapsedMs } = gs
      const stageConfig = getStageConfig(currentStageId)
      // 스테이지 설정 시간에 자동 클리어 대신 탈출구 등장
      if (!gs.escapePortalActive && elapsedMs >= stageConfig.escapePortalSec * 1000) {
        activateEscapePortal()
        emitSfx({ id: 'portalAppear' })
      }
      // 스테이지 설정 시간에 마틸다 스폰
      if (!gs.matildaSpawned && elapsedMs >= stageConfig.matildaSec * 1000) {
        spawnMatilda()
      }
    }

    // smooth camera follow + 경계 클램프.
    // 플레이어를 따라가되, 카메라 시야가 맵(±48)을 넘으면 focus를 맵 안으로 고정한다.
    // → 가장자리에서 스크롤이 멈추고 캐릭터는 화면 끝(벽)까지만, 빈/잘린 바닥이 안 보인다.
    const reach = groundReach(camera)
    const { halfX, halfZ } = getStageBounds(currentStageId)
    const fx = clampFocus(playerPos.x, reach.reachSide, reach.reachSide, halfX)
    const fz = clampFocus(playerPos.z, reach.reachUp, reach.reachDown, halfZ)
    screenBounds.minX = fx - reach.reachSide
    screenBounds.maxX = fx + reach.reachSide
    screenBounds.minZ = fz - reach.reachUp
    screenBounds.maxZ = fz + reach.reachDown
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
      <ChibikoWeapon />
      <SharkMissileWeapon />
      <StudentLanternWeapon />

      {/* ── Shared VFX Layer (적 위에 그릴 효과는 이쪽으로) ── */}
      <VFXLayer />

      {/* ── Enemies (AI + physics) + instanced visual layer ── */}
      <Enemies />
      <ZombieInstanceLayer />

      {/* ── Escape Portal (스테이지 설정 시간 이후 등장) ── */}
      {escapePortalActive && <EscapePortal stageId={currentStageId} />}
    </>
  )
}
