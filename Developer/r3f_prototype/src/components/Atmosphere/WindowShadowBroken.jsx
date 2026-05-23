import { useMemo } from 'react'
import * as THREE from 'three'
import { softOutlineMat, inflateScale } from '../../lib/toon.js'

// 깨진 창문 그림자 — 충돌 없음. 어두운 반투명 plane + 깨진 조각 모양 음영.
// 부드러운 외곽선 + 낮은 alpha로 props보다 시각 위계 약함 (R9).
// atmosphere — collides prop을 무시한다.
/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function WindowShadowBroken({ pos, rot = 0, scale = 1 }) {
  // 그림자 색: Survival Horror 어두운 회청 계열 (0x2d2738), 반투명.
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x2d2738,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  }), [])
  const crackMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x1a1424,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }), [])
  const outMat   = useMemo(() => softOutlineMat(), [])

  return (
    <group position={pos} scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      {/* 본 창문 그림자 — 가로로 긴 plane */}
      <mesh material={outMat} scale={inflateScale([1.02, 6, 1.04])} position={[0, 0.006, 0]}>
        <boxGeometry args={[2.0, 0.01, 1.0]} />
      </mesh>
      <mesh material={shadowMat} position={[0, 0.006, 0]}>
        <boxGeometry args={[2.0, 0.01, 1.0]} />
      </mesh>
      {/* 창문 격자 — 더 어두운 thin 박스 4개 (수직/수평 줄) */}
      <mesh material={crackMat} position={[0, 0.012, 0]}>
        <boxGeometry args={[1.96, 0.001, 0.04]} />
      </mesh>
      <mesh material={crackMat} position={[0, 0.012, 0]}>
        <boxGeometry args={[0.04, 0.001, 0.96]} />
      </mesh>
      <mesh material={crackMat} position={[0.5, 0.012, 0]}>
        <boxGeometry args={[0.04, 0.001, 0.96]} />
      </mesh>
      <mesh material={crackMat} position={[-0.5, 0.012, 0]}>
        <boxGeometry args={[0.04, 0.001, 0.96]} />
      </mesh>
      {/* 깨진 조각 — 사각 모서리 옆에 작은 회전 plane 1-2개 */}
      <mesh material={shadowMat} position={[1.05, 0.013, 0.3]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.25, 0.008, 0.18]} />
      </mesh>
      <mesh material={shadowMat} position={[-0.95, 0.013, -0.35]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.22, 0.008, 0.14]} />
      </mesh>
    </group>
  )
}
