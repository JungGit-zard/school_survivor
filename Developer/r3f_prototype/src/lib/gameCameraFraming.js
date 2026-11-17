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

// ── Stage end reveal (2026-11-17, Stage 6 운동장 only) ──────────────────────────────────────────
// Near the top/bottom ends the follow camera keeps travelling past the arena edge (same zoom as
// everywhere else) so the school front and the gate/fence come into frame. The extended clamp never
// moves the focus past the player, so the view toward the arena interior is never smaller than in
// mid-field, and the part of the arena on screen is always a subset of what the plain clamp showed
// (nothing can spawn or be culled differently inside the visible screen).
// Rendering only — callers keep publishing the plain-clamp screen bounds to gameplay (spawns, tiers).
// Stages without an entry here get null and keep the old camera bit-for-bit.
export const STAGE_CAMERA_END_REVEAL = Object.freeze({
  stage6: Object.freeze({ beyondTop: 8, beyondBottom: 3.2 }),
})

// Exact ground reach (up = far side, down = near side) for a half vertical fov `a` (radians).
function groundReachAtHalfFov(a) {
  const pitch = Math.atan2(GAME_CAMERA_HEIGHT, GAME_CAMERA_BACK)
  return { up: GAME_CAMERA_HEIGHT / Math.tan(pitch - a) - GAME_CAMERA_BACK, down: GAME_CAMERA_BACK - GAME_CAMERA_HEIGHT / Math.tan(pitch + a) }
}

// Returns null (no change) or { zoom, focusZ, ... } for the rendered camera. `zoom` always equals
// fitZoom (no zoom change); `focusZ` replaces the plain clamped focus.
export function getStageCameraEndReveal(stageId, { fov = 30, fitZoom = 1, halfZ, playerZ }) {
  const cfg = STAGE_CAMERA_END_REVEAL[stageId]
  if (!cfg || !Number.isFinite(halfZ) || !Number.isFinite(playerZ)) return null
  const tanHalf = Math.tan((Number(fov) || 30) * Math.PI / 360)
  const r = groundReachAtHalfFov(Math.atan(tanHalf / fitZoom))
  const plainFz = clampGameplayCameraFocus(playerZ, r.up, r.down, halfZ)
  const lo = -halfZ - cfg.beyondTop + r.up, hi = halfZ + cfg.beyondBottom - r.down
  const focusZ = lo > hi ? plainFz : Math.min(hi, Math.max(lo, playerZ))
  return {
    zoom: fitZoom, focusZ,
    viewTop: focusZ - r.up, viewBottom: focusZ + r.down,
    plainViewTop: plainFz - r.up, plainViewBottom: plainFz + r.down,
    reachUp: r.up, reachDown: r.down,
  }
}
