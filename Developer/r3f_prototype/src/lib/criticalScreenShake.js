// Critical-hit camera shake runtime.
// This intentionally keeps one bounded, module-local impulse instead of a queue:
// frequent crits cannot accumulate timers, React renders, or retained events.

export const CRITICAL_SHAKE_NORMAL_DURATION_MS = 90
export const CRITICAL_SHAKE_STRONG_DURATION_MS = 140
export const CRITICAL_SHAKE_COALESCE_MS = 80
export const CRITICAL_SHAKE_COOLDOWN_MS = 140
export const CRITICAL_SHAKE_MAX_STRENGTH = 1.25

export const CRITICAL_SHAKE_NORMAL_X_RATIO = 0.007
export const CRITICAL_SHAKE_NORMAL_Y_RATIO = 0.0035
export const CRITICAL_SHAKE_STRONG_X_RATIO = 0.0115
export const CRITICAL_SHAKE_STRONG_Y_RATIO = 0.0055
export const ENEMY_HIT_SHAKE_STRENGTH = 0.58

let active = false
let startedAtMs = 0
let lastStartedAtMs = Number.NEGATIVE_INFINITY
let durationMs = 0
let horizontalRatio = 0
let verticalRatio = 0
let directionX = 1
let directionZ = 0
let strength = 0
let rank = 0
let lastWholeScreenCriticalAtMs = Number.NEGATIVE_INFINITY
const wholeScreenCriticalListeners = new Set()
let reducedMotionQuery = null
let reducedMotionQueryInitialized = false

function currentTimeMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now()
  return Date.now()
}

function finiteNow(nowMs) {
  const now = Number(nowMs)
  return Number.isFinite(now) ? now : currentTimeMs()
}

function normalizedDirection(impactX, impactZ) {
  const x = Number(impactX)
  const z = Number(impactZ)
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null
  const length = Math.hypot(x, z)
  if (!Number.isFinite(length) || length < 1e-5) return null
  return length
}

function reducedMotionEnabled() {
  if (typeof document !== 'undefined' && document.documentElement?.dataset?.reducedEffects === 'true') return true
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  if (!reducedMotionQueryInitialized) {
    reducedMotionQueryInitialized = true
    try {
      reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)') ?? null
    } catch {
      return false
    }
  }
  return reducedMotionQuery?.matches === true
}

function hitCameraShakeSettingEnabled() {
  if (typeof document !== 'undefined' && document.documentElement?.dataset?.hitCameraShake === 'false') return false
  return true
}

function clearActiveState() {
  active = false
  startedAtMs = 0
  durationMs = 0
  horizontalRatio = 0
  verticalRatio = 0
  directionX = 1
  directionZ = 0
  strength = 0
  rank = 0
}

export function resetCriticalScreenShakeForTest() {
  clearActiveState()
  lastStartedAtMs = Number.NEGATIVE_INFINITY
  lastWholeScreenCriticalAtMs = Number.NEGATIVE_INFINITY
  reducedMotionQuery = null
  reducedMotionQueryInitialized = false
}

export function subscribeWholeScreenCriticalShake(listener) {
  if (typeof listener !== 'function') return () => {}
  wholeScreenCriticalListeners.add(listener)
  return () => wholeScreenCriticalListeners.delete(listener)
}

export function emitCriticalHitScreenShake(impactX = 0, impactZ = 0, { strong = false, nowMs } = {}) {
  const now = finiteNow(nowMs)
  const cameraShakeStarted = emitCriticalScreenShake(impactX, impactZ, strong, 1, now)
  const elapsed = now - lastWholeScreenCriticalAtMs
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < CRITICAL_SHAKE_COOLDOWN_MS) {
    return cameraShakeStarted
  }

  lastWholeScreenCriticalAtMs = now
  const event = {
    strong,
    durationMs: strong ? CRITICAL_SHAKE_STRONG_DURATION_MS : CRITICAL_SHAKE_NORMAL_DURATION_MS,
  }
  wholeScreenCriticalListeners.forEach((listener) => {
    try { listener(event) } catch {}
  })
  return cameraShakeStarted || wholeScreenCriticalListeners.size > 0
}

export function isCriticalScreenShakeReduced() {
  return reducedMotionEnabled() || !hitCameraShakeSettingEnabled()
}

// `impactX`/`impactZ` are world-ground deltas from player to target. The camera
// converts them to its screen-local right/up axes when it applies this frame.
export function emitCriticalScreenShake(impactX = 0, impactZ = 0, strong = false, requestedStrength = 1, nowMs) {
  if (reducedMotionEnabled() || !hitCameraShakeSettingEnabled()) return false

  const now = finiteNow(nowMs)
  const candidateStrength = Math.min(
    CRITICAL_SHAKE_MAX_STRENGTH,
    Math.max(0, Number.isFinite(Number(requestedStrength)) ? Number(requestedStrength) : 1),
  )
  if (candidateStrength <= 0) return false

  const directionLength = normalizedDirection(impactX, impactZ)
  const safeImpactX = Number(impactX)
  const safeImpactZ = Number(impactZ)
  const candidateDirectionX = directionLength ? safeImpactX / directionLength : 1
  const candidateDirectionZ = directionLength ? safeImpactZ / directionLength : 0
  const candidateRank = Math.min(CRITICAL_SHAKE_MAX_STRENGTH, (strong ? CRITICAL_SHAKE_MAX_STRENGTH : 1) * candidateStrength)

  let keepOriginalStart = false
  if (lastStartedAtMs !== Number.NEGATIVE_INFINITY) {
    const elapsed = now - lastStartedAtMs
    // A clock rollback must never keep a stale impulse alive indefinitely.
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      resetCriticalScreenShakeForTest()
    } else if (active && elapsed <= CRITICAL_SHAKE_COALESCE_MS) {
      // Within one impact window only the strongest request survives. Keeping the
      // original start time prevents a rapid-fire stream from extending the shake.
      if (candidateRank <= rank) return false
      keepOriginalStart = true
    } else if (elapsed < CRITICAL_SHAKE_COOLDOWN_MS) {
      // The 80–140ms gap is the cooldown. It deliberately ignores new requests.
      return false
    }
  }

  active = true
  if (!keepOriginalStart) {
    startedAtMs = now
    lastStartedAtMs = now
  }
  durationMs = strong ? CRITICAL_SHAKE_STRONG_DURATION_MS : CRITICAL_SHAKE_NORMAL_DURATION_MS
  horizontalRatio = strong ? CRITICAL_SHAKE_STRONG_X_RATIO : CRITICAL_SHAKE_NORMAL_X_RATIO
  verticalRatio = strong ? CRITICAL_SHAKE_STRONG_Y_RATIO : CRITICAL_SHAKE_NORMAL_Y_RATIO
  directionX = candidateDirectionX
  directionZ = candidateDirectionZ
  strength = candidateStrength
  rank = candidateRank
  return true
}

export function emitEnemyHitScreenShake(impactX = 0, impactZ = 0, { strong = false, strength = ENEMY_HIT_SHAKE_STRENGTH, nowMs } = {}) {
  return emitCriticalScreenShake(impactX, impactZ, strong, strength, nowMs)
}

// Writes into caller-owned `out`, so Game.jsx can reuse one object in useFrame.
export function sampleCriticalScreenShake(out, nowMs) {
  const target = out
  target.horizontal = 0
  target.vertical = 0
  target.impactX = 1
  target.impactZ = 0
  target.active = false

  if (!active) return target
  if (reducedMotionEnabled() || !hitCameraShakeSettingEnabled()) {
    // A newly enabled reduced-motion/effect setting must not resume a stale impulse if
    // the player turns the setting off again before its original duration ends.
    clearActiveState()
    return target
  }
  const elapsed = finiteNow(nowMs) - startedAtMs
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= durationMs) {
    if (elapsed >= durationMs) clearActiveState()
    return target
  }

  const progress = elapsed / durationMs
  // Three short, deterministic direction changes with a quadratic decay. Unlike
  // random jitter, this remains readable on a small mobile display.
  const pulse = Math.cos(progress * Math.PI * 3) * (1 - progress) * (1 - progress)
  target.horizontal = horizontalRatio * strength * pulse
  target.vertical = verticalRatio * strength * pulse
  target.impactX = directionX
  target.impactZ = directionZ
  target.active = true
  return target
}

export function createCriticalScreenShakeFrame() {
  return { horizontal: 0, vertical: 0, impactX: 1, impactZ: 0, active: false }
}
