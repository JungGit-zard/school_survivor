import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { enemyBodies, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'

// starlink / 고장난 스타링크
// 역할: 플레이어 주변 strikeCenter 안에서 적이 있는 지점에 무작위 낙뢰.
// strikeCount만큼 번개를 동시에 떨어뜨려 strikeRadius 안 모든 적에 데미지.

let _strikeId = 0
const STRIKE_DURATION_MS = 380

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
  // 0..1 진행도. 처음 60%는 번개 줄기, 나머지 40%는 ground flash.
  const t = Math.min(1, age / STRIKE_DURATION_MS)
  const boltOpacity = t < 0.6 ? 1 - t / 0.6 : 0
  const flashOpacity = t >= 0.4 ? Math.max(0, 1 - (t - 0.4) / 0.6) : 0
  const flashScale = 0.4 + t * 1.6

  return (
    <group position={[x, 0, z]}>
      {/* 번개 줄기 — 위에서 아래로 떨어지는 cylinder */}
      {boltOpacity > 0 && (
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.06, 0.02, 3.2, 6]} />
          <meshBasicMaterial color={0x7ca0f4} transparent opacity={boltOpacity} depthWrite={false} />
        </mesh>
      )}
      {/* 충돌 지점 ground flash */}
      {flashOpacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={5}>
          <circleGeometry args={[0.5, 24]} />
          <meshBasicMaterial
            color={0xf4e27b}
            transparent
            opacity={flashOpacity * 0.7}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
          <primitive attach="onUpdate" object={() => { /* noop */ }} />
        </mesh>
      )}
      {/* 외곽 ring */}
      {flashOpacity > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[flashScale, flashScale, 1]}>
          <ringGeometry args={[0.42, 0.5, 24]} />
          <meshBasicMaterial color={0xffffff} transparent opacity={flashOpacity * 0.5} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function StrikeWrapper({ id, x, z, damage, radius, onDone }) {
  const ageRef = useRef(0)
  const damageDealtRef = useRef(false)
  const [, force] = useState(0)

  useFrame((_, delta) => {
    ageRef.current += delta * 1000
    if (ageRef.current > STRIKE_DURATION_MS) {
      onDone(id)
      return
    }

    // strike가 떨어진 직후(t≈0.3-0.5 구간)에 1회 데미지 적용.
    if (!damageDealtRef.current && ageRef.current >= STRIKE_DURATION_MS * 0.3) {
      damageDealtRef.current = true
      const hit = new Set()
      enemyBodies.forEach((rb, eid) => {
        if (!rb?._enemyHit || rb._enemyDead || hit.has(eid)) return
        const t = rb.translation()
        const dx = t.x - x
        const dz = t.z - z
        if (dx * dx + dz * dz > radius * radius) return
        hit.add(eid)
        rb._enemyHit(damage, {
          source: { x, z },
          knockback: 1.4,
          knockbackMs: 80,
        })
      })
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

  useFrame(({ clock }) => {
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
