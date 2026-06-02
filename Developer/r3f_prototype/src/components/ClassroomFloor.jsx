/**
 * ClassroomFloor - Stage 1 visible classroom floor background.
 * stage01_concept 컨셉(위에서 내려다본 어두운 나무 마루)을 바탕으로,
 * tile_stage01 타일 리소스를 RepeatWrapping으로 이어붙여(타일링) 바닥을 구성한다.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import tileUrl from '../assets/background_floor/tile_stage01.png.png'

// 바닥 평면 한 변 크기(유닛). 맵(±48) + 카메라 시야 여유를 넉넉히 덮어,
// 플레이어가 맵 가장자리에 있어도 카메라가 바닥 끝을 넘어가 빈(배경색) 영역이 보이지 않게 한다.
// (충돌/벽은 Floor.jsx의 MAP_SIZE×TILE_SIZE=96로 별도 관리 — 여긴 시각 바닥만 키운다.)
const FLOOR_SIZE = 200
// 타일 한 장이 차지하는 월드 크기(판자 크기). repeat은 이 값에 맞춰 자동 계산해 밀도를 일정하게 유지.
const TILE_WORLD_SIZE = 6.9

// 타일 이어붙이기 설정.
// - src      : 이어붙일 타일 리소스
// - repeat   : 바닥 한 변에 들어가는 타일 반복 수 (= FLOOR_SIZE / TILE_WORLD_SIZE)
// - floorSize: 바닥 평면 한 변 크기(유닛)
export const FLOOR_TILE = {
  src: tileUrl,
  repeat: Math.round(FLOOR_SIZE / TILE_WORLD_SIZE),
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
