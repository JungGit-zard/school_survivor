import { useRef, useState, useCallback, useMemo } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'

// starlink / 고장난 스타링크
// 역할: 플레이어 주변 strikeCenter 안에서 적이 있는 지점에 무작위 낙뢰.
// strikeCount만큼 번개를 동시에 떨어뜨려 strikeRadius 안 모든 적에 데미지.

let _strikeId = 0
const STRIKE_DURATION_MS = 480

function pickStrikeTargets(strikeCenter, strikeCount) {
  // 플레이어 주변 strikeCenter 안 적들을 모은 뒤 무작위로 strikeCount개 선택.
  const candidates = []
  enemyBodies.forEach((rb) => {
    if (!rb?._enemyHit || rb._enemyDead) return
    const t = rb.translation()
    const dx = t.x - playerPos.x
    const dz = t.z - playerPos.z
    if (dx * dx + dz * dz > strikeCenter * strikeCenter) return
    candidates.push({ x: t.x, z: t.z, rb })
  })
  if (candidates.length === 0) return []

  // 무작위 셔플 후 N개.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  return candidates.slice(0, Math.max(1, Math.floor(strikeCount)))
}

function StrikeVisual({ x, z, age }) {
  // 0..1 진행도. 처음 55%는 번개 줄기, 나머지는 ground flash.
  const t = Math.min(1, age / STRIKE_DURATION_MS)
  const boltOpacity = t < 0.55 ? 1 - t / 0.55 : 0
  const flashOpacity = t >= 0.35 ? Math.max(0, 1 - (t - 0.35) / 0.65) : 0
  const flashScale = 0.5 + t * 2.4

  return (
    <group position={[x, 0, z]}>
      {/* 번개 줄기 외곽 — 선명한 청백색 두꺼운 기둥 */}
      {boltOpacity > 0 && (
        <mesh position={[0, 2.4, 0]}>
          <cylinderGeometry args={[0.14, 0.06, 4.8, 8]} />
          <meshBasicMaterial color={0x44aaff} transparent opacity={boltOpacity * 0.9} depthWrite={false} />
        </mesh>
      )}
      {/* 번개 줄기 코어 — 순백색 날카로운 중심 */}
      {boltOpacity > 0 && (
        <mesh position={[0, 2.4, 0]}>
          <cylinderGeometry args={[0.045, 0.016, 4.8, 6]} />
          <meshBasicMaterial color={0xffffff} transparent opacity={boltOpacity} depthWrite={false} />
        </mesh>
      )}
      {/* 충돌 지점 백색 코어 플래시 */}
      {flashOpacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} renderOrder={6}>
          <circleGeometry args={[0.5, 32]} />
          <meshBasicMaterial
            color={0xffffff}
            transparent
            opacity={flashOpacity * 0.95}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {/* 충돌 지점 노란 플래시 */}
      {flashOpacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={5}>
          <circleGeometry args={[1.0, 32]} />
          <meshBasicMaterial
            color={0xffee00}
            transparent
            opacity={flashOpacity * 0.88}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {/* 1차 확산 링 — 청백색 */}
      {flashOpacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} scale={[flashScale, flashScale, 1]} renderOrder={4}>
          <ringGeometry args={[0.8, 1.05, 32]} />
          <meshBasicMaterial color={0x88ddff} transparent opacity={flashOpacity * 0.9} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* 2차 확산 링 — 넓게 퍼지는 옅은 황색 외곽 glow */}
      {flashOpacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[flashScale * 1.6, flashScale * 1.6, 1]} renderOrder={3}>
          <ringGeometry args={[0.85, 1.15, 32]} />
          <meshBasicMaterial color={0xffff88} transparent opacity={flashOpacity * 0.45} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function StrikeWrapper({ id, x, z, damage, radius, onDone }) {
  const ageRef = useRef(0)
  const damageDealtRef = useRef(false)
  const [, force] = useState(0)

  usePlayingFrame((_, delta) => {
    ageRef.current += delta * 1000
    if (ageRef.current > STRIKE_DURATION_MS) {
      onDone(id)
      return
    }

    // strike가 떨어진 직후(t≈0.3-0.5 구간)에 1회 데미지 적용.
    if (!damageDealtRef.current && ageRef.current >= STRIKE_DURATION_MS * 0.3) {
      damageDealtRef.current = true
      applyRadialDamage({ x, z, radius, damage, knockback: 1.4, knockbackMs: 80 })
    }

    force((n) => n + 1)
  })

  return <StrikeVisual x={x} z={z} age={ageRef.current} />
}

export function StarlinkWeapon() {
  const [strikes, setStrikes] = useState([])
  const activeStrikesRef = useRef([])
  const lastFireRef = useRef(0)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeStrike = useCallback((sid) => {
    activeStrikesRef.current = activeStrikesRef.current.filter((s) => s.id !== sid)
    setStrikes([...activeStrikesRef.current])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.starlink
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return

    const targets = pickStrikeTargets(w.strikeCenter ?? 5, w.strikeCount ?? 1)
    if (targets.length === 0) return

    lastFireRef.current = now
    const nextStrikes = targets.map((t) => ({
      id: ++_strikeId,
      x: t.x,
      z: t.z,
      damage: w.damage,
      radius: w.strikeRadius ?? 1.2,
    }))
    activeStrikesRef.current = [...activeStrikesRef.current, ...nextStrikes]
    setStrikes([...activeStrikesRef.current])
  })

  if (!weapons.starlink?.active) return null

  return (
    <>
      {strikes.map((s) => (
        <StrikeWrapper key={s.id} {...s} onDone={removeStrike} />
      ))}
    </>
  )
}
