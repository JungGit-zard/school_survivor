import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { toonMat, outlineMat, inflateScale } from '../../lib/toon.js'

// 오염된 사물함 — 직립 박스, 청회색 외장 + 어두운 녹색 오염 얼룩.
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function ContaminatedLocker({ pos, rot = 0, scale = 1, collides = true }) {
  const bodyMat   = useMemo(() => toonMat(0x6f779e, 0.06), [])  // Survival Horror 청보라
  const doorMat   = useMemo(() => toonMat(0x514a78, 0.06), [])  // 본체보다 살짝 어두움 (문 음영)
  const handleMat = useMemo(() => toonMat(0x2d2738, 0.20), [])  // 어두운 손잡이
  const stainMat  = useMemo(() => toonMat(0x41745a, 0.18), [])  // 어두운 녹 오염
  const outMat    = useMemo(() => outlineMat(0.96), [])

  const inner = (
    <group scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 본체 외곽선 + 본체 */}
      <mesh material={outMat} scale={inflateScale([1.03, 1.02, 1.06])} position={[0, 0.7, 0]}>
        <boxGeometry args={[0.9, 1.4, 0.4]} />
      </mesh>
      <mesh material={bodyMat} position={[0, 0.7, 0]}>
        <boxGeometry args={[0.9, 1.4, 0.4]} />
      </mesh>
      {/* 문짝 (앞면 살짝 튀어나옴) */}
      <mesh material={doorMat} position={[0, 0.7, 0.205]}>
        <boxGeometry args={[0.82, 1.32, 0.02]} />
      </mesh>
      {/* 손잡이 (작은 점) */}
      <mesh material={handleMat} position={[0.3, 0.7, 0.225]}>
        <boxGeometry args={[0.06, 0.18, 0.04]} />
      </mesh>
      {/* 오염 얼룩 2-3개 (앞면 위쪽) */}
      <mesh material={stainMat} position={[-0.15, 1.05, 0.22]}>
        <boxGeometry args={[0.32, 0.18, 0.005]} />
      </mesh>
      <mesh material={stainMat} position={[0.18, 0.45, 0.22]}>
        <boxGeometry args={[0.22, 0.14, 0.005]} />
      </mesh>
      <mesh material={stainMat} position={[-0.05, 0.2, 0.22]}>
        <boxGeometry args={[0.18, 0.1, 0.005]} />
      </mesh>
      {/* 환풍구 슬릿 (위쪽 짧은 가로 줄들) */}
      <mesh material={handleMat} position={[0, 1.32, 0.22]}>
        <boxGeometry args={[0.5, 0.02, 0.005]} />
      </mesh>
      <mesh material={handleMat} position={[0, 1.26, 0.22]}>
        <boxGeometry args={[0.5, 0.02, 0.005]} />
      </mesh>
      <mesh material={handleMat} position={[0, 1.20, 0.22]}>
        <boxGeometry args={[0.5, 0.02, 0.005]} />
      </mesh>
    </group>
  )

  if (!collides) {
    return <group position={pos}>{inner}</group>
  }
  return (
    <RigidBody type="fixed" position={pos} colliders="cuboid">
      <mesh visible={false}>
        <boxGeometry args={[1.0, 1.4, 0.5]} />
        <meshBasicMaterial />
      </mesh>
      {inner}
    </RigidBody>
  )
}
