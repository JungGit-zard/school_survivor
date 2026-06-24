import { RigidBody } from '@react-three/rapier'
import ClassroomFloor from './ClassroomFloor.jsx'
import { StageObjectColliderLayer, StageObjectLayer } from './StageObjects/index.js'
import { getStageBounds } from '../lib/stageConfig.js'

export function FloorVisual({ stageId = 'stage1' }) {
  return (
    <>
      <ClassroomFloor stageId={stageId} />
      <StageObjectLayer stageId={stageId} />
    </>
  )
}

export default function Floor({ stageId = 'stage1' }) {
  // 맵 경계는 스테이지별로 다르다 (stage1: 세로로 긴 직사각형, stage2: 정사각).
  const { halfX, halfZ } = getStageBounds(stageId)

  return (
    <group>
      <FloorVisual stageId={stageId} />
      <StageObjectColliderLayer stageId={stageId} />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <planeGeometry args={[halfX * 2, halfZ * 2]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {[
        // 앞/뒤 벽 (z = ±halfZ): 가로(x) 폭 전체를 막고 z 방향으로 얇다.
        [0, 0.5, halfZ, halfX * 2, 1, 1],
        [0, 0.5, -halfZ, halfX * 2, 1, 1],
        // 좌/우 벽 (x = ±halfX): x 방향으로 얇고 세로(z) 깊이 전체를 막는다.
        [halfX, 0.5, 0, 1, 1, halfZ * 2],
        [-halfX, 0.5, 0, 1, 1, halfZ * 2],
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
