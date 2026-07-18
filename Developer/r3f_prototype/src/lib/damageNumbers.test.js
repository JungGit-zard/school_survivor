// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import {
  emitDamageNumber,
  subscribeDamageNumber,
  formatDamageAmount,
  pickDamageNumberSlot,
  computeDamageNumberFrame,
  damageNumbersEnabled,
  DAMAGE_NUMBER_COLORS,
  DAMAGE_NUMBER_LIFE_MS,
  DAMAGE_NUMBER_FADE_START,
} from './damageNumbers.js'

describe('DAMAGE_NUMBER_COLORS', () => {
  it('defines a distinct critical-hit color for enemy damage feedback', () => {
    expect(DAMAGE_NUMBER_COLORS.critical).toBe('#ffb000')
    expect(DAMAGE_NUMBER_COLORS.critical).not.toBe(DAMAGE_NUMBER_COLORS.enemy)
  })
})

describe('formatDamageAmount', () => {
  it('양수는 반올림한 정수 문자열', () => {
    expect(formatDamageAmount(3)).toBe('3')
    expect(formatDamageAmount(12.4)).toBe('12')
    expect(formatDamageAmount(12.6)).toBe('13')
  })
  it('0 이하·비정상 값은 null(표시 생략)', () => {
    expect(formatDamageAmount(0)).toBeNull()
    expect(formatDamageAmount(0.4)).toBeNull() // 반올림 0
    expect(formatDamageAmount(-5)).toBeNull()
    expect(formatDamageAmount(NaN)).toBeNull()
    expect(formatDamageAmount(Infinity)).toBeNull()
  })
})

describe('pickDamageNumberSlot', () => {
  it('비활성 슬롯을 우선 반환', () => {
    const slots = [
      { active: true, startMs: 100 },
      { active: false, startMs: 0 },
      { active: true, startMs: 50 },
    ]
    expect(pickDamageNumberSlot(slots, 200)).toBe(1)
  })
  it('모두 활성이면 가장 오래된(startMs 최소) 슬롯 재활용', () => {
    const slots = [
      { active: true, startMs: 300 },
      { active: true, startMs: 100 },
      { active: true, startMs: 200 },
    ]
    expect(pickDamageNumberSlot(slots, 400)).toBe(1)
  })
})

describe('computeDamageNumberFrame', () => {
  const slot = { startMs: 1000, life: DAMAGE_NUMBER_LIFE_MS, y0: 0.6 }

  it('시작 직후엔 불투명하고 위로 떠오른다', () => {
    const f = computeDamageNumberFrame(slot, 1000)
    expect(f.opacity).toBe(1)
    expect(f.y).toBeCloseTo(0.6, 5) // 상승 아직 0
    expect(f.done).toBe(false)
  })
  it('페이드 시작 이전까진 불투명 유지', () => {
    const beforeFade = 1000 + DAMAGE_NUMBER_LIFE_MS * (DAMAGE_NUMBER_FADE_START - 0.05)
    expect(computeDamageNumberFrame(slot, beforeFade).opacity).toBe(1)
  })
  it('후반부엔 opacity가 감소하고 y가 더 높아진다', () => {
    const late = 1000 + DAMAGE_NUMBER_LIFE_MS * 0.8
    const f = computeDamageNumberFrame(slot, late)
    expect(f.opacity).toBeGreaterThan(0)
    expect(f.opacity).toBeLessThan(1)
    expect(f.y).toBeGreaterThan(0.6)
  })
  it('수명 종료 시 done=true', () => {
    const f = computeDamageNumberFrame(slot, 1000 + DAMAGE_NUMBER_LIFE_MS + 1)
    expect(f.done).toBe(true)
  })
})

describe('emit/subscribe 버스', () => {
  it('구독자가 없으면 no-op, 구독 후엔 이벤트 전달, 해제하면 다시 no-op', () => {
    const seen = []
    const off = subscribeDamageNumber((e) => seen.push(e))
    emitDamageNumber({ x: 1, y: 2, z: 3, amount: 7, colorHex: DAMAGE_NUMBER_COLORS.enemy })
    expect(seen).toHaveLength(1)
    expect(seen[0].amount).toBe(7)
    off()
    emitDamageNumber({ x: 0, y: 0, z: 0, amount: 1 })
    expect(seen).toHaveLength(1)
  })
})

describe('damageNumbersEnabled (reducedEffects 가드)', () => {
  afterEach(() => {
    delete document.documentElement.dataset.reducedEffects
  })
  it('reducedEffects=true면 false', () => {
    document.documentElement.dataset.reducedEffects = 'true'
    expect(damageNumbersEnabled()).toBe(false)
  })
  it('설정 없으면 true', () => {
    expect(damageNumbersEnabled()).toBe(true)
  })
})

describe('색상 상수', () => {
  it('적=연노랑, 플레이어=빨강', () => {
    expect(DAMAGE_NUMBER_COLORS.enemy).toMatch(/^#/)
    expect(DAMAGE_NUMBER_COLORS.player).toMatch(/^#/)
    expect(DAMAGE_NUMBER_COLORS.enemy).not.toBe(DAMAGE_NUMBER_COLORS.player)
  })
})
