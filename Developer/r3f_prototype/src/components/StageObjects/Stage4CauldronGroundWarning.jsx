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
export default function Stage4CauldronGroundWarning() {
  const scene = useThree((state) => state.scene)
  const root = useRef()
  const warning = useRef()
  const fire = useRef()
  const ticks = useRef([])
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
    warning.current.visible = visual.boiling
    fire.current.visible = visual.bursting
    ticks.current.forEach((tick, index) => { if (tick) tick.visible = index < Math.ceil(progress * 12) })
  })
  const radius = PRESSURE_CAULDRON_DAMAGE_RADIUS
  return createPortal(
    <group ref={root} name="pressure-cauldron-world-warning" visible={false} userData={{ studioRenderOutline: false }}>
      <mesh name="pressure-cauldron-world-boundary" position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
        <ringGeometry args={[radius - 0.19, radius, 64]} />
        <meshBasicMaterial color="#211610" depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={warning}>
        <mesh position={[0, 0.039, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={9}>
          <ringGeometry args={[radius - 0.14, radius - 0.045, 64]} />
          <meshBasicMaterial color="#ffe576" depthWrite={false} toneMapped={false} />
        </mesh>
        {Array.from({ length: 12 }, (_, index) => (
          <mesh key={index} ref={(node) => { ticks.current[index] = node }} position={[0, 0.043, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
            <ringGeometry args={[radius - 0.38, radius - 0.24, 64, 1, index * Math.PI / 6, Math.PI / 6 - 0.05]} />
            <meshBasicMaterial color="#ffe576" depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={fire} visible={false} name="pressure-cauldron-world-fire">
        <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={9}>
          <ringGeometry args={[radius - 0.42, radius - 0.04, 64]} />
          <meshBasicMaterial color="#ff6b24" depthWrite={false} toneMapped={false} />
        </mesh>
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
