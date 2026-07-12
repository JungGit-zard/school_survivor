export const STUDENT_SEARCH_REWARD_CHANCE = 0.1
export const STUDENT_SEARCH_GOLD_AMOUNT = 10

export function rollStudentSearchReward(random = Math.random) {
  if (random() >= STUDENT_SEARCH_REWARD_CHANCE) return null

  return random() < 0.5
    ? { type: 'upgrade' }
    : { type: 'gold', amount: STUDENT_SEARCH_GOLD_AMOUNT }
}
