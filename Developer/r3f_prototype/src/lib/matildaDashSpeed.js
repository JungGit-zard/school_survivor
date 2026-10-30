// Actual dash starts only: first dash is base; later starts add 3% of base, never compound.
// 2026-10-30 Terry: 증가계수 3배(0.01 → 0.03). 상한 없음 — 20회 1.57x, 50회 2.47x, 100회 3.97x.
// Count is owned/reset by the Matilda instance, not global state or the frame clock.
export const MATILDA_DASH_SPEED_STEP = 0.03

export function getMatildaDashSpeed(baseSpeed, startedDashCount) {
  return baseSpeed * (1 + Math.max(0, startedDashCount - 1) * MATILDA_DASH_SPEED_STEP)
}
