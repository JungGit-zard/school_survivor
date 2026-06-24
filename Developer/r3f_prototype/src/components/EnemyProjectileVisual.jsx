import { useMemo } from 'react'
import { inflateScale, outlineMat, toonMat } from '../lib/toon.js'

export default function EnemyProjectileVisual() {
  const projMat = useMemo(() => toonMat(0x34d6b8, 0.45), [])
  const projOut = useMemo(() => outlineMat(0.97), [])

  return (
    <>
      <mesh renderOrder={1} material={projOut} scale={inflateScale([1.22, 1.22, 1.22])}>
        <sphereGeometry args={[0.09, 8, 8]} />
      </mesh>
      <mesh renderOrder={2} material={projMat}>
        <sphereGeometry args={[0.09, 8, 8]} />
      </mesh>
    </>
  )
}
