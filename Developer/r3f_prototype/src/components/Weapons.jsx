import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier'
import { bagSwingState, enemyBodies, playerFacing, playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { outlineMat, toonMat } from '../lib/toon.js'

let _projId = 0
let _flaskId = 0
let _bellPulseId = 0
let _missileId  = 0
let _starlinkId  = 0
let _onigiiriId  = 0

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

function findClosestEnemy(maxRange) {
  let closest = null
  let closestDistSq = maxRange * maxRange
  enemyBodies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead) {
      enemyBodies.delete(enemyId)
      return
    }
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    const distSq = dx * dx + dz * dz
    if (distSq >= closestDistSq) return
    closest = { rb, enemyId }
    closestDistSq = distSq
  })
  return closest
}

function findBestSplashTarget(maxRange, radius) {
  let best = null
  const candidates = []
  const maxRangeSq = maxRange * maxRange

  enemyBodies.forEach((rb, enemyId) => {
    if (!rb?._enemyHit || rb._enemyDead) {
      enemyBodies.delete(enemyId)
      return
    }
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    const distSq = dx * dx + dz * dz
    if (distSq > maxRangeSq) return
    candidates.push({ rb, enemyId, x: t.x, z: t.z })
  })

  candidates.forEach((candidate) => {
    let score = 0
    candidates.forEach((other) => {
      const dx = other.x - candidate.x
      const dz = other.z - candidate.z
      if (dx * dx + dz * dz <= radius * radius) score += 1
    })
    if (!best || score > best.score) best = { ...candidate, score }
  })

  return best
}

function Projectile({ id, position, yaw, damage, speed, target, onExpire }) {
  const rb = useRef()
  const visualRef = useRef()
  const hitRef = useRef(false)
  const ageRef = useRef(0)

  useFrame((_, delta) => {
    if (!rb.current) return
    if (hitRef.current) return
    ageRef.current += delta
    if (ageRef.current > 3.5) { onExpire(id); return }
    if (!target?.rb?._enemyHit || target.rb._enemyDead) { onExpire(id); return }

    const p = rb.current.translation()
    const t = target.rb.translation()
    const dx = t.x - p.x
    const dz = t.z - p.z
    const len = Math.hypot(dx, dz)
    if (len < 0.001) return
    if (len <= 0.34) {
      hitRef.current = true
      target.rb._enemyHit(damage)
      onExpire(id)
      return
    }
    const vx = (dx / len) * speed
    const vz = (dz / len) * speed
    rb.current.setLinvel({ x: vx, y: 0, z: vz }, true)
    if (visualRef.current) visualRef.current.rotation.y = Math.atan2(vx, vz)
  })

  return (
    <RigidBody
      ref={rb}
      type="dynamic"
      position={position}
      rotation={[0, 0, 0]}
      linearVelocity={[Math.sin(yaw) * speed, 0, Math.cos(yaw) * speed]}
      lockRotations
      colliders={false}
      gravityScale={0}
      ccd
      sensor
      onIntersectionEnter={({ other }) => {
        if (hitRef.current) return
        const enemy = other.rigidBody?._enemyHit
        if (!enemy) return
        hitRef.current = true
        enemy(damage)
        onExpire(id)
      }}
    >
      <CuboidCollider args={[0.06, 0.06, 0.16]} sensor />
      <group ref={visualRef} rotation={[0, yaw, 0]}>
        <PencilModel />
      </group>
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

    const target = findClosestEnemy(w.range ?? 22)
    if (!target) return
    lastFireRef.current = now

    const targetPos = target.rb.translation()
    const facingAngle = Math.atan2(targetPos.x - playerPos.x, targetPos.z - playerPos.z)
    const count = w.projectileCount ?? 1
    const spreadMap = { 1: [0], 2: [-0.18, 0.18], 3: [-0.22, 0, 0.22], 4: [-0.3, -0.1, 0.1, 0.3] }
    const spreads = spreadMap[count] ?? spreadMap[1]

    setProjectiles((prev) => {
      if (prev.length > 0) {
        activeProjectilesRef.current = prev
        return prev
      }
      const next = spreads.map((spread) => ({
        id: ++_projId,
        position: [
          playerPos.x + Math.sin(facingAngle + spread) * 0.35,
          playerPos.y + 0.22,
          playerPos.z + Math.cos(facingAngle + spread) * 0.35,
        ],
        yaw: facingAngle + spread,
        damage: w.damage,
        speed: w.speed,
        target,
      }))
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

function ThirtyCmRulerModel() {
  const rulerMat = useMemo(() => toonMat(0xf6dd59, 0.18), [])
  const edgeMat = useMemo(() => toonMat(0xfff2a3, 0.12), [])
  const markMat = useMemo(() => toonMat(0x1c1c22, 0), [])
  const outMat = useMemo(() => outlineMat(0.95), [])
  const marks = useMemo(() => Array.from({ length: 11 }, (_, i) => -0.48 + i * 0.096), [])

  return (
    <group scale={[0.55, 0.55, 0.55]}>
      <mesh material={outMat} scale={[1.14, 1.06, 1.25]}>
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

function BellModel() {
  const bellMat = useMemo(() => toonMat(0xffd040, 0.2), [])
  const rimMat = useMemo(() => toonMat(0xf0a820, 0.16), [])
  const handleMat = useMemo(() => toonMat(0x8a4a18, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  return (
    <group scale={[0.36, 0.36, 0.36]}>
      <mesh material={outMat} scale={[1.12, 1.1, 1.12]} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={bellMat} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={rimMat} position={[0, -0.31, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 12]} />
      </mesh>
      <mesh material={outMat} scale={[1.12, 1.12, 1.12]} position={[0, 0.24, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 14]} />
      </mesh>
      <mesh material={handleMat} position={[0, 0.24, 0]}>
        <torusGeometry args={[0.13, 0.035, 6, 14]} />
      </mesh>
      <mesh material={outMat} position={[0, -0.42, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
      </mesh>
    </group>
  )
}

function BellPulse({ id, startMs, radius, onDone }) {
  const ringRef = useRef(null)
  const raysRef = useRef([])

  useFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs
    const t = Math.min(1, age / 520)
    const ease = 1 - Math.pow(1 - t, 3)
    const scale = 0.2 + radius * 2 * ease
    const opacity = 0.55 * (1 - t)

    if (ringRef.current) {
      ringRef.current.position.set(playerPos.x, 0.075, playerPos.z)
      ringRef.current.scale.setScalar(scale)
      ringRef.current.material.opacity = opacity
    }
    raysRef.current.forEach((ray, idx) => {
      if (!ray) return
      const angle = (Math.PI * 2 * idx) / 8
      const rayDist = radius * 0.46 * ease
      ray.position.set(playerPos.x + Math.sin(angle) * rayDist, 0.09, playerPos.z + Math.cos(angle) * rayDist)
      ray.rotation.set(-Math.PI / 2, 0, -angle)
      ray.scale.set(0.12 + ease * 1.15, 1, 1)
      ray.material.opacity = opacity * 0.78
    })
    if (t >= 1) onDone(id)
  })

  return (
    <>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[playerPos.x, 0.075, playerPos.z]} renderOrder={5}>
        <ringGeometry args={[0.42, 0.52, 72]} />
        <meshBasicMaterial color={0xffdf5a} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {Array.from({ length: 8 }, (_, idx) => (
        <mesh
          key={idx}
          ref={(node) => { raysRef.current[idx] = node }}
          position={[playerPos.x, 0.09, playerPos.z]}
          renderOrder={5}
        >
          <planeGeometry args={[0.72, 0.06]} />
          <meshBasicMaterial color={0xfff1a0} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

function FlaskModel() {
  const glassMat = useMemo(() => toonMat(0x9be9ff, 0.1), [])
  const liquidMat = useMemo(() => toonMat(0x62e676, 0.22), [])
  const corkMat = useMemo(() => toonMat(0xc57a36, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  return (
    <group scale={[0.42, 0.42, 0.42]} rotation={[0.1, 0, -0.35]}>
      <mesh material={outMat} scale={[1.12, 1.12, 1.12]} position={[0, -0.08, 0]}>
        <coneGeometry args={[0.34, 0.46, 5]} />
      </mesh>
      <mesh material={glassMat} position={[0, -0.08, 0]}>
        <coneGeometry args={[0.34, 0.46, 5]} />
      </mesh>
      <mesh material={liquidMat} position={[0, -0.17, 0.01]} scale={[0.82, 0.42, 0.82]}>
        <coneGeometry args={[0.32, 0.38, 5]} />
      </mesh>
      <mesh material={outMat} scale={[1.14, 1.1, 1.14]} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.32, 8]} />
      </mesh>
      <mesh material={glassMat} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.32, 8]} />
      </mesh>
      <mesh material={corkMat} position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 8]} />
      </mesh>
    </group>
  )
}

function FlaskProjectile({ id, start, target, speed, radius, damage, onExplode }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const explodedRef = useRef(false)
  const posRef = useRef(new THREE.Vector3(start[0], start[1], start[2]))
  const durationRef = useRef(1.55)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (explodedRef.current) return
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / durationRef.current)
    const ease = 1 - Math.pow(1 - t, 2)

    posRef.current.x = THREE.MathUtils.lerp(start[0], target.x, ease)
    posRef.current.z = THREE.MathUtils.lerp(start[2], target.z, ease)
    posRef.current.y = start[1] + Math.sin(t * Math.PI) * 1.55 - t * 0.25
    groupRef.current.position.copy(posRef.current)
    groupRef.current.rotation.x += delta * 5.2
    groupRef.current.rotation.y += delta * 7.4
    groupRef.current.rotation.z -= delta * 6.6

    if (t >= 1) {
      explodedRef.current = true
      onExplode(id, { x: target.x, z: target.z, radius, damage })
      return
    }
  })

  return (
    <group ref={groupRef} position={start}>
      <FlaskModel />
    </group>
  )
}

function FlaskExplosion({ id, x, z, radius, onDone }) {
  const meshRef = useRef(null)
  const ageRef = useRef(0)

  useFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.36)
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.2 + radius * 2 * t)
      meshRef.current.material.opacity = 0.38 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, z]} renderOrder={4}>
      <circleGeometry args={[0.5, 48]} />
      <meshBasicMaterial color={0x6dff7a} transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
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
  const bagArcRef = useRef(null)
  const trailRef = useRef(null)
  const closeEnemiesRef = useRef(new Map())
  const pendingHitsRef = useRef(new Map())
  const hitSetRef = useRef(new Set())

  useFrame(({ clock }) => {
    const w = weapons.schoolBag
    if (phase !== 'playing' || !w.active) return
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

export function TumblerOrbit() {
  const rbRefs = useRef([])
  const visualRefs = useRef([])
  const ringRef = useRef(null)
  const enemiesRef = useRef(new Map())
  const overlapCountRef = useRef(new Map())
  const lastHitRef = useRef(new Map())
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  useFrame(({ clock }) => {
    const w = weapons.tumbler
    if (phase !== 'playing' || !w.active) return

    const nowSec = clock.elapsedTime
    const count = Math.max(1, Math.min(3, w.count ?? 1))
    const radius = w.radius
    const y = playerPos.y + 0.16

    for (let i = 0; i < count; i += 1) {
      const angle = nowSec * w.orbitSpeed + (Math.PI * 2 * i) / count
      const x = playerPos.x + Math.sin(angle) * radius
      const z = playerPos.z + Math.cos(angle) * radius
      rbRefs.current[i]?.setTranslation({ x, y, z }, true)
      if (visualRefs.current[i]) {
        visualRefs.current[i].position.set(x, y, z)
        visualRefs.current[i].rotation.set(0.2, angle, nowSec * 8 + i * 0.8)
      }
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
  const tumblerCount = Math.max(1, Math.min(3, weapons.tumbler.count ?? 1))

  return (
    <>
      {Array.from({ length: tumblerCount }, (_, idx) => (
        <RigidBody
          key={`tumbler-hit-${idx}`}
          ref={(node) => { rbRefs.current[idx] = node }}
          type="kinematicPosition"
          position={[playerPos.x + weapons.tumbler.radius, playerPos.y + 0.16, playerPos.z]}
          colliders={false}
          sensor
          onIntersectionEnter={({ other }) => {
            const rb = other.rigidBody
            if (!rb?._enemyHit) return
            const nextCount = (overlapCountRef.current.get(rb._enemyId) ?? 0) + 1
            overlapCountRef.current.set(rb._enemyId, nextCount)
            enemiesRef.current.set(rb._enemyId, rb._enemyHit)
          }}
          onIntersectionExit={({ other }) => {
            const rb = other.rigidBody
            if (rb?._enemyId === undefined) return
            const nextCount = (overlapCountRef.current.get(rb._enemyId) ?? 1) - 1
            if (nextCount > 0) {
              overlapCountRef.current.set(rb._enemyId, nextCount)
              return
            }
            overlapCountRef.current.delete(rb._enemyId)
            enemiesRef.current.delete(rb._enemyId)
            lastHitRef.current.delete(rb._enemyId)
          }}
        >
          <BallCollider args={[0.12]} sensor />
        </RigidBody>
      ))}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[playerPos.x, 0.035, playerPos.z]}>
        <ringGeometry args={[weapons.tumbler.radius - 0.03, weapons.tumbler.radius + 0.03, 72]} />
        <meshBasicMaterial color={0xff9a3d} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {Array.from({ length: tumblerCount }, (_, idx) => (
        <group key={`tumbler-visual-${idx}`} ref={(node) => { visualRefs.current[idx] = node }}>
          <TumblerModel />
        </group>
      ))}
    </>
  )
}

export function BellShockwave() {
  const bellRef = useRef(null)
  const lastFireRef = useRef(0)
  const [pulses, setPulses] = useState([])
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removePulse = useCallback((id) => {
    setPulses((prev) => prev.filter((pulse) => pulse.id !== id))
  }, [])

  useFrame(({ clock }) => {
    const w = weapons.bell
    if (!w?.active) return

    const nowSec = clock.elapsedTime
    const nowMs = nowSec * 1000
    const floatAngle = nowSec * 2.3
    if (bellRef.current) {
      bellRef.current.position.set(
        playerPos.x + 0.58 + Math.sin(floatAngle) * 0.05,
        playerPos.y + 0.74 + Math.sin(nowSec * 4.4) * 0.045,
        playerPos.z - 0.32,
      )
      const ringShake = nowMs - lastFireRef.current < 360
        ? Math.sin(nowSec * 52) * 0.28
        : Math.sin(nowSec * 2.2) * 0.08
      bellRef.current.rotation.set(0.15, 0.28, ringShake)
    }

    if (phase !== 'playing') return
    if (nowMs - lastFireRef.current < w.cooldown) return
    lastFireRef.current = nowMs

    const radius = w.radius ?? 1.7
    enemyBodies.forEach((rb) => {
      if (!rb?._enemyHit || rb._enemyDead) return
      const t = rb.translation()
      const dx = t.x - playerPos.x
      const dz = t.z - playerPos.z
      if (dx * dx + dz * dz > radius * radius) return
      rb._enemyHit(w.damage, {
        source: { x: playerPos.x, z: playerPos.z },
        knockback: 4.8,
        knockbackMs: 180,
      })
    })

    setPulses((prev) => [...prev, { id: ++_bellPulseId, startMs: nowMs, radius }])
  })

  if (!weapons.bell?.active) return null

  return (
    <>
      <group ref={bellRef}>
        <BellModel />
      </group>
      {pulses.map((pulse) => (
        <BellPulse key={pulse.id} {...pulse} onDone={removePulse} />
      ))}
    </>
  )
}

export function ScienceFlaskSplash() {
  const [flasks, setFlasks] = useState([])
  const [explosions, setExplosions] = useState([])
  const activeFlasksRef = useRef([])
  const lastFireRef = useRef(0)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const explode = useCallback((id, blast) => {
    activeFlasksRef.current = activeFlasksRef.current.filter((item) => item.id !== id)
    setFlasks([...activeFlasksRef.current])

    const hitTargets = new Set()
    enemyBodies.forEach((rb, enemyId) => {
      if (!rb?._enemyHit || rb._enemyDead || hitTargets.has(enemyId)) return
      const t = rb.translation()
      const dx = t.x - blast.x
      const dz = t.z - blast.z
      if (dx * dx + dz * dz > blast.radius * blast.radius) return
      hitTargets.add(enemyId)
      rb._enemyHit(blast.damage, {
        source: { x: blast.x, z: blast.z },
        knockback: 2.8,
        knockbackMs: 100,
      })
    })

    setExplosions((prev) => [...prev, { id, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  useFrame(({ clock }) => {
    const w = weapons.scienceFlask
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (activeFlasksRef.current.length > 0) return

    const target = findBestSplashTarget(w.range ?? 18, w.radius ?? 1.6)
    if (!target) return
    lastFireRef.current = now

    const next = {
      id: ++_flaskId,
      start: [playerPos.x, playerPos.y + 0.36, playerPos.z],
      target: { x: target.x, z: target.z },
      speed: 8.5,
      radius: w.radius,
      damage: w.damage,
    }
    activeFlasksRef.current = [next]
    setFlasks([next])
  })

  if (!weapons.scienceFlask?.active) return null

  return (
    <>
      {flasks.map((flask) => (
        <FlaskProjectile key={flask.id} {...flask} onExplode={explode} />
      ))}
      {explosions.map((explosion) => (
        <FlaskExplosion key={explosion.id} {...explosion} onDone={removeExplosion} />
      ))}
    </>
  )
}

// ── 보조배터리 ──────────────────────────────────────────────────────────────────

function MissileBody() {
  const bodyMat  = useMemo(() => toonMat(0xff3d85, 0.22), [])   // 선명한 핑크
  const labelMat = useMemo(() => toonMat(0xff80b8, 0.28), [])   // 밝은 핑크 밴드
  const noseMat  = useMemo(() => toonMat(0xffaad0, 0.14), [])   // 연핑크 코
  const outMat   = useMemo(() => outlineMat(0.97), [])

  // scale 0.54 (2배 크기)
  return (
    <group rotation={[Math.PI / 2, 0, 0]} scale={[0.54, 0.54, 0.54]}>
      <mesh renderOrder={1} material={outMat} scale={[1.14, 1.08, 1.14]}>
        <cylinderGeometry args={[0.13, 0.15, 0.64, 8]} />
      </mesh>
      <mesh renderOrder={2} material={bodyMat}>
        <cylinderGeometry args={[0.13, 0.15, 0.64, 8]} />
      </mesh>
      <mesh renderOrder={2} material={labelMat}>
        <cylinderGeometry args={[0.135, 0.155, 0.22, 8]} />
      </mesh>
      <mesh renderOrder={2} material={noseMat} position={[0, 0.42, 0]}>
        <coneGeometry args={[0.13, 0.18, 8]} />
      </mesh>
    </group>
  )
}

function MissileProjectile({ id, start, target, damage, radius, onExplode }) {
  const groupRef    = useRef()
  const flameRef    = useRef()
  const smokeRef    = useRef()
  const ageRef      = useRef(0)
  const speedRef    = useRef(0.09)   // 처음엔 매우 느림 (절반)
  const explodedRef = useRef(false)
  const posRef      = useRef({ x: start[0], y: start[1], z: start[2] })

  const flameMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff6eb8, transparent: true, opacity: 0.55, depthWrite: false,
  }), [])
  const flameCoreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffd6f0, transparent: true, opacity: 0.65, depthWrite: false,
  }), [])
  const smokeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xdddddd, transparent: true, opacity: 0, depthWrite: false,
  }), [])

  useFrame((_, delta) => {
    if (explodedRef.current || !groupRef.current) return
    ageRef.current += delta

    if (ageRef.current > 5.5) {
      explodedRef.current = true
      onExplode(id, { x: posRef.current.x, z: posRef.current.z, radius, damage })
      return
    }

    // 추진 가속 — 처음엔 천천히, 갈수록 빠르게 (절반 속도)
    speedRef.current = Math.min(7.5, speedRef.current + 4.75 * delta)

    const p = posRef.current
    const dx = target.x - p.x
    const dz = target.z - p.z
    const dist = Math.hypot(dx, dz)

    if (dist < 0.28) {
      explodedRef.current = true
      onExplode(id, { x: target.x, z: target.z, radius, damage })
      return
    }

    const nx = dx / dist
    const nz = dz / dist
    p.x += nx * speedRef.current * delta
    p.z += nz * speedRef.current * delta

    groupRef.current.position.set(p.x, start[1], p.z)
    // nose를 진행 방향으로 회전
    groupRef.current.rotation.y = Math.atan2(nx, nz)

    const t = speedRef.current / 7.5   // 0(발사직후) → 1(최고속)
    const pulse = 0.82 + Math.sin(ageRef.current * 28) * 0.18

    // 배기 화염 (속도 오를수록 강해짐)
    if (flameRef.current) {
      flameRef.current.scale.setScalar(pulse * (0.18 + t * 0.60))
      flameMat.opacity     = 0.18 + t * 0.37
      flameCoreMat.opacity = 0.22 + t * 0.43
    }

    // 발사 직후 연기 (속도 낮을수록 진함)
    if (smokeRef.current) {
      const smokeT = 1 - t
      smokeMat.opacity = smokeT * (0.45 + Math.sin(ageRef.current * 9) * 0.08)
      smokeRef.current.scale.set(
        pulse * (0.55 + smokeT * 0.9),
        1 + smokeT * 2.2,
        pulse * (0.55 + smokeT * 0.9),
      )
    }
  })

  return (
    <group ref={groupRef} position={start}>
      <MissileBody />
      {/* 발사 직후 연기 구름 — 꼬리 뒤쪽 */}
      <mesh ref={smokeRef} renderOrder={3} material={smokeMat} position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.10, 1, 8]} />
      </mesh>
      {/* 배기 화염 */}
      <group ref={flameRef} position={[0, 0, -0.10]}>
        <mesh renderOrder={4} material={flameMat} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.038, 0.20, 8]} />
        </mesh>
        <mesh renderOrder={5} material={flameCoreMat} rotation={[Math.PI / 2, 0, 0]} scale={[0.52, 0.58, 0.52]}>
          <coneGeometry args={[0.038, 0.20, 8]} />
        </mesh>
      </group>
    </group>
  )
}

// 폭발 연출 재사용 (플라스크와 동일 시스템, 색상만 다름)
function MissileExplosion({ id, x, z, radius, onDone }) {
  const meshRef = useRef(null)
  const ringRef = useRef(null)
  const ageRef  = useRef(0)

  useFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.40)
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.15 + radius * 2.2 * t)
      meshRef.current.material.opacity = 0.44 * (1 - t)
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.1 + radius * 2.8 * t)
      ringRef.current.material.opacity = 0.28 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, z]} renderOrder={4}>
        <circleGeometry args={[0.5, 48]} />
        <meshBasicMaterial color={0xff9933} transparent opacity={0.44} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.09, z]} renderOrder={5}>
        <ringGeometry args={[0.3, 0.55, 48]} />
        <meshBasicMaterial color={0xffee88} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export function GuidedMissileWeapon() {
  const [missiles, setMissiles]     = useState([])
  const [explosions, setExplosions] = useState([])
  const activeMissilesRef           = useRef([])
  const lastFireRef                 = useRef(0)
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const onExplode = useCallback((id, blast) => {
    activeMissilesRef.current = activeMissilesRef.current.filter((m) => m.id !== id)
    setMissiles([...activeMissilesRef.current])

    const hit = new Set()
    enemyBodies.forEach((rb, enemyId) => {
      if (!rb?._enemyHit || rb._enemyDead || hit.has(enemyId)) return
      const t = rb.translation()
      const dx = t.x - blast.x
      const dz = t.z - blast.z
      if (dx * dx + dz * dz > blast.radius * blast.radius) return
      hit.add(enemyId)
      rb._enemyHit(blast.damage, {
        source: { x: blast.x, z: blast.z },
        knockback: 3.2,
        knockbackMs: 120,
      })
    })

    setExplosions((prev) => [...prev, { id, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  useFrame(({ clock }) => {
    const w = weapons.guidedMissile
    if (phase !== 'playing' || !w?.active) return

    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return

    const count = Math.max(1, Math.min(2, w.count ?? 1))
    if (activeMissilesRef.current.length >= count) return

    // 발사 시점의 좀비 밀도 최고 지점 탐색
    const target = findBestSplashTarget(w.range ?? 22, w.radius ?? 1.6)
    if (!target) return
    lastFireRef.current = now

    const newBatch = Array.from({ length: count }, (_, i) => {
      const spread = count > 1 ? (i === 0 ? -0.22 : 0.22) : 0
      return {
        id: ++_missileId,
        start: [
          playerPos.x + Math.sin(spread) * 0.35,
          playerPos.y + 0.36,
          playerPos.z + Math.cos(spread) * 0.35,
        ],
        target: { x: target.x, z: target.z },
        damage: w.damage,
        radius: w.radius ?? 1.6,
      }
    })
    activeMissilesRef.current = [...activeMissilesRef.current, ...newBatch]
    setMissiles([...activeMissilesRef.current])
  })

  if (!weapons.guidedMissile?.active) return null

  return (
    <>
      {missiles.map((m) => (
        <MissileProjectile key={m.id} {...m} onExplode={onExplode} />
      ))}
      {explosions.map((e) => (
        <MissileExplosion key={e.id} {...e} onDone={removeExplosion} />
      ))}
    </>
  )
}

// ── 고장난 스타링크 ────────────────────────────────────────────────────────────

const WARN_MS   = 680   // 경고 링 지속 (ms)
const BOLT_MS   = 180   // 번개 플래시 지속 (ms)
const BOLT_Y    = 4.2   // 번개 시작 높이

// 지그재그 번개 세그먼트 생성 (시드 기반)
function makeBoltSegs(seed) {
  const segs = []
  let cy = BOLT_Y, cx = 0, cz = 0
  const segCount = 6
  for (let i = 0; i < segCount; i++) {
    const h  = 0.52 + (((seed * (i + 1.3)) % 1 + 1) % 1) * 0.38
    const ox = ((seed * (i * 2.7 + 1.1)) % 1 - 0.5) * 0.22
    const oz = ((seed * (i * 3.1 + 0.9)) % 1 - 0.5) * 0.22
    const nx = cx + ox
    const nz = cz + oz
    const mx = (cx + nx) / 2
    const mz = (cz + nz) / 2
    const my = cy - h / 2
    // rotation to align box from (cx,cy,cz) to (nx,cy-h,nz)
    const rx = Math.atan2(nz - cz, h)
    const rz = -Math.atan2(nx - cx, h)
    segs.push({ mx, my, mz, h, rx, rz })
    cx = nx; cz = nz; cy -= h
  }
  return segs
}

// 경고 링 (번개 낙하 전 예고)
function StrikeWarning({ x, z, startMs, radius }) {
  const outerRef = useRef()
  const innerRef = useRef()
  const crossH   = useRef()
  const crossV   = useRef()

  const warnMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x44eeff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  }), [])
  const crossMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
  }), [])

  useFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs
    const t   = Math.min(1, age / WARN_MS)
    const blink = Math.sin(t * Math.PI * 7) > 0 ? 1 : 0.3
    const op  = (0.55 + 0.45 * blink) * (1 - t * 0.3)

    if (outerRef.current) {
      outerRef.current.position.set(x, 0.04, z)
      outerRef.current.scale.setScalar(0.5 + t * 0.7)
      warnMat.opacity = op * 0.7
    }
    if (innerRef.current) {
      innerRef.current.position.set(x, 0.05, z)
      innerRef.current.scale.setScalar(0.18 + t * 0.25)
    }
    if (crossH.current) {
      crossH.current.position.set(x, 0.055, z)
      crossMat.opacity = op * 0.55
    }
    if (crossV.current) {
      crossV.current.position.set(x, 0.055, z)
    }
  })

  return (
    <>
      <mesh ref={outerRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <ringGeometry args={[radius * 0.75, radius * 0.92, 48]} />
        <primitive object={warnMat} attach="material" />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial color={0x44eeff} transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={crossH} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}>
        <planeGeometry args={[radius * 1.6, 0.04]} />
        <primitive object={crossMat} attach="material" />
      </mesh>
      <mesh ref={crossV} rotation={[-Math.PI / 2, Math.PI / 2, 0]} renderOrder={7}>
        <planeGeometry args={[radius * 1.6, 0.04]} />
        <primitive object={crossMat} attach="material" />
      </mesh>
    </>
  )
}

// 번개 볼트 플래시 + 피해
function StrikeBolt({ id, x, z, startMs, radius, damage, seed, onDone }) {
  const groupRef   = useRef()
  const impactRef  = useRef()
  const hasFiredRef = useRef(false)

  const boltMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xccf4ff, transparent: true, opacity: 1, depthWrite: false,
  }), [])
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 1, depthWrite: false,
  }), [])
  const impactMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x88eeff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide,
  }), [])

  const segs = useMemo(() => makeBoltSegs(seed), [seed])

  useFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs
    if (age < 0) return

    // 피해는 볼트 등장 순간 1회만
    if (!hasFiredRef.current) {
      hasFiredRef.current = true
      enemyBodies.forEach((rb, enemyId) => {
        if (!rb?._enemyHit || rb._enemyDead) return
        const t = rb.translation()
        const dx = t.x - x; const dz = t.z - z
        if (dx * dx + dz * dz > radius * radius) return
        rb._enemyHit(damage, {
          source: { x, z },
          knockback: 4.5,
          knockbackMs: 150,
        })
      })
    }

    const t  = Math.min(1, age / BOLT_MS)
    const op = 1 - t * t   // 빠르게 페이드아웃

    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z)
      boltMat.opacity = op * 0.88
      coreMat.opacity = op
    }
    if (impactRef.current) {
      impactRef.current.scale.setScalar(0.3 + t * radius * 2.8)
      impactMat.opacity = 0.7 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      {/* 번개 세그먼트 (지그재그) */}
      {segs.map((s, i) => (
        <group key={i} position={[s.mx, s.my, s.mz]} rotation={[s.rx, 0, s.rz]}>
          {/* 외곽 빛 */}
          <mesh renderOrder={8} material={boltMat} scale={[3.5, 1, 3.5]}>
            <boxGeometry args={[0.026, s.h, 0.026]} />
          </mesh>
          {/* 코어 백색 */}
          <mesh renderOrder={9} material={coreMat}>
            <boxGeometry args={[0.018, s.h, 0.018]} />
          </mesh>
        </group>
      ))}
      {/* 지면 충격 원 */}
      <mesh ref={impactRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} renderOrder={7}>
        <circleGeometry args={[0.5, 48]} />
        <primitive object={impactMat} attach="material" />
      </mesh>
    </group>
  )
}

export function StarlinkWeapon() {
  const [strikes, setStrikes]   = useState([])  // { id, x, z, phase:'warn'|'bolt', startMs, ... }
  const strikesRef              = useRef([])
  const lastVolleyRef           = useRef(0)
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeBolt = useCallback((id) => {
    strikesRef.current = strikesRef.current.filter((s) => s.id !== id && s.phase !== 'bolt' || s.id !== id)
    setStrikes((prev) => prev.filter((s) => s.id !== id))
  }, [])

  useFrame(({ clock }) => {
    const w = weapons.starlink
    if (phase !== 'playing' || !w?.active) return

    const nowMs = clock.elapsedTime * 1000

    // warn → bolt 전환 체크
    let changed = false
    strikesRef.current = strikesRef.current.map((s) => {
      if (s.phase === 'warn' && nowMs - s.startMs >= WARN_MS) {
        changed = true
        return { ...s, phase: 'bolt', startMs: nowMs }
      }
      return s
    })
    if (changed) setStrikes([...strikesRef.current])

    // 새 볼리 발사
    if (nowMs - lastVolleyRef.current < w.cooldown) return

    // 활성 경고가 없을 때만 새 볼리
    const hasWarn = strikesRef.current.some((s) => s.phase === 'warn')
    if (hasWarn) return

    lastVolleyRef.current = nowMs

    const count = w.strikeCount ?? 1
    const newBatch = Array.from({ length: count }, (_, i) => {
      // 플레이어 5블록 이내 무작위 — 고장난 위성
      const angle  = Math.random() * Math.PI * 2
      const dist   = Math.random() * 5.0
      const seed   = nowMs * 0.001 + i * 17.3
      return {
        id:      ++_starlinkId,
        x:       playerPos.x + Math.cos(angle) * dist,
        z:       playerPos.z + Math.sin(angle) * dist,
        phase:   'warn',
        startMs: nowMs,
        radius:  w.radius ?? 1.2,
        damage:  w.damage,
        seed,
      }
    })

    strikesRef.current = [...strikesRef.current, ...newBatch]
    setStrikes([...strikesRef.current])
  })

  if (!weapons.starlink?.active) return null

  return (
    <>
      {strikes.map((s) =>
        s.phase === 'warn' ? (
          <StrikeWarning key={s.id} x={s.x} z={s.z} startMs={s.startMs} radius={s.radius} />
        ) : (
          <StrikeBolt key={`bolt-${s.id}`} {...s} onDone={removeBolt} />
        )
      )}
    </>
  )
}

// ── 오니기리 바운스 공격 ────────────────────────────────────────────────────────

function OnigiiriModel() {
  const riceMat  = useMemo(() => toonMat(0xfcf8ed, 0.07), [])
  const noriMat  = useMemo(() => toonMat(0x0e0e0e, 0.02), [])
  const umeMat   = useMemo(() => toonMat(0xdd1133, 0.30), [])
  const saltMat  = useMemo(() => toonMat(0xf0eee0, 0.10), [])
  const outMat   = useMemo(() => outlineMat(0.97), [])

  return (
    <group scale={[0.28, 0.28, 0.28]}>
      {/* 본체 삼각형 (3면 실린더) + 외곽선 */}
      <mesh renderOrder={1} material={outMat} scale={[1.13, 1.08, 1.13]}>
        <cylinderGeometry args={[0.37, 0.43, 0.66, 3]} />
      </mesh>
      <mesh renderOrder={2} material={riceMat}>
        <cylinderGeometry args={[0.37, 0.43, 0.66, 3]} />
      </mesh>
      {/* 김(노리) 밴드 */}
      <mesh renderOrder={3} material={noriMat} position={[0, -0.11, 0]}>
        <cylinderGeometry args={[0.39, 0.44, 0.28, 3]} />
      </mesh>
      {/* 소금 텍스처 점들 */}
      {[0.28, -0.15, 0.12].map((y, i) => (
        <mesh key={i} renderOrder={3} material={saltMat}
          position={[Math.sin(i * 2.1) * 0.25, y, Math.cos(i * 2.1) * 0.28]}>
          <sphereGeometry args={[0.055, 5, 5]} />
        </mesh>
      ))}
      {/* 매실 (우메보시) */}
      <mesh renderOrder={4} material={umeMat} position={[0, 0.13, 0.34]}>
        <sphereGeometry args={[0.12, 8, 6]} />
      </mesh>
    </group>
  )
}

// 바운스 충격 플래시
function BounceFlash({ id, x, z, startMs, onDone }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xfff0aa, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide,
  }), [])

  useFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs
    const t   = Math.min(1, age / 160)
    if (ref.current) {
      ref.current.scale.setScalar(0.1 + t * 0.55)
      mat.opacity = 0.85 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, z]} renderOrder={6}>
      <circleGeometry args={[0.5, 20]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

function OnigiiriProjectile({ id, start, initialTarget, maxBounces, damage, bounceRange, onDone, onBounceFlash }) {
  const groupRef   = useRef()
  const posRef     = useRef({ x: start[0], y: start[1] + 0.25, z: start[2] })
  const targetRef  = useRef(initialTarget)
  const bouncesRef = useRef(maxBounces)
  const hitSetRef  = useRef(new Set([initialTarget.enemyId]))
  const spinRef    = useRef(0)
  const doneRef    = useRef(false)
  const SPEED      = 11

  useFrame((_, delta) => {
    if (doneRef.current || !groupRef.current) return

    spinRef.current += delta * 15

    const target = targetRef.current
    if (!target?.rb || target.rb._enemyDead || !target.rb._enemyHit) {
      doneRef.current = true; onDone(id); return
    }

    const t  = target.rb.translation()
    const p  = posRef.current
    const dx = t.x - p.x
    const dz = t.z - p.z
    const dist = Math.hypot(dx, dz)

    if (dist < 0.30) {
      // 타격
      onBounceFlash(t.x, t.z)
      target.rb._enemyHit(damage, {
        source: { x: p.x, z: p.z },
        knockback: 3.2, knockbackMs: 90,
      })
      bouncesRef.current--
      p.x = t.x; p.z = t.z

      if (bouncesRef.current <= 0) {
        doneRef.current = true; onDone(id); return
      }

      // 다음 바운스 대상: 현재 위치 기준 가장 가까운 미타격 적
      let next = null
      let minDSq = bounceRange * bounceRange
      enemyBodies.forEach((rb, enemyId) => {
        if (hitSetRef.current.has(enemyId) || !rb._enemyHit || rb._enemyDead) return
        const et = rb.translation()
        const dSq = (et.x - t.x) ** 2 + (et.z - t.z) ** 2
        if (dSq < minDSq) { minDSq = dSq; next = { rb, enemyId } }
      })

      if (!next) { doneRef.current = true; onDone(id); return }
      hitSetRef.current.add(next.enemyId)
      targetRef.current = next
      return
    }

    // 이동 + 바운스 호 (sin으로 위아래 튕기는 느낌)
    p.x += (dx / dist) * SPEED * delta
    p.z += (dz / dist) * SPEED * delta
    p.y  = start[1] + 0.25 + Math.abs(Math.sin(spinRef.current * 0.45)) * 0.22

    groupRef.current.position.set(p.x, p.y, p.z)
    groupRef.current.rotation.y  = spinRef.current
    groupRef.current.rotation.x  = Math.sin(spinRef.current * 0.8) * 0.35
    groupRef.current.rotation.z  = Math.cos(spinRef.current * 0.6) * 0.25
  })

  return (
    <group ref={groupRef} position={[start[0], start[1] + 0.25, start[2]]}>
      <OnigiiriModel />
    </group>
  )
}

export function OnigiiriWeapon() {
  const [projectiles, setProjectiles] = useState([])
  const [flashes, setFlashes]         = useState([])
  const projRef      = useRef([])
  const lastFireRef  = useRef(0)
  const flashIdRef   = useRef(0)
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const expire = useCallback((id) => {
    projRef.current = projRef.current.filter((p) => p.id !== id)
    setProjectiles([...projRef.current])
  }, [])

  const removeFlash = useCallback((id) => {
    setFlashes((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const addFlash = useCallback((x, z) => {
    setFlashes((prev) => [...prev, { id: ++flashIdRef.current, x, z, startMs: performance.now() }])
  }, [])

  useFrame(({ clock }) => {
    const w = weapons.onigiri
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (projRef.current.length > 0) return   // 비행 중엔 다음 발사 안 함

    const target = findClosestEnemy(w.range ?? 18)
    if (!target) return
    lastFireRef.current = now

    const p = {
      id:            ++_onigiiriId,
      start:         [playerPos.x, playerPos.y, playerPos.z],
      initialTarget: target,
      maxBounces:    w.bounces ?? 4,
      damage:        w.damage,
      bounceRange:   w.bounceRange ?? 4.5,
    }
    projRef.current = [p]
    setProjectiles([p])
  })

  if (!weapons.onigiri?.active) return null

  return (
    <>
      {projectiles.map((p) => (
        <OnigiiriProjectile key={p.id} {...p} onDone={expire} onBounceFlash={addFlash} />
      ))}
      {flashes.map((f) => (
        <BounceFlash key={f.id} {...f} onDone={removeFlash} />
      ))}
    </>
  )
}
