import { useRef, useState, useCallback, useMemo } from 'react'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import * as THREE from 'three'
import { playerArmActionState, playerPos } from '../../lib/refs.js'
import { startPlayerArmAction } from '../../lib/playerArmAction.js'
import { useGameStore } from '../../store/useGameStore.js'
import { outlineMat, toonMat } from '../../lib/toon.js'
import { findBestSplashTarget, applyRadialDamage } from '../../lib/weaponTargeting.js'

// guidedMissile / 보조배터리 미사일 — legacy 2단계(충전 → 비행) 연출 부활본.
// 던지면 0.95s 동안 흔들리며 추진력 축적, 그 뒤 가속 비행해 target 좌표에 폭발.

let _missileId = 0

function MissileBody() {
  const bodyMat  = useMemo(() => toonMat(0xff3d85, 0.22), [])   // 선명한 핑크
  const labelMat = useMemo(() => toonMat(0xff80b8, 0.28), [])   // 밝은 핑크 밴드
  const noseMat  = useMemo(() => toonMat(0xffaad0, 0.14), [])   // 연핑크 코
  const outMat   = useMemo(() => outlineMat(0.97), [])

  return (
    <group rotation={[Math.PI / 2, 0, 0]} scale={[0.54, 0.54, 0.54]}>
      <mesh renderOrder={1} material={outMat} scale={[1.14, 1.08, 1.14]}>
        <cylinderGeometry args={[0.13, 0.15, 0.64, 8]} />
      </mesh>
      <mesh renderOrder={2} material={bodyMat}>
        <cylinderGeometry args={[0.13, 0.15, 0.64, 8]} />
      </mesh>
      <mesh renderOrder={2} material={labelMat}>
        <cylinderGeometry args={[0.135, 0.155, 0.22, 8]} />
      </mesh>
      <mesh renderOrder={2} material={noseMat} position={[0, 0.42, 0]}>
        <coneGeometry args={[0.13, 0.18, 8]} />
      </mesh>
    </group>
  )
}

const MISSILE_CONTROL_TIME = 0.95

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function smoothStep(t) {
  return t * t * (3 - 2 * t)
}

function lerpAngle(a, b, t) {
  let diff = b - a
  while (diff >  Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

function MissileProjectile({ id, start, target, damage, radius, onExplode }) {
  const groupRef    = useRef()
  const flameRef    = useRef()
  const smokeRef    = useRef()
  const ageRef      = useRef(0)
  const speedRef    = useRef(0)
  const explodedRef = useRef(false)
  const posRef      = useRef({ x: start[0], y: start[1], z: start[2] })
  const wobbleSeed  = useRef(Math.random() * 100)
  const throwRef    = useRef({
    angle: Math.random() * Math.PI * 2,
    yawOffset: (Math.random() - 0.5) * Math.PI * 0.85,
    pitch: (Math.random() - 0.5) * 1.3,
    roll: (Math.random() > 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.8),
    hop: 0.12 + Math.random() * 0.12,
  })

  // 첫 프레임 깜빡임 방지: opacity 0으로 초기화
  const flameMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff6eb8, transparent: true, opacity: 0, depthWrite: false,
  }), [])
  const flameCoreMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffd6f0, transparent: true, opacity: 0, depthWrite: false,
  }), [])
  const smokeMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xdddddd, transparent: true, opacity: 0, depthWrite: false,
  }), [])

  usePlayingFrame((_, delta) => {
    if (explodedRef.current || !groupRef.current) return
    ageRef.current += delta

    if (ageRef.current > 9.0) {
      explodedRef.current = true
      onExplode(id, { x: posRef.current.x, z: posRef.current.z, radius, damage })
      return
    }

    const p = posRef.current
    const dx = target.x - p.x
    const dz = target.z - p.z

    // ── 충전 단계: 던져진 뒤 흔들리며 추진력 축적 ────────────────────────
    if (ageRef.current < MISSILE_CONTROL_TIME) {
      const chargeT = ageRef.current / MISSILE_CONTROL_TIME
      const settleT = smoothStep(chargeT)

      // 스폰 팝인: 처음 0.12초 동안 0→1 스케일
      const spawnScale = easeOutCubic(Math.min(1, ageRef.current / 0.12))
      groupRef.current.scale.setScalar(spawnScale)

      // 목표 방향으로 미리 회전
      const dist0 = Math.hypot(dx, dz)
      const baseYaw = dist0 > 0.001 ? Math.atan2(dx / dist0, dz / dist0) : 0

      // 랜덤 흔들림 — 차징 끝으로 갈수록 수렴해서 안정됨
      const seed = wobbleSeed.current
      const throwData = throwRef.current
      const decay = 1 - chargeT * chargeT          // 1 → 0
      const freq  = 10 + Math.sin(seed) * 3
      const randomYaw = throwData.angle + throwData.yawOffset * decay + Math.sin(ageRef.current * freq + seed) * 0.32 * decay
      const controlYaw = lerpAngle(randomYaw, baseYaw, settleT)

      const hopY = Math.sin(chargeT * Math.PI) * throwData.hop
      const drift = 0.045 * (1 - settleT)
      const wobbleX = Math.sin(throwData.angle) * drift + Math.sin(ageRef.current * freq + seed) * 0.018 * decay
      const wobbleZ = Math.cos(throwData.angle) * drift + Math.cos(ageRef.current * freq * 0.7 + seed * 1.4) * 0.018 * decay
      const tiltX = throwData.pitch * decay + Math.sin(ageRef.current * freq * 0.9 + seed * 2.1) * 0.25 * decay
      const tiltZ = throwData.roll * decay + Math.cos(ageRef.current * freq * 1.1 + seed * 0.8) * 0.22 * decay

      groupRef.current.position.set(p.x + wobbleX, start[1] + hopY, p.z + wobbleZ)
      groupRef.current.rotation.set(tiltX, controlYaw, tiltZ)

      // 연기: 충전 초반엔 얇게, 끝으로 갈수록 뭉게뭉게
      if (smokeRef.current) {
        smokeMat.opacity = chargeT * (0.58 + Math.sin(ageRef.current * 12) * 0.10)
        smokeRef.current.scale.set(
          0.38 + chargeT * 1.4,
          1.0  + chargeT * 3.0,
          0.38 + chargeT * 1.4,
        )
      }
      // 화염: 충전이 쌓일수록 점점 밝아짐
      if (flameRef.current) {
        flameRef.current.scale.setScalar(0.06 + chargeT * 0.20)
        flameMat.opacity     = 0.06 + chargeT * 0.22
        flameCoreMat.opacity = 0.08 + chargeT * 0.25
      }
      speedRef.current = 0
      return
    }

    // ── 비행 단계: 충전 완료 후 가속 ──────────────────────────────────
    speedRef.current = Math.min(7.5, speedRef.current + 4.75 * delta)

    const dist = Math.hypot(dx, dz)
    if (dist < 0.28) {
      explodedRef.current = true
      onExplode(id, { x: target.x, z: target.z, radius, damage })
      return
    }

    const nx = dx / dist
    const nz = dz / dist
    p.x += nx * speedRef.current * delta
    p.z += nz * speedRef.current * delta

    groupRef.current.position.set(p.x, start[1], p.z)
    groupRef.current.rotation.set(0, Math.atan2(nx, nz), 0)

    const t = speedRef.current / 7.5
    const pulse = 0.82 + Math.sin(ageRef.current * 28) * 0.18

    if (flameRef.current) {
      flameRef.current.scale.setScalar(pulse * (0.18 + t * 0.60))
      flameMat.opacity     = 0.18 + t * 0.37
      flameCoreMat.opacity = 0.22 + t * 0.43
    }

    if (smokeRef.current) {
      const smokeT = 1 - t
      smokeMat.opacity = smokeT * (0.50 + Math.sin(ageRef.current * 9) * 0.08)
      smokeRef.current.scale.set(
        pulse * (0.55 + smokeT * 0.9),
        1 + smokeT * 2.2,
        pulse * (0.55 + smokeT * 0.9),
      )
    }
  })

  return (
    <group ref={groupRef} position={start}>
      <MissileBody />
      {/* 발사 직후 연기 구름 — 꼬리 뒤쪽 */}
      <mesh ref={smokeRef} renderOrder={3} material={smokeMat} position={[0, 0, -0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.09, 0.42, 8]} />
      </mesh>
      {/* 배기 화염 */}
      <group ref={flameRef} position={[0, 0, -0.36]}>
        <mesh renderOrder={4} material={flameMat} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.038, 0.20, 8]} />
        </mesh>
        <mesh renderOrder={5} material={flameCoreMat} rotation={[Math.PI / 2, 0, 0]} scale={[0.52, 0.58, 0.52]}>
          <coneGeometry args={[0.038, 0.20, 8]} />
        </mesh>
      </group>
    </group>
  )
}

// 폭발 연출 — 주황 disc + 노랑 ring 2단
function MissileExplosion({ id, x, z, radius, onDone }) {
  const meshRef = useRef(null)
  const ringRef = useRef(null)
  const ageRef  = useRef(0)

  usePlayingFrame((_, delta) => {
    ageRef.current += delta
    const t = Math.min(1, ageRef.current / 0.40)
    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.15 + radius * 2.2 * t)
      meshRef.current.material.opacity = 0.44 * (1 - t)
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.1 + radius * 2.8 * t)
      ringRef.current.material.opacity = 0.28 * (1 - t)
    }
    if (t >= 1) onDone(id)
  })

  return (
    <>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.07, z]} renderOrder={4}>
        <circleGeometry args={[0.5, 48]} />
        <meshBasicMaterial color={0xff9933} transparent opacity={0.44} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.09, z]} renderOrder={5}>
        <ringGeometry args={[0.3, 0.55, 48]} />
        <meshBasicMaterial color={0xffee88} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export function GuidedMissile() {
  const [missiles, setMissiles]     = useState([])
  const [explosions, setExplosions] = useState([])
  const activeMissilesRef           = useRef([])
  const lastFireRef                 = useRef(0)
  const phase   = useGameStore((s) => s.phase)
  const weapons = useGameStore((s) => s.weapons)

  const removeExplosion = useCallback((id) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const onExplode = useCallback((id, blast) => {
    activeMissilesRef.current = activeMissilesRef.current.filter((m) => m.id !== id)
    setMissiles([...activeMissilesRef.current])

    applyRadialDamage({
      x: blast.x, z: blast.z, radius: blast.radius, damage: blast.damage,
      knockback: 3.2, knockbackMs: 120,
    })

    setExplosions((prev) => [...prev, { id, x: blast.x, z: blast.z, radius: blast.radius }])
  }, [])

  usePlayingFrame(({ clock }) => {
    const w = weapons.guidedMissile
    if (phase !== 'playing' || !w?.active) return

    const now = clock.elapsedTime * 1000
    if (now - lastFireRef.current < w.cooldown) return

    const count = Math.max(1, Math.min(2, w.count ?? 1))
    if (activeMissilesRef.current.length >= count) return

    // 발사 시점의 좀비 밀도 최고 지점 탐색
    const target = findBestSplashTarget(w.range ?? 22, w.radius ?? 1.6)
    if (!target) return
    lastFireRef.current = now
    startPlayerArmAction(playerArmActionState, 'guidedMissileThrow', now)

    // 목표 방향 기준 수직으로 옆에 던지듯 스폰
    const facingAngle = Math.atan2(target.x - playerPos.x, target.z - playerPos.z)
    const newBatch = Array.from({ length: count }, (_, i) => {
      const side = count > 1 ? (i === 0 ? 1 : -1) : (Math.random() > 0.5 ? 1 : -1)
      const perpAngle = facingAngle + Math.PI / 2
      const throwDist = 0.45 + Math.random() * 0.15
      return {
        id: ++_missileId,
        start: [
          playerPos.x + Math.sin(perpAngle) * side * throwDist,
          playerPos.y + 0.36,
          playerPos.z + Math.cos(perpAngle) * side * throwDist,
        ],
        target: { x: target.x, z: target.z },
        damage: w.damage,
        radius: w.radius ?? 1.6,
      }
    })
    activeMissilesRef.current = [...activeMissilesRef.current, ...newBatch]
    setMissiles([...activeMissilesRef.current])
  })

  if (!weapons.guidedMissile?.active) return null

  return (
    <>
      {missiles.map((m) => (
        <MissileProjectile key={m.id} {...m} onExplode={onExplode} />
      ))}
      {explosions.map((e) => (
        <MissileExplosion key={e.id} {...e} onDone={removeExplosion} />
      ))}
    </>
  )
}
