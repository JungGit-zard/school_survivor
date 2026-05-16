import { describe, it, expect } from 'vitest'
import { getEliteBonusTextbookXp } from './Enemies.jsx'

describe('elite bonus rewards', () => {
  it('B01 보너스 교과서는 B01 기본 XP 0 대신 명시 XP를 사용한다', () => {
    expect(getEliteBonusTextbookXp('B01', 0)).toBe(40)
  })

  it('E06 보너스 교과서는 기존 적 XP를 그대로 사용한다', () => {
    expect(getEliteBonusTextbookXp('E06', 40)).toBe(40)
  })
})
