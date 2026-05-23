import { useMemo } from 'react'
import { toonMat, softOutlineMat, inflateScale } from '../../lib/toon.js'

// 환경 오염 웅덩이 (정적 분위기) — 충돌 없음.
// 색: 채움 0x41745a 어두운 채도 + 테두리 0x95bf91 밝은 외곽 (color_palette_guide §2-4).
// 보스 동적 장판은 더 선명한 위험 톤·동적 spawn으로 명확히 구분 (R10).
// 외곽선은 부드러운 색·낮은 opacity로 props보다 시각 위계 약함 (R9).
// atmosphere — collides prop을 무시한다.
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function PollutionPuddleStatic({ pos, rot = 0, scale = 1 }) {
  const fillMat = useMemo(() => toonMat(0x41745a, 0.10), [])  // 어두운 채도 녹
  const rimMat  = useMemo(() => toonMat(0x95bf91, 0.16), [])  // 밝은 외곽
  const outMat  = useMemo(() => softOutlineMat(), [])

  return (
    <group position={pos} scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 본체 외곽선 + 채움 (납작 cylinder) */}
      <mesh material={outMat} scale={inflateScale([1.04, 2.5, 1.04])} position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.012, 18]} />
      </mesh>
      <mesh material={fillMat} position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.012, 18]} />
      </mesh>
      {/* 밝은 외곽 ring — fill보다 살짝 위 + 살짝 더 큼.
          rotation은 mesh에 (geometry에 붙으면 silently ignored — XY 평면 ring이 세로로 섬). */}
      <mesh material={rimMat} position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.68, 0.74, 22]} />
      </mesh>
      {/* 작은 얼룩 2개 — 본체 옆에 살짝 떨어진 spot */}
      <mesh material={fillMat} position={[0.55, 0.006, 0.5]}>
        <cylinderGeometry args={[0.18, 0.18, 0.01, 12]} />
      </mesh>
      <mesh material={fillMat} position={[-0.6, 0.006, -0.4]}>
        <cylinderGeometry args={[0.14, 0.14, 0.01, 12]} />
      </mesh>
    </group>
  )
}
