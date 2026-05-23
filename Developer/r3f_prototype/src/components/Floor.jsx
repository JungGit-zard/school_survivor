import { RigidBody } from '@react-three/rapier'
import ClassroomFloor from './ClassroomFloor.jsx'

const TILE_SIZE = 4
const MAP_SIZE = 24

export default function Floor() {
  const half = (MAP_SIZE * TILE_SIZE) / 2

  return (
    <group>
      <ClassroomFloor />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <planeGeometry args={[MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>

      {[
        [0, 0.5, half, half * 2, 1, 1],
        [0, 0.5, -half, half * 2, 1, 1],
        [half, 0.5, 0, 1, 1, half * 2],
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
