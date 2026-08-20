export const B03_SHUTTLE_DAMAGE_PER_PASS = 16
export const B03_SHUTTLE_TELEGRAPH_MS = 1_250
export const B03_SHUTTLE_PASS_DURATION_MS = 1_100
export const B03_SHUTTLE_STUN_MS = 1_200
export const B03_SHUTTLE_LANE_WIDTH = 1.2

export function createB03ShuttleRunState({
  phase = 'idle', laneZ = 0, startX = 0, endX = 0,
  triggeredSixtyFive = false, triggeredThirty = false,
} = {}) {
  return {
    phase, elapsedMs: 0, passIndex: -1, laneZ, startX, endX,
    passDurationMs: B03_SHUTTLE_PASS_DURATION_MS,
    hitPasses: [false, false], triggeredSixtyFive, triggeredThirty,
  }
}

export function getB03ShuttleRunTrigger({ hpRatio = 1, elapsedMs = 0, chargeState = 'idle', state } = {}) {
  if (!state || state.phase !== 'idle' || chargeState !== 'chase' || elapsedMs >= 200_000) return null
  if (hpRatio <= 0.65 && !state.triggeredSixtyFive) return 'sixtyFive'
  if (hpRatio <= 0.30 && !state.triggeredThirty) return 'thirty'
  return null
}

export function startB03ShuttleRun(state, trigger, { laneZ, startX, endX }) {
  if (!state || (trigger !== 'sixtyFive' && trigger !== 'thirty')) return state
  return {
    ...state, phase: 'telegraph', elapsedMs: 0, passIndex: -1, laneZ, startX, endX,
    hitPasses: [false, false],
    triggeredSixtyFive: state.triggeredSixtyFive || trigger === 'sixtyFive',
    triggeredThirty: state.triggeredThirty || trigger === 'thirty',
  }
}

export function advanceB03ShuttleRun(state, deltaMs = 0) {
  if (!state || state.phase === 'idle') return state
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs)
  if (state.phase === 'telegraph') {
    if (elapsedMs < B03_SHUTTLE_TELEGRAPH_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'active', elapsedMs: elapsedMs - B03_SHUTTLE_TELEGRAPH_MS, passIndex: 0 }
  }
  if (state.phase === 'active') {
    const passIndex = Math.floor(elapsedMs / state.passDurationMs)
    if (passIndex < 2) return { ...state, elapsedMs, passIndex }
    return { ...state, phase: 'stun', elapsedMs: elapsedMs - state.passDurationMs * 2, passIndex: -1 }
  }
  if (state.phase === 'stun') {
    if (elapsedMs < B03_SHUTTLE_STUN_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'idle', elapsedMs: 0, passIndex: -1, hitPasses: [false, false] }
  }
  return state
}

export function getB03ShuttleRunX(state) {
  if (state?.phase !== 'active') return state?.startX ?? 0
  const localProgress = Math.min(1, (state.elapsedMs % state.passDurationMs) / state.passDurationMs)
  return state.passIndex === 0
    ? state.startX + (state.endX - state.startX) * localProgress
    : state.endX + (state.startX - state.endX) * localProgress
}

export function getB03ShuttleRunLaneZ(playerZ, halfZ) {
  const inset = B03_SHUTTLE_LANE_WIDTH / 2 + 0.4
  return Math.max(-halfZ + inset, Math.min(halfZ - inset, playerZ))
}

export function consumeB03ShuttleRunPassHit(state, playerZ, playerX, bossX) {
  const passIndex = state?.passIndex
  if (state?.phase !== 'active' || passIndex < 0 || passIndex > 1 || state.hitPasses[passIndex]
    || Math.abs(playerZ - state.laneZ) >= B03_SHUTTLE_LANE_WIDTH / 2
    || !Number.isFinite(playerX) || !Number.isFinite(bossX) || Math.abs(playerX - bossX) >= 0.7) return { state, damage: 0 }
  const hitPasses = [...state.hitPasses]
  hitPasses[passIndex] = true
  return { state: { ...state, hitPasses }, damage: B03_SHUTTLE_DAMAGE_PER_PASS }
}
