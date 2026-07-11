import { useRef, useState, useCallback, useMemo } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { scaleEffectVisual } from '../../lib/effectVisualScale.js'
import { toonMat } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

let _stunBoltId  = 0
let _chainArcId  = 0

const BOLT_SPEED  = 16
const CHAIN_RANGE = 4.5

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

function ChainArcVisual({ id, fromX, fromZ, toX, toZ, startMs, onDone }) {
  const SEG_N       = 5
  const ARC_SECS    = 0.22

  const segData = useMemo(() => {
    const dx = toX - fromX
    const dz = toZ - fromZ
    const len = Math.hypot(dx, dz) || 1
    const px  = -dz / len
    const pz  =  dx / len
    const pts = Array.from({ length: SEG_N + 1 }, (_, i) => {
      const t = i / SEG_N
      const j = (i > 0 && i < SEG_N) ? Math.sin(i * 7.3 + (fromX + fromZ) * 5.1) * scaleEffectVisual(0.40) : 0
      return [fromX + dx * t + px * j, fromZ + dz * t + pz * j]
    })
    return Array.from({ length: SEG_N }, (_, i) => {
      const [ax, az] = pts[i]
      const [bx, bz] = pts[i + 1]
      return {
        midX: (ax + bx) / 2,
        midZ: (az + bz) / 2,
        segLen: Math.max(0.01, Math.hypot(bx - ax, bz - az)),
        yaw: Math.atan2(bx - ax, bz - az),
      }
    })
  }, [fromX, fromZ, toX, toZ])

  const mats = useMemo(() => Array.from({ length: SEG_N }, () => {
    const m = toonMat(0xffe840, 0.7)
    m.transparent = true
    m.depthWrite  = false
    return m
  }), [])

  usePlayingFrame(() => {
    const t = Math.min((performance.now() - startMs) / 1000 / ARC_SECS, 1)
    if (t >= 1) { onDone(id); return }
    const opacity = 1 - t * t
    mats.forEach(m    => { m.opacity = opacity })
  })

  return (
    <>
      {segData.map((s, i) => (
        <group key={i} position={[s.midX, 0.55, s.midZ]} rotation={[0, s.yaw, 0]}>
          <mesh renderOrder={2} material={mats[i]}>
            <boxGeometry args={[scaleEffectVisual(0.05), scaleEffectVisual(0.05), s.segLen]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function StunBoltProjectile({ id, startX, startZ, targetId, damage, hitSet, chainsLeft, chainDepth, onHit, onExpire }) {
  const groupRef = useRef()
  const posRef   = useRef({ x: startX, z: startZ })
  const doneRef  = useRef(false)
  const ageRef   = useRef(0)

  usePlayingFrame((_, delta) => {
    if (doneRef.current || !groupRef.current) return
    ageRef.current += delta
    if (ageRef.current > 2.5) { doneRef.current = true; onExpire(id); return }

    const target = enemyBodies.get(targetId)
    if (!target || target._enemyDead) { doneRef.current = true; onExpire(id); return }

    const tt   = target.translation()
    const dx   = tt.x - posRef.current.x
    const dz   = tt.z - posRef.current.z
    const dist = Math.hypot(dx, dz) || 0.001

    if (dist < 0.4) {
      doneRef.current = true
      if (target._enemyHit) {
        target._enemyHit(damage, { knockback: 2.2, knockbackMs: 80 })
        emitSfx({
          id: 'stunGunHit',
          volume: 0.55,
          rate: 1 + Math.min(chainDepth, 2) * 0.06,
        })
      }
      onHit(id, startX, startZ, tt.x, tt.z, targetId, hitSet, chainsLeft, chainDepth)
      return
    }

    posRef.current.x += (dx / dist) * BOLT_SPEED * delta
    posRef.current.z += (dz / dist) * BOLT_SPEED * delta
    groupRef.current.position.set(posRef.current.x, 0.55, posRef.current.z)
    groupRef.current.rotation.y = Math.atan2(dx, dz)
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
  const chainCount = useGameStore(s => s.weapons.stunGun.chainCount)
  const phase      = useGameStore(s => s.phase)

  const lastFireRef = useRef(0)
  const [bolts, setBolts] = useState([])
  const [arcs,  setArcs]  = useState([])

  const removeBolt = useCallback(id =>
    setBolts(prev => prev.filter(b => b.id !== id)), [])

  const removeArc = useCallback(id =>
    setArcs(prev => prev.filter(a => a.id !== id)), [])

  const onBoltHit = useCallback((id, fromX, fromZ, hitX, hitZ, hitEnemyId, hitSet, chainsLeft, chainDepth) => {
    setBolts(prev => prev.filter(b => b.id !== id))
    setArcs(prev => [...prev, {
      id:      ++_chainArcId,
      fromX, fromZ,
      toX:     hitX,
      toZ:     hitZ,
      startMs: performance.now(),
    }])
    if (chainsLeft <= 0) return
    let nextId = null, nextDist = Infinity
    enemyBodies.forEach((rb, eid) => {
      if (hitSet.has(eid) || rb._enemyDead) return
      const t = rb.translation()
      const d = Math.hypot(t.x - hitX, t.z - hitZ)
      if (d < CHAIN_RANGE && d < nextDist) { nextDist = d; nextId = eid }
    })
    if (!nextId) return
    hitSet.add(nextId)
    setBolts(prev => [...prev, {
      id:         ++_stunBoltId,
      startX:     hitX,
      startZ:     hitZ,
      targetId:   nextId,
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
    let nearestId = null, nearestDist = Infinity
    enemyBodies.forEach((rb, eid) => {
      if (rb._enemyDead) return
      const t = rb.translation()
      const d = Math.hypot(t.x - playerPos.x, t.z - playerPos.z)
      if (d < nearestDist) { nearestDist = d; nearestId = eid }
    })
    if (!nearestId) return
    lastFireRef.current = now
    emitSfx({ id: 'stunGunFire' })

    const hitSet = new Set([nearestId])
    setBolts([{
      id:         ++_stunBoltId,
      startX:     playerPos.x,
      startZ:     playerPos.z,
      targetId:   nearestId,
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
          targetId={b.targetId}
          damage={damage}
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
