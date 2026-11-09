// Stage 5 전교 호출 방송 런타임 상태(단일 발행자 = Enemies.jsx). HUD·바닥 표시·오디오는 읽기만 한다.
// phase: 'idle' | 'chiming' | 'calling'. laneIndex는 차임 시작 프레임에 스냅샷한 레인(0~3), 없으면 −1.

const state = { gameKey: -1, cycle: -1, laneIndex: -1, phase: 'idle', version: 0 }

export function publishStage5CallLaneState(gameKey, cycle, laneIndex, phase) {
  if (state.gameKey === gameKey && state.cycle === cycle && state.laneIndex === laneIndex && state.phase === phase) return state
  state.gameKey = gameKey
  state.cycle = cycle
  state.laneIndex = laneIndex
  state.phase = phase
  state.version += 1
  return state
}

export function getStage5CallLaneState() {
  return state
}

export function resetStage5CallLaneState() {
  state.gameKey = -1
  state.cycle = -1
  state.laneIndex = -1
  state.phase = 'idle'
  state.version += 1
}
