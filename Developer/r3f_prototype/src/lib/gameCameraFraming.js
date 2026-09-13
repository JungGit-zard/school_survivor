export const GAME_CAMERA_HEIGHT = 17
export const GAME_CAMERA_BACK = 17
// 375px portrait에서 한쪽 30px를 남기는 화면 기준 여백이다.
export const GAME_CAMERA_EDGE_INSET_FRACTION = 0.08

export function getGameplayGroundReach(fov, aspect) {
  const vfov = (Number(fov) || 30) * Math.PI / 180
  const pitch = Math.atan2(GAME_CAMERA_HEIGHT, GAME_CAMERA_BACK)
  const zTop = GAME_CAMERA_BACK - GAME_CAMERA_HEIGHT / Math.tan(pitch - vfov / 2)
  const zBottom = GAME_CAMERA_BACK - GAME_CAMERA_HEIGHT / Math.tan(pitch + vfov / 2)
  const horizontal = Math.tan(vfov / 2) * (Number(aspect) || 1)
  return {
    reachUp: -zTop,
    reachDown: zBottom,
    reachSideFar: Math.hypot(GAME_CAMERA_BACK - zTop, GAME_CAMERA_HEIGHT) * horizontal,
    reachSideNear: Math.hypot(GAME_CAMERA_BACK - zBottom, GAME_CAMERA_HEIGHT) * horizontal,
  }
}

export function clampGameplayCameraFocus(value, reachNeg, reachPos, half) {
  const lo = -half + reachNeg
  const hi = half - reachPos
  if (lo > hi) return (lo + hi) / 2
  return Math.min(hi, Math.max(lo, value))
}

// Perspective camera의 화면 가까운 쪽에서 플레이어가 잘리는 것을 막는다. far-ground 폭은
// 맵을 가리는 데에는 맞지만, 가까운 플레이어의 실제 투영 폭보다 넓어서 그대로 쓰면 안 된다.
export function keepPlayerInsideCameraX({
  focusX,
  focusZ,
  playerX,
  playerY,
  playerZ,
  playerHalfWidth,
  fov,
  aspect,
  zoom = 1,
  edgeInsetFraction = GAME_CAMERA_EDGE_INSET_FRACTION,
}) {
  const vfov = (Number(fov) || 30) * Math.PI / 180
  const depth = (GAME_CAMERA_HEIGHT + GAME_CAMERA_BACK - playerY - (playerZ - focusZ)) / Math.SQRT2
  const halfWidth = depth * Math.tan(vfov / 2) * (Number(aspect) || 1) / (Number(zoom) || 1)
  // NDC spans two screen-width fractions: 8% of a 375px edge is 30px,
  // so its right-side NDC boundary is 1 - 2 * .08 = .84.
  const safeOffset = halfWidth * (1 - edgeInsetFraction * 2) - playerHalfWidth
  if (!(safeOffset > 0) || !Number.isFinite(safeOffset)) return focusX
  return Math.min(playerX + safeOffset, Math.max(playerX - safeOffset, focusX))
}
