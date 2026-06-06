/**
 * ClassroomFloor - Stage 1 visible classroom floor background.
 * stage01_concept 컨셉(위에서 내려다본 어두운 나무 마루)을 바탕으로,
 * tile_stage01 타일 리소스를 RepeatWrapping으로 이어붙여(타일링) 바닥을 구성한다.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import tileUrl from '../assets/background_floor/tile_stage01.png.png'

const FLOOR_SIZE = 96

// 타일 이어붙이기 설정.
// - src     : 이어붙일 타일 리소스
// - repeat  : 바닥 한 변에 들어가는 타일 반복 수 (FLOOR_SIZE / repeat = 타일 한 장의 월드 크기)
// - floorSize: 바닥 평면 한 변 크기(유닛) — 플레이 가능 맵(±48)을 모두 덮는다.
export const FLOOR_TILE = {
  src: tileUrl,
  repeat: 14,
  floorSize: FLOOR_SIZE,
}

export const STAGE2_CORRIDOR_LANES = {
  laneCount: 3,
  laneWidth: 6,
  centerLineColor: '#40525f',
  safeLaneColor: '#4e725f',
}

function buildFloorTexture() {
  if (typeof document === 'undefined') return null
  const tex = new THREE.TextureLoader().load(FLOOR_TILE.src)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(FLOOR_TILE.repeat, FLOOR_TILE.repeat)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ClassroomFloor({ stageId = 'stage1' }) {
  const floorTex = useMemo(() => buildFloorTexture(), [])
  const floorMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: floorTex }),
    [floorTex]
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
            <meshBasicMaterial color={0x2f3942} transparent opacity={0.28} depthWrite={false} />
          </mesh>
          {[-6, 0, 6].map((x) => (
            <mesh key={x} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
              <planeGeometry args={[0.16, FLOOR_SIZE]} />
              <meshBasicMaterial color={0x40525f} transparent opacity={0.72} depthWrite={false} />
            </mesh>
          ))}
          <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
            <planeGeometry args={[5.2, FLOOR_SIZE]} />
            <meshBasicMaterial color={0x4e725f} transparent opacity={0.10} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}
