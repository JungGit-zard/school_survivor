import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { getCompassBladeOrbitPose } from '../../lib/compassBlade.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

function CompassLeg({ side = 1, main = false }) {
  const armMat = useMemo(() => toonMat(0x1f3d63, 0.08), [])
  const steelMat = useMemo(() => toonMat(main ? 0xd8e6ef : 0xaebcca, 0.06), [main])
  const goldMat = useMemo(() => toonMat(0xe99039, 0.14), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  const angle = side * (main ? 0.34 : -0.34)
  const x = side * 0.18
  const tipZ = main ? 0.54 : 0.48
  const tipLength = main ? 0.38 : 0.26

  return (
    <group position={[x, 0, 0.08]} rotation={[0, angle, 0]}>
      <mesh material={outMat} scale={inflateScale([1.22, 1.18, 1.08])}>
        <boxGeometry args={[0.10, 0.08, 0.82]} />
      </mesh>
      <mesh material={armMat}>
        <boxGeometry args={[0.10, 0.08, 0.82]} />
      </mesh>

      <mesh material={outMat} position={[0, 0, tipZ]} rotation={[Math.PI / 2, 0, 0]} scale={inflateScale([1.16, 1.16, 1.10])}>
        <coneGeometry args={[main ? 0.09 : 0.065, tipLength, 8]} />
      </mesh>
      <mesh material={steelMat} position={[0, 0, tipZ]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[main ? 0.09 : 0.065, tipLength, 8]} />
      </mesh>

      <mesh material={goldMat} position={[0, 0.055, -0.10]}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>
      <mesh material={goldMat} position={[0, 0.055, 0.18]}>
        <sphereGeometry args={[0.03, 8, 8]} />
      </mesh>
    </group>
  )
}

function CompassBladeModel() {
  const hingeMat = useMemo(() => toonMat(0x123052, 0.08), [])
  const redMat = useMemo(() => toonMat(0xe8323d, 0.18), [])
  const trailMat = useMemo(() => toonMat(0xe99039, 0.28), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  return (
    <group scale={[0.56, 0.56, 0.56]} rotation={[0.12, 0, 0]}>
      <mesh material={trailMat} position={[0, -0.035, 0.02]} rotation={[Math.PI / 2, 0, -0.72]}>
        <torusGeometry args={[0.58, 0.026, 8, 40, 1.9]} />
      </mesh>

      <CompassLeg side={-1} main />
      <CompassLeg side={1} />

      <mesh material={outMat} position={[0, 0.03, -0.31]} scale={inflateScale([1.12, 1.12, 1.12])}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 16]} />
      </mesh>
      <mesh material={hingeMat} position={[0, 0.03, -0.31]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 16]} />
      </mesh>
      <mesh material={redMat} position={[0, 0.085, -0.31]}>
        <cylinderGeometry args={[0.105, 0.105, 0.045, 16]} />
      </mesh>
    </group>
  )
}

export function CompassBladeWeapon() {
  const rbRefs = useRef([])
  const visualRefs = useRef([])
  const enemiesRef = useRef(new Map())
  const overlapCountRef = useRef(new Map())
  const lastHitRef = useRef(new Map())
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  useFrame(({ clock }) => {
    const w = weapons.compassBlade
    if (phase !== 'playing' || !w?.active) return

    const nowSec = clock.elapsedTime
    const count = Math.max(1, Math.min(3, w.count ?? 1))
    const radius = w.radius ?? 1.15
    const orbitSpeed = w.orbitSpeed ?? 3.4

    for (let i = 0; i < count; i += 1) {
      const pose = getCompassBladeOrbitPose({
        elapsedSec: nowSec,
        index: i,
        count,
        radius,
        orbitSpeed,
        player: playerPos,
      })

      rbRefs.current[i]?.setTranslation(pose.position, true)
      if (visualRefs.current[i]) {
        visualRefs.current[i].position.set(pose.position.x, pose.position.y, pose.position.z)
        visualRefs.current[i].rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z)
      }
    }

    const nowMs = nowSec * 1000
    const interval = 1000 / (w.hitsPerSecond ?? 2.5)
    enemiesRef.current.forEach((hitFn, enemyId) => {
      const lastHit = lastHitRef.current.get(enemyId) ?? 0
      if (nowMs - lastHit < interval) return
      lastHitRef.current.set(enemyId, nowMs)
      hitFn(w.damage)
    })
  })

  if (!weapons.compassBlade?.active) return null

  const bladeCount = Math.max(1, Math.min(3, weapons.compassBlade.count ?? 1))
  const radius = weapons.compassBlade.radius ?? 1.15
  const orbitSpeed = weapons.compassBlade.orbitSpeed ?? 3.4

  return (
    <>
      {Array.from({ length: bladeCount }, (_, idx) => {
        const pose = getCompassBladeOrbitPose({
          elapsedSec: 0,
          index: idx,
          count: bladeCount,
          radius,
          orbitSpeed,
          player: playerPos,
        })

        return (
          <RigidBody
            key={`compassBlade-hit-${idx}`}
            ref={(node) => { rbRefs.current[idx] = node }}
            type="kinematicPosition"
            position={[pose.position.x, pose.position.y, pose.position.z]}
            colliders={false}
            sensor
          >
            <BallCollider
              args={[0.18]}
              sensor
              onIntersectionEnter={({ other }) => {
                const rb = other.rigidBody
                if (rb?._enemyId == null || !rb?._enemyHit) return
                const nextCount = (overlapCountRef.current.get(rb._enemyId) ?? 0) + 1
                overlapCountRef.current.set(rb._enemyId, nextCount)
                enemiesRef.current.set(rb._enemyId, rb._enemyHit)
              }}
              onIntersectionExit={({ other }) => {
                const rb = other.rigidBody
                if (rb?._enemyId == null) return
                const nextCount = (overlapCountRef.current.get(rb._enemyId) ?? 1) - 1
                if (nextCount > 0) {
                  overlapCountRef.current.set(rb._enemyId, nextCount)
                  return
                }
                overlapCountRef.current.delete(rb._enemyId)
                enemiesRef.current.delete(rb._enemyId)
                lastHitRef.current.delete(rb._enemyId)
              }}
            />
          </RigidBody>
        )
      })}

      {Array.from({ length: bladeCount }, (_, idx) => {
        const pose = getCompassBladeOrbitPose({
          elapsedSec: 0,
          index: idx,
          count: bladeCount,
          radius,
          orbitSpeed,
          player: playerPos,
        })

        return (
          <group
            key={`compassBlade-visual-${idx}`}
            ref={(node) => { visualRefs.current[idx] = node }}
            position={[pose.position.x, pose.position.y, pose.position.z]}
            rotation={[pose.rotation.x, pose.rotation.y, pose.rotation.z]}
          >
            <CompassBladeModel />
          </group>
        )
      })}
    </>
  )
}
