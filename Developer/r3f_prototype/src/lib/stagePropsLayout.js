// 1스테이지 "버려진 교실" 정적 무대 배치.
// 모든 prop은 outer 6-12 블록 링(±24 ~ ±48 world units)에 배치되어
// 중앙 회피 공간과 적 스폰 링(8.5-12.5 unit)에 간섭하지 않는다.
// 외곽 props: collides:true / decoration: collides:false / atmosphere overlay: collides:false.

/**
 * 모든 Props/* · Atmosphere/* 컴포넌트가 받는 공통 props 시그니처.
 * dispatcher(StageProps.jsx)가 PROP_LAYOUT entry에서 자동 채움.
 * atmosphere kind는 collides를 무시한다.
 *
 * @typedef {Object} StagePropProps
 * @property {[number, number, number]} pos World 좌표 [x, y, z].
 * @property {number} [rot] Y축 회전 (rad). 기본 0.
 * @property {number} [scale] 균일 스케일 배수. 기본 1.
 * @property {boolean} [collides] true면 fixed RigidBody로 감싸 충돌체 부착. 기본은 kind의 collidesDefault.
 */

export const PROP_KINDS = {
  // 외곽 props
  fallen_desk:          { category: 'prop',       collidesDefault: true,  footprint: { w: 1.6, d: 1.0 } },
  chair_pile:           { category: 'prop',       collidesDefault: true,  footprint: { w: 1.2, d: 1.2 } },
  contaminated_locker:  { category: 'prop',       collidesDefault: true,  footprint: { w: 1.0, d: 0.5 } },
  safety_cone:          { category: 'prop',       collidesDefault: true,  footprint: { w: 0.5, d: 0.5 } },
  barricade_small:      { category: 'prop',       collidesDefault: true,  footprint: { w: 1.8, d: 0.4 } },
  warning_tape:         { category: 'prop',       collidesDefault: false, footprint: { w: 2.0, d: 0.2 } },
  // 분위기 overlay (충돌 없음)
  exam_paper:           { category: 'atmosphere', collidesDefault: false, footprint: { w: 0.6, d: 0.6 } },
  pollution_puddle_static: { category: 'atmosphere', collidesDefault: false, footprint: { w: 1.4, d: 1.4 } },
  window_shadow_broken: { category: 'atmosphere', collidesDefault: false, footprint: { w: 2.0, d: 1.0 } },
}

// 좌표 단위: world units (1 block = 4 units). 맵 ±48 unit, outer ring 24-48.
// rot: y축 회전 라디안.
// y는 prop=0(바닥에 놓임), atmosphere=0.012(z-fight 방지로 살짝 띄움).
export const PROP_LAYOUT = [
  // 외곽 props 12개 — 네 모서리 + 네 변에 분산 배치
  { kind: 'fallen_desk',         pos: [-32,  0, -28], rot: 0.3 },
  { kind: 'fallen_desk',         pos: [ 30,  0,  26], rot: -0.6 },
  { kind: 'chair_pile',          pos: [-28,  0,  34], rot: 0 },
  { kind: 'chair_pile',          pos: [ 36,  0, -32], rot: 0.8 },
  { kind: 'contaminated_locker', pos: [-40,  0,  10], rot: Math.PI / 2 },
  { kind: 'contaminated_locker', pos: [ 40,  0, -14], rot: -Math.PI / 2 },
  { kind: 'contaminated_locker', pos: [-6,   0, -42], rot: 0 },
  { kind: 'safety_cone',         pos: [-26,  0, -18], rot: 0 },
  { kind: 'safety_cone',         pos: [ 24,  0,  20], rot: 0 },
  { kind: 'barricade_small',     pos: [ 10,  0,  38], rot: 0.1 },
  { kind: 'barricade_small',     pos: [-14,  0, -36], rot: -0.2 },
  { kind: 'warning_tape',        pos: [-30,  0.012,  16], rot: 0.5 },

  // 분위기 overlay 6개 — atmosphere는 collides 자체가 false라 outer ring 안에서도 자유 배치
  { kind: 'exam_paper',          pos: [-25,  0.012, -10], rot: 0.4 },
  { kind: 'exam_paper',          pos: [ 27,  0.012,   8], rot: -0.7 },
  { kind: 'pollution_puddle_static', pos: [-34,  0.012,   0], rot: 0 },
  { kind: 'pollution_puddle_static', pos: [ 32,  0.012, -22], rot: 0 },
  { kind: 'window_shadow_broken',    pos: [-18,  0.012,  40], rot: 0 },
  { kind: 'window_shadow_broken',    pos: [ 20,  0.012, -40], rot: 0 },
]

// 맵 상수 — Floor.jsx와 동일. 변경 시 두 곳 같이 갱신해야 함.
export const MAP_HALF_EXTENT = 48
export const MAP_AREA = (MAP_HALF_EXTENT * 2) ** 2  // 9216 unit²
export const CENTRAL_EMPTY_RADIUS = 16              // 4 블록 (중앙 회피 공간)
export const OUTER_RING_INNER = 24                  // 6 블록
export const OUTER_RING_OUTER = 48                  // 12 블록 (boundary)

export function isValidKind(kind) {
  return Object.prototype.hasOwnProperty.call(PROP_KINDS, kind)
}

export function isCollidable(entry) {
  if (!isValidKind(entry.kind)) return false
  const def = PROP_KINDS[entry.kind]
  return entry.collides !== undefined ? entry.collides : def.collidesDefault
}

// 중앙 ±radius 안에 prop 있는지. true면 정책 위반.
export function hasPropInCentralRadius(layout, radius = CENTRAL_EMPTY_RADIUS) {
  return layout.some(({ pos }) => {
    const [x, , z] = pos
    return Math.abs(x) < radius && Math.abs(z) < radius
  })
}

// 충돌 가능 prop들의 footprint 합 / 맵 전체 면적. R6 ≤ 0.15 검사용.
export function getBlockerAreaRatio(layout) {
  let blocked = 0
  for (const entry of layout) {
    if (!isCollidable(entry)) continue
    const def = PROP_KINDS[entry.kind]
    if (!def) continue
    blocked += def.footprint.w * def.footprint.d
  }
  return blocked / MAP_AREA
}

// outer ring(한 축 |coord| ≥ 24 AND |coord| ≤ 48) 안에 있는지.
export function isInOuterRing(pos) {
  const [x, , z] = pos
  const ax = Math.abs(x)
  const az = Math.abs(z)
  if (ax > OUTER_RING_OUTER || az > OUTER_RING_OUTER) return false
  // 한 축이라도 ≥ inner면 outer ring 안.
  return ax >= OUTER_RING_INNER || az >= OUTER_RING_INNER
}

// 카테고리별 entry 필터.
export function getEntriesByCategory(layout, category) {
  return layout.filter((e) => PROP_KINDS[e.kind]?.category === category)
}
