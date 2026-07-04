import { useRef, useState, useCallback, useMemo } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import * as THREE from 'three'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findBestSplashTarget, applyRadialDamage } from '../../lib/weaponTargeting.js'
import { scaleEffectVisual } from '../../lib/effectVisualScale.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

// eraserBomb / 지우개 폭탄
// 역할: 원거리 투척 폭탄. range:12, cooldown:6000ms — 느리지만 안전 거리에서 강한 한 방.
// 하얀 지우개가 높은 포물선을 그리며 날아가 먼지 폭발 (쓰리미니 설계 2026-06-14).

let _eraserId = 0
const FLIGHT_DURATION = 2.0  // 1.2→2.0: 사거리 2배에 맞춰 비행 시간 연장
export const ERASER_MODEL_VISUAL_SCALE = scaleEffectVisual(1.2)

export function getEraserExplosionVisualScale(radius, progress) {
  return scaleEffectVisual(0.3 + radius * 2 * progress)
}

export function EraserModel() {
  // 하얀 지우개: 따뜻한 오프화이트 본체 + 파란 브랜드 띠 + 닳은 끝부분 디테일
  const bodyMat   = useMemo(() => toonMat(0xf5f0e8, 0.08), [])  // 오프화이트 (지우개 본체)
  const stripeMat = useMemo(() => toonMat(0x1a3a7a, 0.10), [])  // 파란 브랜드 띠
  const wornMat   = useMemo(() => toonMat(0xe8e0d0, 0.06), [])  // 살짝 어두운 오프화이트 (닳은 끝)
  // 흰 오브젝트는 기본 검은 outline이 흐려지므로 opacity를 높이고 약간 짙은 회색 사용
  const outMat    = useMemo(() => outlineMat(0.98, 0x1a1a1a), [])

  return (
    <StudioTunedGroup itemId="weapon-eraser">
      <group scale={[
        ERASER_MODEL_VISUAL_SCALE,
        ERASER_MODEL_VISUAL_SCALE,
        ERASER_MODEL_VISUAL_SCALE,
      ]}>
      {/* 외곽선 hull */}
      <mesh material={outMat} scale={inflateScale([1.08, 1.16, 1.16])}>
        <boxGeometry args={[0.5, 0.22, 0.22]} />
      </mesh>
      {/* 지우개 본체 */}
      <mesh material={bodyMat}>
        <boxGeometry args={[0.5, 0.22, 0.22]} />
      </mesh>
      {/* 파란 브랜드 띠 — 본체 중앙 */}
      <mesh material={stripeMat} position={[0, 0, 0]}>
        <boxGeometry args={[0.52, 0.065, 0.225]} />
      </mesh>
      {/* 닳은 끝부분 디테일 — 한쪽 끝 약간 좁은 블록으로 표현 */}
      <mesh material={wornMat} position={[0.22, 0, 0]}>
        <boxGeometry args={[0.06, 0.20, 0.21]} />
      </mesh>
      </group>
    </StudioTunedGroup>
  )
}

function EraserProjectile({ id, start, target, damage, radius, onExplode }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const explodedRef = useRef(false)

  usePlayingFrame((_, delta) => {
    if (!groupRef.current || explodedRef.current) return
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / FLIGHT_DURATION)

    const x = THREE.MathUtils.lerp(start[0], target.x, t)
    const z = THREE.MathUtils.lerp(start[2], target.z, t)
    // 수직 솟구침: 시작 높이→지면 선형 + 높은 포물선 (7유닛 정점)
    const y = THREE.MathUtils.lerp(start[1], 0, t) + Math.sin(t * Math.PI) * 7.0
    groupRef.current.position.set(x, y, z)
    groupRef.current.rotation.x += delta * 3.2
    groupRef.current.rotation.z -= delta * 4.0

    if (t >= 1) {
      explodedRef.current = true
      onExplode(id, { x: target.x, z: target.z, damage, radius })
    }
  })

  return (
    <group ref={groupRef} position={start}>
      <EraserModel />
    </group>
  )
}

function DustExplosion({ id, x, z, radius, onDone }) {
  const meshRef = useRef(null)
  const ageRef = useRef(0)

  usePlayingFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.5)
    if (meshRef.current) {
      meshRef.current.scale.setScalar(getEraserExplosionVisualScale(radius, t))
      meshRef.current.material.opacity = 0.5 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.08, z]} renderOrder={4}>
      <circleGeometry args={[0.5, 48]} />
      <meshBasicMaterial color={0xc9cb9f} transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function EraserBombWeapon() {
  const [erasers, setErasers] = useState([])
  const [explosions, setExplosions] = useState([])
  const activeErasersRef = useRef([])
  const lastFireRef = useRef(0)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((eid) => {
    setExplosions((prev) => prev.filter((item) => item.id !== eid))
  }, [])

  const explode = useCallback((eid, blast) => {
    activeErasersRef.current = activeErasersRef.current.filter((item) => item.id !== eid)
    setErasers([...activeErasersRef.current])

    applyRadialDamage({
      x: blast.x, z: blast.z, radius: blast.radius, damage: blast.damage,
      knockback: 2.5, knockbackMs: 120, deathStyleOverride: 'shatter5',
    })

    setExplosions((prev) => [...prev, { id: eid, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.eraserBomb
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (activeErasersRef.current.length > 0) return

    const raw = findBestSplashTarget(w.range ?? 12, w.radius ?? 1.35)
    if (!raw) return   // 범위 내 적 없으면 쿨다운 소비 없이 스킵

    // 착지점: 클러스터 방향으로 최대 3유닛 이내 (수직 솟구침 스타일)
    const LAND_RADIUS = 3.0
    const dx = (raw?.x ?? playerPos.x) - playerPos.x
    const dz = (raw?.z ?? playerPos.z) - playerPos.z
    const d = Math.hypot(dx, dz) || 1
    const scale = Math.min(d, LAND_RADIUS) / d
    const landTarget = { x: playerPos.x + dx * scale, z: playerPos.z + dz * scale }

    lastFireRef.current = now
    emitSfx({ id: 'eraserFire' })
    const next = {
      id: ++_eraserId,
      start: [playerPos.x, playerPos.y + 0.36, playerPos.z],
      target: landTarget,
      damage: w.damage,
      radius: w.radius ?? 1.35,
    }
    activeErasersRef.current = [next]
    setErasers([next])
  })

  if (!weapons.eraserBomb?.active) return null

  return (
    <>
      {erasers.map((e) => (
        <EraserProjectile key={e.id} {...e} onExplode={explode} />
      ))}
      {explosions.map((ex) => (
        <DustExplosion key={ex.id} {...ex} onDone={removeExplosion} />
      ))}
    </>
  )
}
