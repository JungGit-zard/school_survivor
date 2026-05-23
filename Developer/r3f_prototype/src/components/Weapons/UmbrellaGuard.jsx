import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'

// umbrellaGuard / 우산 방어막
// 역할: 일정 주기마다 플레이어 주변에 펄스를 발생시켜 가까운 적에 데미지 + 약한 넉백.
// 우산이 1회 펴졌다가 닫히는 짧은 visual.

const PULSE_DURATION_MS = 320

function UmbrellaModel({ openProgress }) {
  const fabricMat = useMemo(() => toonMat(0x351740, 0.06), [])  // 보라 자줏빛
  const ribMat   = useMemo(() => toonMat(0x96a5bc, 0.04), [])
  const handleMat = useMemo(() => toonMat(0x4b2933, 0.06), [])
  const outMat   = useMemo(() => outlineMat(0.94), [])
  const open = 0.4 + openProgress * 0.6
  const fabricRadius = 0.55 * open

  return (
    <group scale={[0.6, open, 0.6]}>
      {/* 손잡이 */}
      <mesh material={outMat} position={[0, -0.6, 0]} scale={inflateScale([1.6, 1.05, 1.6])}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
      </mesh>
      <mesh material={handleMat} position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
      </mesh>
      {/* 우산 천 (cone 거꾸로) */}
      <mesh material={outMat} position={[0, 0.05, 0]} scale={inflateScale([1.06, 1.1, 1.06])}>
        <coneGeometry args={[fabricRadius, 0.5, 12]} />
      </mesh>
      <mesh material={fabricMat} position={[0, 0.05, 0]}>
        <coneGeometry args={[fabricRadius, 0.5, 12]} />
      </mesh>
      {/* 우산 살 */}
      <mesh material={ribMat} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 1.1 * open, 4]} />
      </mesh>
      <mesh material={ribMat} position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 1.1 * open, 4]} />
      </mesh>
    </group>
  )
}

export function UmbrellaGuardWeapon() {
  const lastFireRef = useRef(-Infinity)
  const pulseStartRef = useRef(-Infinity)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)
  const [openProgress, setOpenProgress] = useState(0)

  useFrame(({ clock }) => {
    const w = weapons.umbrellaGuard
    if (phase !== 'playing' || !w?.active) return

    const now = clock.elapsedTime * 1000

    // 펄스 발사 조건.
    if (now - lastFireRef.current >= w.cooldown) {
      lastFireRef.current = now
      pulseStartRef.current = now
      const radius = w.radius ?? 1.0
      const damage = w.damage ?? 5
      enemyBodies.forEach((rb) => {
        if (!rb?._enemyHit || rb._enemyDead) return
        const t = rb.translation()
        const dx = t.x - playerPos.x
        const dz = t.z - playerPos.z
        if (dx * dx + dz * dz > radius * radius) return
        rb._enemyHit(damage, {
          source: { x: playerPos.x, z: playerPos.z },
          knockback: 2.0,
          knockbackMs: w.knockbackMs ?? 200,
        })
      })
    }

    // visual age 갱신.
    const age = now - pulseStartRef.current
    if (age <= PULSE_DURATION_MS) {
      const t = Math.max(0, Math.min(1, age / PULSE_DURATION_MS))
      const next = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2
      setOpenProgress(next)
    } else if (openProgress !== 0) {
      setOpenProgress(0)
    }
  })

  if (!weapons.umbrellaGuard?.active) return null

  return (
    <group position={[playerPos.x, playerPos.y + 0.5, playerPos.z]}>
      <UmbrellaModel openProgress={openProgress} />
    </group>
  )
}
