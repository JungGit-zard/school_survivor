import { describe, it, expect } from 'vitest'
import { getEliteBonusTextbookXp } from './Enemies.jsx'

describe('elite bonus rewards', () => {
  it('B01 bonus textbooks use explicit XP instead of B01 base XP 0', () => {
    expect(getEliteBonusTextbookXp('B01', 0)).toBe(40)
  })

  it('E06 bonus textbooks keep the existing enemy XP value', () => {
    expect(getEliteBonusTextbookXp('E06', 40)).toBe(40)
  })
})
