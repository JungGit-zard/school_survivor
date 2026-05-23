import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { toonMat, outlineMat, inflateScale } from '../../lib/toon.js'

// 쓰러진 책상 — 마루 갈색 상판 + 회청 금속 다리, 옆으로 살짝 기울어진 자세.
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function FallenDesk({ pos, rot = 0, scale = 1, collides = true }) {
  const topMat  = useMemo(() => toonMat(0x805947, 0.08), [])
  const legMat  = useMemo(() => toonMat(0x5c6174, 0.06), [])
  const outMat  = useMemo(() => outlineMat(0.96), [])

  const inner = (
    <group scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 상판: 옆으로 쓰러진 형태 → z축 90도 살짝 회전으로 기울임 */}
      <group rotation={[0, 0, Math.PI / 2.3]}>
        <mesh material={outMat} scale={inflateScale([1.05, 1.18, 1.06])} position={[0, 0.45, 0]}>
          <boxGeometry args={[1.4, 0.08, 0.7]} />
        </mesh>
        <mesh material={topMat} position={[0, 0.45, 0]}>
          <boxGeometry args={[1.4, 0.08, 0.7]} />
        </mesh>
        {/* 다리 4개 */}
        {[[0.6, 0.1, 0.3], [-0.6, 0.1, 0.3], [0.6, 0.1, -0.3], [-0.6, 0.1, -0.3]].map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh material={outMat} scale={inflateScale([1.3, 1.05, 1.3])}>
              <boxGeometry args={[0.06, 0.6, 0.06]} />
            </mesh>
            <mesh material={legMat}>
              <boxGeometry args={[0.06, 0.6, 0.06]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )

  if (!collides) {
    return <group position={pos}>{inner}</group>
  }
  return (
    <RigidBody type="fixed" position={pos} colliders="cuboid">
      {/* 충돌 footprint — PROP_KINDS.fallen_desk: w 1.6 × d 1.0 */}
      <mesh visible={false}>
        <boxGeometry args={[1.6, 0.4, 1.0]} />
        <meshBasicMaterial />
      </mesh>
      {inner}
    </RigidBody>
  )
}
