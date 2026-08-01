import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INVESTIGATION_REWARD_CHANCE,
  STUDENT_SEARCH_GOLD_AMOUNT,
  STUDENT_SEARCH_REWARD_CHANCE,
  rollInvestigationReward,
} from './studentSearchRewards.js'

describe('student search rewards', () => {
  it('awards students below the 50 percent total reward boundary only', () => {
    expect(STUDENT_SEARCH_REWARD_CHANCE).toBe(0.5)
    expect(rollInvestigationReward('student', viSequence(0.499, 0.2))).toEqual({ type: 'upgrade' })
    expect(rollInvestigationReward('student', () => 0.5)).toBeNull()
  })

  it('chooses an upgrade chance or gold after a successful roll', () => {
    const upgrade = rollInvestigationReward('student', viSequence(0.499, 0.2))
    const gold = rollInvestigationReward('student', viSequence(0.499, 0.8))

    expect(upgrade).toEqual({ type: 'upgrade' })
    expect(gold).toEqual({ type: 'gold', amount: STUDENT_SEARCH_GOLD_AMOUNT })
  })

  it('always awards lockers an upgrade without rolling randomness', () => {
    expect(rollInvestigationReward('locker', () => {
      throw new Error('locker rewards must not use randomness')
    })).toEqual({ type: 'upgrade' })
  })

  it('keeps bulletin boards and other subjects at the 10 percent reward boundary', () => {
    expect(DEFAULT_INVESTIGATION_REWARD_CHANCE).toBe(0.1)
    for (const subjectType of ['bulletinBoard', 'janitorCart', 'desk']) {
      expect(rollInvestigationReward(subjectType, viSequence(0.099, 0.2))).toEqual({ type: 'upgrade' })
      expect(rollInvestigationReward(subjectType, () => 0.1)).toBeNull()
    }
  })
})

function viSequence(...values) {
  let index = 0
  return () => values[index++]
}
