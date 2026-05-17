import { describe, it, expect } from 'vitest'
import { getEliteBonusTextbookXp, getOpeningPressureShortage } from './Enemies.jsx'

describe('elite bonus rewards', () => {
  it('B01 보너스 교과서는 B01 기본 XP 0 대신 명시 XP를 사용한다', () => {
    expect(getEliteBonusTextbookXp('B01', 0)).toBe(40)
  })

  it('E06 보너스 교과서는 기존 적 XP를 그대로 사용한다', () => {
    expect(getEliteBonusTextbookXp('E06', 40)).toBe(40)
  })
})

describe('opening pressure spawns', () => {
  it('20초 이내에는 초반 압박 좀비가 3마리까지 보충된다', () => {
    expect(getOpeningPressureShortage([], 5)).toBe(3)
    expect(getOpeningPressureShortage([{ type: 'E01', openingPressure: true }], 10)).toBe(2)
    expect(getOpeningPressureShortage([
      { type: 'E01', openingPressure: true },
      { type: 'E01', openingPressure: true },
      { type: 'E01', openingPressure: true },
    ], 19)).toBe(0)
  })

  it('20초 이후에는 초반 압박 보충을 멈춘다', () => {
    expect(getOpeningPressureShortage([], 21)).toBe(0)
  })
})
