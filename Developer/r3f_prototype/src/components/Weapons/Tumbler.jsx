import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

function TumblerModel() {
  const bodyMat = useMemo(() => toonMat(0xff7a3d, 0.16), [])
  const capMat = useMemo(() => toonMat(0xf4f4f4, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.92), [])

  return (
    <group rotation={[0, 0, Math.PI / 2]} scale={[0.425, 0.425, 0.425]}>
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.08])}>
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
