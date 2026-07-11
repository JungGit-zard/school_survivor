import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import {
  getCompassBladeOrbitPose,
  getCompassBladeRespawnUntilMs,
  resolveCompassBladeHitStack,
  shouldRenderCompassBladeHitBodies,
} from '../../lib/compassBlade.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

let _compassExplosionId = 0
const PARKED_BLADE_POSITION = Object.freeze({ x: 9999, y: -9999, z: 9999 })

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

export function CompassBladeModel() {
  const hingeMat = useMemo(() => toonMat(0x123052, 0.08), [])
  const redMat = useMemo(() => toonMat(0xe8323d, 0.18), [])
  const trailMat = useMemo(() => toonMat(0xe99039, 0.28), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  return (
    <StudioTunedGroup itemId="weapon-compass">
      <group scale={[0.373, 0.373, 0.373]} rotation={[0.12, 0, 0]}>
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
    </StudioTunedGroup>
  )
}

function CompassBladeExplosion({ id, x, z, radius, onDone }) {
  const groupRef = useRef(null)
  const flashRef = useRef(null)
  const innerRingRef = useRef(null)
  const outerRingRef = useRef(null)
  const burstRef = useRef(null)
  const ageRef = useRef(0)
  const mats = useMemo(() => ({
    flash: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    innerRing: new THREE.MeshBasicMaterial({
      color: 0xfff0a6,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    outerRing: new THREE.MeshBasicMaterial({
      color: 0xff8b35,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    burst: new THREE.MeshBasicMaterial({
      color: 0xffd76a,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    spark: new THREE.MeshBasicMaterial({
      color: 0xfff0a6,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  }), [])

  usePlayingFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.48)
    const fastPop = 1 - Math.min(1, t / 0.34)
    const lateFade = Math.max(0, 1 - t)
    if (groupRef.current) {
      groupRef.current.scale.setScalar(0.24 + radius * 2.9 * t)
      groupRef.current.rotation.y += delta * 4.4
    }
    if (flashRef.current) {
      flashRef.current.scale.setScalar(0.65 + t * 0.7)
      flashRef.current.material.opacity = 0.92 * fastPop
    }
    if (innerRingRef.current) {
      innerRingRef.current.scale.setScalar(0.72 + t * 0.9)
      innerRingRef.current.material.opacity = 0.84 * lateFade
    }
    if (outerRingRef.current) {
      outerRingRef.current.scale.setScalar(0.95 + t * 1.4)
      outerRingRef.current.material.opacity = 0.72 * lateFade
    }
    if (burstRef.current) {
      burstRef.current.scale.set(1.2 + t * 0.8, 1.3 + t * 1.8, 1.2 + t * 0.8)
      burstRef.current.material.opacity = 0.62 * fastPop
    }
    mats.spark.opacity = 0.9 * lateFade
    if (t >= 1) onDone(id)
  })

  return (
    <group ref={groupRef} position={[x, 0.14, z]} renderOrder={15}>
      <mesh ref={flashRef} rotation={[-Math.PI / 2, 0, 0]} userData={{ baseOpacity: 0.92 }}>
        <circleGeometry args={[0.5, 48]} />
        <primitive object={mats.flash} attach="material" />
      </mesh>
      <mesh ref={innerRingRef} rotation={[-Math.PI / 2, 0, 0]} userData={{ baseOpacity: 0.84 }}>
        <ringGeometry args={[0.28, 0.5, 56]} />
        <primitive object={mats.innerRing} attach="material" />
      </mesh>
      <mesh ref={outerRingRef} rotation={[-Math.PI / 2, 0, 0]} userData={{ baseOpacity: 0.72 }}>
        <ringGeometry args={[0.48, 0.72, 64]} />
        <primitive object={mats.outerRing} attach="material" />
      </mesh>
      <mesh ref={burstRef} position={[0, 0.16, 0]} userData={{ baseOpacity: 0.62 }}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <primitive object={mats.burst} attach="material" />
      </mesh>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index * Math.PI * 2) / 16
        const longSpark = index % 2 === 0
        return (
          <mesh
            key={index}
            material={mats.spark}
            position={[Math.sin(angle) * (longSpark ? 0.68 : 0.5), 0.06, Math.cos(angle) * (longSpark ? 0.68 : 0.5)]}
            rotation={[0, angle, longSpark ? 0.48 : -0.36]}
            scale={[longSpark ? 0.08 : 0.055, 0.035, longSpark ? 0.46 : 0.3]}
            userData={{ baseOpacity: longSpark ? 0.95 : 0.78 }}
          >
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        )
      })}
    </group>
  )
}

export function CompassBladeWeapon() {
  const rbRefs = useRef([])
  const visualRefs = useRef([])
  const enemiesRef = useRef(new Map())
  const overlapCountRef = useRef(new Map())
  const lastHitRef = useRef(new Map())
  const hitStackRef = useRef(0)
  const respawnUntilRef = useRef(0)
  const wasActiveRef = useRef(false)
  const [explosions, setExplosions] = useState([])
  const [isRespawning, setIsRespawning] = useState(false)
  const weapons = useGameStore((s) => s.weapons)
  const compassActive = !!weapons.compassBlade?.active

  useEffect(() => {
    if (compassActive && !wasActiveRef.current) emitSfx({ id: 'compassFire' })
    wasActiveRef.current = compassActive
  }, [compassActive])

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const explode = useCallback((blast) => {
    emitSfx({ id: 'compassHit' })
    applyRadialDamage({
      x: blast.x, z: blast.z, radius: blast.radius, damage: blast.damage,
      knockback: 3.2, knockbackMs: 130,
    })

    setExplosions((prev) => [...prev, {
      id: ++_compassExplosionId,
      x: blast.x,
      z: blast.z,
      radius: blast.radius,
    }])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.compassBlade
    if (!w?.active) return

    const nowSec = clock.elapsedTime
    const count = Math.max(1, Math.min(3, w.count ?? 1))
    const radius = w.radius ?? 1.15
    const orbitSpeed = w.orbitSpeed ?? 3.4
    const nowMs = nowSec * 1000

    if (respawnUntilRef.current > nowMs) {
      for (let i = 0; i < count; i += 1) {
        rbRefs.current[i]?.setTranslation(PARKED_BLADE_POSITION, true)
        if (visualRefs.current[i]) visualRefs.current[i].visible = false
      }
      return
    }

    if (isRespawning) {
      respawnUntilRef.current = 0
      setIsRespawning(false)
      enemiesRef.current.clear()
      overlapCountRef.current.clear()
      lastHitRef.current.clear()
    }

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
        visualRefs.current[i].visible = true
        visualRefs.current[i].position.set(pose.position.x, pose.position.y, pose.position.z)
        visualRefs.current[i].rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z)
      }
    }

    const interval = 1000 / (w.hitsPerSecond ?? 2.5)
    enemiesRef.current.forEach((rb, enemyId) => {
      if (!rb?._enemyHit || rb._enemyDead) {
        enemiesRef.current.delete(enemyId)
        overlapCountRef.current.delete(enemyId)
        lastHitRef.current.delete(enemyId)
        return
      }
      const lastHit = lastHitRef.current.get(enemyId) ?? 0
      if (nowMs - lastHit < interval) return
      lastHitRef.current.set(enemyId, nowMs)
      const t = rb.translation()
      rb._enemyHit(w.damage)
      emitSfx({ id: 'compassFire', volume: 0.18 })

      const stackResult = resolveCompassBladeHitStack({
        currentStack: hitStackRef.current,
        hitDamage: w.damage,
      })
      hitStackRef.current = stackResult.stack

      if (stackResult.exploded) {
        explode({
          x: t.x,
          z: t.z,
          damage: stackResult.explosionDamage,
          radius: stackResult.explosionRadius,
        })
        respawnUntilRef.current = getCompassBladeRespawnUntilMs({
          exploded: true,
          nowMs,
        })
        setIsRespawning(true)
        enemiesRef.current.clear()
        overlapCountRef.current.clear()
        lastHitRef.current.clear()
      }
    })
  })

  if (!weapons.compassBlade?.active) return null

  const bladeCount = Math.max(1, Math.min(3, weapons.compassBlade.count ?? 1))
  const radius = weapons.compassBlade.radius ?? 1.15
  const orbitSpeed = weapons.compassBlade.orbitSpeed ?? 3.4
  const renderHitBodies = shouldRenderCompassBladeHitBodies({
    active: weapons.compassBlade?.active,
    isRespawning,
  })

  return (
    <>
      {renderHitBodies && Array.from({ length: bladeCount }, (_, idx) => {
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
            ref={(node) => { rbRefs.current[idx] = node ?? null }}
            type="kinematicPosition"
            position={isRespawning
              ? [PARKED_BLADE_POSITION.x, PARKED_BLADE_POSITION.y, PARKED_BLADE_POSITION.z]
              : [pose.position.x, pose.position.y, pose.position.z]}
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
                enemiesRef.current.set(rb._enemyId, rb)
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
            ref={(node) => { visualRefs.current[idx] = node ?? null }}
            position={[pose.position.x, pose.position.y, pose.position.z]}
            rotation={[pose.rotation.x, pose.rotation.y, pose.rotation.z]}
            visible={!isRespawning}
          >
            <CompassBladeModel />
          </group>
        )
      })}

      {explosions.map((explosion) => (
        <CompassBladeExplosion key={explosion.id} {...explosion} onDone={removeExplosion} />
      ))}
    </>
  )
}
