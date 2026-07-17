// 맵 프랍 배치 에디터 순수 기하 유틸(테스트 대상).
// 화면 px <-> 월드 x/z 변환, 톱다운 뷰포트 계산, 팔레트 기본값.
import { getStageBounds } from './stageConfig.js'
import { UNCONSCIOUS_STUDENT_PLAYER_SCALE } from './characterVisualScale.js'

// 팔레트: 배치 가능한 프랍 타입 전부. 신규 배치 시 기본 scale/변형 시드로 사용.
export const STAGE_PROP_PALETTE = Object.freeze([
  { type: 'classroomDesk', label: '책상', defaultScale: 0.8, defaultVariant: 'upright', glyph: '▬' },
  { type: 'classroomChair', label: '의자', defaultScale: 0.7, defaultVariant: 'abandoned', glyph: '▪' },
  { type: 'unconsciousStudent', label: '학생', defaultScale: UNCONSCIOUS_STUDENT_PLAYER_SCALE, defaultVariant: 'faceUp', glyph: '☻' },
  { type: 'corridorLockerBank', label: '사물함', defaultScale: 1, defaultVariant: null, glyph: '▤' },
  { type: 'corridorJanitorCart', label: '청소카트', defaultScale: 0.82, defaultVariant: null, glyph: '▥' },
  { type: 'corridorLostFoundBoard', label: '분실물판', defaultScale: 1, defaultVariant: null, glyph: '▦' },
  // 체육관(stage3) 프랍 10종
  { type: 'basketballHoop', label: '농구골대', defaultScale: 1.18, glyph: '🥅' },
  { type: 'basketballBallCart', label: '공카트', defaultScale: 1.05, glyph: '🛒' },
  { type: 'basketballCluster', label: '농구공', defaultScale: 1.15, glyph: '🏀', defaultProps: { count: 5 } },
  { type: 'gymBench', label: '체육벤치', defaultScale: 1.08, glyph: '🛋' },
  { type: 'gymTrainingCones', label: '콘', defaultScale: 1.1, glyph: '🔺' },
  { type: 'gymMats', label: '매트', defaultScale: 1.12, glyph: '▧' },
  { type: 'gymScoreboard', label: '전광판', defaultScale: 1, glyph: '🔢' },
  { type: 'gymBanner', label: '배너', defaultScale: 1.05, glyph: '🎌' },
  { type: 'gymExitDoor', label: '비상구', defaultScale: 1, glyph: '🚪' },
  { type: 'gymEquipmentSpill', label: '장비흩어짐', defaultScale: 1.08, glyph: '🧺' },
])

// 팔레트 항목에서 신규 배치 시 시드할 기본 props(있으면 객체, 없으면 null).
// defaultProps(체육관 프랍) 우선, 없으면 defaultVariant(교실/복도 프랍)로 fallback.
export function getPaletteDefaultProps(entry) {
  if (!entry) return null
  if (entry.defaultProps) return { ...entry.defaultProps }
  if (entry.defaultVariant) return { variant: entry.defaultVariant }
  return null
}

const PALETTE_BY_TYPE = new Map(STAGE_PROP_PALETTE.map((entry) => [entry.type, entry]))

export function getPaletteEntry(type) {
  return PALETTE_BY_TYPE.get(type) ?? null
}

// 에디터가 그릴 맵의 반-크기. 게임 경계보다 넓게 배치된 기존 프랍(예: stage1 z=±48)도
// 모두 화면에 들어오도록 stageBounds와 실제 배치 좌표 최대값 중 큰 쪽을 쓴다.
export function getStagePropEditorBounds(stageId, placements = [], margin = 2) {
  const { halfX, halfZ } = getStageBounds(stageId)
  let maxX = halfX
  let maxZ = halfZ
  for (const placement of placements) {
    const pos = placement?.position
    if (!Array.isArray(pos)) continue
    const px = Math.abs(Number(pos[0]))
    const pz = Math.abs(Number(pos[2]))
    if (Number.isFinite(px)) maxX = Math.max(maxX, px + margin)
    if (Number.isFinite(pz)) maxZ = Math.max(maxZ, pz + margin)
  }
  return { halfX: maxX, halfZ: maxZ }
}

// bounds 종횡비를 유지하며 maxHeight px 안에 들어가는 뷰포트 픽셀 크기.
export function getEditorViewport(bounds, { maxWidth = 520, maxHeight = 560 } = {}) {
  const worldWidth = bounds.halfX * 2
  const worldHeight = bounds.halfZ * 2
  const aspect = worldWidth / worldHeight
  let height = maxHeight
  let width = height * aspect
  if (width > maxWidth) {
    width = maxWidth
    height = width / aspect
  }
  return { width: Math.round(width), height: Math.round(height) }
}

// 월드 {x, z} -> 화면 {left, top} px. 화면 상단(top=0)은 북쪽(-z), 왼쪽(left=0)은 서쪽(-x).
export function worldToScreen(x, z, bounds, viewport) {
  const left = ((x + bounds.halfX) / (bounds.halfX * 2)) * viewport.width
  const top = ((z + bounds.halfZ) / (bounds.halfZ * 2)) * viewport.height
  return { left, top }
}

// 화면 {left, top} px -> 월드 {x, z}. worldToScreen의 역함수. 경계 밖 입력은 경계로 클램프.
export function screenToWorld(left, top, bounds, viewport) {
  const width = viewport.width || 1
  const height = viewport.height || 1
  const clampedLeft = Math.min(viewport.width, Math.max(0, left))
  const clampedTop = Math.min(viewport.height, Math.max(0, top))
  const x = (clampedLeft / width) * (bounds.halfX * 2) - bounds.halfX
  const z = (clampedTop / height) * (bounds.halfZ * 2) - bounds.halfZ
  return { x: Number(x.toFixed(3)), z: Number(z.toFixed(3)) }
}
