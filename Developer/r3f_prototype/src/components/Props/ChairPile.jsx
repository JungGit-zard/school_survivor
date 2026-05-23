import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { toonMat, outlineMat, inflateScale } from '../../lib/toon.js'

// 의자 더미 — 의자 2-3개가 무질서하게 쌓인 형태.
function Chair({ y, twist, seatMat, frameMat, outMat }) {
  return (
    <group position={[0, y, 0]} rotation={[0, twist, twist * 0.3]}>
      {/* 좌판 */}
      <mesh material={outMat} scale={inflateScale([1.08, 1.4, 1.08])} position={[0, 0, 0]}>
        <boxGeometry args={[0.45, 0.05, 0.45]} />
      </mesh>
      <mesh material={seatMat} position={[0, 0, 0]}>
        <boxGeometry args={[0.45, 0.05, 0.45]} />
      </mesh>
      {/* 등받이 */}
      <mesh material={outMat} scale={inflateScale([1.08, 1.04, 1.4])} position={[0, 0.25, -0.2]}>
        <boxGeometry args={[0.45, 0.4, 0.05]} />
      </mesh>
      <mesh material={frameMat} position={[0, 0.25, -0.2]}>
        <boxGeometry args={[0.45, 0.4, 0.05]} />
      </mesh>
      {/* 다리 4개 (좌판 아래) */}
      {[[0.18, -0.18, 0.18], [-0.18, -0.18, 0.18], [0.18, -0.18, -0.18], [-0.18, -0.18, -0.18]].map(([x, py, z], i) => (
        <group key={i} position={[x, py, z]}>
          <mesh material={outMat} scale={inflateScale([1.4, 1.05, 1.4])}>
            <boxGeometry args={[0.05, 0.32, 0.05]} />
          </mesh>
          <mesh material={frameMat}>
            <boxGeometry args={[0.05, 0.32, 0.05]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** @param {import('../../lib/stagePropsLayout.js').StagePropProps} props */
export default function ChairPile({ pos, rot = 0, scale = 1, collides = true }) {
  const seatMat  = useMemo(() => toonMat(0x805947, 0.08), [])  // 좌판 갈색
  const frameMat = useMemo(() => toonMat(0x8c929e, 0.06), [])  // 프레임 회색
  const outMat   = useMemo(() => outlineMat(0.96), [])

  const inner = (
    <group scale={[scale, scale, scale]} rotation={[0, rot, 0]}>
      <Chair y={0.32} twist={0.2}  seatMat={seatMat} frameMat={frameMat} outMat={outMat} />
      <Chair y={0.72} twist={-0.5} seatMat={seatMat} frameMat={frameMat} outMat={outMat} />
      <Chair y={1.05} twist={0.9}  seatMat={seatMat} frameMat={frameMat} outMat={outMat} />
    </group>
  )

  if (!collides) {
    return <group position={pos}>{inner}</group>
  }
  return (
    <RigidBody type="fixed" position={pos} colliders="cuboid">
      <mesh visible={false}>
        <boxGeometry args={[1.2, 1.4, 1.2]} />
        <meshBasicMaterial />
      </mesh>
      {inner}
    </RigidBody>
  )
}
