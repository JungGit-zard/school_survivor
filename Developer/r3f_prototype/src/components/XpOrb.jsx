import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerPos } from '../lib/refs.js'
import { useGameStore } from '../store/useGameStore.js'
import StudioTunedGroup from './StudioTunedGroup.jsx'

const COLLECT_RADIUS = 1.0

export default function XpOrb({ id, pos, xp, onCollect }) {
  const groupRef = useRef()
  const collected = useRef(false)
  const gainXp = useGameStore((s) => s.gainXp)

  // STUDIO_OUTER_MOTION_ONLY — 이 useFrame은 StudioTunedGroup의 바깥 그룹만 움직인다.
  // 스튜디오 파츠는 건드리지 않으므로 튜닝을 덮어쓰지 않고 부모 변형으로 곱해질 뿐이다.
  useFrame(({ clock }) => {
    if (collected.current || !groupRef.current) return
    if (useGameStore.getState().phase !== 'playing') return

    groupRef.current.position.y = pos[1] + 0.12 + Math.sin(clock.elapsedTime * 4 + id * 0.7) * 0.06

    const dx = playerPos.x - pos[0]
    const dz = playerPos.z - pos[2]
    if (Math.sqrt(dx * dx + dz * dz) < COLLECT_RADIUS) {
      collected.current = true
      gainXp(xp)
      onCollect(id)
    }
  })

  return (
    <group ref={groupRef} position={[pos[0], pos[1] + 0.12, pos[2]]}>
      <StudioTunedGroup itemId="pickup-xp-orb">
        <mesh>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={0x81b071} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshBasicMaterial color={0xaad688} transparent opacity={0.25} />
        </mesh>
      </StudioTunedGroup>
    </group>
  )
}
