import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import { toonMat, outlineMat } from '../lib/toon.js'

const PULL_RADIUS_SQ    = 1.5 * 1.5   // 이 거리 안에 들면 자석처럼 끌려옴
const COLLECT_RADIUS_SQ = 0.22 * 0.22 // 이 거리 안에 들면 즉시 수집
const R       = 0.097  // coin face radius (2/3 of original)
const TH      = 0.020  // coin thickness  (2/3 of original)
const FLOOR_Y = R + 0.10
const GRAVITY = 20

// ── 반짝임 파티클 ──────────────────────────────────────────────────────────────
const SPARKLE_LIFE = 0.32   // seconds

function SparkleParticle({ startPos, angle, speed, birthTime }) {
  const ref    = useRef()
  const matRef = useRef()
  const outRef = useRef()
  const mat    = useMemo(() => {
    const m = toonMat(0xFFE040, 0.9)
    m.transparent = true
    m.depthWrite = false
    return m
  }, [])
  const outMat = useMemo(() => {
    const m = outlineMat(0.95)
    m.transparent = true
    m.depthWrite = false
    return m
  }, [])

  matRef.current = mat
  outRef.current = outMat

  useFrame(() => {
    if (!ref.current) return
    const age = (performance.now() - birthTime) / 1000
    if (age > SPARKLE_LIFE) { ref.current.visible = false; return }
    const t    = age / SPARKLE_LIFE
    const ease = 1 - t * t
    const dist = speed * age
    const sx   = startPos[0] + Math.cos(angle) * dist
    const sy   = startPos[1] + 0.12 + age * 1.4
    const sz   = startPos[2] + Math.sin(angle) * dist
    ref.current.position.set(sx, sy, sz)
    const sc = (1 - t * 0.5) * 0.072
    ref.current.scale.setScalar(sc)
    matRef.current.opacity  = ease
    outRef.current.opacity  = ease * 0.92
  })

  return (
    <group ref={ref} position={[startPos[0], startPos[1], startPos[2]]}>
      <mesh renderOrder={5} material={outMat} scale={[1.18, 1.18, 1.18]}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
      <mesh renderOrder={6} material={mat}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
    </group>
  )
}

// ── 코인 본체 ─────────────────────────────────────────────────────────────────
export default function GoldCoin({ id, pos, xp, onCollect }) {
  const groupRef  = useRef()
  const spinRef   = useRef()
  const collected = useRef(false)
  const phaseRef  = useRef('fly')
  const bounced   = useRef(false)
  const spinAngle = useRef(0)
  const tumble    = useRef(0)
  const springRef = useRef({ val: 0.0, vel: 0 })
  const birthTime = useRef(performance.now())

  const seed = pos[0] * 13.7 + pos[2] * 7.3
  const vRef = useRef({
    x: Math.sin(seed * 3.7) * 1.5,
    y: 3.8 + (Math.cos(seed * 2.1) + 1) * 1.0,
    z: Math.cos(seed * 5.3) * 1.5,
  })
  const pRef = useRef({ x: pos[0], y: pos[1] + 0.1, z: pos[2] })

  const gainXp = useGameStore((s) => s.gainXp)

  // 머테리얼 (컴포넌트당 1회 생성)
  const bodyMat = useMemo(() => toonMat(0xFFD700, 0.28), [])
  const rimMat  = useMemo(() => toonMat(0xAA7000, 0.14), [])
  const shineMat = useMemo(() => {
    const m = toonMat(0xFFF5B0, 0.55)
    m.transparent = true
    m.opacity = 0.78
    m.depthWrite = false
    return m
  }, [])
  const outMat = useMemo(() => outlineMat(0.97), [])

  // 반짝임 파티클 데이터 (6개, 균등 분산)
  const sparkles = useMemo(() => {
    const baseAngle = seed * 0.7
    return Array.from({ length: 6 }, (_, i) => ({
      angle: baseAngle + (i / 6) * Math.PI * 2,
      speed: 1.6 + ((i * 0.37) % 0.8),
    }))
  }, [seed])

  useFrame((_, delta) => {
    if (collected.current || !groupRef.current) return
    if (useGameStore.getState().phase !== 'playing') return

    const p = pRef.current
    const v = vRef.current

    // 스프링 팝 스케일 (0 → 1, 자연스러운 오버슈트)
    const sp = springRef.current
    sp.vel += (1.0 - sp.val) * 340 * delta - sp.vel * 22 * delta
    sp.val = Math.max(0, sp.val + sp.vel * delta)
    groupRef.current.scale.setScalar(Math.max(0, sp.val))

    if (phaseRef.current === 'fly') {
      v.y -= GRAVITY * delta
      p.x += v.x * delta
      p.y += v.y * delta
      p.z += v.z * delta
      tumble.current += delta * 16

      if (p.y <= FLOOR_Y) {
        p.y = FLOOR_Y
        if (!bounced.current) {
          v.y = Math.abs(v.y) * 0.36
          v.x *= 0.40
          v.z *= 0.40
          bounced.current = true
        } else {
          v.x = 0; v.y = 0; v.z = 0
          phaseRef.current = 'spin'
        }
      }

      groupRef.current.position.set(p.x, p.y, p.z)
      if (spinRef.current) spinRef.current.rotation.y = tumble.current
    } else {
      spinAngle.current += delta * 4.8
      groupRef.current.position.set(p.x, FLOOR_Y, p.z)
      if (spinRef.current) spinRef.current.rotation.y = spinAngle.current
    }

    // 자석 흡입 & 수집 판정
    const dx     = playerPos.x - p.x
    const dz     = playerPos.z - p.z
    const distSq = dx * dx + dz * dz

    if (distSq < COLLECT_RADIUS_SQ) {
      collected.current = true
      gainXp(xp)
      onCollect(id)
      return
    }

    if (distSq < PULL_RADIUS_SQ) {
      const dist = Math.sqrt(distSq)
      // 가까울수록 빠르게 — 최소 3, 최대 18
      const pullSpeed = 3.0 + (1 - dist / 1.5) * 15.0
      p.x += (dx / dist) * pullSpeed * delta
      p.z += (dz / dist) * pullSpeed * delta
      // 비행 중이면 착지시킴
      if (phaseRef.current === 'fly') {
        p.y = FLOOR_Y
        vRef.current.x = 0; vRef.current.y = 0; vRef.current.z = 0
        phaseRef.current = 'spin'
      }
      groupRef.current.position.set(p.x, FLOOR_Y, p.z)
    }
  })

  return (
    <group>
      {/* 스폰 반짝임 파티클 */}
      {sparkles.map((s, i) => (
        <SparkleParticle
          key={i}
          startPos={pos}
          angle={s.angle}
          speed={s.speed}
          birthTime={birthTime.current}
        />
      ))}

      {/* 코인 (이동 그룹) */}
      <group ref={groupRef} position={[pos[0], pos[1], pos[2]]}>
        {/* Y축 회전 그룹 */}
        <group ref={spinRef}>
          {/* 외곽선 (BackSide — 카툰 윤곽선) */}
          <mesh renderOrder={1} material={outMat} rotation={[0, 0, Math.PI / 2]} scale={[1.16, 1.22, 1.16]}>
            <cylinderGeometry args={[R, R, TH, 22]} />
          </mesh>

          {/* 코인 본체 */}
          <mesh renderOrder={2} material={bodyMat} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[R, R, TH, 22]} />
          </mesh>

          {/* 테두리 링 (짙은 금색) */}
          <mesh renderOrder={2} material={rimMat} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[R + 0.006, R + 0.014, TH * 0.55, 22]} />
          </mesh>

          {/* 앞면 광택 */}
          <mesh renderOrder={3} material={shineMat} position={[TH / 2 + 0.002, 0, 0]}>
            <circleGeometry args={[R * 0.50, 18]} />
          </mesh>

          {/* 뒷면 광택 */}
          <mesh renderOrder={3} material={shineMat} position={[-(TH / 2 + 0.002), 0, 0]} rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[R * 0.50, 18]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
