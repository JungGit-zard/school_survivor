import { useRef, useMemo, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import {
  COMPASS_BLADE_EXPLOSION_DURATION_SEC,
  getCompassBladeExplosionExpansion,
  getCompassBladeExplosionVisualScale,
  getCompassBladeOrbitPose,
  getCompassBladeRespawnUntilMs,
  resolveCompassBladeHitStack,
} from '../../lib/compassBlade.js'
import { applyRadialDamage, createWeaponTargetScratch, resolveWeaponTarget, scanOrbitEnemiesInto } from '../../lib/weaponTargeting.js'
import { applyEnemyHit, isEnemyHitLive } from '../../lib/weaponCollision.js'
import { useDeferredProjectileState } from '../../lib/useDeferredProjectileState.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

let _compassExplosionId = 0

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
    const t = Math.min(1, ageRef.current / COMPASS_BLADE_EXPLOSION_DURATION_SEC)
    // 크기는 e(앞으로 몰린 확산), 불투명도는 t(선형 수명). 예전엔 둘 다 t라 링이 실제
    // 피해 반경에 닿는 순간 opacity가 0이었다 — 보이는 내내 실제보다 작은 폭발이었다.
    const e = getCompassBladeExplosionExpansion(t)
    const fastPop = 1 - Math.min(1, t / 0.34)
    const lateFade = Math.max(0, 1 - t)
    if (groupRef.current) {
      // 바깥 링의 월드 반경 = 피해 반경. 예전 스케일 식은 완전 확산 시 피해 반경의 5.7배까지
      // 부풀어 "닿았는데 안 죽는다"를 만들었고, 반경에 비례하지 않는 상수항 때문에 영구
      // 반경 강화가 비주얼에 반영되지도 않았다.
      groupRef.current.scale.setScalar(getCompassBladeExplosionVisualScale(radius, e))
      groupRef.current.rotation.y += delta * 4.4
    }
    if (flashRef.current) {
      flashRef.current.scale.setScalar(0.65 + e * 0.7)
      flashRef.current.material.opacity = 0.92 * fastPop
    }
    if (innerRingRef.current) {
      innerRingRef.current.scale.setScalar(0.72 + e * 0.9)
      innerRingRef.current.material.opacity = 0.84 * lateFade
    }
    if (outerRingRef.current) {
      outerRingRef.current.scale.setScalar(0.95 + e * 1.4)
      outerRingRef.current.material.opacity = 0.72 * lateFade
    }
    if (burstRef.current) {
      burstRef.current.scale.set(1.2 + e * 0.8, 1.3 + e * 1.8, 1.2 + e * 0.8)
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
  const visualRefs = useRef([])
  const lastHitRef = useRef({ times: new Float64Array(200), generations: new Uint16Array(200), special: new Array(3), specialTimes: new Float64Array(3) })
  const targetScratchRef = useRef(createWeaponTargetScratch())
  const impactRef = useRef({ critChance: 0, critMultiplier: 1 })
  const orbitXRef = useRef(new Float32Array(3))
  const orbitZRef = useRef(new Float32Array(3))
  // 살아 있는(리스폰 중이 아닌) 요강만 압축해 담는다. scanOrbitEnemiesInto는 궤도체 배열을
  // 통째로 훑으므로, 터져서 사라진 요강 자리로도 좀비가 걸려들지 않게 여기서 걸러 넘긴다.
  const liveXRef = useRef(new Float32Array(3))
  const liveZRef = useRef(new Float32Array(3))
  // 스택·리스폰은 요강별이다(2026-08-19 사용자 지시: "요강별로 해줘, 그게 더 실감나").
  // 전역이었을 땐 하나가 터지면 셋이 동시에 사라져 무기가 통째로 점멸했다.
  const hitStacksRef = useRef(new Uint8Array(3))
  const respawnUntilRef = useRef(new Float64Array(3))
  const wasActiveRef = useRef(false)
  const [explosions, explosionsRef, requestExplosions, removeExplosion] = useDeferredProjectileState()
  const weapons = useGameStore((s) => s.weapons)
  const compassActive = !!weapons.compassBlade?.active

  useEffect(() => {
    if (compassActive && !wasActiveRef.current) {
      emitSfx({ id: 'compassFire' })
      // ref는 런이 바뀌어도 살아남는다. 이전 런의 스택을 들고 시작하면 해금 직후 첫 타에
      // 폭발하는 일이 생긴다.
      hitStacksRef.current.fill(0)
      respawnUntilRef.current.fill(0)
    }
    wasActiveRef.current = compassActive
  }, [compassActive])

  const explode = useCallback((blast) => {
    emitSfx({ id: 'compassHit' })
    applyRadialDamage({
      x: blast.x, z: blast.z, radius: blast.radius, damage: blast.damage,
      knockback: 3.2, knockbackMs: 130,
      canCrit: false, damageType: 'explosive', attackTags: ['radial', 'explosive', 'burst'],
    })

    requestExplosions([...explosionsRef.current, {
      id: ++_compassExplosionId,
      x: blast.x,
      z: blast.z,
      radius: blast.radius,
    }])
  }, [explosionsRef, requestExplosions])

  usePlayingFrame(({ clock }) => {
    const w = weapons.compassBlade
    if (!w?.active) return

    const nowSec = clock.elapsedTime
    const count = Math.max(1, Math.min(3, w.count ?? 1))
    const radius = w.radius ?? 1.15
    const orbitSpeed = w.orbitSpeed ?? 3.4
    const nowMs = nowSec * 1000

    // 죽은 요강도 궤도 좌표는 계속 갱신한다 — 리스폰 시 제자리가 아니라 그 사이 돌았어야 할
    // 위치에서 돌아와야 다른 요강과 간격이 유지된다.
    let liveCount = 0
    for (let i = 0; i < count; i += 1) {
      const pose = getCompassBladeOrbitPose({
        elapsedSec: nowSec,
        index: i,
        count,
        radius,
        orbitSpeed,
        player: playerPos,
      })

      orbitXRef.current[i] = pose.position.x
      orbitZRef.current[i] = pose.position.z

      const alive = respawnUntilRef.current[i] <= nowMs
      if (alive) {
        liveXRef.current[liveCount] = pose.position.x
        liveZRef.current[liveCount] = pose.position.z
        liveCount += 1
      }
      if (visualRefs.current[i]) {
        visualRefs.current[i].visible = alive
        visualRefs.current[i].position.set(pose.position.x, pose.position.y, pose.position.z)
        visualRefs.current[i].rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z)
      }
    }
    if (liveCount === 0) return

    const interval = 1000 / (w.hitsPerSecond ?? 2.5)
    const hitRadius = w.hitRadius ?? 0.46
    const scratch = targetScratchRef.current
    const targetCount = scanOrbitEnemiesInto(scratch, liveXRef.current, liveZRef.current, liveCount, hitRadius)
    for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
      const special = scratch.special[targetIndex]
      const index = scratch.indices[targetIndex]
      const generation = special ? (scratch.generations[targetIndex] || null) : scratch.generations[targetIndex]
      const rb = special ?? resolveWeaponTarget(index, generation, null)
      if (!isEnemyHitLive(rb, generation)) continue
      const t = rb.translation()

      // 이 좀비를 때린 요강 = 가장 가까운 살아 있는 요강. 스택도 폭발 지점도 그 요강 것이다.
      // 이번 프레임에 이미 터진 요강은 respawnUntil이 갱신돼 여기서 자연히 빠진다 —
      // 그래서 판정보다 먼저 고르고, 고를 요강이 없으면 타격 자체가 없다.
      let blade = -1
      let bestDistSq = Infinity
      for (let i = 0; i < count; i += 1) {
        if (respawnUntilRef.current[i] > nowMs) continue
        const dx = t.x - orbitXRef.current[i]
        const dz = t.z - orbitZRef.current[i]
        const distSq = dx * dx + dz * dz
        if (distSq < bestDistSq) { bestDistSq = distSq; blade = i }
      }
      if (blade < 0) break

      let lastHit = 0
      let specialSlot = -1
      if (special) {
        for (let slot = 0; slot < 3; slot += 1) {
          if (lastHitRef.current.special[slot] === special || lastHitRef.current.special[slot] === undefined) {
            if (lastHitRef.current.special[slot] === undefined) lastHitRef.current.special[slot] = special
            specialSlot = slot
            lastHit = lastHitRef.current.specialTimes[slot]
            break
          }
        }
      } else {
        if (lastHitRef.current.generations[index] !== generation) {
          lastHitRef.current.generations[index] = generation
          lastHitRef.current.times[index] = 0
        }
        lastHit = lastHitRef.current.times[index]
      }
      if (nowMs - lastHit < interval) continue
      const impact = impactRef.current
      impact.critChance = w.critChance; impact.critMultiplier = w.critMultiplier
      if (!applyEnemyHit(rb, generation, w.damage, impact)) continue
      if (special) {
        if (specialSlot >= 0) lastHitRef.current.specialTimes[specialSlot] = nowMs
      } else lastHitRef.current.times[index] = nowMs
      emitSfx({ id: 'compassQuack', volume: 0.5 })

      const stackResult = resolveCompassBladeHitStack({
        currentStack: hitStacksRef.current[blade],
        hitDamage: w.damage,
        explosionRadiusMultiplier: w.permanentExplosionRadiusMultiplier ?? 1,
      })
      hitStacksRef.current[blade] = stackResult.stack

      if (stackResult.exploded) {
        // 터지는 주체는 맞은 좀비가 아니라 그 좀비를 때린 요강이다. 그 요강만 사라지고,
        // 나머지는 자기 스택을 들고 계속 돈다.
        explode({
          x: orbitXRef.current[blade],
          z: orbitZRef.current[blade],
          damage: stackResult.explosionDamage,
          radius: stackResult.explosionRadius,
        })
        respawnUntilRef.current[blade] = getCompassBladeRespawnUntilMs({
          exploded: true,
          nowMs,
        })
      }
    }
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
          <group
            key={`compassBlade-visual-${idx}`}
            ref={(node) => { visualRefs.current[idx] = node ?? null }}
            position={[pose.position.x, pose.position.y, pose.position.z]}
            rotation={[pose.rotation.x, pose.rotation.y, pose.rotation.z]}
            visible
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
