import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'

const COLLECT_RADIUS = 1.0

export default function XpOrb({ id, pos, xp, onCollect }) {
  const meshRef   = useRef()
  const collected = useRef(false)
  const gainXp    = useGameStore((s) => s.gainXp)

  useFrame(({ clock }) => {
    if (collected.current || !meshRef.current) return
    if (useGameStore.getState().phase !== 'playing') return

    // 위아래 둥실 애니메이션
    meshRef.current.position.y = pos[1] + 0.12 + Math.sin(clock.elapsedTime * 4 + id * 0.7) * 0.06

    // 플레이어 접근 판정 (XZ 2D 거리)
    const dx = playerPos.x - pos[0]
    const dz = playerPos.z - pos[2]
    if (Math.sqrt(dx * dx + dz * dz) < COLLECT_RADIUS) {
      collected.current = true
      gainXp(xp)
      onCollect(id)
    }
  })

  return (
    <group>
      {/* 오브 본체 */}
      <mesh ref={meshRef} position={[pos[0], pos[1] + 0.12, pos[2]]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color={0x81b071} />
      </mesh>
      {/* 글로우 외곽 */}
      <mesh position={[pos[0], pos[1] + 0.12, pos[2]]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial color={0xaad688} transparent opacity={0.25} />
      </mesh>
    </group>
  )
}
