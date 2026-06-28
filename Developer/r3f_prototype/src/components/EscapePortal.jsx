import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { STAGE_OBJECT_PLACEMENTS } from './StageObjects/stageObjectPlacements.js'

const PORTAL_RADIUS = 1.5
const MIN_DIST_FROM_PLAYER = 5
const MIN_DIST_FROM_OBSTACLE = 2
const SUCTION_DURATION = 1.0   // seconds
const MAP_INSET = 3             // stay this far from map edge

function pickPortalPosition(stageId) {
  const bounds = getStageBounds(stageId)
  const obstacles = (STAGE_OBJECT_PLACEMENTS[stageId] ?? []).map((o) => o.position)

  for (let attempt = 0; attempt < 40; attempt++) {
    const x = (Math.random() * 2 - 1) * (bounds.halfX - MAP_INSET)
    const z = (Math.random() * 2 - 1) * (bounds.halfZ - MAP_INSET)

    const distFromPlayer = Math.hypot(x - playerPos.x, z - playerPos.z)
    if (distFromPlayer < MIN_DIST_FROM_PLAYER) continue

    const tooClose = obstacles.some(([ox, , oz]) => Math.hypot(x - ox, z - oz) < MIN_DIST_FROM_OBSTACLE)
    if (tooClose) continue

    return [x, 0.05, z]
  }
  // fallback: centre-ish if all attempts fail
  return [0, 0.05, 0]
}

export default function EscapePortal({ stageId }) {
  const clearStage  = useGameStore((s) => s.clearStage)
  const phase       = useGameStore((s) => s.phase)

  const pos      = useMemo(() => pickPortalPosition(stageId), [stageId])
  const ringRef  = useRef()
  const glowRef  = useRef()
  const suckingRef      = useRef(false)
  const suckTimerRef    = useRef(0)
  const clearedRef      = useRef(false)
  const [sucking, setSucking] = useState(false)

  useFrame((_, delta) => {
    if (phase !== 'playing' || clearedRef.current) return

    // rotation animation
    if (ringRef.current)  ringRef.current.rotation.y  += delta * 1.2
    if (glowRef.current)  glowRef.current.rotation.y  -= delta * 0.6

    const dx = playerPos.x - pos[0]
    const dz = playerPos.z - pos[2]
    const dist = Math.hypot(dx, dz)

    if (!suckingRef.current && dist < PORTAL_RADIUS) {
      suckingRef.current = true
      suckTimerRef.current = 0
      setSucking(true)
    }

    if (suckingRef.current) {
      suckTimerRef.current += delta
      // scale up glow during suction
      const t = Math.min(suckTimerRef.current / SUCTION_DURATION, 1)
      if (glowRef.current) glowRef.current.scale.setScalar(1 + t * 1.5)

      if (suckTimerRef.current >= SUCTION_DURATION && !clearedRef.current) {
        clearedRef.current = true
        clearStage()
      }
    }
  })

  const portalColor  = sucking ? '#ffffff' : '#00ffcc'
  const emissiveInt  = sucking ? 3 : 1.5

  return (
    <group position={pos}>
      {/* outer rotating ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PORTAL_RADIUS - 0.12, PORTAL_RADIUS, 48]} />
        <meshStandardMaterial
          color={portalColor}
          emissive={portalColor}
          emissiveIntensity={emissiveInt}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* inner glow disc */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PORTAL_RADIUS - 0.14, 48]} />
        <meshStandardMaterial
          color={portalColor}
          emissive={portalColor}
          emissiveIntensity={emissiveInt * 0.5}
          transparent
          opacity={sucking ? 0.7 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* point light for scene glow */}
      <pointLight color={portalColor} intensity={sucking ? 6 : 2.5} distance={6} decay={2} />
    </group>
  )
}
