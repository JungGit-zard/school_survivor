import * as THREE from 'three'

let _gradient = null

export function getToonGradient() {
  if (_gradient) return _gradient
  const c = document.createElement('canvas')
  c.width = 5; c.height = 1
  const ctx = c.getContext('2d')
  ;['#09070c', '#18131f', '#5c5368', '#beb4cc', '#ffffff'].forEach((col, i) => {
    ctx.fillStyle = col
    ctx.fillRect(i, 0, 1, 1)
  })
  _gradient = new THREE.CanvasTexture(c)
  _gradient.minFilter = _gradient.magFilter = THREE.NearestFilter
  _gradient.generateMipmaps = false
  _gradient.colorSpace = THREE.SRGBColorSpace
  return _gradient
}

// 외곽선 굵기 글로벌 곱수. 모든 인버티드 헐 메쉬의 인플레이션 오프셋 (s - 1)에 곱한다.
// 예: 1.08 (8% 인플레이션) × 2 = 1.16 (16% 인플레이션). scale === 1 인 경우는 변화 없음 (1 + 0×N = 1).
// 모든 외곽선 메쉬의 scale은 inflateScale(...)로 감싸 일관된 굵기를 유지한다.
export const OUTLINE_THICKNESS_MULT = 2

export function inflateScale(s) {
  if (Array.isArray(s)) return s.map(inflateScale)
  return 1 + (s - 1) * OUTLINE_THICKNESS_MULT
}

// Inverted Hull Outline의 Stencil Layer 기법 (Delt06/toon-rp wiki).
// 1) 모든 toonMat 지오메트리는 자기 픽셀에 stencil=OUTLINE_STENCIL_REF를 기록한다.
// 2) outlineMat(BackSide 인플레이션 헐)은 stencil != ref인 픽셀에만 그린다.
// 결과: 다중 부품 모델(예: 플라스크 body+neck)이 겹치는 영역의 헐은 stencil 차단으로
//       그려지지 않아, 부품 사이 seam이 아닌 외곽 silhouette만 외곽선으로 남는다.
const OUTLINE_STENCIL_REF = 1

export function toonMat(hex, emissiveIntensity = 0.08) {
  const m = new THREE.MeshToonMaterial({
    color: hex,
    gradientMap: getToonGradient(),
    emissive: hex,
    emissiveIntensity,
  })
  m.stencilWrite = true
  m.stencilRef   = OUTLINE_STENCIL_REF
  m.stencilFunc  = THREE.AlwaysStencilFunc
  m.stencilZPass = THREE.ReplaceStencilOp
  return m
}

// 외곽선 위계 프리셋 — opacity·color 두 축을 prose가 아닌 코드에서 페어링.
// PROP·ATMOSPHERE 추가 시 ATMOSPHERE는 색을 부드럽게(0x3a2a2a) + opacity 낮춤(0.5).
export const OUTLINE_PRESETS = {
  PROP:       { opacity: 0.96, color: 0x050209 },  // 캐릭터·props 기본 진한 외곽선
  ATMOSPHERE: { opacity: 0.5,  color: 0x3a2a2a },  // 분위기 overlay 부드러운 약 외곽선
}

// color 기본값 0x050209는 캐릭터·props의 진한 외곽선 톤. 분위기 overlay는 softOutlineMat() 사용.
export function outlineMat(opacity = 0.96, color = 0x050209) {
  const m = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
    transparent: true,
    opacity,
    depthWrite: false,
  })
  // 주의: three.js에서 material.stencilWrite는 "stencil test enable" 스위치다.
  // false로 두면 NotEqual 비교 자체가 동작하지 않으므로 true로 켜되,
  // stencilZPass를 Keep으로 두어 "테스트만 하고 버퍼는 안 건드린다"를 구현한다.
  m.stencilWrite = true
  m.stencilRef   = OUTLINE_STENCIL_REF
  m.stencilFunc  = THREE.NotEqualStencilFunc
  m.stencilZPass = THREE.KeepStencilOp
  m.stencilFail  = THREE.KeepStencilOp
  m.stencilZFail = THREE.KeepStencilOp
  return m
}

// 분위기 overlay 전용 — 위계 페어링을 코드에서 강제.
export function softOutlineMat() {
  const { opacity, color } = OUTLINE_PRESETS.ATMOSPHERE
  return outlineMat(opacity, color)
}

// ── 렌더링 캐시 (동일 파라미터 인스턴스 공유) ──────────────────────────────
// BoxGeometry: 같은 크기의 박스를 여러 메쉬가 공유
const _geoCache = new Map()
export function getCachedBoxGeo(w, h, d) {
  const key = `${w},${h},${d}`
  let g = _geoCache.get(key)
  if (!g) { g = new THREE.BoxGeometry(w, h, d); _geoCache.set(key, g) }
  return g
}

// toonMat: 동일 색상+발광 조합의 머티리얼 공유
const _toonMatCache = new Map()
export function getCachedToonMat(color, emissive = 0.08) {
  const key = `${color},${emissive}`
  let m = _toonMatCache.get(key)
  if (!m) { m = toonMat(color, emissive); _toonMatCache.set(key, m) }
  return m
}

// outlineMat(0.96): 모든 캐릭터 아웃라인이 동일 → 싱글턴
let _sharedOutlineMat = null
export function getSharedOutlineMat() {
  if (!_sharedOutlineMat) _sharedOutlineMat = outlineMat(0.96)
  return _sharedOutlineMat
}

// 피격 플래시: 순백색 싱글턴 (모든 적이 공유해도 무방 — 머티리얼 교체 방식이라 상호 간섭 없음)
let _flashMat = null
export function getFlashMat() {
  if (!_flashMat) _flashMat = toonMat(0xffffff, 1.0)
  return _flashMat
}
