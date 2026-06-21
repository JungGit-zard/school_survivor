import { useCallback, useMemo, useRef, useState } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import * as THREE from 'three'
import { playerArmActionState, playerPos } from '../../lib/refs.js'
import { startPlayerArmAction } from '../../lib/playerArmAction.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { findSharkMissileClusterTarget } from '../../lib/sharkMissileTargeting.js'
import { canFireSharkMissile, createSharkMissileLaunch } from '../../lib/sharkMissileRuntime.js'

let _sharkMissileId = 0

function reportSharkMissileDebug(type, payload = {}) {
  if (typeof window === 'undefined') return
  if (!Array.isArray(window.__sharkMissileDebug)) return
  window.__sharkMissileDebug.push({ type, payload })
}

function SharkPart({ args, position, rotation, material, outlineScale = [1.08, 1.08, 1.08] }) {
  const outMat = useMemo(() => outlineMat(0.96), [])
  return (
    <group position={position} rotation={rotation}>
      <mesh material={outMat} scale={inflateScale(outlineScale)}>
        <boxGeometry args={args} />
      </mesh>
      <mesh material={material}>
        <boxGeometry args={args} />
      </mesh>
    </group>
  )
}

function SharkMissileModel() {
  const bodyMat = useMemo(() => toonMat(0x28486f, 0.18), [])
  const topMat = useMemo(() => toonMat(0x4f78aa, 0.2), [])
  const bellyMat = useMemo(() => toonMat(0xf0dfbd, 0.06), [])
  const finMat = useMemo(() => toonMat(0x20385a, 0.16), [])
  const engineMat = useMemo(() => toonMat(0x242424, 0.18), [])
  const stripeMat = useMemo(() => toonMat(0xf4c524, 0.35), [])
  const toothMat = useMemo(() => toonMat(0xfff4db, 0.05), [])
  const eyeMat = useMemo(() => toonMat(0xfff7e8, 0.08), [])
  const pupilMat = useMemo(() => toonMat(0x151515, 0.0), [])
  const outMat = useMemo(() => outlineMat(0.96), [])

  return (
    <group scale={[0.62, 0.62, 0.62]}>
      <SharkPart args={[0.44, 0.28, 0.9]} position={[0, 0, 0.02]} material={bodyMat} />
      <SharkPart args={[0.46, 0.12, 0.54]} position={[0, 0.09, 0.08]} material={topMat} outlineScale={[1.05, 1.12, 1.06]} />
      <SharkPart args={[0.46, 0.13, 0.44]} position={[0, -0.12, 0.18]} material={bellyMat} outlineScale={[1.05, 1.1, 1.06]} />

      <mesh material={outMat} scale={inflateScale([1.1, 1.1, 1.1])} position={[0, 0.01, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.23, 0.28, 4]} />
      </mesh>
      <mesh material={bodyMat} position={[0, 0.01, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.23, 0.28, 4]} />
      </mesh>

      <SharkPart args={[0.12, 0.42, 0.24]} position={[0, 0.29, -0.02]} rotation={[0.05, 0, Math.PI / 4]} material={finMat} outlineScale={[1.12, 1.08, 1.1]} />
      <SharkPart args={[0.13, 0.3, 0.28]} position={[-0.3, -0.05, -0.04]} rotation={[0.25, 0.12, -0.65]} material={finMat} outlineScale={[1.1, 1.08, 1.1]} />
      <SharkPart args={[0.13, 0.3, 0.28]} position={[0.3, -0.05, -0.04]} rotation={[0.25, -0.12, 0.65]} material={finMat} outlineScale={[1.1, 1.08, 1.1]} />

      <SharkPart args={[0.54, 0.3, 0.18]} position={[0, 0, -0.52]} material={engineMat} />
      <SharkPart args={[0.58, 0.08, 0.19]} position={[0, 0.08, -0.44]} rotation={[0, 0, -0.55]} material={stripeMat} outlineScale={[1.03, 1.05, 1.04]} />
      <SharkPart args={[0.58, 0.08, 0.19]} position={[0, -0.08, -0.44]} rotation={[0, 0, 0.55]} material={stripeMat} outlineScale={[1.03, 1.05, 1.04]} />

      <mesh material={outMat} scale={inflateScale([1.08, 1.08, 1.08])} position={[0, 0, -0.76]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.23, 0.42, 4]} />
      </mesh>
      <mesh material={engineMat} position={[0, 0, -0.76]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.23, 0.42, 4]} />
      </mesh>

      {[-0.16, 0, 0.16].map((x) => (
        <mesh key={x} material={toothMat} position={[x, -0.13, 0.55]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.045, 0.16, 3]} />
        </mesh>
      ))}

      <mesh material={eyeMat} position={[-0.16, 0.05, 0.5]} rotation={[0, 0.25, 0]}>
        <boxGeometry args={[0.12, 0.08, 0.025]} />
      </mesh>
      <mesh material={pupilMat} position={[-0.19, 0.05, 0.515]} rotation={[0, 0.25, 0]}>
        <boxGeometry args={[0.05, 0.035, 0.02]} />
      </mesh>
    </group>
  )
}

function FlameTrail({ flameRef }) {
  const flameMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff7b1c,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }), [])
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  }), [])

  return (
    <group ref={flameRef} position={[0, 0, -0.9]}>
      <mesh material={flameMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
        <coneGeometry args={[0.14, 0.5, 4]} />
      </mesh>
      <mesh material={coreMat} rotation={[-Math.PI / 2, 0, 0]} scale={[0.55, 0.7, 0.55]} renderOrder={5}>
        <coneGeometry args={[0.12, 0.45, 4]} />
      </mesh>
    </group>
  )
}

function SharkMissileProjectile({ id, start, initialTarget, damage, radius, range, speed, retargetIntervalMs, onExplode }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const targetRef = useRef(initialTarget)
  const retargetAtRef = useRef(0)
  const posRef = useRef({ x: start[0], y: start[1], z: start[2] })
  const explodedRef = useRef(false)
  const flameRef = useRef(null)

  // 발사 시점에 목표 방향으로 yaw 초기화 — useRef(0)이면 항상 +Z(정면)로 날아간 뒤 뒤늦게 꺾임
  const initDx = initialTarget.x - start[0]
  const initDz = initialTarget.z - start[2]
  const initDist = Math.hypot(initDx, initDz)
  const yawRef = useRef(initDist > 0.001 ? Math.atan2(initDx / initDist, initDz / initDist) : 0)

  usePlayingFrame((_, delta) => {
    if (!groupRef.current || explodedRef.current) return
    ageRef.current += delta
    const nowMs = ageRef.current * 1000

    if (nowMs >= retargetAtRef.current) {
      const nextTarget = findSharkMissileClusterTarget({ range, radius })
      if (nextTarget) targetRef.current = { x: nextTarget.x, z: nextTarget.z }
      retargetAtRef.current = nowMs + retargetIntervalMs
    }

    const target = targetRef.current
    const p = posRef.current
    const dx = target.x - p.x
    const dz = target.z - p.z
    const dist = Math.hypot(dx, dz)

    if (ageRef.current > 8 || dist < 1.2) {
      explodedRef.current = true
      onExplode(id, { x: p.x, z: p.z, damage, radius })
      return
    }

    const nx = dist > 0.001 ? dx / dist : Math.sin(yawRef.current)
    const nz = dist > 0.001 ? dz / dist : Math.cos(yawRef.current)
    const desiredYaw = Math.atan2(nx, nz)
    // THREE.MathUtils.lerp은 ±π 경계에서 긴 쪽으로 돌아가는 wrap 버그가 있어 최단 각도 보간으로 교체
    const angleDiff = ((desiredYaw - yawRef.current + Math.PI) % (2 * Math.PI)) - Math.PI
    yawRef.current += angleDiff * Math.min(1, delta * 9)

    p.x += Math.sin(yawRef.current) * speed * delta
    p.z += Math.cos(yawRef.current) * speed * delta
    p.y = start[1] + Math.sin(ageRef.current * 10) * 0.04

    groupRef.current.position.set(p.x, p.y, p.z)
    groupRef.current.rotation.set(0.06 * Math.sin(ageRef.current * 8), yawRef.current, 0.16 * Math.sin(ageRef.current * 5))
    if (flameRef.current) {
      const pulse = 0.72 + Math.sin(ageRef.current * 32) * 0.16
      flameRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group ref={groupRef} position={start}>
      <SharkMissileModel />
      <FlameTrail flameRef={flameRef} />
    </group>
  )
}

function SharkExplosion({ id, x, z, radius, onDone }) {
  const discRef = useRef(null)
  const ringRef = useRef(null)
  const ageRef = useRef(0)

  usePlayingFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.55)
    if (discRef.current) {
      discRef.current.scale.setScalar(0.18 + radius * 2.4 * t)
      discRef.current.material.opacity = 0.48 * (1 - t)
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.2 + radius * 3.0 * t)
      ringRef.current.material.opacity = 0.34 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <>
      <mesh ref={discRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.075, z]} renderOrder={4}>
        <circleGeometry args={[0.5, 56]} />
        <meshBasicMaterial color={0x23c7ff} transparent opacity={0.48} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.095, z]} renderOrder={5}>
        <ringGeometry args={[0.28, 0.54, 56]} />
        <meshBasicMaterial color={0xff9b2c} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export function SharkMissileWeapon() {
  const [missiles, setMissiles] = useState([])
  const [explosions, setExplosions] = useState([])
  const activeMissilesRef = useRef([])
  const lastFireRef = useRef(null)
  const phase = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const explode = useCallback((id, blast) => {
    activeMissilesRef.current = activeMissilesRef.current.filter((item) => item.id !== id)
    setMissiles([...activeMissilesRef.current])
    reportSharkMissileDebug('explode', blast)

    applyRadialDamage({
      x: blast.x,
      z: blast.z,
      radius: blast.radius,
      damage: blast.damage,
      knockback: 3.6,
      knockbackMs: 150,
    })

    setExplosions((prev) => [...prev, { id, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.sharkMissile
    const now = clock.elapsedTime * 1000
    if (!canFireSharkMissile({
      phase,
      weapon: w,
      nowMs: now,
      lastFireMs: lastFireRef.current,
      activeMissileCount: activeMissilesRef.current.length,
    })) return

    const radius = w.radius ?? 1.8
    const range = w.range ?? 28
    const target = findSharkMissileClusterTarget({ range, radius })
    if (!target) {
      reportSharkMissileDebug('no-target', { range, radius })
      return
    }

    lastFireRef.current = now
    startPlayerArmAction(playerArmActionState, 'guidedMissileThrow', now)

    const next = createSharkMissileLaunch({
      id: ++_sharkMissileId,
      playerPosition: playerPos,
      target,
      weapon: w,
    })
    reportSharkMissileDebug('launch', next)
    activeMissilesRef.current = [next]
    setMissiles([next])
  })

  if (!weapons.sharkMissile?.active) return null

  return (
    <>
      {missiles.map((missile) => (
        <SharkMissileProjectile key={missile.id} {...missile} onExplode={explode} />
      ))}
      {explosions.map((explosion) => (
        <SharkExplosion key={explosion.id} {...explosion} onDone={removeExplosion} />
      ))}
    </>
  )
}
