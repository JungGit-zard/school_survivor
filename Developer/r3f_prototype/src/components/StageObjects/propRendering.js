import * as THREE from 'three'
import { getCachedBoxGeo, getCachedOutlineMat, getCachedToonMat } from '../../lib/toon.js'

const PROP_OUTLINE_PADDING = 0.045

// 플레이어가 어느 방향에서 접근해도 소품 표면이 외곽선 뒤로 컬링되지 않게 한다.
// 외곽선 재질은 별도로 BackSide를 유지하므로 inverted-hull 실루엣은 변하지 않는다.
export const STAGE_PROP_SURFACE_SIDE = THREE.DoubleSide

// Stage 1의 책상·의자·학생은 모두 scale만 다른 1×1×1 box를 사용한다. geometry를
// 인스턴스마다 JSX로 생성하지 않고 모듈 수명 동안 하나만 공유한다.
export const STAGE_PROP_UNIT_BOX_GEOMETRY = getCachedBoxGeo(1, 1, 1)

export const STAGE_PROP_MESH_RENDERING = Object.freeze({
  castShadow: false,
  receiveShadow: false,
})

// 공유 geometry/material은 개별 프랍 언마운트 때 dispose하면 안 된다. HMR 때에는
// toon.js의 중앙 캐시 정리 경로가 안전하게 해제한다.
export const STAGE_PROP_SHARED_RESOURCE_MESH_RENDERING = Object.freeze({
  ...STAGE_PROP_MESH_RENDERING,
  dispose: null,
})

export function getStagePropToonMaterial(color, emissiveIntensity = 0.08) {
  return getCachedToonMat(color, emissiveIntensity, STAGE_PROP_SURFACE_SIDE)
}

export function getStagePropOutlineMaterial(opacity = 0.96, color = 0x050209) {
  return getCachedOutlineMat(opacity, color)
}

export function getPropOutlineScale(scale) {
  if (Array.isArray(scale)) return scale.map(getPropOutlineScale)
  return Math.max(0.01, scale + PROP_OUTLINE_PADDING)
}
