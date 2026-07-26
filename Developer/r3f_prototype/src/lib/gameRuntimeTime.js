const PUBLISH_INTERVAL_MS = 100

// Gameplay time is deliberately kept outside React/Zustand. Rendering may publish
// a snapshot at a lower cadence, but simulation gates must always see this value.
const runtimeTime = {
  elapsedMs: 0,
  lastPublishedMs: 0,
}

function toNonNegativeFinite(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0
}

export function getRuntimeElapsedMs(storeElapsedMs = 0) {
  return Math.max(runtimeTime.elapsedMs, toNonNegativeFinite(storeElapsedMs))
}

export function advanceRuntimeTime(deltaMs) {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return runtimeTime.elapsedMs
  runtimeTime.elapsedMs += deltaMs
  return runtimeTime.elapsedMs
}

export function setRuntimeElapsedMs(elapsedMs) {
  runtimeTime.elapsedMs = toNonNegativeFinite(elapsedMs)
  return runtimeTime.elapsedMs
}

export function resetRuntimeTime() {
  runtimeTime.elapsedMs = 0
  runtimeTime.lastPublishedMs = 0
}

export function isRuntimeTimePublishDue(storeElapsedMs = 0) {
  const elapsedMs = getRuntimeElapsedMs(storeElapsedMs)
  return elapsedMs !== runtimeTime.lastPublishedMs && elapsedMs - runtimeTime.lastPublishedMs >= PUBLISH_INTERVAL_MS
}

export function markRuntimeTimePublished(storeElapsedMs = 0) {
  runtimeTime.lastPublishedMs = getRuntimeElapsedMs(storeElapsedMs)
  return runtimeTime.lastPublishedMs
}

export { PUBLISH_INTERVAL_MS }
