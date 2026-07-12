import { describe, expect, it } from 'vitest'
import {
  STUDENT_SEARCH_GOLD_AMOUNT,
  STUDENT_SEARCH_REWARD_CHANCE,
  rollStudentSearchReward,
} from './studentSearchRewards.js'

describe('student search rewards', () => {
  it('uses a 10 percent total reward chance', () => {
    expect(STUDENT_SEARCH_REWARD_CHANCE).toBe(0.1)
    expect(rollStudentSearchReward(() => 0.1)).toBeNull()
  })

  it('chooses an upgrade chance or gold after a successful roll', () => {
    const upgrade = rollStudentSearchReward(viSequence(0.09, 0.2))
    const gold = rollStudentSearchReward(viSequence(0.09, 0.8))

    expect(upgrade).toEqual({ type: 'upgrade' })
    expect(gold).toEqual({ type: 'gold', amount: STUDENT_SEARCH_GOLD_AMOUNT })
  })
})

function viSequence(...values) {
  let index = 0
  return () => values[index++]
}
