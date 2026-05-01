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
