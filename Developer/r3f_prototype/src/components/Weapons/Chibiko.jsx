import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGameStore } from '../../store/useGameStore.js'
import { playerPos } from '../../lib/refs.js'
import {
  createChibikoAttackConfig,
  createChibikoTrail,
  getChibikoTrailTarget,
  recordChibikoTrailPoint,
} from '../../lib/chibiko.js'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

let _chibikoPencilId = 0

function Part({ size, position, rotation = [0, 0, 0], material, outlineMaterial, outlineScale = 1.07 }) {
  const geometry = useMemo(() => new THREE.BoxGeometry(...size), [size.join(',')])
  const s = inflateScale(outlineScale)
  return (
    <group position={position} rotation={rotation}>
      {outlineMaterial && (
        <mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={[s, s, s]} />
      )}
      <mesh renderOrder={2} geometry={geometry} material={material} />
    </group>
  )
}

export function ChibikoModel({ attackPhaseRef }) {
  const parts = useRef({})
  const outline = useMemo(() => outlineMat(0.96), [])
  const hairMat = useMemo(() => toonMat(0x120d14, 0.05), [])
  const hairShadeMat = useMemo(() => toonMat(0x2a1c28, 0.04), [])
  const skinMat = useMemo(() => toonMat(0xefe6e2, 0.07), [])
  const dressMat = useMemo(() => toonMat(0xf3f3f1, 0.07), [])
  const ribbonMat = useMemo(() => toonMat(0xb81f2d, 0.16), [])
  const shoeMat = useMemo(() => toonMat(0x1a151c, 0.05), [])

  const reg = (key) => (el) => {
    if (el) parts.current[key] = el
  }

  usePlayingFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const attack = attackPhaseRef.current
    const prep = attack > 0 ? Math.min(1, attack / 0.24) : 0
    const throwSnap = attack > 0.12 ? Math.sin(Math.min(1, (attack - 0.12) / 0.18) * Math.PI) : 0
    const idleBob = Math.sin(t * 4.1) * 0.025
    const sway = Math.sin(t * 3.2) * 0.045

    if (parts.current.root) {
      parts.current.root.position.y = idleBob - prep * 0.035
      parts.current.root.rotation.z = sway * 0.35 + throwSnap * 0.1
    }
    if (parts.current.hairFront) {
      parts.current.hairFront.position.y = 0.97 + idleBob * 0.7
      parts.current.hairFront.rotation.x = -0.06 - throwSnap * 0.08
    }
    if (parts.current.armR) {
      parts.current.armR.rotation.x += ((prep ? -1.05 : -0.18) - parts.current.armR.rotation.x) * Math.min(1, delta * 14)
      parts.current.armR.rotation.z += ((prep ? -0.42 : -0.18) - parts.current.armR.rotation.z) * Math.min(1, delta * 14)
      if (throwSnap > 0) parts.current.armR.rotation.x = -1.2 + throwSnap * 1.8
    }
    if (parts.current.armL) {
      parts.current.armL.rotation.x = -0.08 + sway * 0.4
      parts.current.armL.rotation.z = 0.22
    }
  })

  return (
    <group ref={reg('root')}>
      <Part size={[0.56, 0.46, 0.46]} position={[0, 0.9, 0]} material={skinMat} outlineMaterial={outline} />

      <Part size={[0.72, 0.34, 0.58]} position={[0, 1.18, 0.02]} material={hairMat} outlineMaterial={outline} outlineScale={1.05} />
      <group ref={reg('hairFront')} position={[0, 0.97, 0.26]}>
        <Part size={[0.68, 0.42, 0.16]} position={[0, 0, 0]} material={hairMat} outlineMaterial={outline} outlineScale={1.04} />
      </group>
      <Part size={[0.18, 0.72, 0.46]} position={[-0.43, 0.78, 0.01]} material={hairMat} outlineMaterial={outline} outlineScale={1.04} />
      <Part size={[0.18, 0.72, 0.46]} position={[0.43, 0.78, 0.01]} material={hairShadeMat} outlineMaterial={outline} outlineScale={1.04} />
      <Part size={[0.5, 0.72, 0.22]} position={[0, 0.73, -0.26]} material={hairMat} outlineMaterial={outline} outlineScale={1.04} />

      <Part size={[0.48, 0.48, 0.38]} position={[0, 0.34, 0]} material={dressMat} outlineMaterial={outline} />
      <Part size={[0.62, 0.34, 0.42]} position={[0, 0.02, 0]} material={dressMat} outlineMaterial={outline} />
      <Part size={[0.08, 0.22, 0.08]} position={[0, 0.56, 0.24]} rotation={[0, 0, 0.18]} material={ribbonMat} outlineMaterial={outline} outlineScale={1.03} />
      <Part size={[0.18, 0.12, 0.08]} position={[-0.09, 0.62, 0.25]} rotation={[0, 0, -0.45]} material={ribbonMat} />
      <Part size={[0.18, 0.12, 0.08]} position={[0.09, 0.62, 0.25]} rotation={[0, 0, 0.45]} material={ribbonMat} />

      <group ref={reg('armL')} position={[-0.38, 0.38, 0]}>
        <Part size={[0.16, 0.48, 0.18]} position={[0, -0.2, 0]} rotation={[0, 0, 0.12]} material={dressMat} outlineMaterial={outline} outlineScale={1.04} />
        <Part size={[0.15, 0.14, 0.14]} position={[0.02, -0.5, 0]} material={skinMat} />
      </group>
      <group ref={reg('armR')} position={[0.38, 0.38, 0]}>
        <Part size={[0.16, 0.48, 0.18]} position={[0, -0.2, 0]} rotation={[0, 0, -0.12]} material={dressMat} outlineMaterial={outline} outlineScale={1.04} />
        <Part size={[0.15, 0.14, 0.14]} position={[-0.02, -0.5, 0]} material={skinMat} />
      </group>

      <Part size={[0.14, 0.28, 0.16]} position={[-0.16, -0.3, 0]} material={skinMat} />
      <Part size={[0.14, 0.28, 0.16]} position={[0.16, -0.3, 0]} material={skinMat} />
      <Part size={[0.24, 0.12, 0.24]} position={[-0.16, -0.5, 0.04]} material={shoeMat} outlineMaterial={outline} outlineScale={1.04} />
      <Part size={[0.24, 0.12, 0.24]} position={[0.16, -0.5, 0.04]} material={shoeMat} outlineMaterial={outline} outlineScale={1.04} />
    </group>
  )
}

export function ChibikoPencilModel() {
  const outline = useMemo(() => outlineMat(0.98), [])
  const woodMat = useMemo(() => toonMat(0xd89646, 0.04), [])
  const graphiteMat = useMemo(() => toonMat(0x1c1c22, 0), [])
  const bodyMat = useMemo(() => toonMat(0xffcf24, 0.035), [])
  const bandMat = useMemo(() => toonMat(0xd9d9e8, 0.025), [])
  const eraserMat = useMemo(() => toonMat(0xf05a78, 0.035), [])

  return (
    <group rotation={[Math.PI / 2, 0, 0]} scale={[0.26, 0.26, 0.26]}>
      <mesh material={outline} scale={[1.14, 1.08, 1.14]}>
        <cylinderGeometry args={[0.075, 0.075, 0.58, 6]} />
      </mesh>
      <mesh material={bodyMat}>
        <cylinderGeometry args={[0.075, 0.075, 0.58, 6]} />
      </mesh>
      <mesh material={woodMat} position={[0, 0.4, 0]}>
        <coneGeometry args={[0.085, 0.22, 6]} />
      </mesh>
      <mesh material={graphiteMat} position={[0, 0.56, 0]}>
        <coneGeometry args={[0.042, 0.1, 6]} />
      </mesh>
      <mesh material={bandMat} position={[0, -0.33, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.08, 6]} />
      </mesh>
      <mesh material={eraserMat} position={[0, -0.43, 0]}>
        <cylinderGeometry args={[0.073, 0.073, 0.14, 6]} />
      </mesh>
    </group>
  )
}

function ChibikoPencilProjectile({ id, position, yaw, damage, speed, target, onExpire }) {
  const rb = useRef()
  const visualRef = useRef()
  const hitRef = useRef(false)
  const ageRef = useRef(0)

  usePlayingFrame((_, delta) => {
    if (!rb.current || hitRef.current) return
    ageRef.current += delta
    if (ageRef.current > 3.2) {
      onExpire(id)
      return
    }
    if (!target?.rb?._enemyHit || target.rb._enemyDead) {
      onExpire(id)
      return
    }

    const p = rb.current.translation()
    const t = target.rb.translation()
    const dx = t.x - p.x
    const dz = t.z - p.z
    const len = Math.hypot(dx, dz)
    if (len <= 0.32) {
      hitRef.current = true
      target.rb._enemyHit(damage)
      onExpire(id)
      return
    }
    if (len < 0.001) return

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
        <ChibikoPencilModel />
      </group>
    </RigidBody>
  )
}

export function ChibikoWeapon() {
  const groupRef = useRef()
  const posRef = useRef(new THREE.Vector3())
  const targetRef = useRef(new THREE.Vector3())
  const trailRef = useRef(createChibikoTrail())
  const initializedRef = useRef(false)
  const attackPhaseRef = useRef(0)
  const targetYawRef = useRef(0)
  const lastFireRef = useRef(0)
  const [projectiles, setProjectiles] = useState([])
  const activeProjectilesRef = useRef([])
  const weapons = useGameStore((s) => s.weapons)

  const expire = useCallback((id) => {
    setProjectiles((prev) => {
      const next = prev.filter((p) => p.id !== id)
      activeProjectilesRef.current = next
      return next
    })
  }, [])

  usePlayingFrame(({ clock }, delta) => {
    const w = weapons.chibiko
    if (!w?.active || !groupRef.current) return

    const now = clock.elapsedTime * 1000
    recordChibikoTrailPoint(trailRef.current, playerPos, now)
    const follow = getChibikoTrailTarget(trailRef.current, now, {
      followDistance: w.followDistance,
    })
    targetRef.current.set(follow.x, follow.y, follow.z)
    if (!initializedRef.current) {
      posRef.current.copy(targetRef.current)
      initializedRef.current = true
    }

    const moveX = targetRef.current.x - posRef.current.x
    const moveZ = targetRef.current.z - posRef.current.z
    posRef.current.lerp(targetRef.current, Math.min(1, delta * 6.2))

    const bob = Math.sin(clock.elapsedTime * 4.1) * 0.025
    groupRef.current.position.set(posRef.current.x, 0.14 + bob, posRef.current.z)

    const trailYaw = Math.hypot(moveX, moveZ) > 0.001
      ? Math.atan2(moveX, moveZ)
      : groupRef.current.rotation.y
    const desiredYaw = attackPhaseRef.current > 0 ? targetYawRef.current : trailYaw
    let diff = desiredYaw - groupRef.current.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    groupRef.current.rotation.y += diff * Math.min(1, delta * 10)

    attackPhaseRef.current = Math.max(0, attackPhaseRef.current - delta)

    const attack = createChibikoAttackConfig(w)
    if (now - lastFireRef.current < attack.cooldown) return
    if (activeProjectilesRef.current.length > 0) return

    const target = findClosestEnemy(attack.range)
    if (!target) return
    const targetPos = target.rb.translation()
    const yaw = Math.atan2(targetPos.x - posRef.current.x, targetPos.z - posRef.current.z)
    targetYawRef.current = yaw
    attackPhaseRef.current = 0.34
    lastFireRef.current = now

    const projectile = {
      id: ++_chibikoPencilId,
      position: [
        posRef.current.x + Math.sin(yaw) * 0.22,
        0.46,
        posRef.current.z + Math.cos(yaw) * 0.22,
      ],
      yaw,
      damage: attack.damage,
      speed: attack.speed,
      target,
    }

    activeProjectilesRef.current = [projectile]
    setProjectiles([projectile])
  })

  if (!weapons.chibiko?.active) return null

  return (
    <>
      <group ref={groupRef} scale={[0.255, 0.255, 0.255]}>
        <ChibikoModel attackPhaseRef={attackPhaseRef} />
      </group>
      {projectiles.map((projectile) => (
        <ChibikoPencilProjectile key={projectile.id} {...projectile} onExpire={expire} />
      ))}
    </>
  )
}
