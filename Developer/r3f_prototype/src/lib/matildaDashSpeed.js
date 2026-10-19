// Actual dash starts only: first dash is base; later starts add 1% of base, never compound.
// Count is owned/reset by the Matilda instance, not global state or the frame clock.
export function getMatildaDashSpeed(baseSpeed, startedDashCount) {
  return baseSpeed * (1 + Math.max(0, startedDashCount - 1) * 0.01)
}
