import { useMemo } from 'react'
import * as THREE from 'three'
import stage1TileUrl from '../assets/background_floor/tile_stage01.png.png'
import stage2TileUrl from '../assets/background_floor/tile_stage02_corridor.png'
import stage2EndWallUrl from '../assets/background_floor/stage02_corridor_end_wall.png'

const FLOOR_SIZE = 200
const STAGE1_TILE_WORLD_SIZE = 6.9
const STAGE2_TILE_WORLD_SIZE = 30

export const FLOOR_TILE = {
  src: stage1TileUrl,
  repeat: Math.round(FLOOR_SIZE / STAGE1_TILE_WORLD_SIZE),
  floorSize: FLOOR_SIZE,
}

export const STAGE_FLOOR_TILES = {
  stage1: FLOOR_TILE,
  stage2: {
    src: stage2TileUrl,
    repeat: Math.round(FLOOR_SIZE / STAGE2_TILE_WORLD_SIZE),
    floorSize: FLOOR_SIZE,
  },
}

export const STAGE2_CORRIDOR_END = {
  src: stage2EndWallUrl,
  width: 34,
  height: 5.15,
  positionZ: 48.4,
}

export const STAGE2_CORRIDOR_LANES = {
  laneCount: 3,
  laneWidth: 6,
  centerLineColor: '#40525f',
  safeLaneColor: '#4e725f',
}

function buildRepeatingTexture(tile) {
  if (typeof document === 'undefined') return null
  const tex = new THREE.TextureLoader().load(tile.src)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(tile.repeat, tile.repeat)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function buildSingleTexture(src) {
  if (typeof document === 'undefined') return null
  const tex = new THREE.TextureLoader().load(src)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ClassroomFloor({ stageId = 'stage1' }) {
  const floorTile = STAGE_FLOOR_TILES[stageId] ?? STAGE_FLOOR_TILES.stage1
  const floorTex = useMemo(() => buildRepeatingTexture(floorTile), [floorTile])
  const endWallTex = useMemo(() => buildSingleTexture(STAGE2_CORRIDOR_END.src), [])
  const floorMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: floorTex }),
    [floorTex],
  )
  const endWallMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: endWallTex, side: THREE.DoubleSide, transparent: true }),
    [endWallTex],
  )

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <primitive object={floorMat} />
      </mesh>

      {stageId === 'stage2' && (
        <group position={[0, 0.012, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
            <planeGeometry args={[26, FLOOR_SIZE]} />
            <meshBasicMaterial color={0x2f3942} transparent opacity={0.16} depthWrite={false} />
          </mesh>
          {[-6, 0, 6].map((x) => (
            <mesh key={x} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
              <planeGeometry args={[0.16, FLOOR_SIZE]} />
              <meshBasicMaterial color={0x40525f} transparent opacity={0.45} depthWrite={false} />
            </mesh>
          ))}
          <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <planeGeometry args={[5.2, FLOOR_SIZE]} />
            <meshBasicMaterial color={0x4e725f} transparent opacity={0.07} depthWrite={false} />
          </mesh>
          <mesh
            position={[0, STAGE2_CORRIDOR_END.height / 2, STAGE2_CORRIDOR_END.positionZ]}
            renderOrder={3}
            material={endWallMat}
          >
            <planeGeometry args={[STAGE2_CORRIDOR_END.width, STAGE2_CORRIDOR_END.height]} />
          </mesh>
        </group>
      )}
    </group>
  )
}
