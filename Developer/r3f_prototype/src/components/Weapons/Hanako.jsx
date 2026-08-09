import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../store/useGameStore.js'
import { playerPos } from '../../lib/refs.js'
import {
  createChibikoTrail,
  getChibikoTrailTarget,
  recordChibikoTrailPoint,
} from '../../lib/chibiko.js'
import {
  HANAKO_HEAL_INTERVAL_MS,
  HANAKO_TRAIL_FOLLOW_DISTANCE,
  computeHanakoHealAmount,
  shouldRenderHanakoCompanion,
} from '../../lib/hanako.js'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup, { composeStudioPartPosition, composeStudioPartRotation } from '../StudioTunedGroup.jsx'

function Part({ size, position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.07 }) {
  const geometry = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const s = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation}>
      {outlineMaterial && (
        <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={[s, s, s]} userData={{ studioRenderOutline: true }} />
      )}
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

export function HanakoModel() {
  const parts = useRef({})
  const outline = useMemo(() => outlineMat(0.97), [])
  const hairMat = useMemo(() => toonMat(0x100c12, 0.045), [])
  const hairShadeMat = useMemo(() => toonMat(0x241725, 0.035), [])
  const skinMat = useMemo(() => toonMat(0xf2ddd2, 0.065), [])
  const kimonoMat = useMemo(() => toonMat(0xf6a9bd, 0.075), [])
  const obiMat = useMemo(() => toonMat(0xdb5a83, 0.11), [])
  const cherryBlossomMat = useMemo(() => toonMat(0xffc9d9, 0.14), [])
  const blossomCoreMat = useMemo(() => toonMat(0xffec8a, 0.18), [])
  const shoeMat = useMemo(() => toonMat(0x21161b, 0.045), [])

  const reg = (key) => (el) => {
    if (el) parts.current[key] = el
  }

  usePlayingFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const idleBob = Math.sin(t * 3.7) * 0.023
    const sway = Math.sin(t * 2.9) * 0.04
    const sleeve = Math.sin(t * 3.4) * 0.12

    if (parts.current.root) {
      parts.current.root.position.y = composeStudioPartPosition(parts.current.root, 'y', 0, idleBob)
      parts.current.root.rotation.z = composeStudioPartRotation(parts.current.root, 'z', 0, sway * 0.32)
    }
    if (parts.current.hairFront) {
      parts.current.hairFront.position.y = composeStudioPartPosition(parts.current.hairFront, 'y', 0.98, idleBob * 0.65)
      parts.current.hairFront.rotation.x = composeStudioPartRotation(parts.current.hairFront, 'x', 0, -0.045)
    }
    if (parts.current.armL) {
      parts.current.armL.rotation.x = composeStudioPartRotation(parts.current.armL, 'x', 0, -0.1 + sleeve)
      parts.current.armL.rotation.z = composeStudioPartRotation(parts.current.armL, 'z', 0, 0.18)
    }
    if (parts.current.armR) {
      parts.current.armR.rotation.x = composeStudioPartRotation(parts.current.armR, 'x', 0, -0.12 - sleeve)
      parts.current.armR.rotation.z = composeStudioPartRotation(parts.current.armR, 'z', 0, -0.18)
    }
  })

  return (
    <StudioTunedGroup itemId="weapon-hanako">
      <group ref={reg('root')}>
        <Part size={[0.54, 0.45, 0.44]} position={[0, 0.9, 0]} material={skinMat} outlineMaterial={outline} />

        <Part size={[0.7, 0.32, 0.56]} position={[0, 1.17, 0.02]} material={hairMat} outlineMaterial={outline} outlineScale={1.05} />
        <group ref={reg('hairFront')} position={[0, 0.98, 0.25]}>
          <Part size={[0.66, 0.38, 0.15]} position={[0, 0, 0]} material={hairMat} outlineMaterial={outline} outlineScale={1.04} />
        </group>
        <Part size={[0.22, 0.68, 0.45]} position={[-0.38, 0.8, 0.01]} material={hairMat} outlineMaterial={outline} outlineScale={1.04} />
        <Part size={[0.22, 0.68, 0.45]} position={[0.38, 0.8, 0.01]} material={hairShadeMat} outlineMaterial={outline} outlineScale={1.04} />
        <Part size={[0.52, 0.62, 0.22]} position={[0, 0.76, -0.25]} material={hairMat} outlineMaterial={outline} outlineScale={1.04} />

        <group position={[0.31, 1.05, 0.26]} rotation={[0.18, 0, -0.38]}>
          <Part size={[0.16, 0.06, 0.035]} position={[0, 0.06, 0]} rotation={[0, 0, 0]} material={cherryBlossomMat} outlineMaterial={outline} outlineScale={1.03} />
          <Part size={[0.16, 0.06, 0.035]} position={[0.055, 0.0, 0]} rotation={[0, 0, 1.25]} material={cherryBlossomMat} outlineMaterial={outline} outlineScale={1.03} />
          <Part size={[0.16, 0.06, 0.035]} position={[-0.055, 0.0, 0]} rotation={[0, 0, -1.25]} material={cherryBlossomMat} outlineMaterial={outline} outlineScale={1.03} />
          <Part size={[0.06, 0.06, 0.04]} position={[0, 0.015, 0.02]} material={blossomCoreMat} outlineMaterial={outline} outlineScale={1.02} />
        </group>

        <Part size={[0.5, 0.5, 0.38]} position={[0, 0.34, 0]} material={kimonoMat} outlineMaterial={outline} />
        <Part size={[0.68, 0.4, 0.44]} position={[0, -0.02, 0]} material={kimonoMat} outlineMaterial={outline} />
        <Part size={[0.58, 0.12, 0.42]} position={[0, 0.27, 0.03]} material={obiMat} outlineMaterial={outline} outlineScale={1.035} />
        <Part size={[0.11, 0.26, 0.08]} position={[0, 0.43, 0.25]} rotation={[0, 0, 0.12]} material={obiMat} outlineMaterial={outline} outlineScale={1.03} />

        <group ref={reg('armL')} position={[-0.42, 0.42, 0]}>
          <Part size={[0.2, 0.54, 0.22]} position={[0, -0.24, 0]} rotation={[0, 0, 0.14]} material={kimonoMat} outlineMaterial={outline} outlineScale={1.04} />
          <Part size={[0.15, 0.13, 0.13]} position={[0.02, -0.55, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04} />
        </group>
        <group ref={reg('armR')} position={[0.42, 0.42, 0]}>
          <Part size={[0.2, 0.54, 0.22]} position={[0, -0.24, 0]} rotation={[0, 0, -0.14]} material={kimonoMat} outlineMaterial={outline} outlineScale={1.04} />
          <Part size={[0.15, 0.13, 0.13]} position={[-0.02, -0.55, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04} />
        </group>

        <Part size={[0.13, 0.27, 0.15]} position={[-0.15, -0.35, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04} />
        <Part size={[0.13, 0.27, 0.15]} position={[0.15, -0.35, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04} />
        <Part size={[0.23, 0.11, 0.23]} position={[-0.15, -0.54, 0.04]} material={shoeMat} outlineMaterial={outline} outlineScale={1.04} />
        <Part size={[0.23, 0.11, 0.23]} position={[0.15, -0.54, 0.04]} material={shoeMat} outlineMaterial={outline} outlineScale={1.04} />
      </group>
    </StudioTunedGroup>
  )
}

export function HanakoWeapon() {
  const groupRef = useRef()
  const posRef = useRef(new THREE.Vector3())
  const targetRef = useRef(new THREE.Vector3())
  const trailRef = useRef(createChibikoTrail())
  const initializedRef = useRef(false)
  const startedAtRef = useRef(null)
  const lastHealAtRef = useRef(null)
  const weapons = useGameStore((s) => s.weapons)
  const maxHp = useGameStore((s) => s.player.maxHp)
  const healPlayer = useGameStore((s) => s.healPlayer)

  const active = shouldRenderHanakoCompanion(weapons)

  usePlayingFrame(({ clock }, delta) => {
    if (!active || !groupRef.current) return

    const now = clock.elapsedTime * 1000
    if (startedAtRef.current === null) {
      startedAtRef.current = now
      lastHealAtRef.current = now
    }

    recordChibikoTrailPoint(trailRef.current, playerPos, now)
    const follow = getChibikoTrailTarget(trailRef.current, now, {
      followDistance: HANAKO_TRAIL_FOLLOW_DISTANCE,
    })
    targetRef.current.set(follow.x, follow.y, follow.z)
    if (!initializedRef.current) {
      posRef.current.copy(targetRef.current)
      initializedRef.current = true
    }

    const moveX = targetRef.current.x - posRef.current.x
    const moveZ = targetRef.current.z - posRef.current.z
    posRef.current.lerp(targetRef.current, Math.min(1, delta * 5.8))

    const bob = Math.sin(clock.elapsedTime * 3.7) * 0.023
    groupRef.current.position.set(posRef.current.x, 0.14 + bob, posRef.current.z)

    const trailYaw = Math.hypot(moveX, moveZ) > 0.001
      ? Math.atan2(moveX, moveZ)
      : groupRef.current.rotation.y
    let diff = trailYaw - groupRef.current.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    groupRef.current.rotation.y += diff * Math.min(1, delta * 8.5)

    if (now - lastHealAtRef.current >= HANAKO_HEAL_INTERVAL_MS) {
      const healAmount = computeHanakoHealAmount(maxHp)
      lastHealAtRef.current = now
      if (healAmount > 0) healPlayer(healAmount)
    }
  })

  if (!active) {
    initializedRef.current = false
    startedAtRef.current = null
    lastHealAtRef.current = null
    trailRef.current.length = 0
    return null
  }

  return (
    <group ref={groupRef} scale={[0.255, 0.255, 0.255]}>
      <HanakoModel />
    </group>
  )
}
