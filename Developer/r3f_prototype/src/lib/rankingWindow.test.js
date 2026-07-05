import { describe, expect, it } from 'vitest'
import {
  KST_OFFSET_MS,
  kstDailyKey,
  kstWeeklyKey,
  kstDateStartMs,
  kstDateEndMs,
  compareRankingWindowEntries,
} from './rankingWindow.js'

// KST 자정 = 그 전날 UTC 15:00. 아래 경계 상수로 검증한다.
describe('kstDailyKey', () => {
  it('KST 벽시계 날짜를 YYYY-MM-DD로 반환', () => {
    // UTC 2026-07-05 03:00 = KST 2026-07-05 12:00
    expect(kstDailyKey(Date.UTC(2026, 6, 5, 3, 0, 0))).toBe('2026-07-05')
  })

  it('KST 자정 직전(UTC 14:59:59)은 아직 전날', () => {
    // UTC 2026-07-05 14:59:59 = KST 2026-07-05 23:59:59
    expect(kstDailyKey(Date.UTC(2026, 6, 5, 14, 59, 59))).toBe('2026-07-05')
  })

  it('KST 자정 직후(UTC 15:00:00)는 다음 날로 롤오버', () => {
    // UTC 2026-07-05 15:00:00 = KST 2026-07-06 00:00:00
    expect(kstDailyKey(Date.UTC(2026, 6, 5, 15, 0, 0))).toBe('2026-07-06')
  })

  it('로컬 타임존과 무관하게 UTC+9로만 계산(월말 경계)', () => {
    // UTC 2026-01-31 15:00 = KST 2026-02-01 00:00
    expect(kstDailyKey(Date.UTC(2026, 0, 31, 15, 0, 0))).toBe('2026-02-01')
    // UTC 2026-01-31 14:59:59 = KST 2026-01-31 23:59:59
    expect(kstDailyKey(Date.UTC(2026, 0, 31, 14, 59, 59))).toBe('2026-01-31')
  })
})

// 2024-01-01(KST 월요일)을 앵커로 사용. 그 주 = 월 01-01 ~ 일 01-07.
describe('kstWeeklyKey', () => {
  it('그 주 월요일을 반환(주 시작)', () => {
    // KST 2024-01-01 00:00 (월) = UTC 2023-12-31 15:00
    expect(kstWeeklyKey(Date.UTC(2023, 11, 31, 15, 0, 0))).toBe('2024-01-01')
  })

  it('주중 수요일은 그 주 월요일로 매핑', () => {
    // KST 2024-01-03 12:00 (수) = UTC 2024-01-03 03:00
    expect(kstWeeklyKey(Date.UTC(2024, 0, 3, 3, 0, 0))).toBe('2024-01-01')
  })

  it('일요일 밤(자정 직전)은 아직 그 주 월요일', () => {
    // KST 2024-01-07 23:59:59 (일) = UTC 2024-01-07 14:59:59
    expect(kstWeeklyKey(Date.UTC(2024, 0, 7, 14, 59, 59))).toBe('2024-01-01')
  })

  it('일→월 전환(월요일 자정)에 다음 주로 넘어감', () => {
    // KST 2024-01-08 00:00 (월) = UTC 2024-01-07 15:00
    expect(kstWeeklyKey(Date.UTC(2024, 0, 7, 15, 0, 0))).toBe('2024-01-08')
  })

  it('일요일 자정 직전/직후 경계가 서로 다른 주', () => {
    const before = kstWeeklyKey(Date.UTC(2024, 0, 7, 14, 59, 59)) // 일 23:59:59
    const after = kstWeeklyKey(Date.UTC(2024, 0, 7, 15, 0, 0)) // 월 00:00:00
    expect(before).toBe('2024-01-01')
    expect(after).toBe('2024-01-08')
    expect(before).not.toBe(after)
  })
})

describe('kstDateStartMs / kstDateEndMs', () => {
  it('KST 달력일의 00:00을 UTC ms로 변환', () => {
    // KST 2026-07-05 00:00 = UTC 2026-07-04 15:00
    expect(kstDateStartMs('2026-07-05')).toBe(Date.UTC(2026, 6, 4, 15, 0, 0))
  })

  it('endMs는 그날 23:59:59.999(종료일 포함)', () => {
    expect(kstDateEndMs('2026-07-05')).toBe(kstDateStartMs('2026-07-05') + 24 * 60 * 60 * 1000 - 1)
  })

  it('빈 값/형식 오류는 null', () => {
    expect(kstDateStartMs('')).toBeNull()
    expect(kstDateStartMs('2026/07/05')).toBeNull()
    expect(kstDateStartMs(undefined)).toBeNull()
    expect(kstDateEndMs('nope')).toBeNull()
  })

  it('KST_OFFSET_MS는 9시간', () => {
    expect(KST_OFFSET_MS).toBe(9 * 60 * 60 * 1000)
  })
})

describe('compareRankingWindowEntries (tie-breaker)', () => {
  it('score 내림차순이 최우선', () => {
    const rows = [
      { uid: 'a', score: 10, timeMs: 5, updatedAt: 1 },
      { uid: 'b', score: 30, timeMs: 5, updatedAt: 1 },
      { uid: 'c', score: 20, timeMs: 5, updatedAt: 1 },
    ]
    expect(rows.slice().sort(compareRankingWindowEntries).map((r) => r.uid)).toEqual(['b', 'c', 'a'])
  })

  it('동점이면 timeMs 오름차순', () => {
    const rows = [
      { uid: 'a', score: 10, timeMs: 900, updatedAt: 1 },
      { uid: 'b', score: 10, timeMs: 100, updatedAt: 1 },
    ]
    expect(rows.slice().sort(compareRankingWindowEntries).map((r) => r.uid)).toEqual(['b', 'a'])
  })

  it('score·timeMs 동일하면 updatedAt 오름차순', () => {
    const rows = [
      { uid: 'a', score: 10, timeMs: 100, updatedAt: 500 },
      { uid: 'b', score: 10, timeMs: 100, updatedAt: 200 },
    ]
    expect(rows.slice().sort(compareRankingWindowEntries).map((r) => r.uid)).toEqual(['b', 'a'])
  })

  it('전부 동일하면 uid 오름차순', () => {
    const rows = [
      { uid: 'zeta', score: 10, timeMs: 100, updatedAt: 200 },
      { uid: 'alpha', score: 10, timeMs: 100, updatedAt: 200 },
    ]
    expect(rows.slice().sort(compareRankingWindowEntries).map((r) => r.uid)).toEqual(['alpha', 'zeta'])
  })
})
