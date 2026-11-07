import { useMemo } from 'react'
import { outlineMat, toonMat } from '../lib/toon.js'
import StudioTunedGroup from './StudioTunedGroup.jsx'

export default function EnemyProjectileVisual() {
  const projMat = useMemo(() => toonMat(0x34d6b8, 0.45), [])
  // 게임 정본(PooledEnemyProjectileLayer kind 0)과 동일: 불투명 외곽선, 반경 대비 정확히 1.22배.
  const projOut = useMemo(() => outlineMat(1), [])

  return (
    <StudioTunedGroup itemId="enemy-projectile-e04">
      <mesh renderOrder={1} material={projOut} scale={[1.22, 1.22, 1.22]}>
        <sphereGeometry args={[0.09, 8, 8]} />
      </mesh>
      <mesh renderOrder={2} material={projMat}>
        <sphereGeometry args={[0.09, 8, 8]} />
      </mesh>
    </StudioTunedGroup>
  )
}
