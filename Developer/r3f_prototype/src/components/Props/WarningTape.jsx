import { useMemo } from 'react'
import { toonMat, softOutlineMat, inflateScale } from '../../lib/toon.js'

// 감염 경고 테이프 — 충돌 없음, 바닥에 살짝 띄운 노랑/검정 줄무늬 띠.
// PROP_KINDS.warning_tape.collidesDefault === false 이므로 항상 RigidBody 없이 렌더.
// 분배기가 넘기는 collides prop은 무시 (atmosphere처럼 처리).
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function WarningTape({ pos, rot = 0, scale = 1 }) {
  const baseMat  = useMemo(() => toonMat(0xf4e27b, 0.20), [])  // 노란 (Vampire-16)
  const stripeMat = useMemo(() => toonMat(0x2d2738, 0.06), []) // 검정 줄무늬
  const outMat   = useMemo(() => softOutlineMat(), []) // 부드러운 외곽선 (장식급, 분위기 프리셋 재활용)

  return (
    <group position={pos} scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 테이프 본체 + 외곽선 */}
      <mesh material={outMat} scale={inflateScale([1.02, 3.5, 1.1])} position={[0, 0.04, 0]}>
        <boxGeometry args={[2.0, 0.04, 0.15]} />
      </mesh>
      <mesh material={baseMat} position={[0, 0.04, 0]}>
        <boxGeometry args={[2.0, 0.04, 0.15]} />
      </mesh>
      {/* 검정 사선 줄무늬 5개 */}
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
        <mesh key={i} material={stripeMat} position={[x, 0.061, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.12, 0.005, 0.18]} />
        </mesh>
      ))}
    </group>
  )
}
