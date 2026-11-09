import { emitExpansionHazardSnapshot } from './expansionAttackRuntime.js'
// Stage 6 시그니처 기믹 「훈화 말씀」 스케줄(조회대 스피커, 스펙 Part C C-7). 순수 스케줄 + 재시도 대기열.
// 데이터 정본: EXPANSION_HAZARDS.H06 — 원점 (0, −19)u, 30·60·90·120초(endExclusive 150), 회차당 고리 2개(0 / +0.8초),
// 사전 경고 1초 전(preCue), windup 1.6초, 피해 12(무적 존중), 외반경 = 플레이어 거리 + 0.6u(2~40u), 폭 1.2u.
// 시계 = 런타임 경과 시간(Game.jsx 고정 스텝, S4 가마솥과 같은 시계). 고리 판정·텔레그래프는 확장 공격 런타임이 맡는다
// (emitExpansionHazardSnapshot / stepExpansionHazardSnapshots). 이 모듈은 "언제 무엇을 낼지"만 정한다.

// 오디오·HUD 훅 id. soundmini가 SOUND_MAP에 넣기 전까지 sfxRegistry가 모르는 id라 조용히 무시된다
// (sfxRegistry: `if (!SOUND_MAP[id]) return`, emitSfx는 throw하지 않는다).
export const STAGE6_SFX = Object.freeze({
  micFeedback: 'stage6MicFeedback',       // 훈화 사전 경고·보스 등장
  speechRingPulse: 'stage6SpeechRingPulse', // 고리 active 진입(고리당 1회)
  schoolChime: 'stage6SchoolChime',         // 첫 훈화 튜토리얼(27.5초)
  relayWhistle: 'stage6RelayWhistle',       // B05 소환 경고
  anthemSting: 'stage6AnthemSting',         // B05 교가 제창 windup 시작
  gateOpen: 'stage6GateOpen',               // 210초 정문 개방
})

// 첫 회차 튜토리얼(학교 종 + hud.stage6.speechTutorial)은 첫 발신 2.5초 전.
export const ASSEMBLY_SPEECH_TUTORIAL_LEAD_SEC = 2.5

function cycleStarts(hazard) {
  const starts = []
  for (let t = hazard.firstSec; t < hazard.endExclusiveSec; t += hazard.intervalSec) starts.push(t)
  return starts
}

const NO_CUES = Object.freeze([])

// (prevSec, nowSec] 구간에 지나간 신호 목록. kind: 'tutorial' | 'preCue' | 'emit'. emit은 고리마다 1개.
export function getAssemblySpeechCues(hazard, prevSec, nowSec) {
  if (!hazard || !Number.isFinite(prevSec) || !Number.isFinite(nowSec) || nowSec <= prevSec) return NO_CUES
  let cues = null
  const push = (cue) => { (cues ??= []).push(cue) }
  const crossed = (atSec) => prevSec < atSec && atSec <= nowSec
  cycleStarts(hazard).forEach((start, cycle) => {
    if (cycle === 0 && crossed(start - ASSEMBLY_SPEECH_TUTORIAL_LEAD_SEC)) push({ cycle, ring: -1, kind: 'tutorial', atSec: start - ASSEMBLY_SPEECH_TUTORIAL_LEAD_SEC })
    const preCueSec = start - hazard.preCueLeadMs / 1000
    if (crossed(preCueSec)) push({ cycle, ring: -1, kind: 'preCue', atSec: preCueSec })
    hazard.ringDelaysMs.forEach((delayMs, ring) => {
      const atSec = start + delayMs / 1000
      if (crossed(atSec)) push({ cycle, ring, kind: 'emit', atSec })
    })
  })
  return cues ?? NO_CUES
}

export function createAssemblySpeechState(gameKey = 0) {
  return { gameKey, pending: [], emitted: 0, skipped: 0, ringRanges: new Map() }
}

// 고리 1개 발신(Game.jsx·런타임 프로브·소크 공용 — 세 곳이 같은 규칙을 쓴다).
// 2026-11-08 wave 4: 회차의 2번째 고리는 플레이어를 다시 겨누지 않고 1번째 고리와 같은 원점의 동심 물결이다 —
// 외반경 = 1번째 고리 외반경 + followUpRingOffsetUnits(1.8u). 1번째 고리 띠 위에 서 있으면 2번째 고리가
// 인증에 실패해 건너뛰던(soak 33%) 문제를 없앤다. 탈출 인증은 그대로 하되, 같은 회차 형제 고리는 함께 읽히도록
// 설계된 한 쌍이라 서로의 인증 대상에서 뺀다(보스 패턴·다른 회차 해저드는 그대로 본다).
// 1번째 고리가 건너뛰어졌으면 2번째 고리는 기존 규칙(플레이어 거리)으로 낸다.
export function emitAssemblySpeechRing(state, hazard, entry, { gameKey, playerX, playerZ, stageId, halfX, halfZ, obstacles }) {
  const prefix = `${hazard.id}:${gameKey}:${entry.cycle}:`
  const base = entry.ring > 0 ? state.ringRanges?.get(entry.cycle) : undefined
  const ripple = Number.isFinite(base) && hazard.followUpRingOffsetUnits > 0
  const snapshot = emitExpansionHazardSnapshot({
    hazardId: hazard.id, pattern: hazard.pattern, originXZ: hazard.originUnits, key: prefix + entry.ring, gameKey,
    playerX, playerZ, stageId, halfX, halfZ, obstacles,
    rangeUnitsOverride: ripple ? base + entry.ring * hazard.followUpRingOffsetUnits : undefined,
    certExcludeKeyPrefix: ripple ? prefix : undefined,
  })
  if (snapshot && entry.ring === 0) (state.ringRanges ??= new Map()).set(entry.cycle, snapshot.rangeUnits)
  return snapshot
}

// 한 프레임 진행. tryEmit(cue) → 성공 true(안전 기하·탈출 인증 통과), 실패 false(250ms 뒤 최대 4회 재시도, 그래도 실패면 그 고리만 건너뜀).
// onCue(cue)는 tutorial·preCue 신호에 호출된다(SFX·HUD).
export function advanceAssemblySpeech(state, hazard, prevSec, nowSec, tryEmit, onCue) {
  for (const cue of getAssemblySpeechCues(hazard, prevSec, nowSec)) {
    if (cue.kind === 'emit') state.pending.push({ cycle: cue.cycle, ring: cue.ring, dueSec: cue.atSec, retries: 0 })
    else onCue?.(cue)
  }
  if (state.pending.length === 0) return state
  const retrySec = (hazard.retryMs ?? 250) / 1000
  const maxRetries = hazard.maxRetries ?? 4
  for (let index = 0; index < state.pending.length;) {
    const entry = state.pending[index]
    if (entry.dueSec > nowSec) { index += 1; continue }
    if (tryEmit(entry)) {
      state.emitted += 1
      state.pending.splice(index, 1)
    } else if (entry.retries < maxRetries) {
      entry.retries += 1
      entry.dueSec = nowSec + retrySec
      index += 1
    } else {
      state.skipped += 1
      state.pending.splice(index, 1)
    }
  }
  return state
}

// HUD 신호 발행(uimini가 읽는다): tutorial → hud.stage6.speechTutorial, preCue → hud.stage6.speechShort.
const cueState = { version: 0, gameKey: -1, kind: null, cycle: -1 }
export function publishAssemblySpeechCue(gameKey, kind, cycle) {
  cueState.version += 1
  cueState.gameKey = gameKey
  cueState.kind = kind
  cueState.cycle = cycle
  return cueState
}
export function getAssemblySpeechCueState() {
  return cueState
}
