import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { getBossClearBonus, getRankingScore } from '../lib/rankingScorePolicy.js'
import { VISIBLE_STAGE_IDS } from '../lib/stageConfig.js'

function clearAt(stageId, elapsedMs) {
  useGameStore.setState({ elapsedMs, bossDefeated: true })
  expect(useGameStore.getState().clearStage()).toBe(true)
  const survivalSeconds = elapsedMs / 1000
  return getRankingScore({ stageId, survivalSeconds, cleared: true,
    bossBonus: getBossClearBonus({ stageId, survivalSeconds, cleared: true, bossDefeated: true }) })
}

describe('escape success and continuous score', () => {
  beforeEach(() => { installProgressTransactionTestClient(); useGameStore.getState().resetGame('stage1') })

  it('waits at the same stage and gameKey until an explicit choice; duplicate clear and continue are harmless', async () => {
    const gameKey = useGameStore.getState().gameKey
    const score = clearAt('stage1', 240000)
    expect(useGameStore.getState()).toMatchObject({ phase: 'cleared', currentStageId: 'stage1', gameKey,
      escapeResult: { stageScore: score, totalScore: score } })
    expect(useGameStore.getState().clearStage()).toBe(false)
    expect(await useGameStore.getState().continueToNextStage()).toBe(true)
    expect(useGameStore.getState()).toMatchObject({ phase: 'playing', currentStageId: 'stage2',
      gameKey: gameKey + 1, continuousScoreBase: score, elapsedMs: 0, escapeResult: null })
    expect(await useGameStore.getState().continueToNextStage()).toBe(false)
  })

  it('adds two clear scores then includes the dying stage live score; fresh starts reset the sequence', async () => {
    const first = clearAt('stage1', 240000)
    await useGameStore.getState().continueToNextStage()
    const second = clearAt('stage2', 300000)
    expect(useGameStore.getState().escapeResult.totalScore).toBe(first + second)
    await useGameStore.getState().continueToNextStage()
    useGameStore.setState((s) => ({ elapsedMs: 120000, player: { ...s.player, hp: 1 } }))
    useGameStore.getState().damagePlayer(100, { ignoreInvulnerability: true })
    const liveScore = getRankingScore({ stageId: 'stage3', survivalSeconds: 120 })
    expect(useGameStore.getState()).toMatchObject({ phase: 'gameover',
      rankingSubmission: { score: first + second + liveScore, stageScore: liveScore, globalTimeMs: 660000 } })
    useGameStore.getState().resetGame('stage1')
    expect(useGameStore.getState()).toMatchObject({ continuousScoreBase: 0, continuousTimeBase: 0, escapeResult: null })
  })

  it('final stage clear has no next stage and preserves the result', async () => {
    const {updateFirebasePlayerProgress}=await import('../lib/firebaseProgress.js')
    // The final stage is the last released one (release boundary a8ddfe0c/1fcfc848), not stage10.
    const finalStageId = VISIBLE_STAGE_IDS.at(-1)
    updateFirebasePlayerProgress(p => {p.records[`stage${Number(finalStageId.slice(5)) - 1}BossDefeats`]=1})
    expect(useGameStore.getState().resetGame(finalStageId)).toBe(true)
    const score = clearAt(finalStageId, 240000)
    expect(await useGameStore.getState().continueToNextStage()).toBe(false)
    expect(useGameStore.getState()).toMatchObject({ phase: 'cleared', escapeResult: { totalScore: score } })
  })
})
