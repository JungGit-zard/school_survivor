export const B02_BLOCKADE_DAMAGE = 18
export const B02_BLOCKADE_TELEGRAPH_MS = 1_200
export const B02_BLOCKADE_LINE_ACTIVE_MS = 500
export const B02_BLOCKADE_LINE_COUNT = 3
export const B02_BLOCKADE_STUN_MS = 1_200
export const B02_BLOCKADE_LINE_WIDTH = 1.2

export function createB02CorridorBlockadeState({
  phase = 'idle',
  lineZs = [],
  triggeredSeventy = false,
  triggeredThirtyFive = false,
} = {}) {
  return {
    phase,
    elapsedMs: 0,
    activeLineIndex: -1,
    lineZs: [...lineZs],
    damagedPlayer: false,
    triggeredSeventy,
    triggeredThirtyFive,
  }
}

export function getB02CorridorBlockadeTrigger({ hpRatio = 1, elapsedMs = 0, chargeState = 'idle', state } = {}) {
  if (!state || state.phase !== 'idle' || chargeState !== 'chase' || elapsedMs >= 200_000) return null
  if (hpRatio <= 0.70 && !state.triggeredSeventy) return 'seventy'
  if (hpRatio <= 0.35 && !state.triggeredThirtyFive) return 'thirtyFive'
  return null
}

export function startB02CorridorBlockade(state, trigger, lineZs) {
  if (!state || (trigger !== 'seventy' && trigger !== 'thirtyFive')) return state
  return {
    ...state,
    phase: 'telegraph',
    elapsedMs: 0,
    activeLineIndex: -1,
    lineZs: [...lineZs],
    damagedPlayer: false,
    triggeredSeventy: state.triggeredSeventy || trigger === 'seventy',
    triggeredThirtyFive: state.triggeredThirtyFive || trigger === 'thirtyFive',
  }
}

export function advanceB02CorridorBlockade(state, deltaMs = 0) {
  if (!state || state.phase === 'idle') return state
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs)
  if (state.phase === 'telegraph') {
    if (elapsedMs < B02_BLOCKADE_TELEGRAPH_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'active', elapsedMs: elapsedMs - B02_BLOCKADE_TELEGRAPH_MS, activeLineIndex: 0 }
  }
  if (state.phase === 'active') {
    const activeLineIndex = Math.floor(elapsedMs / B02_BLOCKADE_LINE_ACTIVE_MS)
    if (activeLineIndex < B02_BLOCKADE_LINE_COUNT) return { ...state, elapsedMs, activeLineIndex }
    return { ...state, phase: 'stun', elapsedMs: elapsedMs - B02_BLOCKADE_LINE_ACTIVE_MS * B02_BLOCKADE_LINE_COUNT, activeLineIndex: -1 }
  }
  if (state.phase === 'stun') {
    if (elapsedMs < B02_BLOCKADE_STUN_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'idle', elapsedMs: 0, activeLineIndex: -1, lineZs: [], damagedPlayer: false }
  }
  return state
}

export function isPlayerInsideB02BlockadeLine({ playerZ = 0, lineZ = 0, lineWidth = B02_BLOCKADE_LINE_WIDTH } = {}) {
  return Math.abs(playerZ - lineZ) < lineWidth / 2
}

export function consumeB02CorridorBlockadeHit(state, playerZ) {
  const lineZ = state?.lineZs?.[state.activeLineIndex]
  if (state?.phase !== 'active' || state.damagedPlayer || !Number.isFinite(lineZ)
    || !isPlayerInsideB02BlockadeLine({ playerZ, lineZ })) {
    return { state, damage: 0 }
  }
  return { state: { ...state, damagedPlayer: true }, damage: B02_BLOCKADE_DAMAGE }
}

export function getB02CorridorBlockadeLineZs({ bossZ = 0, playerZ = 0, halfZ = 19.2 } = {}) {
  const direction = playerZ >= bossZ ? 1 : -1
  const inset = B02_BLOCKADE_LINE_WIDTH / 2 + 0.4
  const spacing = 3.6
  const minimum = -halfZ + inset
  const maximum = halfZ - inset
  const span = spacing * (B02_BLOCKADE_LINE_COUNT - 1)
  const lowStart = Math.max(minimum, Math.min(maximum - span, bossZ + direction * 2.8 - (direction < 0 ? span : 0)))
  return direction > 0
    ? Array.from({ length: B02_BLOCKADE_LINE_COUNT }, (_, index) => lowStart + spacing * index)
    : Array.from({ length: B02_BLOCKADE_LINE_COUNT }, (_, index) => lowStart + span - spacing * index)
}
