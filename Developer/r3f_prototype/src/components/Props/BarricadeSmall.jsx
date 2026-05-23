import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { toonMat, outlineMat, inflateScale } from '../../lib/toon.js'

// 작은 바리케이드 — A자형 두 다리 + 가로대 (노란/검정 줄무늬).
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function BarricadeSmall({ pos, rot = 0, scale = 1, collides = true }) {
  const legMat    = useMemo(() => toonMat(0x9a826b, 0.06), [])  // 갈색 나무
  const stripeYMat = useMemo(() => toonMat(0xf4e27b, 0.18), []) // 노란 (Vampire-16)
  const stripeKMat = useMemo(() => toonMat(0x2d2738, 0.06), []) // 검정
  const outMat    = useMemo(() => outlineMat(0.96), [])

  const inner = (
    <group scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 왼쪽 다리 (A자 한쪽) */}
      <group position={[-0.8, 0.35, 0]} rotation={[0, 0, 0.25]}>
        <mesh material={outMat} scale={inflateScale([1.3, 1.04, 1.3])}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
        </mesh>
        <mesh material={legMat}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
        </mesh>
      </group>
      {/* 오른쪽 다리 (A자 반대쪽) */}
      <group position={[0.8, 0.35, 0]} rotation={[0, 0, -0.25]}>
        <mesh material={outMat} scale={inflateScale([1.3, 1.04, 1.3])}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
        </mesh>
        <mesh material={legMat}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
        </mesh>
      </group>
      {/* 가로대 본체 외곽선 + 본체 */}
      <mesh material={outMat} scale={inflateScale([1.03, 1.2, 1.2])} position={[0, 0.55, 0]}>
        <boxGeometry args={[1.7, 0.18, 0.1]} />
      </mesh>
      <mesh material={stripeYMat} position={[0, 0.55, 0]}>
        <boxGeometry args={[1.7, 0.18, 0.1]} />
      </mesh>
      {/* 검정 줄무늬 3개 (가로대 위에 작은 박스로 표현) */}
      {[-0.5, 0.0, 0.5].map((x, i) => (
        <mesh key={i} material={stripeKMat} position={[x, 0.55, 0.051]}>
          <boxGeometry args={[0.18, 0.18, 0.005]} />
        </mesh>
      ))}
    </group>
  )

  if (!collides) {
    return <group position={pos}>{inner}</group>
  }
  return (
    <RigidBody type="fixed" position={pos} colliders="cuboid">
      <mesh visible={false}>
        <boxGeometry args={[1.8, 0.8, 0.4]} />
        <meshBasicMaterial />
      </mesh>
      {inner}
    </RigidBody>
  )
}
