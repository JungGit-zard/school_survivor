export const STUDENT_SEARCH_REWARD_CHANCE = 0.5
export const DEFAULT_INVESTIGATION_REWARD_CHANCE = 0.1
export const STUDENT_SEARCH_GOLD_AMOUNT = 10

export function rollInvestigationReward(subjectType, random = Math.random) {
  if (subjectType === 'locker') return { type: 'upgrade' }
  const rewardChance = subjectType === 'student'
    ? STUDENT_SEARCH_REWARD_CHANCE
    : DEFAULT_INVESTIGATION_REWARD_CHANCE
  if (random() >= rewardChance) return null

  return random() < 0.5
    ? { type: 'upgrade' }
    : { type: 'gold', amount: STUDENT_SEARCH_GOLD_AMOUNT }
}
