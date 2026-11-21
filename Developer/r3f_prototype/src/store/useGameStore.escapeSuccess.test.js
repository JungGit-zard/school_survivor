import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore.js'
import { getBossKillBonus, getRankingScore } from '../lib/rankingScorePolicy.js'
import { VISIBLE_STAGE_IDS } from '../lib/stageConfig.js'

// 보스를 잡자마자 탈출한다. 반환값은 그 순간의 런 누적 총점이다(Terry 2026-11-21: 이월 점수는 고정,
// 보스 20%·탈출 15%는 이번 스테이지 점수에만 붙는다).
function clearAt(stageId, elapsedMs) {
  const carriedScore = useGameStore.getState().continuousScoreBase
  useGameStore.setState({ elapsedMs, bossAliveCount: 1 })
  expect(useGameStore.getState().recordBossDefeat()).toBe(true)
  expect(useGameStore.getState().clearStage()).toBe(true)
  const survivalSeconds = elapsedMs / 1000
  const bossBonus = getBossKillBonus({ stageId, survivalSeconds })
  return getRankingScore({ stageId, survivalSeconds, cleared: true, bossBonus, carriedScore })
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

  it('carries one running total across stages then includes the dying stage live score; fresh starts reset the sequence', async () => {
    const first = clearAt('stage1', 240000)
    // stage1: 240 -> 보스 48 = 288 -> 탈출 43 = 331.
    expect(first).toBe(331)
    await useGameStore.getState().continueToNextStage()
    const second = clearAt('stage2', 300000)
    // stage2: 이월 331(고정) + (360 -> 보스 72 = 432 -> 탈출 64 = 496) = 827.
    expect(second).toBe(827)
    expect(useGameStore.getState().escapeResult).toMatchObject({ totalScore: second, stageScore: second - first })
    await useGameStore.getState().continueToNextStage()
    useGameStore.setState((s) => ({ elapsedMs: 120000, player: { ...s.player, hp: 1 } }))
    useGameStore.getState().damagePlayer(100, { ignoreInvulnerability: true })
    const liveScore = getRankingScore({ stageId: 'stage3', survivalSeconds: 120 })
    expect(useGameStore.getState()).toMatchObject({ phase: 'gameover',
      rankingSubmission: { score: second + liveScore, stageScore: liveScore, globalTimeMs: 660000 } })
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
