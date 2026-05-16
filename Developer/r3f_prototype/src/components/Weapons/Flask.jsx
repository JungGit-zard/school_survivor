import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findBestSplashTarget } from '../../lib/weaponTargeting.js'

let _flaskId = 0

function FlaskModel() {
  const glassMat = useMemo(() => toonMat(0x9be9ff, 0.1), [])
  const liquidMat = useMemo(() => toonMat(0x62e676, 0.22), [])
  const corkMat = useMemo(() => toonMat(0xc57a36, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  return (
    <group scale={[0.42, 0.42, 0.42]} rotation={[0.1, 0, -0.35]}>
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.12])} position={[0, -0.08, 0]}>
        <coneGeometry args={[0.34, 0.46, 5]} />
      </mesh>
      <mesh material={glassMat} position={[0, -0.08, 0]}>
        <coneGeometry args={[0.34, 0.46, 5]} />
      </mesh>
      <mesh material={liquidMat} position={[0, -0.17, 0.01]} scale={[0.82, 0.42, 0.82]}>
        <coneGeometry args={[0.32, 0.38, 5]} />
      </mesh>
      <mesh material={outMat} scale={inflateScale([1.14, 1.1, 1.14])} position={[0, 0.25, 0]}>
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
