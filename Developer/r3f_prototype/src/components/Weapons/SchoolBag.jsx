import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier'
import { bagSwingState, playerFacing, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

export function ThirtyCmRulerModel() {
  const rulerMat = useMemo(() => toonMat(0xf6dd59, 0.18), [])
  const edgeMat = useMemo(() => toonMat(0xfff2a3, 0.12), [])
  const markMat = useMemo(() => toonMat(0x1c1c22, 0), [])
  const outMat = useMemo(() => outlineMat(0.95), [])
  const marks = useMemo(() => Array.from({ length: 11 }, (_, i) => -0.48 + i * 0.096), [])

  return (
    <StudioTunedGroup itemId="weapon-ruler">
      <group scale={[0.55, 0.55, 0.55]}>
      <mesh material={outMat} scale={inflateScale([1.14, 1.06, 1.25])}>
        <boxGeometry args={[0.14, 1.18, 0.045]} />
      </mesh>
      <mesh material={rulerMat}>
        <boxGeometry args={[0.14, 1.18, 0.045]} />
      </mesh>
      <mesh material={edgeMat} position={[0.04, 0, 0.026]}>
        <boxGeometry args={[0.022, 1.08, 0.012]} />
      </mesh>
      {marks.map((y, idx) => (
        <mesh key={idx} material={markMat} position={[-0.02, y, 0.032]}>
          <boxGeometry args={[idx % 5 === 0 ? 0.09 : 0.055, 0.012, 0.012]} />
        </mesh>
      ))}
      </group>
    </StudioTunedGroup>
  )
}

export function SchoolBagSwing() {
  const weapons = useGameStore((s) => s.weapons)
  const [swing, setSwing] = useState(null)
  const lastSwingRef = useRef(0)
  const rbRef = useRef(null)
  const proximityRbRef = useRef(null)
  const visualRef = useRef(null)
  const bagArcRef = useRef(null)
  const trailRef = useRef(null)
  const closeEnemiesRef = useRef(new Map())
  const pendingHitsRef = useRef(new Map())
  const hitSetRef = useRef(new Set())

  usePlayingFrame(({ clock }) => {
    const w = weapons.schoolBag
    if (!w?.active) return
    proximityRbRef.current?.setTranslation({ x: playerPos.x, y: playerPos.y + 0.16, z: playerPos.z }, true)

    const now = clock.elapsedTime * 1000
    const triggerRange = w.triggerRange ?? 0.387
    let hasVeryCloseEnemy = false
    closeEnemiesRef.current.forEach(({ rb }, enemyId) => {
      if (!rb?._enemyHit || rb._enemyDead) {
        closeEnemiesRef.current.delete(enemyId)
        return
      }
      const t = rb.translation()
      const dx = t.x - playerPos.x
      const dz = t.z - playerPos.z
      if (Math.hypot(dx, dz) <= triggerRange) hasVeryCloseEnemy = true
    })

    if (!swing && hasVeryCloseEnemy && now - lastSwingRef.current >= w.cooldown) {
      lastSwingRef.current = now
      bagSwingState.lastFired = now
      emitSfx({ id: 'rulerFire' })
      bagSwingState.cooldown  = w.cooldown
      hitSetRef.current = new Set()
      pendingHitsRef.current = new Map()
      bagSwingState.active = true
      bagSwingState.progress = 0
      setSwing({ startMs: now, facing: Math.atan2(playerFacing.x, playerFacing.z) })
      return
    }

    if (!swing) {
      bagSwingState.active = false
      bagSwingState.progress = 0
      return
    }

    const elapsed = now - swing.startMs
    const duration = w.swingMs ?? 420
    if (elapsed >= duration) {
      rbRef.current?.setTranslation({ x: 9999, y: -9999, z: 9999 }, true)
      pendingHitsRef.current = new Map()
      bagSwingState.active = false
      bagSwingState.progress = 0
      setSwing(null)
      return
    }

    const t = elapsed / duration
    const ease = 1 - Math.pow(1 - t, 3)
    const swingPower = Math.sin(t * Math.PI)
    bagSwingState.active = true
    bagSwingState.progress = t
    const sweep = -1.18 + ease * 2.36
    const angle = swing.facing + sweep
    const reach = w.range ?? 0.633
    const x = playerPos.x + Math.sin(angle) * reach
    const z = playerPos.z + Math.cos(angle) * reach
    const y = playerPos.y + 0.16

    rbRef.current?.setTranslation({ x, y, z }, true)
    if (visualRef.current) {
      visualRef.current.position.set(playerPos.x, playerPos.y, playerPos.z)
      visualRef.current.rotation.set(0, swing.facing, 0)
    }
    if (bagArcRef.current) {
      const localX = Math.sin(sweep) * reach
      const localZ = Math.cos(sweep) * reach
      bagArcRef.current.position.set(localX, 0.16, localZ)
      bagArcRef.current.rotation.set(
        -0.55 * swingPower,
        sweep + Math.PI / 2,
        -1.0 + ease * 2.0,
      )
    }
    if (trailRef.current) {
      trailRef.current.position.set(playerPos.x, 0.055, playerPos.z)
      trailRef.current.rotation.set(-Math.PI / 2, 0, swing.facing - Math.PI / 2)
      trailRef.current.scale.setScalar(0.52 + ease * 0.32)
      trailRef.current.material.opacity = 0.88 * swingPower
    }

    pendingHitsRef.current.forEach((hitFn, enemyId) => {
      if (hitSetRef.current.has(enemyId)) return
      hitSetRef.current.add(enemyId)
      hitFn(w.damage, {
        source: { x: playerPos.x, z: playerPos.z },
        knockback: 3.8,
        knockbackMs: 120,
      })
    })
    pendingHitsRef.current.clear()
  })

  if (!weapons.schoolBag.active) return null

  return (
    <>
      <RigidBody
        ref={proximityRbRef}
        type="kinematicPosition"
        position={[playerPos.x, playerPos.y + 0.16, playerPos.z]}
        colliders={false}
        sensor
        onIntersectionEnter={({ other }) => {
          const rb = other.rigidBody
          if (rb?._enemyHit) closeEnemiesRef.current.set(rb._enemyId, { rb })
        }}
        onIntersectionExit={({ other }) => {
          const rb = other.rigidBody
          if (rb?._enemyId !== undefined) closeEnemiesRef.current.delete(rb._enemyId)
        }}
      >
        <BallCollider args={[weapons.schoolBag.triggerRange ?? 0.387]} sensor />
      </RigidBody>
      {swing && (
        <mesh ref={trailRef} rotation={[-Math.PI / 2, 0, 0]} position={[playerPos.x, 0.055, playerPos.z]} renderOrder={3}>
          <ringGeometry args={[0.28, (weapons.schoolBag.range ?? 0.633) + 0.28, 72, 1, -1.18, 2.36]} />
          <meshBasicMaterial color={0x7ee7ff} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <RigidBody
        ref={rbRef}
        type="kinematicPosition"
        position={[9999, -9999, 9999]}
        colliders={false}
        sensor
        onIntersectionEnter={({ other }) => {
          if (!swing) return
          const rb = other.rigidBody
          if (!rb?._enemyHit || hitSetRef.current.has(rb._enemyId)) return
          pendingHitsRef.current.set(rb._enemyId, rb._enemyHit)
        }}
      >
        <CuboidCollider args={[0.32, 0.20, 0.253]} sensor />
      </RigidBody>
      {swing && (
        <group ref={visualRef} position={[playerPos.x, playerPos.y, playerPos.z]}>
          <group ref={bagArcRef} position={[0, 0.16, weapons.schoolBag.range ?? 0.633]}>
            <ThirtyCmRulerModel />
          </group>
        </group>
      )}
    </>
  )
}
