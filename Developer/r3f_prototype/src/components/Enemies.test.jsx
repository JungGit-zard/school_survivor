import { describe, it, expect } from 'vitest'
import {
  getEliteBonusTextbookXp,
  getWavePhasesForStage,
  getBurstEventsForStage,
  shouldDropTextbook,
  TEXTBOOK_DROP_RATE,
  WAVE_PHASES,
} from './Enemies.jsx'

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

  it('keeps E04 out of every stage 1 wave and burst event', () => {
    expect(getWavePhasesForStage('stage1').some((phase) => phase.weights.E04)).toBe(false)
    expect(getBurstEventsForStage('stage1').some((event) => event.type === 'E04')).toBe(false)
  })

  it('introduces E04 only in stage 2 after the 90 second tutorial window', () => {
    const stage2Phases = getWavePhasesForStage('stage2')
    const firstE04Phase = stage2Phases.find((phase) => phase.weights.E04)

    expect(firstE04Phase.start).toBeGreaterThanOrEqual(90)
    expect(getBurstEventsForStage('stage2').filter((event) => event.type === 'E04').every((event) => event.sec >= 90)).toBe(true)
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
