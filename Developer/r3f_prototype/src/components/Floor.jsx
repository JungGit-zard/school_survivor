import { useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody } from '@react-three/rapier'

const TILE_SIZE = 4
const MAP_SIZE  = 24   // tiles per side
const GRID_DENSITY_MULTIPLIER = 4

// 첨부 이미지 기준 — 따뜻한 라이트 그레이베이지
const FLOOR_COLOR = 0xc8c4bc
const GROUT_COLOR = 0xa8a49c   // 줄눈: 바닥보다 약간 어두운 동계열

export default function Floor() {
  const floorMat = useMemo(() => new THREE.MeshLambertMaterial({ color: FLOOR_COLOR }), [])
  const lineMat  = useMemo(() => new THREE.LineBasicMaterial({ color: GROUT_COLOR, transparent: true, opacity: 0.85 }), [])

  const gridLines = useMemo(() => {
    const pts = []
    const half = (MAP_SIZE * TILE_SIZE) / 2
    const lineCount = MAP_SIZE * GRID_DENSITY_MULTIPLIER
    const gridSize = TILE_SIZE / GRID_DENSITY_MULTIPLIER
    for (let i = 0; i <= lineCount; i++) {
      const v = -half + i * gridSize
      pts.push(-half, 0.02, v,  half, 0.02, v)
      pts.push(v, 0.02, -half,  v, 0.02,  half)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }, [])

  const half = (MAP_SIZE * TILE_SIZE) / 2

  return (
    <group>
      {/* floor plane */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE]} />
          <primitive object={floorMat} />
        </mesh>
      </RigidBody>

      {/* grid overlay */}
      <lineSegments geometry={gridLines} material={lineMat} />

      {/* boundary walls (invisible) */}
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
