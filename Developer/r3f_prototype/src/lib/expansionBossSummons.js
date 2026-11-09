// 확장 보스 소환 타이머(Stage 6 B05 교장 좀비 '운동장 10바퀴', 스펙 Part C C-6-4). 순수 함수 — 패턴 슬롯과 별개.
// 데이터: EXPANSION_BOSSES.B05.summon = { type E21, count 6, formation track_lanes, warningMs 1200,
//   firstDelayMs 12000, intervalMs 30000, phase2IntervalMs 25000, summonOnEnrage true }.
// 시각표(150초 등장 기준): 162초 첫 소환, 이후 30초마다(192, 222…). 격노 전환(1,500ms)이 끝나는 순간 1회 즉시,
// 그 뒤로 25초 간격. 경고(warn)는 소환 1.2초 전 1회(HUD 배너 + 호루라기), 격노 소환은 전환 시작 때 경고한다.
// 소환 실행은 Enemy.jsx가 bossSummonQueue에 넣고 Enemies.jsx(SCHEDULE_EXPANSION_SUMMON)가 track_lanes로 낸다.

export function createBossSummonState(summon) {
  return {
    ageMs: 0,
    nextFireMs: summon?.firstDelayMs ?? Infinity,
    warned: false,
    enrageWarned: false,
    enrageHandled: false,
    fired: 0,
    result: { warn: false, fire: false },
  }
}

// args: { deltaMs, playing, enraged, enrageDone } — enrageDone = 격노 전환 정지가 끝났는가.
export function stepBossSummon(state, summon, { deltaMs = 0, playing = true, enraged = false, enrageDone = false } = {}) {
  const out = state.result
  out.warn = false
  out.fire = false
  if (!summon || !playing || !Number.isFinite(deltaMs) || deltaMs < 0) return out
  state.ageMs += deltaMs
  if (enraged && summon.summonOnEnrage && !state.enrageHandled) {
    if (!enrageDone) {
      // 전환 정지 동안은 일반 타이머도 멈춘 셈으로 둔다(정지가 끝나면 격노 소환이 바로 나간다).
      if (!state.enrageWarned) { state.enrageWarned = true; out.warn = true }
      return out
    }
    state.enrageHandled = true
    state.fired += 1
    state.warned = false
    state.nextFireMs = state.ageMs + (summon.phase2IntervalMs ?? summon.intervalMs)
    out.fire = true
    return out
  }
  if (!state.warned && state.ageMs >= state.nextFireMs - (summon.warningMs ?? 0)) {
    state.warned = true
    out.warn = true
  }
  if (state.ageMs >= state.nextFireMs) {
    state.fired += 1
    state.warned = false
    state.nextFireMs += enraged ? (summon.phase2IntervalMs ?? summon.intervalMs) : summon.intervalMs
    out.fire = true
  }
  return out
}

// HUD 배너용 경고 발행(uimini가 읽는다: version이 바뀌면 hud.stage6.trackSummon을 warningMs 동안 띄운다).
const warning = { version: 0, gameKey: -1, bossType: null }
export function publishBossSummonWarning(gameKey, bossType) {
  warning.version += 1
  warning.gameKey = gameKey
  warning.bossType = bossType
  return warning
}
export function getBossSummonWarning() {
  return warning
}
