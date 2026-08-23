export const B02_BLOCKADE_DAMAGE = 18
export const B02_BLOCKADE_TELEGRAPH_MS = 1_200
// 세 선을 0.5초씩 순차로 켜던 구조를 버리고, 보스를 감싸는 선을 한 번에 1.5초 동안 켠다.
// 총 시전 길이(1.2 + 1.5 + 1.2 = 3.9초)는 예전과 같다.
export const B02_BLOCKADE_ACTIVE_MS = 1_500
export const B02_BLOCKADE_STUN_MS = 1_200
export const B02_BLOCKADE_LINE_WIDTH = 1.2
// 보스 자신을 기준으로 앞뒤 이 거리에 선을 하나씩 긋는다(2026-08-23 사용자 지시).
// 예전에는 보스에서 플레이어 쪽으로 세 줄이 밀려왔지만, 이제는 보스가 자기 영역을
// 선으로 두르고 플레이어가 그 선을 밟고 넘을 때 피해를 준다.
export const B02_BLOCKADE_RING_OFFSET = 3.0
export const B02_BLOCKADE_LINE_COUNT = 2

export function createB02CorridorBlockadeState({
  phase = 'idle',
  lineZs = [],
  triggeredSeventy = false,
  triggeredThirtyFive = false,
} = {}) {
  return {
    phase,
    elapsedMs: 0,
    lineZs: [...lineZs],
    // 선마다 시전당 1회씩 판정한다 — 들어갈 때 한 번, 나올 때 한 번 맞는다.
    damagedLines: lineZs.map(() => false),
    triggeredSeventy,
    triggeredThirtyFive,
  }
}

// HP 임계에 닿으면 경과 시간과 무관하게 반드시 발현한다(2026-08-23 사용자 지시).
// 예전에는 200초 이후 시전을 막아서, 그 전에 HP를 못 깎으면 필살기가 영영 안 나왔다.
export function getB02CorridorBlockadeTrigger({ hpRatio = 1, chargeState = 'idle', state } = {}) {
  if (!state || state.phase !== 'idle' || chargeState !== 'chase') return null
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
    lineZs: [...lineZs],
    damagedLines: lineZs.map(() => false),
    triggeredSeventy: state.triggeredSeventy || trigger === 'seventy',
    triggeredThirtyFive: state.triggeredThirtyFive || trigger === 'thirtyFive',
  }
}

export function advanceB02CorridorBlockade(state, deltaMs = 0) {
  if (!state || state.phase === 'idle') return state
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs)
  if (state.phase === 'telegraph') {
    if (elapsedMs < B02_BLOCKADE_TELEGRAPH_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'active', elapsedMs: elapsedMs - B02_BLOCKADE_TELEGRAPH_MS }
  }
  if (state.phase === 'active') {
    if (elapsedMs < B02_BLOCKADE_ACTIVE_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'stun', elapsedMs: elapsedMs - B02_BLOCKADE_ACTIVE_MS }
  }
  if (state.phase === 'stun') {
    if (elapsedMs < B02_BLOCKADE_STUN_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'idle', elapsedMs: 0, lineZs: [], damagedLines: [] }
  }
  return state
}

export function isPlayerInsideB02BlockadeLine({ playerZ = 0, lineZ = 0, lineWidth = B02_BLOCKADE_LINE_WIDTH } = {}) {
  return Math.abs(playerZ - lineZ) < lineWidth / 2
}

// 활성 중인 모든 선을 검사한다. 한 선은 시전당 한 번만 때리므로, 보스에게 들어갈 때
// 한 번·빠져나올 때 한 번 맞고 같은 선 위에서 비벼도 연타당하지 않는다.
export function consumeB02CorridorBlockadeHit(state, playerZ) {
  if (state?.phase !== 'active') return { state, damage: 0 }
  const lineZs = state.lineZs ?? []
  for (let index = 0; index < lineZs.length; index += 1) {
    if (state.damagedLines?.[index]) continue
    if (!Number.isFinite(lineZs[index])) continue
    if (!isPlayerInsideB02BlockadeLine({ playerZ, lineZ: lineZs[index] })) continue
    const damagedLines = [...(state.damagedLines ?? lineZs.map(() => false))]
    damagedLines[index] = true
    return { state: { ...state, damagedLines }, damage: B02_BLOCKADE_DAMAGE }
  }
  return { state, damage: 0 }
}

// 보스 앞뒤로 한 줄씩. 복도 밖으로 나가는 선은 버린다 — 화면에 없는 선으로 때리지 않는다.
// 두 선은 복도 폭 전체를 가로지르므로 벽에 붙어 우회할 수 없고, 보스에게 접근하려면
// 반드시 한 줄을 밟고 넘어야 한다.
export function getB02CorridorBlockadeLineZs({ bossZ = 0, halfZ = 19.2 } = {}) {
  const inset = B02_BLOCKADE_LINE_WIDTH / 2 + 0.4
  const minimum = -halfZ + inset
  const maximum = halfZ - inset
  return [bossZ - B02_BLOCKADE_RING_OFFSET, bossZ + B02_BLOCKADE_RING_OFFSET]
    .filter((z) => z >= minimum && z <= maximum)
}
