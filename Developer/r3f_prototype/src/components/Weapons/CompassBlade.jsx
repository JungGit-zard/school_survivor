import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

// compassBlade / 나침반 칼날
// 역할: 플레이어 주변을 도는 회전 칼날. Tumbler 패턴 + 더 공격적 (회전 속도·hit interval).

function BladeModel() {
  const bodyMat = useMemo(() => toonMat(0xb7c0c7, 0.04), [])   // 회청 (Survival Horror)
  const tipMat  = useMemo(() => toonMat(0x71353f, 0.12), [])   // 자루 적자
  const outMat  = useMemo(() => outlineMat(0.96), [])

  return (
    <group scale={[0.5, 0.5, 0.5]}>
      {/* 칼날 본체 — 가늘고 긴 박스 */}
      <mesh material={outMat} scale={inflateScale([1.04, 1.5, 1.5])}>
        <boxGeometry args={[0.6, 0.04, 0.08]} />
      </mesh>
      <mesh material={bodyMat}>
        <boxGeometry args={[0.6, 0.04, 0.08]} />
      </mesh>
      {/* 손잡이 (한쪽 끝) */}
      <mesh material={tipMat} position={[-0.3, 0, 0]}>
        <boxGeometry args={[0.12, 0.06, 0.1]} />
      </mesh>
    </group>
  )
}

export function CompassBladeWeapon() {
  const rbRefs = useRef([])
  const visualRefs = useRef([])
  const enemiesRef = useRef(new Map())
  const lastHitRef = useRef(new Map())
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  useFrame(({ clock }) => {
    const w = weapons.compassBlade
    if (phase !== 'playing' || !w?.active) return

    const nowSec = clock.elapsedTime
    const count = Math.max(1, Math.min(3, w.count ?? 1))
    const radius = w.radius ?? 1.15
    const y = playerPos.y + 0.16

    for (let i = 0; i < count; i += 1) {
      const angle = nowSec * (w.orbitSpeed ?? 3.4) + (Math.PI * 2 * i) / count
      const x = playerPos.x + Math.sin(angle) * radius
      const z = playerPos.z + Math.cos(angle) * radius
      rbRefs.current[i]?.setTranslation({ x, y, z }, true)
      if (visualRefs.current[i]) {
        visualRefs.current[i].position.set(x, y, z)
        // 칼날이 회전 진행 방향과 평행하게 — angle + 90도
        visualRefs.current[i].rotation.set(0, angle + Math.PI / 2, 0)
      }
    }

    // hit interval 처리
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

  return (
    <>
      {Array.from({ length: bladeCount }, (_, idx) => (
        <RigidBody
          key={`compassBlade-${idx}`}
          ref={(node) => { rbRefs.current[idx] = node }}
          type="kinematicPosition"
          position={[playerPos.x + (weapons.compassBlade.radius ?? 1.15), playerPos.y + 0.16, playerPos.z]}
          colliders={false}
          sensor
        >
          <BallCollider
            args={[0.18]}
            sensor
            onIntersectionEnter={({ other }) => {
              const enemyId = other.rigidBody?._enemyId
              const hit = other.rigidBody?._enemyHit
              if (enemyId == null || !hit) return
              enemiesRef.current.set(enemyId, hit)
            }}
            onIntersectionExit={({ other }) => {
              const enemyId = other.rigidBody?._enemyId
              if (enemyId == null) return
              enemiesRef.current.delete(enemyId)
              lastHitRef.current.delete(enemyId)
            }}
          />
          <group ref={(node) => { visualRefs.current[idx] = node }}>
            <BladeModel />
          </group>
        </RigidBody>
      ))}
    </>
  )
}
