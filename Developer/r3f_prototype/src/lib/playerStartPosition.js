export const STAGE_PLAYER_START_POSITIONS = Object.freeze({
  stage4: Object.freeze([0, 0, 7]),
})

export function getPlayerStartPosition(stageId) {
  return STAGE_PLAYER_START_POSITIONS[stageId] ?? [0, 0, 0]
}
