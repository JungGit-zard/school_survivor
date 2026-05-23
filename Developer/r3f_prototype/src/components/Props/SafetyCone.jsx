import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { toonMat, outlineMat, inflateScale } from '../../lib/toon.js'

// 안전 콘 — 주황 원뿔 + 흰 띠 + 검은 사각 베이스.
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function SafetyCone({ pos, rot = 0, scale = 1, collides = true }) {
  const coneMat  = useMemo(() => toonMat(0xe99039, 0.14), [])  // Vampire-16 주황
  const stripeMat = useMemo(() => toonMat(0xc9cb9f, 0.16), []) // 흰띠 (밝은 크림)
  const baseMat  = useMemo(() => toonMat(0x2d2738, 0.06), [])  // 검은 베이스
  const outMat   = useMemo(() => outlineMat(0.96), [])

  const inner = (
    <group scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 베이스 (사각) */}
      <mesh material={outMat} scale={inflateScale([1.08, 1.5, 1.08])} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
      </mesh>
      <mesh material={baseMat} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
      </mesh>
      {/* 콘 본체 외곽선 + 본체 */}
      <mesh material={outMat} scale={inflateScale([1.12, 1.04, 1.12])} position={[0, 0.32, 0]}>
        <coneGeometry args={[0.18, 0.5, 14]} />
      </mesh>
      <mesh material={coneMat} position={[0, 0.32, 0]}>
        <coneGeometry args={[0.18, 0.5, 14]} />
      </mesh>
      {/* 흰 띠 (콘 중간 부근, 짧은 cylinder) */}
      <mesh material={stripeMat} position={[0, 0.27, 0]}>
        <cylinderGeometry args={[0.135, 0.165, 0.06, 14]} />
      </mesh>
    </group>
  )

  if (!collides) {
    return <group position={pos}>{inner}</group>
  }
  return (
    <RigidBody type="fixed" position={pos} colliders="cuboid">
      <mesh visible={false}>
        <boxGeometry args={[0.5, 0.6, 0.5]} />
        <meshBasicMaterial />
      </mesh>
      {inner}
    </RigidBody>
  )
}
