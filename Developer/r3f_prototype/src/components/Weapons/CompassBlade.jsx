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

const DUCK_POTTY_BODY = 0xf3ead9
const DUCK_POTTY_SHADOW = 0xd8ceb9
const DUCK_POTTY_ORANGE = 0xef8a2e
const DUCK_POTTY_DARK = 0x1f2328
const DUCK_POTTY_SEAT = 0xc9c0ad
const DUCK_POTTY_GLOW = 0xffb24a

function DuckPottyPart({
  material,
  outlineMaterial,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  geometry = 'box',
  args = [1, 1, 1],
  outlineScale = [1.08, 1.08, 1.08],
}) {
  const outlineArgs = Array.isArray(outlineScale)
    ? outlineScale
    : [outlineScale, outlineScale, outlineScale]

  const shape = (shapeArgs = args) => {
    if (geometry === 'sphere') return <sphereGeometry args={shapeArgs} />
    if (geometry === 'cylinder') return <cylinderGeometry args={shapeArgs} />
    if (geometry === 'torus') return <torusGeometry args={shapeArgs} />
    if (geometry === 'cone') return <coneGeometry args={shapeArgs} />
    return <boxGeometry args={shapeArgs} />
  }

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh material={outlineMaterial} scale={inflateScale(outlineArgs)} userData={{ studioRenderOutline: true }}>
        {shape()}
      </mesh>
      <mesh material={material}>
        {shape()}
      </mesh>
    </group>
  )
}

function DuckPottyHandle({ side = 1, bodyMat, outMat }) {
  return (
    <group position={[side * 0.35, 0.52, -0.19]} rotation={[0, side * 0.08, 0]}>
      {/* 튼튼한 옆 손잡이: 오리 머리 양쪽에 세로 루프처럼 붙어야 레퍼런스가 읽힌다. */}
      <DuckPottyPart material={bodyMat} outlineMaterial={outMat} position={[side * 0.08, 0, 0]} scale={[0.18, 0.28, 0.12]} geometry="torus" args={[0.28, 0.065, 8, 20]} />
      <DuckPottyPart material={bodyMat} outlineMaterial={outMat} position={[side * 0.005, 0, 0]} scale={[0.06, 0.30, 0.10]} />
    </group>
  )
}

function DuckFoot({ side = 1, orangeMat, outMat, rear = false }) {
  return (
    <group position={[side * (rear ? 0.34 : 0.23), -0.25, rear ? -0.37 : 0.33]} rotation={[0, side * (rear ? -0.18 : 0.18), 0]}>
      <DuckPottyPart material={orangeMat} outlineMaterial={outMat} scale={[0.28, 0.13, 0.22]} geometry="sphere" args={[0.5, 10, 6]} />
      <DuckPottyPart material={orangeMat} outlineMaterial={outMat} position={[0, 0.015, rear ? -0.07 : 0.07]} scale={[0.20, 0.07, 0.06]} />
    </group>
  )
}

export function CompassBladeModel() {
  const bodyMat = useMemo(() => toonMat(DUCK_POTTY_BODY, 0.08), [])
  const shadowMat = useMemo(() => toonMat(DUCK_POTTY_SHADOW, 0.05), [])
  const orangeMat = useMemo(() => toonMat(DUCK_POTTY_ORANGE, 0.18), [])
  const darkMat = useMemo(() => toonMat(DUCK_POTTY_DARK, 0.02), [])
  const seatMat = useMemo(() => toonMat(DUCK_POTTY_SEAT, 0.04), [])
  const glowMat = useMemo(() => toonMat(DUCK_POTTY_GLOW, 0.32), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  return (
    <StudioTunedGroup itemId="weapon-compass">
      {/* 나침반 칼날의 궤도/충돌 로직은 유지하고, 시각 모델만 오리좌변기 장난감으로 교체한다. */}
      <group scale={[0.48, 0.48, 0.48]} rotation={[0.16, 0, 0]}>
        <mesh material={glowMat} position={[0, -0.31, 0]} rotation={[Math.PI / 2, 0, -0.72]}>
          <torusGeometry args={[0.72, 0.026, 8, 44, 2.05]} />
        </mesh>

        {/* 안정적인 좌변기 베이스와 포티 시트 구멍. */}
        <DuckPottyPart material={bodyMat} outlineMaterial={outMat} position={[0, -0.06, -0.02]} scale={[0.78, 0.34, 1.02]} geometry="sphere" args={[0.5, 12, 8]} />
        <DuckPottyPart material={bodyMat} outlineMaterial={outMat} position={[0, 0.06, -0.08]} scale={[0.68, 0.22, 0.78]} />
        <DuckPottyPart material={seatMat} outlineMaterial={outMat} position={[0, 0.24, -0.12]} rotation={[Math.PI / 2, 0, 0]} scale={[0.76, 0.58, 0.12]} geometry="torus" args={[0.34, 0.095, 10, 28]} outlineScale={[1.05, 1.05, 1.05]} />
        <DuckPottyPart material={shadowMat} outlineMaterial={outMat} position={[0, 0.20, -0.12]} rotation={[Math.PI / 2, 0, 0]} scale={[0.44, 0.34, 0.05]} geometry="cylinder" args={[0.38, 0.38, 0.04, 22]} outlineScale={[1.02, 1.02, 1.02]} />

        {/* 오리 목/머리: 앞쪽에서 길게 솟아올라 무기 회전 중에도 실루엣이 보인다. */}
        <DuckPottyPart material={bodyMat} outlineMaterial={outMat} position={[0, 0.42, 0.30]} scale={[0.34, 0.70, 0.32]} geometry="sphere" args={[0.5, 12, 8]} />
        <DuckPottyPart material={bodyMat} outlineMaterial={outMat} position={[0, 0.86, 0.35]} scale={[0.48, 0.40, 0.42]} geometry="sphere" args={[0.5, 12, 8]} />
        <DuckPottyPart material={bodyMat} outlineMaterial={outMat} position={[0, 1.02, 0.30]} scale={[0.26, 0.18, 0.20]} geometry="sphere" args={[0.5, 10, 6]} outlineScale={[1.05, 1.05, 1.05]} />

        <DuckPottyHandle side={-1} bodyMat={bodyMat} outMat={outMat} />
        <DuckPottyHandle side={1} bodyMat={bodyMat} outMat={outMat} />

        {/* 주황색 부리와 발: 레퍼런스의 가장 강한 식별 색. */}
        <DuckPottyPart material={orangeMat} outlineMaterial={outMat} position={[0, 0.82, 0.68]} rotation={[Math.PI / 2, 0, 0]} scale={[1.25, 0.42, 0.34]} geometry="cone" args={[0.18, 0.34, 8]} />
        <DuckPottyPart material={orangeMat} outlineMaterial={outMat} position={[0, 0.70, 0.66]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.0, 0.28, 0.18]} geometry="cone" args={[0.15, 0.24, 8]} />
        <DuckFoot side={-1} orangeMat={orangeMat} outMat={outMat} />
        <DuckFoot side={1} orangeMat={orangeMat} outMat={outMat} />
        <DuckFoot side={-1} orangeMat={orangeMat} outMat={outMat} rear />
        <DuckFoot side={1} orangeMat={orangeMat} outMat={outMat} rear />

        {/* 눈, 눈썹, 옆 날개/손잡이 패널. */}
        <DuckPottyPart material={darkMat} outlineMaterial={outMat} position={[-0.13, 0.92, 0.57]} scale={[0.055, 0.09, 0.035]} geometry="sphere" args={[0.5, 8, 8]} outlineScale={[1.03, 1.03, 1.03]} />
        <DuckPottyPart material={darkMat} outlineMaterial={outMat} position={[0.13, 0.92, 0.57]} scale={[0.055, 0.09, 0.035]} geometry="sphere" args={[0.5, 8, 8]} outlineScale={[1.03, 1.03, 1.03]} />
        <DuckPottyPart material={darkMat} outlineMaterial={outMat} position={[-0.14, 1.05, 0.54]} rotation={[0, 0, -0.34]} scale={[0.11, 0.02, 0.02]} />
        <DuckPottyPart material={darkMat} outlineMaterial={outMat} position={[0.14, 1.05, 0.54]} rotation={[0, 0, 0.34]} scale={[0.11, 0.02, 0.02]} />
        <DuckPottyPart material={shadowMat} outlineMaterial={outMat} position={[-0.38, 0.05, -0.02]} rotation={[0, 0.05, 0.08]} scale={[0.09, 0.28, 0.32]} geometry="sphere" args={[0.5, 8, 6]} />
        <DuckPottyPart material={shadowMat} outlineMaterial={outMat} position={[0.38, 0.05, -0.02]} rotation={[0, -0.05, -0.08]} scale={[0.09, 0.28, 0.32]} geometry="sphere" args={[0.5, 8, 6]} />
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
      canCrit: false, damageType: 'explosive', attackTags: ['radial', 'explosive', 'burst'],
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
      rb._enemyHit(w.damage, { critChance: w.critChance, critMultiplier: w.critMultiplier })
      emitSfx({ id: 'compassFire', volume: 0.18 })

      const stackResult = resolveCompassBladeHitStack({
        currentStack: hitStackRef.current,
        hitDamage: w.damage,
        explosionRadiusMultiplier: w.permanentExplosionRadiusMultiplier ?? 1,
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
