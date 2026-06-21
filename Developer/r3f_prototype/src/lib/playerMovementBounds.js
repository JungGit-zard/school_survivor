import { getStageBounds } from './stageConfig.js'
import { STAGE2_CORRIDOR_WALL } from './stage2CorridorWall.js'

export const PLAYER_INSET_X = 2
export const PLAYER_INSET_Z = 4

export function getPlayerMovementBounds(stageId) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const minZ = stageId === 'stage2'
    ? Math.max(
      -halfZ + PLAYER_INSET_Z,
      STAGE2_CORRIDOR_WALL.bottomZ + STAGE2_CORRIDOR_WALL.playerVisualStopInsetZ,
    )
    : -halfZ + PLAYER_INSET_Z

  return {
    minX: -halfX + PLAYER_INSET_X,
    maxX: halfX - PLAYER_INSET_X,
    minZ,
    maxZ: halfZ - PLAYER_INSET_Z,
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
