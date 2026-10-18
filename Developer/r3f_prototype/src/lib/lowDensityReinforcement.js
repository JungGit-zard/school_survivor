// 화면/HP/처치속도와 무관한 실제 생존 좀비 저밀도 타이머.
export const LOW_DENSITY_REINFORCEMENT_ALIVE_THRESHOLD = 3
export const LOW_DENSITY_REINFORCEMENT_STREAK_SEC = 10
export const LOW_DENSITY_REINFORCEMENT_ENTRIES = Object.freeze([
  Object.freeze({ type: 'E07', count: 10 }),
  Object.freeze({ type: 'E01', count: 10 }),
])
const NO_SPAWN = Object.freeze({ shouldSpawn: false, entries: Object.freeze([]) })

export function createLowDensityReinforcementState() {
  return { lowForSec: 0, pending: false, stageId: undefined, gameKey: undefined }
}

export function resetLowDensityReinforcementState(state) {
  if (!state) return state
  state.lowForSec = 0
  state.pending = false
  state.stageId = undefined
  state.gameKey = undefined
  return state
}

// 소비 후에만 자체 예약 잠금을 해제한다. 다른 시스템의 큐는 타이머를 막지 않는다.
export function finishLowDensityReinforcement(state) {
  if (!state) return
  state.pending = false
  state.lowForSec = 0
}

export function advanceLowDensityReinforcement(state, options = {}) {
  if (!state) return NO_SPAWN
  const { phase = 'playing', stageId, gameKey, deltaSec = 0, aliveEnemyCount = 0,
    queuedEnemyCount = 0, availableSpawnSlots = 20 } = options
  if (state.stageId !== stageId || state.gameKey !== gameKey) {
    resetLowDensityReinforcementState(state)
    state.stageId = stageId
    state.gameKey = gameKey
  }
  if (phase !== 'playing') return NO_SPAWN
  if (!Number.isFinite(aliveEnemyCount) || aliveEnemyCount < 0
    || aliveEnemyCount > LOW_DENSITY_REINFORCEMENT_ALIVE_THRESHOLD) {
    state.lowForSec = 0
    return NO_SPAWN
  }
  if (state.pending || !Number.isFinite(deltaSec) || deltaSec <= 0) return NO_SPAWN
  state.lowForSec = Math.min(LOW_DENSITY_REINFORCEMENT_STREAK_SEC, state.lowForSec + deltaSec)
  // 600 fixed steps can land a few ulps below ten seconds; not a gameplay grace window.
  if (state.lowForSec + 1e-9 < LOW_DENSITY_REINFORCEMENT_STREAK_SEC) return NO_SPAWN
  // 다른 예약은 생존 수가 아니며 슬롯 예약량은 caller가 계산한다.
  // 자체 pending 잠금만 중복을 막고, 20슬롯 미만이면 준비된 타이머를 보존한다.
  if (!Number.isFinite(availableSpawnSlots) || Math.floor(availableSpawnSlots) < 20) return NO_SPAWN
  const entries = LOW_DENSITY_REINFORCEMENT_ENTRIES.map((entry) => ({ ...entry }))
  state.pending = true
  state.lowForSec = 0
  return { shouldSpawn: true, entries }
}
