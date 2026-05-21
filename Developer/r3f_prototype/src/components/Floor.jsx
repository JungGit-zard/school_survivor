/**
 * Floor — 경계 벽(Physics) + 시각 바닥은 ClassroomFloor에 위임.
 *
 * 변경 내역:
 *  - 구 회색 타일 + 그리드 라인 제거
 *  - 경계 RigidBody 4개 유지 (플레이어·적 이탈 방지)
 *  - 바닥 평면 RigidBody 유지 (플레이어 낙하 방지)
 */

import { RigidBody } from '@react-three/rapier'
import ClassroomFloor from './ClassroomFloor.jsx'

const TILE_SIZE = 4
const MAP_SIZE  = 24   // tiles per side

export default function Floor() {
  const half = (MAP_SIZE * TILE_SIZE) / 2

  return (
    <group>
      {/* ── 시각 바닥: 교실 나무 마루 ── */}
      <ClassroomFloor />

      {/* ── 물리 바닥 평면 (보이지 않음, 낙하 방지용) ── */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <planeGeometry args={[MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {/* ── 경계 벽 (보이지 않음) ── */}
      {[
        [0, 0.5,  half, half * 2, 1, 1],
        [0, 0.5, -half, half * 2, 1, 1],
        [ half, 0.5, 0, 1, 1, half * 2],
        [-half, 0.5, 0, 1, 1, half * 2],
      ].map(([x, y, z, w, h, d], i) => (
        <RigidBody key={i} type="fixed" position={[x, y, z]}>
          <mesh visible={false}>
            <boxGeometry args={[w, h, d]} />
            <meshBasicMaterial />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}
