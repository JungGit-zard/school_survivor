import { useRef, useState, useCallback, useMemo } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import * as THREE from 'three'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { findBestSplashTarget, applyRadialDamage } from '../../lib/weaponTargeting.js'

let _flaskId = 0
const FLASK_FLIGHT_DURATION = 1.55

export function FlaskModel() {
  // 유리는 반투명 처리 — 불투명하면 안의 녹색 액체가 가려져 보이지 않는다.
  // depthWrite=false로 두어 불투명 액체(먼저 렌더)가 비쳐 보이도록 한다.
  const glassMat = useMemo(() => {
    const m = toonMat(0xc2f2ff, 0.06)
    m.transparent = true
    m.opacity = 0.28
    m.depthWrite = false
    return m
  }, [])
  // 밝게 빛나는 라임그린 액체 — emissive를 높여 발광감을 준다.
  const liquidMat = useMemo(() => toonMat(0x53e028, 0.5), [])
  const bubbleMat = useMemo(() => toonMat(0xc7ffa6, 0.55), [])
  const corkMat = useMemo(() => toonMat(0xd6ad77, 0.08), [])
  const outMat = useMemo(() => outlineMat(0.94), [])

  return (
    <group scale={[0.42, 0.42, 0.42]} rotation={[0.1, 0, -0.35]}>
      {/* 본체(원뿔) — 둥글게 보이도록 분할수를 높임 */}
      <mesh material={outMat} scale={inflateScale([1.1, 1.1, 1.1])} position={[0, -0.08, 0]}>
        <coneGeometry args={[0.34, 0.46, 24]} />
      </mesh>
      <mesh material={glassMat} position={[0, -0.08, 0]}>
        <coneGeometry args={[0.34, 0.46, 24]} />
      </mesh>
      {/* 녹색 액체 — 원뿔 안쪽을 약 2/3까지 채우는 절두체, 윗면은 평평한 수면 */}
      <mesh material={liquidMat} position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.10, 0.31, 0.30, 24]} />
      </mesh>
      {/* 기포 */}
      <mesh material={bubbleMat} position={[0.07, -0.18, 0.05]}>
        <sphereGeometry args={[0.035, 8, 8]} />
      </mesh>
      <mesh material={bubbleMat} position={[-0.06, -0.1, 0.04]}>
        <sphereGeometry args={[0.028, 8, 8]} />
      </mesh>
      <mesh material={bubbleMat} position={[0.02, -0.23, -0.05]}>
        <sphereGeometry args={[0.024, 8, 8]} />
      </mesh>
      {/* 목(투명 유리) */}
      <mesh material={outMat} scale={inflateScale([1.14, 1.1, 1.14])} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.32, 16]} />
      </mesh>
      <mesh material={glassMat} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.32, 16]} />
      </mesh>
      {/* 코르크 마개 */}
      <mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.12])} position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
      </mesh>
      <mesh material={corkMat} position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
      </mesh>
    </group>
  )
}

function FlaskProjectile({ id, start, target, radius, damage, onExplode }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const explodedRef = useRef(false)
  const posRef = useRef(new THREE.Vector3(start[0], start[1], start[2]))

  usePlayingFrame((_, delta) => {
    if (!groupRef.current) return
    if (explodedRef.current) return
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / FLASK_FLIGHT_DURATION)
    const ease = 1 - Math.pow(1 - t, 2)

    posRef.current.x = THREE.MathUtils.lerp(start[0], target.x, ease)
    posRef.current.z = THREE.MathUtils.lerp(start[2], target.z, ease)
    posRef.current.y = start[1] + Math.sin(t * Math.PI) * 1.55 - t * 0.25
    groupRef.current.position.copy(posRef.current)
    groupRef.current.rotation.x += delta * 5.2
    groupRef.current.rotation.y += delta * 7.4
    groupRef.current.rotation.z -= delta * 6.6

    if (t >= 1) {
      explodedRef.current = true
      onExplode(id, { x: target.x, z: target.z, radius, damage })
      return
    }
  })

  return (
    <group ref={groupRef} position={start}>
      <FlaskModel />
    </group>
  )
}

function FlaskExplosion({ id, x, z, radius, onDone }) {
  const meshRef = useRef(null)
  const ageRef = useRef(0)

  usePlayingFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.36)
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.2 + radius * 2 * t)
      meshRef.current.material.opacity = 0.38 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, z]} renderOrder={4}>
      <circleGeometry args={[0.5, 48]} />
      <meshBasicMaterial color={0x6dff7a} transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function ScienceFlaskSplash() {
  const [flasks, setFlasks] = useState([])
  const [explosions, setExplosions] = useState([])
  const activeFlasksRef = useRef([])
  const lastFireRef = useRef(0)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const explode = useCallback((id, blast) => {
    activeFlasksRef.current = activeFlasksRef.current.filter((item) => item.id !== id)
    setFlasks([...activeFlasksRef.current])

    applyRadialDamage({
      x: blast.x, z: blast.z, radius: blast.radius, damage: blast.damage,
      knockback: 2.8, knockbackMs: 100,
    })

    setExplosions((prev) => [...prev, { id, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.scienceFlask
    if (phase !== 'playing' || !w?.active) return
    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return
    if (activeFlasksRef.current.length > 0) return

    const target = findBestSplashTarget(w.range ?? 2, w.radius ?? 1.6)
    if (!target) return
    lastFireRef.current = now
    emitSfx({ id: 'flaskFire' })

    const next = {
      id: ++_flaskId,
      start: [playerPos.x, playerPos.y + 0.36, playerPos.z],
      target: { x: target.x, z: target.z },
      // 발사 게이트(167줄)와 동일한 폴백을 둬, radius가 undefined여도 폭발 거리 판정이
      // NaN(전 적 타격)이 되지 않게 한다.
      radius: w.radius ?? 1.6,
      damage: w.damage ?? 15,
    }
    activeFlasksRef.current = [next]
    setFlasks([next])
  })

  if (!weapons.scienceFlask?.active) return null

  return (
    <>
      {flasks.map((flask) => (
        <FlaskProjectile key={flask.id} {...flask} onExplode={explode} />
      ))}
      {explosions.map((explosion) => (
        <FlaskExplosion key={explosion.id} {...explosion} onDone={removeExplosion} />
      ))}
    </>
  )
}
