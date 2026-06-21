export const STAGE2_CORRIDOR_WALL = {
  width: 36,
  height: 5.5,
  scale: 2 / 5,
  repeatX: 5,
  bottomZ: -42.95,
  playerVisualStopInsetZ: 1.2,
}

export function getStage2CorridorPlayerStopZ() {
  return STAGE2_CORRIDOR_WALL.bottomZ + STAGE2_CORRIDOR_WALL.playerVisualStopInsetZ
}

export function getStage2CorridorWallDisplay() {
  const displayWidth = STAGE2_CORRIDOR_WALL.width * STAGE2_CORRIDOR_WALL.scale
  const displayHeight = STAGE2_CORRIDOR_WALL.height * STAGE2_CORRIDOR_WALL.scale

  return {
    ...STAGE2_CORRIDOR_WALL,
    displayWidth,
    displayHeight,
    playerStopZ: getStage2CorridorPlayerStopZ(),
    positionZ: STAGE2_CORRIDOR_WALL.bottomZ - displayHeight / 2,
  }
}
