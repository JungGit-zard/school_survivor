import { useCallback, useMemo, useRef, useState } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import * as THREE from 'three'
import { playerArmActionState, playerPos, screenBounds } from '../../lib/refs.js'
import { startPlayerArmAction } from '../../lib/playerArmAction.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat, inflateScale } from '../../lib/toon.js'
import { applyRadialDamage } from '../../lib/weaponTargeting.js'
import { findSharkMissileClusterTarget } from '../../lib/sharkMissileTargeting.js'
import { SHARK_DART, canFireSharkMissile, createSharkMissileLaunch, isSharkHomingPhase, pickSharkWanderPoint, shortestAngleDelta } from '../../lib/sharkMissileRuntime.js'
import StudioTunedGroup from '../StudioTunedGroup.jsx'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
function clampToScreen(x, z, margin = 0) {
  return {
    x: clamp(x, screenBounds.minX + margin, screenBounds.maxX - margin),
    z: clamp(z, screenBounds.minZ + margin, screenBounds.maxZ - margin),
  }
}

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

export function SharkMissileModel() {
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
    <StudioTunedGroup itemId="weapon-shark-missile">
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
    </StudioTunedGroup>
  )
}

export function FlameTrail({ flameRef }) {
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

// dart 비행 2단계 (파라미터 정본: sharkMissileRuntime.js SHARK_DART)
// ① 방랑(0~1.05s): 화면 안 랜덤 웨이포인트를 오가는 "어디로 갈지 모르는" 지그재그
// ② 귀소(1.05~1.5s): 밀집지역으로 급선회 → 도착 즉시 or 1.5s에 폭발
// 이전 방식(밀집점만 220ms 재조준)은 표적이 고정점이라 도착 후 제자리 궤도
// 선회(≈3바퀴)로 보이는 문제가 있었다.

function SharkMissileProjectile({ id, start, initialTarget, damage, radius, range, onExplode }) {
  const groupRef = useRef(null)
  const ageRef = useRef(0)
  const targetRef = useRef(initialTarget)
  const retargetAtRef = useRef(0)
  const posRef = useRef({ x: start[0], y: start[1], z: start[2] })
  const explodedRef = useRef(false)
  const flameRef = useRef(null)

  const initDx = initialTarget.x - start[0]
  const initDz = initialTarget.z - start[2]
  const initDist = Math.hypot(initDx, initDz)
  const yawRef = useRef(initDist > 0.001 ? Math.atan2(initDx / initDist, initDz / initDist) : 0)

  usePlayingFrame((_, delta) => {
    if (!groupRef.current || explodedRef.current) return
    ageRef.current += delta
    const nowMs = ageRef.current * 1000
    const p = posRef.current
    const homing = isSharkHomingPhase(ageRef.current)

    const explode = () => {
      explodedRef.current = true
      onExplode(id, { x: p.x, z: p.z, damage, radius })
    }

    // 총 비행 시간 만료 → 현재 위치에서 폭발
    if (ageRef.current >= SHARK_DART.DURATION_SEC) { explode(); return }

    const target = targetRef.current
    let dx = target.x - p.x
    let dz = target.z - p.z
    let dist = Math.hypot(dx, dz)

    if (homing) {
      // 귀소: 밀집점 추적, 도착 즉시 폭발 (제자리 궤도 선회 방지)
      if (nowMs >= retargetAtRef.current) {
        const next = findSharkMissileClusterTarget({ range, radius })
        if (next) targetRef.current = clampToScreen(next.x, next.z)
        retargetAtRef.current = nowMs + 150
      }
      if (dist < SHARK_DART.HOMING_HIT_DIST) { explode(); return }
    } else if (nowMs >= retargetAtRef.current || dist < SHARK_DART.WANDER_ARRIVE_DIST) {
      // 방랑: 주기 만료 또는 웨이포인트 도착 → 화면 안 새 랜덤 지점
      targetRef.current = pickSharkWanderPoint(screenBounds)
      retargetAtRef.current = nowMs + SHARK_DART.WANDER_RETARGET_MS
      dx = targetRef.current.x - p.x
      dz = targetRef.current.z - p.z
      dist = Math.hypot(dx, dz)
    }

    if (dist > 0.1) {
      const desiredYaw = Math.atan2(dx / dist, dz / dist)
      const turnRate = homing ? SHARK_DART.TURN_RATE_HOMING : SHARK_DART.TURN_RATE_WANDER
      yawRef.current += shortestAngleDelta(yawRef.current, desiredYaw) * Math.min(1, delta * turnRate)
    }

    const prevX = p.x
    const prevZ = p.z
    p.x += Math.sin(yawRef.current) * SHARK_DART.SPEED * delta
    p.z += Math.cos(yawRef.current) * SHARK_DART.SPEED * delta
    // 화면 밖 이탈 방지 — 클램프 후 yaw도 보정해 벽면 허깅 방지
    const sc = clampToScreen(p.x, p.z)
    if (sc.x !== p.x || sc.z !== p.z) {
      const cdx = sc.x - prevX
      const cdz = sc.z - prevZ
      if (Math.hypot(cdx, cdz) > 0.001) yawRef.current = Math.atan2(cdx, cdz)
    }
    p.x = sc.x
    p.z = sc.z
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
  const lastFireRef = useRef(0)
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
      deathStyleOverride: 'shatter5',
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
    const rawTarget = findSharkMissileClusterTarget({ range, radius })
    if (!rawTarget) {
      reportSharkMissileDebug('no-target', { range, radius })
      return
    }

    const target = clampToScreen(rawTarget.x, rawTarget.z)

    lastFireRef.current = now
    emitSfx({ id: 'sharkFire' })
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
