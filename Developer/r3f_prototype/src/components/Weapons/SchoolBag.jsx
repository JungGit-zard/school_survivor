import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { bagSwingState, playerFacing, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { applyEnemyHit, isEnemyHitLive } from '../../lib/weaponCollision.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanOrientedBoxEnemiesInto, scanRadiusEnemiesInto } from '../../lib/weaponTargeting.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

// idle/완료 시 마지막 swing transform이 남지 않도록 mounted visual만 숨긴다.
// 호출자가 보유한 Three 객체만 갱신하므로 프레임별 할당이 없다.
export function hideSchoolBagSwingVisuals(visual, trail) {
  if (visual) visual.visible = false
  if (trail) {
    trail.visible = false
    trail.material.opacity = 0
  }
}

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
  const swingRef = useRef({ active: false, startMs: 0, facing: 0 })
  const lastSwingRef = useRef(0)
  const visualRef = useRef(null)
  const bagArcRef = useRef(null)
  const trailRef = useRef(null)
  const hitTargetsRef = useRef({ generations: new Uint16Array(200), special: new Array(3) })
  const nearbyScratchRef = useRef(createWeaponTargetScratch(1))
  const swingScratchRef = useRef(createWeaponTargetScratch())
  const impactRef = useRef({ source: { x: 0, z: 0 }, knockback: 3.8, knockbackMs: 120, critChance: 0, critMultiplier: 1 })

  usePlayingFrame(({ clock }) => {
    const w = weapons.schoolBag
    if (!w?.active) return
    const now = clock.elapsedTime * 1000
    const triggerRange = w.triggerRange ?? 0.387
    const hasVeryCloseEnemy = scanRadiusEnemiesInto(nearbyScratchRef.current, playerPos.x, playerPos.z, triggerRange, 1) > 0

    const swing = swingRef.current
    if (!swing.active && hasVeryCloseEnemy && now - lastSwingRef.current >= w.cooldown) {
      lastSwingRef.current = now
      bagSwingState.lastFired = now
      emitSfx({ id: 'rulerFire' })
      bagSwingState.cooldown  = w.cooldown
      hitTargetsRef.current.generations.fill(0)
      hitTargetsRef.current.special.fill(undefined)
      bagSwingState.active = true
      bagSwingState.progress = 0
      swing.active = true
      swing.startMs = now
      swing.facing = Math.atan2(playerFacing.x, playerFacing.z)
      return
    }

    if (!swing.active) {
      bagSwingState.active = false
      bagSwingState.progress = 0
      hideSchoolBagSwingVisuals(visualRef.current, trailRef.current)
      return
    }

    const elapsed = now - swing.startMs
    const duration = w.swingMs ?? 420
    if (elapsed >= duration) {
      bagSwingState.active = false
      bagSwingState.progress = 0
      swing.active = false
      hideSchoolBagSwingVisuals(visualRef.current, trailRef.current)
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
    if (visualRef.current) {
      visualRef.current.visible = true
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
      trailRef.current.visible = true
      trailRef.current.position.set(playerPos.x, 0.055, playerPos.z)
      trailRef.current.rotation.set(-Math.PI / 2, 0, swing.facing - Math.PI / 2)
      trailRef.current.scale.setScalar(0.52 + ease * 0.32)
      trailRef.current.material.opacity = 0.88 * swingPower
    }

    const scratch = swingScratchRef.current
    const targetCount = scanOrientedBoxEnemiesInto(scratch, x, z, angle, 0.32, 0.253)
    for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
      const special = scratch.special[targetIndex]
      const index = scratch.indices[targetIndex]
      const generation = special ? (scratch.generations[targetIndex] || null) : scratch.generations[targetIndex]
      const rb = special ?? resolveWeaponTarget(index, generation, null)
      if (!isEnemyHitLive(rb, generation)) continue
      let alreadyHit = false
      if (special) {
        for (let slot = 0; slot < 3; slot += 1) {
          if (hitTargetsRef.current.special[slot] === special) { alreadyHit = true; break }
        }
      } else alreadyHit = hitTargetsRef.current.generations[index] === generation
      if (alreadyHit) continue
      const impact = impactRef.current
      impact.source.x = playerPos.x; impact.source.z = playerPos.z
      impact.critChance = w.critChance; impact.critMultiplier = w.critMultiplier
      if (!applyEnemyHit(rb, generation, w.damage, impact)) continue
      if (special) {
        for (let slot = 0; slot < 3; slot += 1) {
          if (hitTargetsRef.current.special[slot] === undefined) {
            hitTargetsRef.current.special[slot] = special
            break
          }
        }
      } else hitTargetsRef.current.generations[index] = generation
      emitSfx({ id: 'rulerHit', volume: 0.58 })
    }
  })

  if (!weapons.schoolBag.active) return null

  return (
    <>
      <mesh ref={trailRef} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[playerPos.x, 0.055, playerPos.z]} renderOrder={3}>
          <ringGeometry args={[0.28, (weapons.schoolBag.range ?? 0.633) + 0.28, 72, 1, -1.18, 2.36]} />
          <meshBasicMaterial color={0x7ee7ff} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={visualRef} visible={false} position={[playerPos.x, playerPos.y, playerPos.z]}>
          <group ref={bagArcRef} position={[0, 0.16, weapons.schoolBag.range ?? 0.633]}>
            <ThirtyCmRulerModel />
          </group>
      </group>
    </>
  )
}
