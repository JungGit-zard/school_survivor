import { useMemo } from 'react'
import * as THREE from 'three'
import stage1TileUrl from '../assets/background_floor/tile_stage01.png.png'
import stage2TileUrl from '../assets/background_floor/tile_stage02_corridor.png'
import stage2EndWallUrl from '../assets/background_floor/stage02_corridor_end_wall.png'
import { getStage2CorridorWallDisplay } from '../lib/stage2CorridorWall.js'

const FLOOR_SIZE = 200
const STAGE1_TILE_WORLD_SIZE = 6.9
const STAGE2_TILE_WORLD_SIZE = 30
const STAGE2_TILE_DENSITY_MULTIPLIER = 10

export const FLOOR_TILE = {
  src: stage1TileUrl,
  repeat: Math.round(FLOOR_SIZE / STAGE1_TILE_WORLD_SIZE),
  floorSize: FLOOR_SIZE,
}

export const STAGE_FLOOR_TILES = {
  stage1: FLOOR_TILE,
  stage2: {
    src: stage2TileUrl,
    repeat: Math.round(FLOOR_SIZE / STAGE2_TILE_WORLD_SIZE) * STAGE2_TILE_DENSITY_MULTIPLIER,
    floorSize: FLOOR_SIZE,
  },
}

export const STAGE2_CORRIDOR_END = {
  src: stage2EndWallUrl,
  ...getStage2CorridorWallDisplay(),
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

function buildEndWallTexture(config) {
  if (typeof document === 'undefined') return null
  const tex = new THREE.TextureLoader().load(config.src)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ClassroomFloor({ stageId = 'stage1' }) {
  // STAGE_FLOOR_TILES 값은 모듈 수준 상수 객체다 — stageId로 키를 선택해야
  // 실제 의존이 stageId에 걸리게 된다. floorTile을 dep으로 쓰면 항상 같은
  // 참조라 memo가 재실행되지 않아 stageId 전환 시 텍스처가 갱신되지 않는다.
  const floorTile = STAGE_FLOOR_TILES[stageId] ?? STAGE_FLOOR_TILES.stage1
  const floorTex = useMemo(() => buildRepeatingTexture(floorTile), [stageId])
  const endWallTex = useMemo(() => buildEndWallTexture(STAGE2_CORRIDOR_END), [])
  const floorMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: floorTex }),
    [floorTex],
  )
  const endWallMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: endWallTex, side: THREE.DoubleSide, transparent: true, depthWrite: false }),
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
            <mesh key={x} position={[x, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
              <planeGeometry args={[0.16, FLOOR_SIZE]} />
              <meshBasicMaterial color={0x40525f} transparent opacity={0.45} depthWrite={false} />
            </mesh>
          ))}
          <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <planeGeometry args={[5.2, FLOOR_SIZE]} />
            <meshBasicMaterial color={0x4e725f} transparent opacity={0.07} depthWrite={false} />
          </mesh>
          {Array.from({ length: STAGE2_CORRIDOR_END.repeatX }, (_, i) => {
            const centerOffset = i - (STAGE2_CORRIDOR_END.repeatX - 1) / 2
            return (
              <mesh
                key={i}
                position={[
                  centerOffset * STAGE2_CORRIDOR_END.displayWidth,
                  0.018,
                  STAGE2_CORRIDOR_END.positionZ,
                ]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={3}
                material={endWallMat}
              >
                <planeGeometry args={[STAGE2_CORRIDOR_END.displayWidth, STAGE2_CORRIDOR_END.displayHeight]} />
              </mesh>
            )
          })}
        </group>
      )}
    </group>
  )
}
