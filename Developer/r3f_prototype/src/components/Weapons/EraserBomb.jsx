import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findBestSplashTarget, applyRadialDamage } from '../../lib/weaponTargeting.js'

// eraserBomb / 지우개 폭탄
// 역할: Flask 패턴 + 더 느린 cooldown + 강한 한 방. 큰 지우개가 날아가 먼지 폭발.

let _eraserId = 0
const FLIGHT_DURATION = 1.2

function EraserModel() {
  const bodyMat   = useMemo(() => toonMat(0xcea19d, 0.06), [])  // 살구색 (지우개 본체)
  const stripeMat = useMemo(() => toonMat(0x4f1b30, 0.10), [])  // 짙은 적자 (브랜드 띠)
  const outMat    = useMemo(() => outlineMat(0.96), [])

  return (
    <group scale={[0.4, 0.4, 0.4]}>
      <mesh material={outMat} scale={inflateScale([1.08, 1.16, 1.16])}>
        <boxGeometry args={[0.5, 0.22, 0.22]} />
      </mesh>
      <mesh material={bodyMat}>
        <boxGeometry args={[0.5, 0.22, 0.22]} />
      </mesh>
      {/* 가운데 띠 */}
      <mesh material={stripeMat} position={[0, 0, 0]}>
        <boxGeometry args={[0.52, 0.06, 0.225]} />
      </mesh>
    </group>
  )
}

function EraserProjectile({ id, start, target, damage, radius, onExplode }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const explodedRef = useRef(false)

  useFrame((_, delta) => {
    if (!groupRef.current || explodedRef.current) return
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / FLIGHT_DURATION)
    const ease = t  // 선형 — 무거운 느낌

    const x = THREE.MathUtils.lerp(start[0], target.x, ease)
    const z = THREE.MathUtils.lerp(start[2], target.z, ease)
    const y = start[1] + Math.sin(t * Math.PI) * 1.2 - t * 0.2
    groupRef.current.position.set(x, y, z)
    groupRef.current.rotation.x += delta * 3.2
    groupRef.current.rotation.z -= delta * 4.0

    if (t >= 1) {
      explodedRef.current = true
      onExplode(id, { x: target.x, z: target.z, damage, radius })
    }
  })

  return (
    <group ref={groupRef} position={start}>
      <EraserModel />
    </group>
  )
}

function DustExplosion({ id, x, z, radius, onDone }) {
  const meshRef = useRef(null)
  const ageRef = useRef(0)

  useFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.5)
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.3 + radius * 2 * t)
      meshRef.current.material.opacity = 0.5 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.08, z]} renderOrder={4}>
      <circleGeometry args={[0.5, 48]} />
      <meshBasicMaterial color={0xc9cb9f} transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function EraserBombWeapon() {
  const [erasers, setErasers] = useState([])
  const [explosions, setExplosions] = useState([])
  const activeErasersRef = useRef([])
  const lastFireRef = useRef(0)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((eid) => {
    setExplosions((prev) => prev.filter((item) => item.id !== eid))
  }, [])

  const explode = useCallback((eid, blast) => {
    activeErasersRef.current = activeErasersRef.current.filter((item) => item.id !== eid)
    setErasers([...activeErasersRef.current])

    applyRadialDamage({
      x: blast.x, z: blast.z, radius: blast.radius, damage: blast.damage,
      knockback: 2.5, knockbackMs: 120,
    })

    setExplosions((prev) => [...prev, { id: eid, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  useFrame(({ clock }) => {
    const w = weapons.eraserBomb
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (activeErasersRef.current.length > 0) return

    const target = findBestSplashTarget(w.range ?? 6, w.radius ?? 1.35)
    if (!target) return

    lastFireRef.current = now
    const next = {
      id: ++_eraserId,
      start: [playerPos.x, playerPos.y + 0.36, playerPos.z],
      target: { x: target.x, z: target.z },
      damage: w.damage,
      radius: w.radius ?? 1.35,
    }
    activeErasersRef.current = [next]
    setErasers([next])
  })

  if (!weapons.eraserBomb?.active) return null

  return (
    <>
      {erasers.map((e) => (
        <EraserProjectile key={e.id} {...e} onExplode={explode} />
      ))}
      {explosions.map((ex) => (
        <DustExplosion key={ex.id} {...ex} onDone={removeExplosion} />
      ))}
    </>
  )
}
