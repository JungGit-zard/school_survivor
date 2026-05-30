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

function buildFloorTexture() {
  if (typeof document === 'undefined') return null
  const tex = new THREE.TextureLoader().load(FLOOR_TILE.src)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(FLOOR_TILE.repeat, FLOOR_TILE.repeat)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ClassroomFloor() {
  const floorTex = useMemo(() => buildFloorTexture(), [])
  const floorMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: floorTex }),
    [floorTex]
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <primitive object={floorMat} />
    </mesh>
  )
}
