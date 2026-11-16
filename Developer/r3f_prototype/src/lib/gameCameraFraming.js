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
// Near the top/bottom ends the camera may look past the arena edge so the school front (podium,
// flagpoles, hedges) and the gate/fence/playground come into frame. It never shows less of the arena
// interior than the plain clamp does: the interior-side view edge stays where it was and the camera
// eases out (zoom < 1) by exactly the amount needed to add `beyond` units on the outer side.
// Rendering only — callers keep publishing the plain-clamp screen bounds to gameplay (spawns, tiers).
// Stages without an entry here get null and keep the old camera bit-for-bit.
export const STAGE_CAMERA_END_REVEAL = Object.freeze({
  stage6: Object.freeze({ beyondTop: 9, beyondBottom: 3.5, rampFrom: 8, rampTo: 15 }),
})

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// Exact ground reach (up = far side, down = near side) for a half vertical fov `a` (radians).
function groundReachAtHalfFov(a) {
  const pitch = Math.atan2(GAME_CAMERA_HEIGHT, GAME_CAMERA_BACK)
  return { up: GAME_CAMERA_HEIGHT / Math.tan(pitch - a) - GAME_CAMERA_BACK, down: GAME_CAMERA_BACK - GAME_CAMERA_HEIGHT / Math.tan(pitch + a) }
}

// Returns null (no change) or { zoom, focusZ } for the rendered camera. `zoom` is the full camera.zoom
// (already including fitZoom); `focusZ` replaces the clamped focus. playerZ drives the ramp.
export function getStageCameraEndReveal(stageId, { fov = 30, fitZoom = 1, focusZ, playerZ }) {
  const cfg = STAGE_CAMERA_END_REVEAL[stageId]
  if (!cfg || !Number.isFinite(focusZ) || !Number.isFinite(playerZ)) return null
  const top = playerZ < 0, t = smoothstep(cfg.rampFrom, cfg.rampTo, Math.abs(playerZ))
  const beyond = (top ? cfg.beyondTop : cfg.beyondBottom) * t
  if (!(beyond > 1e-6)) return null
  const tanHalf = Math.tan((Number(fov) || 30) * Math.PI / 360)
  const a0 = Math.atan(tanHalf / fitZoom), r0 = groundReachAtHalfFov(a0)
  const viewTop = focusZ - r0.up, viewBottom = focusZ + r0.down
  const span = r0.up + r0.down + beyond
  let lo = a0, hi = Math.PI / 4 - 1e-3
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2, r = groundReachAtHalfFov(mid); if (r.up + r.down < span) lo = mid; else hi = mid }
  const a = hi, r = groundReachAtHalfFov(a)
  return {
    zoom: tanHalf / Math.tan(a),
    focusZ: top ? (viewTop - beyond) + r.up : viewTop + r.up,
    viewTop: top ? viewTop - beyond : viewTop,
    viewBottom: top ? viewTop - beyond + r.up + r.down : viewTop + r.up + r.down,
    plainViewTop: viewTop, plainViewBottom: viewBottom,
  }
}
