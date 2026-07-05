// 랭킹 윈도우(KST 일일·주간) 순수 헬퍼. 부작용 없음 — 테스트 대상.
// KST = UTC+9 고정(서머타임 없음). 주간은 월요일 시작.

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function pad2(n) {
  return String(n).padStart(2, '0')
}

// nowMs를 KST 벽시계 컴포넌트로 변환. UTC 메서드를 +9h 시프트한 Date에 적용하면
// 로컬 타임존과 무관하게 KST 달력값을 얻는다.
function kstParts(nowMs) {
  const shifted = new Date(Number(nowMs) + KST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(), // 0-based
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(), // 0=일 ~ 6=토
  }
}

// KST 기준 그 날짜 → 'YYYY-MM-DD'
export function kstDailyKey(nowMs) {
  const { year, month, day } = kstParts(nowMs)
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

// KST 기준 그 주 월요일 → 'YYYY-MM-DD'
export function kstWeeklyKey(nowMs) {
  const { weekday } = kstParts(nowMs)
  // 월요일까지 거슬러 갈 일수: 일(0)→6, 월(1)→0, ... 토(6)→5
  const daysSinceMonday = (weekday + 6) % 7
  // KST 오프셋이 상수라 정확히 24h 배수를 빼면 KST 시각(시:분)이 보존되어 그 주 월요일 날짜가 나온다.
  return kstDailyKey(Number(nowMs) - daysSinceMonday * DAY_MS)
}

// 'YYYY-MM-DD'(KST 달력일) → 그날 00:00:00 KST의 UTC ms. 형식 불일치 시 null.
export function kstDateStartMs(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? '').trim())
  if (!m) return null
  const [, y, mo, d] = m
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0) - KST_OFFSET_MS
}

// 'YYYY-MM-DD'(KST 달력일)의 그날 마지막 순간(23:59:59.999 KST)의 UTC ms. 종료일 포함.
export function kstDateEndMs(dateStr) {
  const start = kstDateStartMs(dateStr)
  return start == null ? null : start + DAY_MS - 1
}

// tie-breaker 정렬: score 내림차순 → timeMs 오름차순 → updatedAt 오름차순 → uid 오름차순.
export function compareRankingWindowEntries(a, b) {
  return (
    readNum(b?.score) - readNum(a?.score)
    || readNum(a?.timeMs) - readNum(b?.timeMs)
    || readNum(a?.updatedAt) - readNum(b?.updatedAt)
    || String(a?.uid ?? '').localeCompare(String(b?.uid ?? ''))
  )
}

function readNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
