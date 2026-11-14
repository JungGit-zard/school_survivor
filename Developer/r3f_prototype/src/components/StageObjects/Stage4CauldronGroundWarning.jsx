import { useRef } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../store/useGameStore.js'
import { getRuntimeElapsedMs } from '../../lib/gameRuntimeTime.js'
import {
  getPressureCauldronHazardVisual,
  PRESSURE_CAULDRON_BOIL_LEAD_MS,
  PRESSURE_CAULDRON_DAMAGE_RADIUS,
  PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS,
} from '../../lib/stage4PressureCauldronHazard.js'

// Game's blast consumer measures distance from WORLD (0, 0), not from the
// Studio-authored vessel. Portal out of all prop/model scale, shiver and yaw.
// No audio here: the single fixed-step Game owner owns the cauldron cue edges.
// The filled disc radius IS the damage radius (3.2 units / 0.8 blocks) and never pulses.
export const STAGE4_CAULDRON_GROUND_FILL = Object.freeze({
  warningColor: '#ffe576', warningOpacity: 0.3, warningOpacityGain: 0.18,
  fireColor: '#ff6b24', fireOpacity: 0.55,
})
export default function Stage4CauldronGroundWarning() {
  const scene = useThree((state) => state.scene)
  const root = useRef()
  const fill = useRef()
  const fire = useRef()
  useFrame(() => {
    const state = useGameStore.getState()
    if (!root.current) return
    if (state.currentStageId !== 'stage4' || !['playing', 'paused', 'levelup'].includes(state.phase)) {
      root.current.visible = false
      return
    }
    // Pause/overlays never advance or restart the simulation warning.
    const ms = getRuntimeElapsedMs(state.elapsedMs)
    const visual = getPressureCauldronHazardVisual(ms, state.currentStageId, 'playing')
    const progress = visual.boiling
      ? (ms % PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS - (PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS - PRESSURE_CAULDRON_BOIL_LEAD_MS)) / PRESSURE_CAULDRON_BOIL_LEAD_MS
      : 0
    root.current.visible = visual.boiling || visual.bursting
    root.current.userData.progress = progress
    root.current.userData.hazardState = visual.bursting ? 'fire' : visual.boiling ? 'warning' : 'idle'
    // 2026-11-14 Terry: 테두리·눈금 없이 원형 색상 하나. 남은 시간은 채움이 점점 진해지는 것으로만 읽힌다(맥동 없음).
    const material = fill.current?.material
    if (material) {
      const W = STAGE4_CAULDRON_GROUND_FILL
      material.color.set(visual.bursting ? W.fireColor : W.warningColor)
      material.opacity = visual.bursting ? W.fireOpacity : W.warningOpacity + W.warningOpacityGain * Math.min(1, Math.max(0, progress))
    }
    fire.current.visible = visual.bursting
  })
  const radius = PRESSURE_CAULDRON_DAMAGE_RADIUS
  return createPortal(
    <group ref={root} name="pressure-cauldron-world-warning" visible={false} userData={{ studioRenderOutline: false }}>
      <mesh ref={fill} name="pressure-cauldron-world-boundary" position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial color={STAGE4_CAULDRON_GROUND_FILL.warningColor} transparent opacity={STAGE4_CAULDRON_GROUND_FILL.warningOpacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={fire} visible={false} name="pressure-cauldron-world-fire">
        {Array.from({ length: 8 }, (_, index) => {
          const angle = index * Math.PI / 4
          return <mesh key={index} position={[Math.sin(angle) * (radius - 0.72), 0.055, Math.cos(angle) * (radius - 0.72)]} rotation={[0, angle, 0]} renderOrder={10}>
            <boxGeometry args={[0.12, 0.035, 0.48]} />
            <meshBasicMaterial color="#fff2ce" depthWrite={false} toneMapped={false} />
          </mesh>
        })}
      </group>
    </group>, scene,
  )
}
