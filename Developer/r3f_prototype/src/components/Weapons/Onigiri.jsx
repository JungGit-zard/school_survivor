import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findClosestEnemy } from '../../lib/weaponTargeting.js'

let _onigiiriId  = 0

function OnigiiriModel() {
  const riceMat = useMemo(() => toonMat(0xfcf8f0, 0.06), [])
  const noriMat = useMemo(() => toonMat(0x192e13, 0.04), [])
  const noriHiMat = useMemo(() => toonMat(0x36542c, 0.08), [])
  const bumpMat = useMemo(() => toonMat(0xe5e3d0, 0.08), [])
  const outMat  = useMemo(() => outlineMat(0.97), [])

  const bumps = [
    [0,     0.26,  0.29],
    [-0.15, 0.12,  0.26],
    [ 0.15, 0.12,  0.26],
    [0,     0.00,  0.30],
    [-0.13,-0.10,  0.27],
    [ 0.13,-0.10,  0.27],
  ]

  return (
    <group scale={[0.42, 0.42, 0.42]}>
      <mesh renderOrder={1} material={outMat} scale={inflateScale([1.15, 1.10, 1.15])}>
        <cylinderGeometry args={[0.26, 0.50, 0.74, 3]} />
      </mesh>
      <mesh renderOrder={2} material={riceMat}>
        <cylinderGeometry args={[0.26, 0.50, 0.74, 3]} />
      </mesh>
      {bumps.map(([x, y, z], i) => (
        <mesh key={i} renderOrder={3} material={bumpMat} position={[x, y, z]}>
          <sphereGeometry args={[0.095, 7, 5]} />
        </mesh>
      ))}
      <mesh renderOrder={3} material={outMat} position={[0, -0.23, 0.36]} scale={inflateScale([1.08, 1.08, 1.08])}>
        <boxGeometry args={[0.46, 0.36, 0.08]} />
      </mesh>
      <mesh renderOrder={4} material={noriMat} position={[0, -0.23, 0.405]}>
        <boxGeometry args={[0.42, 0.32, 0.065]} />
      </mesh>
      <mesh renderOrder={5} material={noriHiMat} position={[-0.10, -0.12, 0.442]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.18, 0.035, 0.018]} />
      </mesh>
      <mesh renderOrder={5} material={noriHiMat} position={[0.11, -0.28, 0.442]} rotation={[0, 0, 0.42]}>
        <boxGeometry args={[0.16, 0.032, 0.018]} />
      </mesh>
    </group>
  )
}

function BounceFlash({ id, x, z, startMs, onDone }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xfff0aa, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide,
  }), [])

  useFrame(({ clock }) => {
    const age = clock.elapsedTime * 1000 - startMs
    const t   = Math.min(1, age / 160)
    if (ref.current) {
      ref.current.scale.setScalar((0.1 + t * 0.55) / 5)
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
  const SPEED      = 11 / 8

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
    if (projRef.current.length > 0) return

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
