// 어드민 '스테이지별 웨이브 컨트롤' 변환 로직 (순수 함수 — import 없음).
//
// 편집 모델(entry): { start, end, bossPhase, counts: { E01: n, ... } }
//   — "몇 분 몇 초에 무슨 좀비가 얼마나"라는 운영자 멘탈 모델.
// 엔진 모델(phase): { start, end, target, weights, bossPhase }
//   — Enemies.jsx 유지 스폰 루프가 소비하는 형태.
//
// counts → phase: target = 합계, weights = count/합계.
// phase → counts: count = round(target × weight) (기본 타임라인을 편집 시작점으로
// 불러올 때 1회 변환 — 반올림 오차는 편집 출발점 용도로 허용).

export const WAVE_ZOMBIE_TYPES = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06']

export const WAVE_TIME_MAX_SEC = 420 // 어드민 스테이지 시간 상한과 동일

const toInt = (v, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function phaseToEditorEntry(phase) {
  const counts = {}
  for (const type of WAVE_ZOMBIE_TYPES) {
    const w = phase?.weights?.[type]
    counts[type] = w ? Math.round((phase.target ?? 0) * w) : 0
  }
  return {
    start: toInt(phase?.start),
    end: toInt(phase?.end),
    bossPhase: !!phase?.bossPhase,
    counts,
  }
}

// entry → 엔진 phase. 좀비 합계 0이거나 구간이 뒤집힌 entry는 null (무효).
export function editorEntryToPhase(entry) {
  const start = toInt(entry?.start)
  const end = toInt(entry?.end)
  if (end <= start) return null
  let target = 0
  for (const type of WAVE_ZOMBIE_TYPES) target += Math.max(0, toInt(entry?.counts?.[type]))
  if (target <= 0) return null
  const weights = {}
  for (const type of WAVE_ZOMBIE_TYPES) {
    const c = Math.max(0, toInt(entry?.counts?.[type]))
    if (c > 0) weights[type] = c / target
  }
  const phase = { start, end, target, weights }
  if (entry?.bossPhase) phase.bossPhase = true
  return phase
}

// 편집 리스트 정리: 숫자 강제·클램프·시작시각 순 정렬. UI 입력 직후 호출.
export function normalizeWaveEntries(list) {
  if (!Array.isArray(list)) return null
  const cleaned = list.map((entry) => {
    const counts = {}
    for (const type of WAVE_ZOMBIE_TYPES) {
      counts[type] = clamp(toInt(entry?.counts?.[type]), 0, 200)
    }
    return {
      start: clamp(toInt(entry?.start), 0, WAVE_TIME_MAX_SEC),
      end: clamp(toInt(entry?.end), 0, WAVE_TIME_MAX_SEC),
      bossPhase: !!entry?.bossPhase,
      counts,
    }
  })
  cleaned.sort((a, b) => a.start - b.start)
  return cleaned
}

// 어드민 waveControl 섹션(entry 리스트)을 엔진 phase 배열로. 커스텀이 없거나
// 유효 phase가 하나도 없으면 null → 호출측이 기본 타임라인 사용.
export function buildWavePhasesFromEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null
  const phases = entries.map(editorEntryToPhase).filter(Boolean)
  return phases.length > 0 ? phases : null
}

// 분/초 표시 헬퍼
export function secToMin(sec) { return Math.floor(toInt(sec) / 60) }
export function secToRemainder(sec) { return toInt(sec) % 60 }
export function minSecToSec(min, sec) {
  return clamp(toInt(min) * 60 + toInt(sec), 0, WAVE_TIME_MAX_SEC)
}
