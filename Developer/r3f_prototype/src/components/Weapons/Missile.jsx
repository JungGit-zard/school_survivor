import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findBestSplashTarget } from '../../lib/weaponTargeting.js'

// guidedMissile / 보조배터리 미사일
// 역할 (Weapons_modify.md §4): 멀리 있거나 크게 뭉친 적 무리를 긴 쿨다운으로 크게 처리.
// 차별점: flask 대비 데미지 낮지만 호밍으로 명중 보장 + 사거리 김.

let _missileId = 0

function MissileModel() {
  const bodyMat  = useMemo(() => toonMat(0x5c6174, 0.06), [])  // 배터리 본체 회청
  const noseMat  = useMemo(() => toonMat(0xe99039, 0.18), [])  // 탄두 주황
  const ledMat   = useMemo(() => toonMat(0xf4e27b, 0.24), [])  // LED 노랑
  const finMat   = useMemo(() => toonMat(0x96a5bc, 0.04), [])  // 날개 회청 밝은
  const outMat   = useMemo(() => outlineMat(0.96), [])

  return (
    <group scale={[0.38, 0.38, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
      {/* 본체 */}
      <mesh material={outMat} scale={inflateScale([1.14, 1.04, 1.14])}>
        <cylinderGeometry args={[0.16, 0.16, 0.7, 10]} />
      </mesh>
      <mesh material={bodyMat}>
        <cylinderGeometry args={[0.16, 0.16, 0.7, 10]} />
      </mesh>
      {/* LED 띠 */}
      <mesh material={ledMat} position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.165, 0.165, 0.06, 10]} />
      </mesh>
      {/* 탄두 (cone) */}
      <mesh material={outMat} position={[0, 0.46, 0]} scale={inflateScale([1.18, 1.06, 1.18])}>
        <coneGeometry args={[0.16, 0.24, 10]} />
      </mesh>
      <mesh material={noseMat} position={[0, 0.46, 0]}>
        <coneGeometry args={[0.16, 0.24, 10]} />
      </mesh>
      {/* 꼬리 날개 4개 */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={finMat} position={[0, -0.32, 0]} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.04, 0.14, 0.18]} />
        </mesh>
      ))}
    </group>
  )
}

function MissileProjectile({ id, start, initialTarget, damage, radius, onExplode }) {
  const groupRef = useRef(null)
  const posRef = useRef(new THREE.Vector3(start[0], start[1], start[2]))
  const velRef = useRef(new THREE.Vector3(0, 0, 0))
  const targetRef = useRef(initialTarget)
  const explodedRef = useRef(false)
  const ageRef = useRef(0)

  // 초기 진행 방향: 시작점에서 타깃 방향으로 빠르게 가속.
  const initialAimSetRef = useRef(false)

  useFrame((_, delta) => {
    if (!groupRef.current || explodedRef.current) return
    ageRef.current += delta
    if (ageRef.current > 3.5) {
      // 너무 오래 못 맞췄으면 자체 폭발 (현 위치).
      explodedRef.current = true
      const p = posRef.current
      onExplode(id, { x: p.x, z: p.z, damage, radius })
      return
    }

    const SPEED = 6.0       // unit/s — flask보다 느리지만 호밍이라 명중률 보장
    const TURN_RATE = 5.0   // rad/s — 부드럽지 않게 잘 따라감

    // 타깃이 죽었거나 사라졌으면 재타깃팅 시도.
    let target = targetRef.current
    if (!target?.rb?.translation || target.rb._enemyDead) {
      const next = pickNearestEnemy(posRef.current)
      if (next) {
        targetRef.current = next
        target = next
      } else {
        // 타깃 없음 → 직진 후 폭발.
        const p = posRef.current
        p.add(velRef.current.clone().multiplyScalar(delta))
        groupRef.current.position.copy(p)
        return
      }
    }

    const t = target.rb.translation()
    const desired = new THREE.Vector3(t.x - posRef.current.x, 0, t.z - posRef.current.z)
    const distance = desired.length()
    if (distance < 0.001) return

    desired.normalize().multiplyScalar(SPEED)

    if (!initialAimSetRef.current) {
      velRef.current.copy(desired)
      initialAimSetRef.current = true
    } else {
      // 부드러운 회전: 현재 velocity를 desired 쪽으로 lerp.
      const lerpAlpha = Math.min(1, TURN_RATE * delta)
      velRef.current.lerp(desired, lerpAlpha)
      velRef.current.setLength(SPEED)
    }

    // 이동.
    posRef.current.x += velRef.current.x * delta
    posRef.current.z += velRef.current.z * delta

    // 임팩트 판정 — radius 안 진입 시 폭발.
    if (distance <= 0.5) {
      explodedRef.current = true
      onExplode(id, { x: t.x, z: t.z, damage, radius })
      return
    }

    groupRef.current.position.copy(posRef.current)
    // 진행 방향으로 mesh 회전.
    groupRef.current.rotation.y = Math.atan2(velRef.current.x, velRef.current.z)
  })

  return (
    <group ref={groupRef} position={start}>
      <MissileModel />
    </group>
  )
}

function pickNearestEnemy(fromPos) {
  let best = null
  let bestDistSq = Infinity
  enemyBodies.forEach((rb) => {
    if (!rb?._enemyHit || rb._enemyDead) return
    const t = rb.translation()
    const dx = t.x - fromPos.x
    const dz = t.z - fromPos.z
    const d2 = dx * dx + dz * dz
    if (d2 < bestDistSq) {
      bestDistSq = d2
      best = { rb }
    }
  })
  return best
}

function MissileExplosion({ id, x, z, radius, onDone }) {
  const meshRef = useRef(null)
  const ageRef = useRef(0)

  useFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.42)
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.2 + radius * 2 * t)
      meshRef.current.material.opacity = 0.45 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.08, z]} renderOrder={4}>
      <circleGeometry args={[0.5, 48]} />
      <meshBasicMaterial color={0xe99039} transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function GuidedMissile() {
  const [missiles, setMissiles] = useState([])
  const [explosions, setExplosions] = useState([])
  const activeMissilesRef = useRef([])
  const lastFireRef = useRef(0)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((eid) => {
    setExplosions((prev) => prev.filter((item) => item.id !== eid))
  }, [])

  const explode = useCallback((mid, blast) => {
    activeMissilesRef.current = activeMissilesRef.current.filter((item) => item.id !== mid)
    setMissiles([...activeMissilesRef.current])

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
        knockback: 2.2,
        knockbackMs: 100,
      })
    })

    setExplosions((prev) => [...prev, { id: mid, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  useFrame(({ clock }) => {
    const w = weapons.guidedMissile
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (activeMissilesRef.current.length > 0) return

    // 우선 cluster center 시도, 없으면 가장 가까운 적.
    const splash = findBestSplashTarget(w.range ?? 22, w.radius ?? 1.6)
    if (!splash) return
    // 진짜 rigid body가 필요해서 가장 가까운 enemy를 cluster 중심 근처에서 찾음.
    let initialTarget = null
    let bestDist = Infinity
    enemyBodies.forEach((rb) => {
      if (!rb?._enemyHit || rb._enemyDead) return
      const t = rb.translation()
      const dx = t.x - splash.x
      const dz = t.z - splash.z
      const d2 = dx * dx + dz * dz
      if (d2 < bestDist) {
        bestDist = d2
        initialTarget = { rb }
      }
    })
    if (!initialTarget) return

    lastFireRef.current = now
    const next = {
      id: ++_missileId,
      start: [playerPos.x, playerPos.y + 0.36, playerPos.z],
      initialTarget,
      damage: w.damage,
      radius: w.radius ?? 1.6,
    }
    activeMissilesRef.current = [next]
    setMissiles([next])
  })

  if (!weapons.guidedMissile?.active) return null

  return (
    <>
      {missiles.map((m) => (
        <MissileProjectile key={m.id} {...m} onExplode={explode} />
      ))}
      {explosions.map((ex) => (
        <MissileExplosion key={ex.id} {...ex} onDone={removeExplosion} />
      ))}
    </>
  )
}
