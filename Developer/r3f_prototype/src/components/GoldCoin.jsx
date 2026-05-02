import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'

const COLLECT_RADIUS_SQ = 1.0 * 1.0
const R  = 0.09    // coin face radius
const TH = 0.018   // coin thickness
const FLOOR_Y = R  // coin center Y when resting (rim touches y=0)
const GRAVITY = 16

export default function GoldCoin({ id, pos, xp, onCollect }) {
  const groupRef  = useRef()
  const spinRef   = useRef()
  const collected = useRef(false)
  const phaseRef  = useRef('fly')   // 'fly' | 'spin'
  const bounced   = useRef(false)
  const spinAngle = useRef(0)
  const tumble    = useRef(0)

  // 시드 기반 초기 속도 (반복성 없이 방향 분산)
  const seed = pos[0] * 13.7 + pos[2] * 7.3
  const vRef = useRef({
    x: Math.sin(seed * 3.7) * 0.9,
    y: 2.0 + (Math.cos(seed * 2.1) + 1) * 0.55,
    z: Math.cos(seed * 5.3) * 0.9,
  })
  const pRef = useRef({ x: pos[0], y: pos[1], z: pos[2] })

  const gainXp = useGameStore((s) => s.gainXp)

  useFrame((_, delta) => {
    if (collected.current || !groupRef.current) return
    if (useGameStore.getState().phase !== 'playing') return

    const p = pRef.current
    const v = vRef.current

    if (phaseRef.current === 'fly') {
      v.y -= GRAVITY * delta
      p.x += v.x * delta
      p.y += v.y * delta
      p.z += v.z * delta
      tumble.current += delta * 11

      if (p.y <= FLOOR_Y) {
        p.y = FLOOR_Y
        if (!bounced.current) {
          // 1회 튕김
          v.y = Math.abs(v.y) * 0.32
          v.x *= 0.45
          v.z *= 0.45
          bounced.current = true
        } else {
          // 안착 → 회전 페이즈
          v.x = 0; v.y = 0; v.z = 0
          phaseRef.current = 'spin'
        }
      }

      groupRef.current.position.set(p.x, p.y, p.z)
      if (spinRef.current) spinRef.current.rotation.y = tumble.current
    } else {
      // 세워진 코인이 중심축(Y) 기준 회전
      spinAngle.current += delta * 5.0
      groupRef.current.position.set(p.x, FLOOR_Y, p.z)
      if (spinRef.current) spinRef.current.rotation.y = spinAngle.current
    }

    // 수집 판정
    const dx = playerPos.x - p.x
    const dz = playerPos.z - p.z
    if (dx * dx + dz * dz < COLLECT_RADIUS_SQ) {
      collected.current = true
      gainXp(xp)
      onCollect(id)
    }
  })

  return (
    <group ref={groupRef} position={[pos[0], pos[1], pos[2]]}>
      {/* Y축 기준 회전 그룹 */}
      <group ref={spinRef}>
        {/* 코인 본체: rotation.z = PI/2 로 세워짐 */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[R, R, TH, 20]} />
          <meshBasicMaterial color={0xFFD700} />
        </mesh>
        {/* 테두리 하이라이트 */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[R + 0.004, R + 0.004, TH * 0.5, 20]} />
          <meshBasicMaterial color={0xCC8800} transparent opacity={0.7} />
        </mesh>
        {/* 앞면 광택 */}
        <mesh position={[TH / 2 + 0.001, 0, 0]}>
          <circleGeometry args={[R * 0.55, 16]} />
          <meshBasicMaterial color={0xFFEE88} transparent opacity={0.55} />
        </mesh>
        {/* 뒷면 광택 */}
        <mesh position={[-(TH / 2 + 0.001), 0, 0]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[R * 0.55, 16]} />
          <meshBasicMaterial color={0xFFEE88} transparent opacity={0.55} />
        </mesh>
      </group>
    </group>
  )
}
