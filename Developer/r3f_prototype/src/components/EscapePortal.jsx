import { useEffect, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clearPortalTarget, playerPos, publishPortalTarget } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { STAGE_OBJECT_PLACEMENTS } from './StageObjects/stageObjectPlacements.js'
import { clampGameplayFrameDelta } from '../lib/gameplayFrameTime.js'
import {
  PORTAL_SUCTION_DURATION,
  advancePortalSuctionClock,
  createPortalSuctionClock,
  resetPortalSuctionClock,
} from '../lib/portalSuctionClock.js'
import { PORTAL_VISUAL_STATE, applyPortalSuctionVisuals } from '../lib/portalVisualState.js'
import StudioTunedGroup, {
  composeStudioPartRotation,
  composeStudioPartScale,
} from './StudioTunedGroup.jsx'

const PORTAL_RADIUS = 1.5
// 작동(흡입) 히트박스 — 시각 링(PORTAL_RADIUS)과 분리해 중앙 좁은 원으로 제한.
const PORTAL_TRIGGER_RADIUS = 0.6
const MIN_DIST_FROM_PLAYER = 5
const MIN_DIST_FROM_OBSTACLE = 2
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
  const clearStageAndStartNext = useGameStore((s) => s.clearStageAndStartNext)
  const phase       = useGameStore((s) => s.phase)

  const pos      = useMemo(() => pickPortalPosition(stageId), [stageId])
  const ringRef  = useRef()
  const glowRef  = useRef()
  const ringMaterialRef = useRef()
  const glowMaterialRef = useRef()
  const portalLightRef = useRef()
  const spinRef = useRef({ ringY: 0, glowY: 0 })
  const suckingRef      = useRef(false)
  const suctionClockRef = useRef(null)
  const clearedRef      = useRef(false)
  if (suctionClockRef.current === null) suctionClockRef.current = createPortalSuctionClock()

  useEffect(() => {
    publishPortalTarget(pos[0], pos[2])
    return clearPortalTarget
  }, [pos])

  useFrame((_, delta) => {
    if (phase !== 'playing' || clearedRef.current) return

    const visualDelta = clampGameplayFrameDelta(delta)

    // Studio 파츠의 회전·스케일은 정본 base/Studio/애니메이션 합성법칙으로만 갱신한다.
    spinRef.current.ringY += visualDelta * 1.2
    spinRef.current.glowY -= visualDelta * 0.6
    if (ringRef.current) {
      ringRef.current.rotation.y = composeStudioPartRotation(
        ringRef.current, 'y', 0, spinRef.current.ringY,
      )
    }
    if (glowRef.current) {
      glowRef.current.rotation.y = composeStudioPartRotation(
        glowRef.current, 'y', 0, spinRef.current.glowY,
      )
    }

    const dx = playerPos.x - pos[0]
    const dz = playerPos.z - pos[2]
    const dist = Math.hypot(dx, dz)

    if (!suckingRef.current && dist < PORTAL_TRIGGER_RADIUS) {
      suckingRef.current = true
      resetPortalSuctionClock(suctionClockRef.current)
      applyPortalSuctionVisuals({
        ringMaterial: ringMaterialRef.current,
        glowMaterial: glowMaterialRef.current,
        light: portalLightRef.current,
      })
      emitSfx({ id: 'portalSuction' })
      // Trigger frame only starts the sequence. The next playing frame owns
      // the first fixed suction step, preventing a resume hitch from skipping it.
      return
    }

    if (suckingRef.current) {
      const { elapsed, completedNow } = advancePortalSuctionClock(suctionClockRef.current, delta)
      // scale up glow during suction
      const t = Math.min(elapsed / PORTAL_SUCTION_DURATION, 1)
      if (glowRef.current) {
        const scale = 1 + t * 1.5
        glowRef.current.scale.set(
          composeStudioPartScale(glowRef.current, 'x', 1, scale),
          composeStudioPartScale(glowRef.current, 'y', 1, scale),
          composeStudioPartScale(glowRef.current, 'z', 1, scale),
        )
      }

      if (completedNow && !clearedRef.current) {
        clearedRef.current = true
        emitSfx({ id: 'escapePortalClear' })
        clearStageAndStartNext()
      }
    }
  })

  return (
    <group position={pos}>
      <StudioTunedGroup itemId="stage-object-escape-portal">
        {/* outer rotating ring */}
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PORTAL_RADIUS - 0.12, PORTAL_RADIUS, 48]} />
          <meshStandardMaterial
            ref={ringMaterialRef}
            color={PORTAL_VISUAL_STATE.idle.color}
            emissive={PORTAL_VISUAL_STATE.idle.color}
            emissiveIntensity={PORTAL_VISUAL_STATE.idle.ringEmissiveIntensity}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* inner glow disc */}
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[PORTAL_RADIUS - 0.14, 48]} />
          <meshStandardMaterial
            ref={glowMaterialRef}
            color={PORTAL_VISUAL_STATE.idle.color}
            emissive={PORTAL_VISUAL_STATE.idle.color}
            emissiveIntensity={PORTAL_VISUAL_STATE.idle.glowEmissiveIntensity}
            transparent
            opacity={PORTAL_VISUAL_STATE.idle.glowOpacity}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* point light for scene glow */}
        <pointLight
          ref={portalLightRef}
          color={PORTAL_VISUAL_STATE.idle.color}
          intensity={PORTAL_VISUAL_STATE.idle.lightIntensity}
          distance={6}
          decay={2}
        />
      </StudioTunedGroup>
    </group>
  )
}
