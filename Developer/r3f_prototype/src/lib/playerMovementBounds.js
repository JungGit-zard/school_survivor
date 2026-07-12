import { getStageBounds } from './stageConfig.js'
import { getStage2CorridorPlayerStopZ } from './stage2CorridorWall.js'

export const PLAYER_INSET_X = 2
export const PLAYER_INSET_Z = 4
// 아래쪽(+z)은 카메라 하단 시야 끝 == 맵 끝이라, inset 4면 화면 맨 아래 4유닛을 못 밟는다.
// 벽 두께(0.5)+캡슐 반경만 남기고 화면 맨 아래까지 이동 가능하게 0.8로 축소(2026-07-12).
export const PLAYER_INSET_Z_BOTTOM = 0.8

// 플레이어 이동 한계 = 스테이지 맵 경계에서 안쪽 inset.
// - 세로(z) 위쪽: 상단 시야 여백이 커서 벽까지 가면 화면 밖으로 크게 빠짐 -> inset 4 유지.
// - 세로(z) 아래쪽: 화면 맨 아래와 일치하도록 최소 inset(0.8).
// - 가로(x): 좌우 시야 여백이 작아 inset 2에서 멈춰 좌우 끝 가까이까지 보이게.
export function getPlayerMovementBounds(stageId) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const minZ = stageId === 'stage2'
    ? Math.max(
      -halfZ + PLAYER_INSET_Z,
      getStage2CorridorPlayerStopZ(),
    )
    : -halfZ + PLAYER_INSET_Z

  return {
    minX: -halfX + PLAYER_INSET_X,
    maxX: halfX - PLAYER_INSET_X,
    minZ,
    maxZ: halfZ - PLAYER_INSET_Z_BOTTOM,
  }
}

export function clampPlayerPosition(stageId, position) {
  const bounds = getPlayerMovementBounds(stageId)

  return {
    x: clamp(position.x, bounds.minX, bounds.maxX),
    z: clamp(position.z, bounds.minZ, bounds.maxZ),
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
