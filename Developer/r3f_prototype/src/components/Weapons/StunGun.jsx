import { useRef, useState, useCallback, useMemo } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import * as THREE from 'three'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { scaleEffectVisual } from '../../lib/effectVisualScale.js'
import { toonMat } from '../../lib/toon.js'
import { applyEnemyHit, isEnemyHitLive } from '../../lib/weaponCollision.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { STUN_GUN_TARGET_RANGE, createStunGunHitSet, markStunGunHit, pickStunGunChainTarget } from '../../lib/stunGun.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

let _stunBoltId  = 0
let _chainArcId  = 0

const BOLT_SPEED  = 16
const CHAIN_RANGE = 4.5
const CHAIN_ARC_SEGMENT_INDICES = Object.freeze([0, 1, 2, 3, 4])
const stunBoltVisualPose = { x: Math.PI / 2, y: 0, z: 0, order: 'YXZ' }

// LightningBoltModel의 장축은 local +Y다. YXZ에서 X축으로 눕힌 뒤 yaw를 적용하면
// +Y가 표적을 향한 XZ delta와 일치한다. 프레임마다 pose 객체를 만들지 않고 재사용한다.
export function getStunBoltVisualPose(dx, dz) {
  stunBoltVisualPose.y = Number.isFinite(dx) && Number.isFinite(dz) && (dx * dx + dz * dz > Number.EPSILON)
    ? Math.atan2(dx, dz)
    : 0
  return stunBoltVisualPose
}

// 체인 호 endpoint는 발사/명중 좌표를 fallback으로 보관하되, 프레임마다 현재 정본 좌표를 쓴다.
// pooled 슬롯이 재사용되면 generation이 달라져 fallback에 고정하므로 다른 적에게 호가 점프하지 않는다.
export function resolveStunArcEndpoint(out, endpoint) {
  if (endpoint?.isPlayer) {
    out.x = playerPos.x
    out.z = playerPos.z
    return out
  }

  if (isEnemyHitLive(endpoint?.rb, endpoint?.generation)) {
    const translation = endpoint.rb.translation()
    if (Number.isFinite(translation.x) && Number.isFinite(translation.z)) {
      out.x = translation.x
      out.z = translation.z
      return out
    }
  }

  out.x = Number.isFinite(endpoint?.fallbackX) ? endpoint.fallbackX : 0
  out.z = Number.isFinite(endpoint?.fallbackZ) ? endpoint.fallbackZ : 0
  return out
}

export function LightningBoltModel() {
  const boltMat = useMemo(() => toonMat(0xffe840, 0.55), [])
  const coreMat = useMemo(() => toonMat(0xffffff, 0.9),  [])

  const geo = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo( 0.06,  0.48)
    shape.lineTo( 0.18,  0.48)
    shape.lineTo(-0.04,  0.02)
    shape.lineTo( 0.12,  0.02)
    shape.lineTo(-0.06, -0.48)
    shape.lineTo(-0.18, -0.48)
    shape.lineTo( 0.04, -0.02)
    shape.lineTo(-0.12, -0.02)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false })
  }, [])

  return (
    <StudioTunedGroup itemId="weapon-stun-gun">
      <group scale={[scaleEffectVisual(0.38), scaleEffectVisual(0.38), scaleEffectVisual(0.38)]}>
      <mesh renderOrder={2} geometry={geo} material={boltMat} />
      <mesh renderOrder={3} geometry={geo} material={coreMat} scale={[0.52, 0.52, 0.52]} position={[0, 0, 0.03]} />
      </group>
    </StudioTunedGroup>
  )
}

function ChainArcVisual({ id, from, to, startMs, onDone }) {
  const SEG_N       = 5
  const ARC_SECS    = 0.22
  const fromPointRef = useRef({ x: from?.fallbackX ?? 0, z: from?.fallbackZ ?? 0 })
  const toPointRef = useRef({ x: to?.fallbackX ?? 0, z: to?.fallbackZ ?? 0 })
  const segmentRefs = useRef([])
  const doneRef = useRef(false)

  const mats = useMemo(() => Array.from({ length: SEG_N }, () => {
    const m = toonMat(0xffe840, 0.7)
    m.transparent = true
    m.depthWrite  = false
    return m
  }), [])

  usePlayingFrame(() => {
    const t = Math.min((performance.now() - startMs) / 1000 / ARC_SECS, 1)
    if (t >= 1) {
      if (doneRef.current) return
      doneRef.current = true
      onDone(id)
      return
    }
    const opacity = 1 - t * t
    for (let i = 0; i < SEG_N; i += 1) mats[i].opacity = opacity

    const fromPoint = resolveStunArcEndpoint(fromPointRef.current, from)
    const toPoint = resolveStunArcEndpoint(toPointRef.current, to)
    const dx = toPoint.x - fromPoint.x
    const dz = toPoint.z - fromPoint.z
    const length = Math.hypot(dx, dz) || 1
    const px = -dz / length
    const pz = dx / length
    for (let i = 0; i < SEG_N; i += 1) {
      const next = i + 1
      const aT = i / SEG_N
      const bT = next / SEG_N
      const aJitter = i > 0 ? Math.sin(i * 7.3 + (fromPoint.x + fromPoint.z) * 5.1) * scaleEffectVisual(0.40) : 0
      const bJitter = next < SEG_N ? Math.sin(next * 7.3 + (fromPoint.x + fromPoint.z) * 5.1) * scaleEffectVisual(0.40) : 0
      const ax = fromPoint.x + dx * aT + px * aJitter
      const az = fromPoint.z + dz * aT + pz * aJitter
      const bx = fromPoint.x + dx * bT + px * bJitter
      const bz = fromPoint.z + dz * bT + pz * bJitter
      const segmentLength = Math.max(0.01, Math.hypot(bx - ax, bz - az))
      if (!segmentRefs.current[i]) continue
      segmentRefs.current[i].position.set((ax + bx) / 2, 0.55, (az + bz) / 2)
      segmentRefs.current[i].rotation.y = Math.atan2(bx - ax, bz - az)
      segmentRefs.current[i].scale.z = segmentLength
      segmentRefs.current[i].visible = true
    }
  })

  return (
    <>
      {CHAIN_ARC_SEGMENT_INDICES.map((i) => (
        <group key={i} ref={(node) => { segmentRefs.current[i] = node }} visible={false}>
          <mesh renderOrder={2} material={mats[i]}>
            <boxGeometry args={[scaleEffectVisual(0.05), scaleEffectVisual(0.05), 1]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function StunBoltProjectile({ id, startX, startZ, sourceEndpoint, targetRb, targetGeneration, damage, critChance, critMultiplier, hitSet, chainsLeft, chainDepth, onHit, onExpire }) {
  const groupRef = useRef()
  const posRef   = useRef({ x: startX, z: startZ })
  const doneRef  = useRef(false)
  const ageRef   = useRef(0)

  usePlayingFrame((_, delta) => {
    if (doneRef.current || !groupRef.current) return
    const frameDelta = Math.min(delta, 1 / 30)
    ageRef.current += delta
    if (ageRef.current > 2.5) { doneRef.current = true; onExpire(id); return }

    if (!isEnemyHitLive(targetRb, targetGeneration)) { doneRef.current = true; onExpire(id); return }

    const tt   = targetRb.translation()
    const dx   = tt.x - posRef.current.x
    const dz   = tt.z - posRef.current.z
    const dist = Math.hypot(dx, dz) || 0.001

    if (dist < 0.4) {
      doneRef.current = true
      const hit = applyEnemyHit(targetRb, targetGeneration, damage, { knockback: 2.2, knockbackMs: 80, critChance, critMultiplier })
      if (hit) {
        emitSfx({
          id: 'stunGunHit',
          volume: 0.55,
          rate: 1 + Math.min(chainDepth, 2) * 0.06,
        })
      }
      onHit(id, tt.x, tt.z, targetRb, targetGeneration, sourceEndpoint, hitSet, chainsLeft, chainDepth)
      return
    }

    const travel = Math.min(BOLT_SPEED * frameDelta, dist)
    posRef.current.x += (dx / dist) * travel
    posRef.current.z += (dz / dist) * travel
    groupRef.current.position.set(posRef.current.x, 0.55, posRef.current.z)
    const pose = getStunBoltVisualPose(dx, dz)
    groupRef.current.rotation.set(pose.x, pose.y, pose.z, pose.order)
  })

  return (
    <group ref={groupRef} position={[startX, 0.55, startZ]}>
      <LightningBoltModel />
    </group>
  )
}

export function StunGunWeapon() {
  const active     = useGameStore(s => s.weapons.stunGun.active)
  const cooldown   = useGameStore(s => s.weapons.stunGun.cooldown)
  const damage     = useGameStore(s => s.weapons.stunGun.damage)
  const critChance = useGameStore(s => s.weapons.stunGun.critChance)
  const critMultiplier = useGameStore(s => s.weapons.stunGun.critMultiplier)
  const chainCount = useGameStore(s => s.weapons.stunGun.chainCount)
  const phase      = useGameStore(s => s.phase)

  const lastFireRef = useRef(0)
  const [bolts, setBolts] = useState([])
  const [arcs,  setArcs]  = useState([])

  const removeBolt = useCallback(id =>
    setBolts(prev => prev.filter(b => b.id !== id)), [])

  const removeArc = useCallback(id =>
    setArcs(prev => prev.filter(a => a.id !== id)), [])

  const onBoltHit = useCallback((id, hitX, hitZ, hitRb, hitGeneration, sourceEndpoint, hitSet, chainsLeft, chainDepth) => {
    const hitEndpoint = { rb: hitRb, generation: hitGeneration, fallbackX: hitX, fallbackZ: hitZ }
    setBolts(prev => prev.filter(b => b.id !== id))
    setArcs(prev => [...prev, {
      id:      ++_chainArcId,
      from:    sourceEndpoint,
      to:      hitEndpoint,
      startMs: performance.now(),
    }])
    if (chainsLeft <= 0) return
    const next = pickStunGunChainTarget(hitX, hitZ, hitSet, CHAIN_RANGE)
    if (!next) return
    markStunGunHit(hitSet, next.rb, next.generation)
    setBolts(prev => [...prev, {
      id:              ++_stunBoltId,
      startX:          hitX,
      startZ:          hitZ,
      sourceEndpoint:  hitEndpoint,
      targetRb:        next.rb,
      targetGeneration: next.generation,
      hitSet,
      chainsLeft: chainsLeft - 1,
      chainDepth: chainDepth + 1,
    }])
  }, [])

  usePlayingFrame(({ clock }) => {
    if (!active || phase !== 'playing') return
    const now = clock.elapsedTime * 1000   // 다른 무기들과 동일한 타임소스
    if (now - lastFireRef.current < cooldown) return
    if (bolts.length > 0) return
    const nearest = findClosestEnemy(STUN_GUN_TARGET_RANGE)
    if (!nearest) return
    lastFireRef.current = now
    emitSfx({ id: 'stunGunFire' })

    const hitSet = createStunGunHitSet(nearest.rb, nearest.generation)
    setBolts([{
      id:              ++_stunBoltId,
      startX:          playerPos.x,
      startZ:          playerPos.z,
      sourceEndpoint:  { isPlayer: true, fallbackX: playerPos.x, fallbackZ: playerPos.z },
      targetRb:        nearest.rb,
      targetGeneration: nearest.generation,
      hitSet,
      chainsLeft: chainCount - 1,
      chainDepth: 0,
    }])
  })

  if (!active) return null
  return (
    <>
      {bolts.map(b => (
        <StunBoltProjectile
          key={b.id}
          id={b.id}
          startX={b.startX}
          startZ={b.startZ}
          sourceEndpoint={b.sourceEndpoint}
          targetRb={b.targetRb}
          targetGeneration={b.targetGeneration}
          damage={damage}
          critChance={critChance}
          critMultiplier={critMultiplier}
          hitSet={b.hitSet}
          chainsLeft={b.chainsLeft}
          chainDepth={b.chainDepth}
          onHit={onBoltHit}
          onExpire={removeBolt}
        />
      ))}
      {arcs.map(a => (
        <ChainArcVisual key={a.id} {...a} onDone={removeArc} />
      ))}
    </>
  )
}
