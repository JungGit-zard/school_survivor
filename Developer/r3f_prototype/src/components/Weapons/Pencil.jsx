import { useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'

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
      <mesh geometry={bodyGeo} material={pencilOutlineMat} scale={inflateScale([1.55, 1.55, 1.14])} />
      <mesh geometry={tipGeo} material={pencilOutlineMat} position={[0, 0.40, 0]} scale={inflateScale([1.55, 1.42, 1.55])} />
      <mesh geometry={eraserGeo} material={pencilOutlineMat} position={[0, -0.43, 0]} scale={inflateScale([1.52, 1.40, 1.52])} />

      <mesh geometry={bodyGeo} material={bodyMat} />
      <mesh geometry={tipGeo} material={woodMat} position={[0, 0.40, 0]} />
      <mesh geometry={leadGeo} material={graphiteMat} position={[0, 0.56, 0]} />
      <mesh geometry={bandGeo} material={bandMat} position={[0, -0.33, 0]} />
      <mesh geometry={eraserGeo} material={eraserMat} position={[0, -0.43, 0]} />
    </group>
  )
}

function Projectile({ id, position, yaw, damage, speed, target, onExpire }) {
  const rb = useRef()
  const visualRef = useRef()
  const hitRef = useRef(false)
  const ageRef = useRef(0)

  usePlayingFrame((_, delta) => {
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
  const weapons = useGameStore((s) => s.weapons)

  const expire = useCallback((id) => {
    setProjectiles((p) => {
      const next = p.filter((x) => x.id !== id)
      activeProjectilesRef.current = next
      return next
    })
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.pencilThrow
    if (!w?.active) return

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
