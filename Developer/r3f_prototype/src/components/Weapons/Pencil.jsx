import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanClosestEnemiesInto, scanSweptCapsuleEnemiesInto } from '../../lib/weaponTargeting.js'
import { applyEnemyHit, isEnemyHitLive } from '../../lib/weaponCollision.js'
import { useDeferredProjectileState } from '../../lib/useDeferredProjectileState.js'
import { PENCIL_FIRE_RANGE_WORLD_UNITS } from '../../lib/gameplayUnits.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

let _projId = 0
export const PENCIL_MODEL_SCALE = 0.29 * 1.5

// 최초 homing target을 맞힌 뒤에만 해제한다. pooled target은 index+generation,
// special target은 객체 identity가 같아야 하므로 관통 중 다른 적 명중은 조향을 바꾸지 않는다.
export function releasePencilHomingTargetAfterHit(target, index, generation, special) {
  const matched = special
    ? target.special === special
    : target.special == null && target.index === index && target.generation === generation
  if (!matched) return false
  target.index = -1
  target.generation = null
  target.special = null
  return true
}

export function PencilModel() {
  const pencilOutlineMat = useMemo(() => outlineMat(0.98), [])
  const woodMat = useMemo(() => toonMat(0xd89646, 0.04), [])
  const graphiteMat = useMemo(() => toonMat(0x1c1c22, 0), [])
  const bodyMat = useMemo(() => toonMat(0xffcf24, 0.035), [])
  const bandMat = useMemo(() => toonMat(0xd9d9e8, 0.025), [])
  const eraserMat = useMemo(() => toonMat(0xf05a78, 0.035), [])

  const bodyGeo = useMemo(() => new THREE.CylinderGeometry(0.075, 0.075, 0.58, 6), [])
  const tipGeo = useMemo(() => new THREE.ConeGeometry(0.085, 0.22, 6), [])
  const leadGeo = useMemo(() => new THREE.ConeGeometry(0.042, 0.10, 6), [])
  const bandGeo = useMemo(() => new THREE.CylinderGeometry(0.078, 0.078, 0.08, 6), [])
  const eraserGeo = useMemo(() => new THREE.CylinderGeometry(0.073, 0.073, 0.14, 6), [])

  return (
    <StudioTunedGroup itemId="weapon-pencil">
      <group rotation={[Math.PI / 2, 0, 0]} scale={[PENCIL_MODEL_SCALE, PENCIL_MODEL_SCALE, PENCIL_MODEL_SCALE]}>
      <mesh geometry={bodyGeo} material={pencilOutlineMat} scale={inflateScale([1.55, 1.55, 1.14])} />
      <mesh geometry={tipGeo} material={pencilOutlineMat} position={[0, 0.40, 0]} scale={inflateScale([1.55, 1.42, 1.55])} />
      <mesh geometry={eraserGeo} material={pencilOutlineMat} position={[0, -0.43, 0]} scale={inflateScale([1.52, 1.40, 1.52])} />

      <mesh geometry={bodyGeo} material={bodyMat} />
      <mesh geometry={tipGeo} material={woodMat} position={[0, 0.40, 0]} />
      <mesh geometry={leadGeo} material={graphiteMat} position={[0, 0.56, 0]} />
      <mesh geometry={bandGeo} material={bandMat} position={[0, -0.33, 0]} />
      <mesh geometry={eraserGeo} material={eraserMat} position={[0, -0.43, 0]} />
      </group>
    </StudioTunedGroup>
  )
}

function Projectile({ id, position, yaw, damage, speed, pierce, targetIndex, targetGeneration, targetSpecial, critChance, critMultiplier, onExpire }) {
  const visualRef = useRef()
  const hitsLeftRef = useRef(pierce ?? 1)    // pierce=N: N명까지 관통
  const hitIndicesRef = useRef(new Int16Array(16))
  const hitGenerationsRef = useRef(new Uint16Array(16))
  const hitSpecialRef = useRef(new Array(16))
  const hitCountRef = useRef(0)
  const targetRef = useRef({ index: targetIndex, generation: targetGeneration, special: targetSpecial })
  const sweepScratchRef = useRef(createWeaponTargetScratch())
  const impactRef = useRef({ critChance, critMultiplier })
  const ageRef = useRef(0)
  const positionRef = useRef({ x: position[0], y: position[1], z: position[2] })
  const velocityRef = useRef({ x: Math.sin(yaw) * speed, z: Math.cos(yaw) * speed })

  const tryHit = (rb, generation, index, special) => {
    if (!isEnemyHitLive(rb, generation)) return false
    for (let hitIndex = 0; hitIndex < hitCountRef.current; hitIndex += 1) {
      if (special ? hitSpecialRef.current[hitIndex] === special : (hitIndicesRef.current[hitIndex] === index && hitGenerationsRef.current[hitIndex] === generation)) return false
    }
    const impact = impactRef.current
    impact.critChance = critChance
    impact.critMultiplier = critMultiplier
    if (!applyEnemyHit(rb, generation, damage, impact)) return false
    releasePencilHomingTargetAfterHit(targetRef.current, index, generation, special)
    const slot = hitCountRef.current
    if (slot < hitIndicesRef.current.length) {
      hitIndicesRef.current[slot] = index
      hitGenerationsRef.current[slot] = generation ?? 0
      hitSpecialRef.current[slot] = special
      hitCountRef.current += 1
    }
    emitSfx({
      id: 'pencilHit',
      volume: 0.48 + Math.random() * 0.12,
      rate: 0.94 + Math.random() * 0.14,
    })
    hitsLeftRef.current -= 1
    if (hitsLeftRef.current <= 0) onExpire(id)
    return true
  }

  usePlayingFrame((_, delta) => {
    if (hitsLeftRef.current <= 0) return
    ageRef.current += delta
    if (ageRef.current > 3.5) { onExpire(id); return }

    // 타겟이 살아있는 동안 호밍
    const tgt = targetRef.current
    let targetRb = null
    if (tgt.index >= 0 || tgt.special) {
      targetRb = resolveWeaponTarget(tgt.index, tgt.generation, tgt.special)
    }
    const p = positionRef.current
    if (targetRb && isEnemyHitLive(targetRb, tgt.generation)) {
      const t = targetRb.translation()
      const dx = t.x - p.x
      const dz = t.z - p.z
      const len = Math.hypot(dx, dz)
      if (len >= 0.001) {
        velocityRef.current.x = (dx / len) * speed
        velocityRef.current.z = (dz / len) * speed
      }
    } else {
      // 타겟이 despawn/reuse되어도 마지막 속도로 직선 비행한다.
    }
    const vx = velocityRef.current.x
    const vz = velocityRef.current.z
    const nextX = p.x + vx * delta
    const nextZ = p.z + vz * delta
    const sweepScratch = sweepScratchRef.current
    const sweepCandidateLimit = Math.min(sweepScratch.indices.length, hitsLeftRef.current + hitCountRef.current)
    const sweepCount = scanSweptCapsuleEnemiesInto(sweepScratch, p.x, p.z, nextX, nextZ, 0.34, sweepCandidateLimit)
    p.x = nextX
    p.z = nextZ
    if (visualRef.current) {
      visualRef.current.position.set(p.x, p.y, p.z)
      visualRef.current.rotation.y = Math.atan2(vx, vz)
    }
    for (let hitIndex = 0; hitIndex < sweepCount && hitsLeftRef.current > 0; hitIndex += 1) {
      const special = sweepScratch.special[hitIndex]
      const index = sweepScratch.indices[hitIndex]
      const generation = special ? (sweepScratch.generations[hitIndex] || null) : sweepScratch.generations[hitIndex]
      const rb = special ?? resolveWeaponTarget(index, generation, null)
      tryHit(rb, generation, index, special)
    }
  })

  return (
    <group ref={visualRef} position={position} rotation={[0, yaw, 0]}>
      <PencilModel />
    </group>
  )
}

export function PencilThrow() {
  const [projectiles, activeProjectilesRef, requestProjectiles, expire] = useDeferredProjectileState()
  const lastFireRef = useRef(0)
  const targetScratchRef = useRef(createWeaponTargetScratch(8))
  const weapons = useGameStore((s) => s.weapons)

  usePlayingFrame(({ clock }) => {
    const w = weapons.pencilThrow
    if (!w?.active) return

    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (activeProjectilesRef.current.length > 0) return

    const count = w.projectileCount ?? 1
    const targetScratch = targetScratchRef.current
    const targetCount = scanClosestEnemiesInto(targetScratch, w.range ?? PENCIL_FIRE_RANGE_WORLD_UNITS, count)
    if (targetCount === 0) return
    lastFireRef.current = now
    emitSfx({ id: 'pencilFire' })

    const next = new Array(targetCount)
    for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
        const special = targetScratch.special[targetIndex]
        const poolIndex = targetScratch.indices[targetIndex]
        const generation = targetScratch.generations[targetIndex]
        const targetRb = special ?? resolveWeaponTarget(poolIndex, generation, null)
        if (!targetRb) continue
        const targetPos = targetRb.translation()
        const facingAngle = Math.atan2(targetPos.x - playerPos.x, targetPos.z - playerPos.z)
        next[targetIndex] = {
          id: ++_projId,
          position: [
            playerPos.x + Math.sin(facingAngle) * 0.35,
            playerPos.y + 0.22,
            playerPos.z + Math.cos(facingAngle) * 0.35,
          ],
          yaw: facingAngle,
          damage: w.damage,
          speed: w.speed,
          pierce: w.pierce ?? 1,
          targetIndex: poolIndex,
          targetGeneration: special ? (generation || null) : generation,
          targetSpecial: special,
          critChance: w.critChance,
          critMultiplier: w.critMultiplier,
        }
    }
    requestProjectiles(next)
  })

  return (
    <>
      {projectiles.map((p) => (
        <Projectile key={p.id} {...p} onExpire={expire} />
      ))}
    </>
  )
}
