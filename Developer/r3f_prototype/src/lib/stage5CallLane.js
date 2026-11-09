// Stage 5 시그니처 기믹 「전교 호출 방송」 순수 로직 (2026-11-08 스펙 Part B §7).
//
// 60초마다 교내 방송 차임(경고 3초) → 차임 순간 플레이어가 서 있던 레인이 10초간 '호출 레인'이 되고,
// 그 레인의 북쪽 끝(z −14.5)과 남쪽 끝(z +14.5)에서 2초마다 1기씩 좀비가 들어온다(펄스 5회 = 10기).
// 피해 지대가 아니라 스폰 지대다 — 피해·감속·강제 이동 없음, 즉사·끼임 위험 없음.
//
// 시계 = 스폰 시계(spawnSec × 1000). 스트림 스폰을 버스트 스케줄러가 소비하므로, 캐치업으로 스폰 시계가
// 당겨질 때 차임·바닥 표시·HUD가 스폰과 어긋나지 않게 같은 시계를 본다(S4 가마솥은 런타임 시계).
// 마릿수·타입·시각의 정본은 burstEvents.js STAGE5_BURST_EVENTS의 'stage5CallLane' 반복 descriptor다
// (73초 시작, 60초 간격, 240초 미만 → 73·133·193). 이 모듈은 그 descriptor를 펄스로 펼치기만 한다.
//
// 단위: 거리 = 월드 유닛(u), 1블록 = 4u. 시간 = ms.

export const STAGE5_CALL_STAGE_ID = 'stage5'
export const STAGE5_CALL_FIRST_SEC = 73
export const STAGE5_CALL_PERIOD_SEC = 60
export const STAGE5_CALL_LAST_START_SEC = 193       // 240초 전 3회(73·133·193). 포탈(210) 이후 회차 없음.
export const STAGE5_CALL_WARNING_MS = 3000
export const STAGE5_CALL_STREAM_MS = 10000
export const STAGE5_CALL_PULSE_MS = 2000
export const STAGE5_CALL_SPAWN_Z = 14.5             // 3.625블록. 스폰 inset 1.5u 안쪽 끝(halfZ 16 − 1.5)

// 레인 4개(책상 섬 3열 X 중심 −4.2 / 0 / +4.2, 폭 2.0u가 만든 통로). minX/maxX는 적이 다니는 폭.
export const STAGE5_CALL_LANES = Object.freeze([
  Object.freeze({ id: 'L1', minX: -9.36, maxX: -5.2, spawnX: -7.0 }),
  Object.freeze({ id: 'L2', minX: -3.2, maxX: -1.0, spawnX: -2.1 }),
  Object.freeze({ id: 'L3', minX: 1.0, maxX: 3.2, spawnX: 2.1 }),
  Object.freeze({ id: 'L4', minX: 5.2, maxX: 9.36, spawnX: 7.0 }),
])

// 오디오 id. soundmini가 SOUND_MAP에 넣기 전까지는 sfxRegistry가 모르는 id라 조용히 무시된다
// (sfxRegistry: `if (!SOUND_MAP[id]) return`, emitSfx는 절대 throw하지 않는다).
export const STAGE5_CALL_SFX = Object.freeze({ chime: 'stage5CallChime', start: 'stage5CallStart' })

const CYCLE_COUNT = Math.floor((STAGE5_CALL_LAST_START_SEC - STAGE5_CALL_FIRST_SEC) / STAGE5_CALL_PERIOD_SEC) + 1

export function stage5CallStartMs(cycle) {
  return (STAGE5_CALL_FIRST_SEC + cycle * STAGE5_CALL_PERIOD_SEC) * 1000
}

// 차임 시작 프레임의 플레이어 x로 레인을 고른다. 경계는 책상 섬 중심선(−4.2 / 0 / +4.2).
export function laneIndexForX(x) {
  if (!Number.isFinite(x)) return 0
  if (x < -4.2) return 0
  if (x < 0) return 1
  if (x < 4.2) return 2
  return 3
}

// 현재 ms가 속한 회차와 단계. 경고 [S−3s, S) = chiming, 스트림 [S, S+10s) = calling.
// out을 넘기면 그 객체를 채워 돌려준다(프레임 루프 무할당).
export function getStage5CallLaneVisual(spawnMs, stageId, phase = 'playing', out = { chiming: false, calling: false, cycle: -1 }) {
  out.chiming = false
  out.calling = false
  out.cycle = -1
  if (stageId !== STAGE5_CALL_STAGE_ID || phase !== 'playing' || !Number.isFinite(spawnMs)) return out
  for (let cycle = 0; cycle < CYCLE_COUNT; cycle += 1) {
    const start = stage5CallStartMs(cycle)
    if (spawnMs >= start - STAGE5_CALL_WARNING_MS && spawnMs < start) {
      out.chiming = true
      out.cycle = cycle
      return out
    }
    if (spawnMs >= start && spawnMs < start + STAGE5_CALL_STREAM_MS) {
      out.calling = true
      out.cycle = cycle
      return out
    }
  }
  return out
}

const feedbackScratch = { chiming: false, calling: false, cycle: -1 }

// 경계 1회 판정(S4 getStage4CauldronFeedback과 같은 틀). 지난 회차를 다시 울리지 않는다.
export function getStage5CallLaneFeedback(previousMs, ms, stageId, phase = 'playing') {
  if (!Number.isFinite(previousMs) || previousMs < 0 || !Number.isFinite(ms) || ms <= previousMs) return null
  const visual = getStage5CallLaneVisual(ms, stageId, phase, feedbackScratch)
  if (visual.cycle < 0) return null
  const start = stage5CallStartMs(visual.cycle)
  if (visual.calling && previousMs < start) return STAGE5_CALL_SFX.start
  if (visual.chiming && previousMs < start - STAGE5_CALL_WARNING_MS) return STAGE5_CALL_SFX.chime
  return null
}

// 한 'stage5CallLane' descriptor의 한 tick을 펄스로 펼친다. 펄스마다 레인 양끝에서 1기씩(홀수면 마지막은 북쪽만).
// firstPulseIndex = 같은 tick의 앞선 호출 descriptor가 이미 쓴 펄스 수(E03×8 → 0~3, E07×2 → 4).
export function createStage5CallLanePulses(event, laneIndex, tickSec, firstPulseIndex = 0) {
  const lane = STAGE5_CALL_LANES[laneIndex] ?? STAGE5_CALL_LANES[0]
  const count = Math.max(0, Math.floor(event?.count ?? 0))
  const pulses = []
  for (let i = 0; i * 2 < count; i += 1) {
    const ends = Math.min(2, count - i * 2)
    const spawns = [{ x: lane.spawnX, z: -STAGE5_CALL_SPAWN_Z }]
    if (ends === 2) spawns.push({ x: lane.spawnX, z: STAGE5_CALL_SPAWN_Z })
    pulses.push({ atMs: tickSec * 1000 + (firstPulseIndex + i) * STAGE5_CALL_PULSE_MS, type: event.type, laneIndex, spawns })
  }
  return pulses
}

export function stage5CallLanePulseCount(event) {
  return Math.ceil(Math.max(0, Math.floor(event?.count ?? 0)) / 2)
}

// 같은 시작 초를 가진 앞선 호출 descriptor들의 펄스 수 합 = 이 descriptor의 첫 펄스 번호.
export function stage5CallLanePulseOffset(events, eventIndex, formation) {
  const target = events?.[eventIndex]
  if (!target) return 0
  let offset = 0
  for (let index = 0; index < eventIndex; index += 1) {
    const evt = events[index]
    if (evt.formation === formation && evt.sec === target.sec && evt.repeatIntervalSec === target.repeatIntervalSec) offset += stage5CallLanePulseCount(evt)
  }
  return offset
}

// 한 회차 전체(호출 descriptor 전부)를 펄스로 펼친다 — 테스트·분석용.
export function createStage5CallLaneCyclePulses(events, laneIndex, tickSec) {
  const pulses = []
  let offset = 0
  for (const evt of events) {
    const next = createStage5CallLanePulses(evt, laneIndex, tickSec, offset)
    offset += next.length
    pulses.push(...next)
  }
  return pulses
}

// 런타임 펄스 버퍼(고정 크기). 프레임 루프는 스칼라만 읽고 쓴다.
// state: 0 빈칸 · 1 대기(시각 미도달) · 2 스케줄 큐에 올림.
export const STAGE5_CALL_PULSE_CAPACITY = 16

export function createStage5CallLanePulseBuffer(capacity = STAGE5_CALL_PULSE_CAPACITY) {
  return {
    atMs: new Float64Array(capacity),
    gameKey: new Float64Array(capacity),
    state: new Uint8Array(capacity),
    pulses: new Array(capacity).fill(null),
  }
}

export function clearStage5CallLanePulseBuffer(buffer) {
  if (!buffer) return
  buffer.state.fill(0)
  buffer.pulses.fill(null)
}

export function addStage5CallLanePulse(buffer, pulse, gameKey) {
  for (let slot = 0; slot < buffer.state.length; slot += 1) {
    if (buffer.state[slot] !== 0) continue
    buffer.state[slot] = 1
    buffer.atMs[slot] = pulse.atMs
    buffer.gameKey[slot] = gameKey
    buffer.pulses[slot] = pulse
    return slot
  }
  return -1
}
