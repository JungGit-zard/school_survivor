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

    // smooth camera follow (거리 17 = 원근 깊이감 유지하며 살짝 당긴 줌)
    _camTarget.set(playerPos.x, 17, playerPos.z + 17)
    camera.position.lerp(_camTarget, 0.08)
    camera.lookAt(playerPos.x, 0, playerPos.z)
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
