import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier'
import { bagSwingState, playerFacing, playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { outlineMat, toonMat } from '../lib/toon.js'

let _projId = 0

function PencilModel() {
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
    <group rotation={[Math.PI / 2, 0, 0]} scale={[0.29, 0.29, 0.29]}>
      <mesh geometry={bodyGeo} material={pencilOutlineMat} scale={[1.55, 1.55, 1.14]} />
      <mesh geometry={tipGeo} material={pencilOutlineMat} position={[0, 0.40, 0]} scale={[1.55, 1.42, 1.55]} />
      <mesh geometry={eraserGeo} material={pencilOutlineMat} position={[0, -0.43, 0]} scale={[1.52, 1.40, 1.52]} />

      <mesh geometry={bodyGeo} material={bodyMat} />
      <mesh geometry={tipGeo} material={woodMat} position={[0, 0.40, 0]} />
      <mesh geometry={leadGeo} material={graphiteMat} position={[0, 0.56, 0]} />
      <mesh geometry={bandGeo} material={bandMat} position={[0, -0.33, 0]} />
      <mesh geometry={eraserGeo} material={eraserMat} position={[0, -0.43, 0]} />
    </group>
  )
}

function Projectile({ id, position, velocity, yaw, damage, pierce, onExpire }) {
  const rb = useRef()
  const pierceRef = useRef(pierce)
  const hitSet = useRef(new Set())
  const ageRef = useRef(0)

  useFrame((_, delta) => {
    if (!rb.current) return
    ageRef.current += delta
    if (ageRef.current > 3.5) { onExpire(id); return }
  })

  return (
    <RigidBody
      ref={rb}
      type="dynamic"
      position={position}
      rotation={[0, yaw, 0]}
      linearVelocity={velocity}
      lockRotations
      colliders={false}
      gravityScale={0}
      ccd
      sensor
      onIntersectionEnter={({ other }) => {
        const enemy = other.rigidBody?._enemyHit
        if (!enemy) return
        const eid = other.rigidBody._enemyId
        if (hitSet.current.has(eid)) return
        hitSet.current.add(eid)
        enemy(damage)
        if (pierceRef.current <= 0) { onExpire(id); return }
        pierceRef.current -= 1
      }}
    >
      <CuboidCollider args={[0.06, 0.06, 0.16]} sensor />
      <PencilModel />
    </RigidBody>
  )
}

export function PencilThrow() {
  const [projectiles, setProjectiles] = useState([])
  const activeProjectilesRef = useRef([])
  const lastFireRef = useRef(0)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const expire = useCallback((id) => {
    setProjectiles((p) => {
      const next = p.filter((x) => x.id !== id)
      activeProjectilesRef.current = next
      return next
    })
  }, [])

  useFrame(({ clock }) => {
    if (phase !== 'playing') return
    const w = weapons.pencilThrow
    if (!w.active) return

    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (activeProjectilesRef.current.length > 0) return
    lastFireRef.current = now

    const facingAngle = Math.atan2(playerFacing.x, playerFacing.z)

    setProjectiles((prev) => {
      if (prev.length > 0) {
        activeProjectilesRef.current = prev
        return prev
      }
      const angle = facingAngle
      const speed = w.speed
      const next = [...prev, {
        id: ++_projId,
        position: [
          playerPos.x + Math.sin(angle) * 0.35,
          playerPos.y + 0.22,
          playerPos.z + Math.cos(angle) * 0.35,
        ],
        velocity: [Math.sin(angle) * speed, 0, Math.cos(angle) * speed],
        yaw: angle,
        damage: w.damage,
        pierce: w.pierce,
      }]
      activeProjectilesRef.current = next
      return next
    })
  })

  return (
    <>
      {projectiles.map((p) => (
        <Projectile key={p.id} {...p} onExpire={expire} />
      ))}
    </>
  )
}

function SchoolBagModel() {
  const bagMat = useMemo(() => toonMat(0x38c8f0, 0.2), [])
  const pocketMat = useMemo(() => toonMat(0x1668a0, 0.12), [])
  const outMat = useMemo(() => outlineMat(0.95), [])

  return (
    <group scale={[0.35, 0.35, 0.35]}>
      <mesh material={outMat} scale={[1.08, 1.08, 1.08]}>
        <boxGeometry args={[0.55, 0.75, 0.28]} />
      </mesh>
      <mesh material={bagMat}>
        <boxGeometry args={[0.55, 0.75, 0.28]} />
      </mesh>
      <mesh material={pocketMat} position={[0, 0.16, 0.16]}>
        <boxGeometry args={[0.34, 0.22, 0.08]} />
      </mesh>
    </group>
  )
}

function TumblerModel() {
  const bodyMat = useMemo(() => toonMat(0xff7a3d, 0.16), [])
  const capMat = useMemo(() => toonMat(0xf4f4f4, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.92), [])

  return (
    <group rotation={[0, 0, Math.PI / 2]} scale={[0.425, 0.425, 0.425]}>
      <mesh material={outMat} scale={[1.12, 1.12, 1.08]}>
        <cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />
      </mesh>
      <mesh material={bodyMat}>
        <cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />
      </mesh>
      <mesh material={capMat} position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.10, 10]} />
      </mesh>
    </group>
  )
}

export function SchoolBagSwing() {
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const [swing, setSwing] = useState(null)
  const lastSwingRef = useRef(0)
  const rbRef = useRef(null)
  const proximityRbRef = useRef(null)
  const visualRef = useRef(null)
  const trailRef = useRef(null)
  const closeEnemiesRef = useRef(new Map())
  const pendingHitsRef = useRef(new Map())
  const hitSetRef = useRef(new Set())

  useFrame(({ clock }) => {
    const w = weapons.schoolBag
    if (phase !== 'playing' || !w.active) return
    proximityRbRef.current?.setTranslation({ x: playerPos.x, y: playerPos.y + 0.16, z: playerPos.z }, true)

    const now = clock.elapsedTime * 1000
    const triggerRange = w.triggerRange ?? 0.58
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
    bagSwingState.active = true
    bagSwingState.progress = t
    const sweep = -1.25 + t * 2.5
    const angle = swing.facing + sweep
    const reach = w.range ?? 0.95
    const x = playerPos.x + Math.sin(angle) * reach
    const z = playerPos.z + Math.cos(angle) * reach
    const y = playerPos.y + 0.16

    rbRef.current?.setTranslation({ x, y, z }, true)
    if (visualRef.current) {
      visualRef.current.position.set(x, y, z)
      visualRef.current.rotation.set(-0.25, angle + Math.PI / 2, Math.sin(t * Math.PI) * 0.8)
    }
    if (trailRef.current) {
      trailRef.current.position.set(playerPos.x, 0.055, playerPos.z)
      trailRef.current.rotation.set(-Math.PI / 2, 0, swing.facing - Math.PI / 2)
      trailRef.current.material.opacity = 0.28 * Math.sin(t * Math.PI)
    }

    pendingHitsRef.current.forEach((hitFn, enemyId) => {
      if (hitSetRef.current.has(enemyId)) return
      hitSetRef.current.add(enemyId)
      hitFn(w.damage)
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
        <BallCollider args={[weapons.schoolBag.triggerRange ?? 0.58]} sensor />
      </RigidBody>
      {swing && (
        <mesh ref={trailRef} rotation={[-Math.PI / 2, 0, 0]} position={[playerPos.x, 0.055, playerPos.z]} renderOrder={3}>
          <ringGeometry args={[0.35, (weapons.schoolBag.range ?? 0.95) + 0.28, 40, 1, -1.25, 2.5]} />
          <meshBasicMaterial color={0xbfeeff} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
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
        <CuboidCollider args={[0.42, 0.28, 0.34]} sensor />
      </RigidBody>
      {swing && (
      <group ref={visualRef}>
        <SchoolBagModel />
      </group>
      )}
    </>
  )
}

export function TumblerOrbit() {
  const rbRef = useRef(null)
  const visualRef = useRef(null)
  const ringRef = useRef(null)
  const enemiesRef = useRef(new Map())
  const lastHitRef = useRef(new Map())
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  useFrame(({ clock }) => {
    const w = weapons.tumbler
    if (phase !== 'playing' || !w.active) return

    const nowSec = clock.elapsedTime
    const angle = nowSec * w.orbitSpeed
    const radius = w.radius
    const x = playerPos.x + Math.sin(angle) * radius
    const z = playerPos.z + Math.cos(angle) * radius
    const y = playerPos.y + 0.16

    rbRef.current?.setTranslation({ x, y, z }, true)
    if (visualRef.current) {
      visualRef.current.position.set(x, y, z)
      visualRef.current.rotation.set(0.2, angle, nowSec * 8)
    }
    ringRef.current?.position.set(playerPos.x, 0.035, playerPos.z)

    const nowMs = nowSec * 1000
    const interval = 1000 / w.hitsPerSecond
    enemiesRef.current.forEach((hitFn, enemyId) => {
      const lastHit = lastHitRef.current.get(enemyId) ?? 0
      if (nowMs - lastHit < interval) return
      lastHitRef.current.set(enemyId, nowMs)
      hitFn(w.damage)
    })
  })

  if (!weapons.tumbler.active) return null

  return (
    <>
      <RigidBody
        ref={rbRef}
        type="kinematicPosition"
        position={[playerPos.x + weapons.tumbler.radius, playerPos.y + 0.16, playerPos.z]}
        colliders={false}
        sensor
        onIntersectionEnter={({ other }) => {
          const rb = other.rigidBody
          if (rb?._enemyHit) enemiesRef.current.set(rb._enemyId, rb._enemyHit)
        }}
        onIntersectionExit={({ other }) => {
          const rb = other.rigidBody
          if (rb?._enemyId === undefined) return
          enemiesRef.current.delete(rb._enemyId)
          lastHitRef.current.delete(rb._enemyId)
        }}
      >
        <BallCollider args={[0.12]} sensor />
      </RigidBody>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[playerPos.x, 0.035, playerPos.z]}>
        <ringGeometry args={[weapons.tumbler.radius - 0.03, weapons.tumbler.radius + 0.03, 72]} />
        <meshBasicMaterial color={0xff9a3d} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={visualRef}>
        <TumblerModel />
      </group>
    </>
  )
}
