import { useMemo } from 'react'
import { toonMat, softOutlineMat, inflateScale } from '../../lib/toon.js'

// 찢어진 시험지 — 충돌 없음, 바닥에 살짝 띄움. 흰 종이 + 빨간 줄 + 작은 찢김 조각.
// atmosphere — collides prop을 무시한다.
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function ExamPaper({ pos, rot = 0, scale = 1 }) {
  const paperMat = useMemo(() => toonMat(0xf2eddc, 0.10), [])  // 크림색 종이
  const inkMat   = useMemo(() => toonMat(0x71353f, 0.12), [])  // 흐릿한 빨강 (낙서·문제번호)
  const outMat   = useMemo(() => softOutlineMat(), []) // 분위기 overlay 외곽선 프리셋

  return (
    <group position={pos} scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 본 종이 */}
      <mesh material={outMat} scale={inflateScale([1.04, 6, 1.04])}>
        <boxGeometry args={[0.6, 0.012, 0.6]} />
      </mesh>
      <mesh material={paperMat}>
        <boxGeometry args={[0.6, 0.012, 0.6]} />
      </mesh>
      {/* 빨간 줄 (문제 줄) 2개 */}
      <mesh material={inkMat} position={[0, 0.0065, 0.1]}>
        <boxGeometry args={[0.5, 0.001, 0.015]} />
      </mesh>
      <mesh material={inkMat} position={[0, 0.0065, -0.05]}>
        <boxGeometry args={[0.4, 0.001, 0.012]} />
      </mesh>
      {/* 찢긴 조각 — 본 plane 옆에 작은 회전 plane */}
      <group position={[0.4, 0, 0.05]} rotation={[0, 0.6, 0]}>
        <mesh material={outMat} scale={inflateScale([1.06, 6, 1.06])}>
          <boxGeometry args={[0.22, 0.012, 0.18]} />
        </mesh>
        <mesh material={paperMat}>
          <boxGeometry args={[0.22, 0.012, 0.18]} />
        </mesh>
      </group>
    </group>
  )
}
