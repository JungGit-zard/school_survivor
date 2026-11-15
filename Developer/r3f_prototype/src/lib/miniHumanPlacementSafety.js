// 사람 구경꾼 스테이지 배치 안전 검사. 2026-11-15, threemini.
//
// 구경꾼은 콜라이더가 없어 게임플레이를 막지 않지만, 보이는 자리가 플레이어 시작점·출구·프롭·퀘스트 물건과 겹치면 안 된다.
// 검사(문제 문자열 목록, 없으면 []):
//  - 맵 안: |x| ≤ halfX − r, |z| ≤ halfZ − r (r = MINI_HUMAN_FOOTPRINT_RADIUS)
//  - 콜라이더: 실제 프롭 콜라이더 파트 박스(portalPlacement.getPortalBlockers, 이미 플레이어 반폭만큼 부풀림)에서 r만큼 더 떨어진다
//  - 프롭 원점: 모든 배치 프롭(학생·퀘스트 물건 등 콜라이더 없는 것 포함) 원점에서 MINI_HUMAN_PROP_ORIGIN_CLEARANCE 이상
//  - 플레이어 시작점에서 MINI_HUMAN_PLAYER_START_CLEARANCE 이상
//  - 출구: 고정 앵커(stageConfig.portalAnchor)에서 MINI_HUMAN_EXIT_CLEARANCE 이상, 그리고 무작위 출구 범위
//    (getPortalPlacementBounds)를 출구 링 반지름 + r만큼 넓힌 사각형 밖 = 벽·모서리 띠(출구 링이 사람 위에 생길 수 없다)
// 적 스폰은 플레이어 주변 링이라 고정 자리가 없다. 구경꾼은 적 풀에 없으니 스폰·조준과 무관하다.
import { getStageBounds, getStageConfig } from './stageConfig.js'
import { getPlayerStartPosition } from './playerStartPosition.js'
import { getPortalBlockers, getPortalPlacementBounds } from './portalPlacement.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'

export const MINI_HUMAN_FOOTPRINT_RADIUS = 0.3
export const MINI_HUMAN_PROP_ORIGIN_CLEARANCE = 0.8
export const MINI_HUMAN_PLAYER_START_CLEARANCE = 3
export const MINI_HUMAN_EXIT_RING_RADIUS = 1.5 // EscapePortal PORTAL_RADIUS
export const MINI_HUMAN_EXIT_CLEARANCE = MINI_HUMAN_EXIT_RING_RADIUS + 1

export function miniHumanPlacementProblems(stageId, placement) {
  const r = MINI_HUMAN_FOOTPRINT_RADIUS
  const { x, z } = placement
  const problems = []
  const { halfX, halfZ } = getStageBounds(stageId)
  if (Math.abs(x) > halfX - r || Math.abs(z) > halfZ - r) problems.push('outside the map')
  for (const box of getPortalBlockers(stageId)) {
    if (x > box.minX - r && x < box.maxX + r && z > box.minZ - r && z < box.maxZ + r) { problems.push('overlaps a prop collider'); break }
  }
  const prop = getStageObjectPlacements(stageId).find(({ position }) => Math.hypot(x - position[0], z - position[2]) < MINI_HUMAN_PROP_ORIGIN_CLEARANCE)
  if (prop) problems.push(`on top of prop ${prop.id ?? prop.type}`)
  const [sx, , sz] = getPlayerStartPosition(stageId)
  if (Math.hypot(x - sx, z - sz) < MINI_HUMAN_PLAYER_START_CLEARANCE) problems.push('near the player start')
  const anchor = getStageConfig(stageId).portalAnchor
  if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.z) && Math.hypot(x - anchor.x, z - anchor.z) < MINI_HUMAN_EXIT_CLEARANCE) problems.push('near the fixed exit')
  const exits = getPortalPlacementBounds(stageId); const pad = MINI_HUMAN_EXIT_RING_RADIUS + r
  if (x > exits.minX - pad && x < exits.maxX + pad && z > exits.minZ - pad && z < exits.maxZ + pad) problems.push('inside the random exit area')
  return problems
}
