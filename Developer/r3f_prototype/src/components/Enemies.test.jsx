import { describe, it, expect } from 'vitest'
import { getEliteBonusTextbookXp, shouldDropTextbook, TEXTBOOK_DROP_RATE, WAVE_PHASES } from './Enemies.jsx'

describe('elite bonus rewards', () => {
  it('B01 bonus textbooks use explicit XP instead of B01 base XP 0', () => {
    expect(getEliteBonusTextbookXp('B01', 0)).toBe(40)
  })

  it('E06 bonus textbooks keep the existing enemy XP value', () => {
    expect(getEliteBonusTextbookXp('E06', 40)).toBe(40)
  })
})

describe('stage 1 E06 spawn pressure', () => {
  it('keeps the late giant zombie wave at two thirds of the old three percent pressure', () => {
    const giantPhase = WAVE_PHASES.find((phase) => phase.start === 210)

    expect(giantPhase.weights.E06).toBe(0.02)
    expect(Object.values(giantPhase.weights).reduce((sum, weight) => sum + weight, 0)).toBe(1)
  })
})

describe('XP textbook drops', () => {
  it('drops a textbook for normal enemies when the 30 percent roll succeeds', () => {
    expect(TEXTBOOK_DROP_RATE).toBe(0.3)
    expect(shouldDropTextbook({ xp: 6, type: 'E01' }, 0.29)).toBe(true)
  })

  it('does not drop a textbook for normal enemies when the roll misses', () => {
    expect(shouldDropTextbook({ xp: 6, type: 'E01' }, 0.3)).toBe(false)
  })

  it('does not drop random textbooks for zero-XP enemies', () => {
    expect(shouldDropTextbook({ xp: 0, type: 'B01' }, 0)).toBe(false)
  })
})
