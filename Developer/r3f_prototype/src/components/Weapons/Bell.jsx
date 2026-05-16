import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

let _bellPulseId = 0

function BellModel() {
  const bellMat = useMemo(() => toonMat(0xffd040, 0.2), [])
  const rimMat = useMemo(() => toonMat(0xf0a820, 0.16), [])
  const handleMat = useMemo(() => toonMat(0x8a4a18, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  return (
    <group scale={[0.36, 0.36, 0.36]}>
      <mesh material={outMat} scale={inflateScale([1.12, 1.1, 1.12])} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={bellMat} position={[0, -0.05, 0]}>
        <coneGeometry args={[0.34, 0.48, 12]} />
      </mesh>
      <mesh material={rimMat} position={[0, -0.31, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 12]} />
      </mesh>
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.12])} position={[0, 0.24, 0]}>
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
