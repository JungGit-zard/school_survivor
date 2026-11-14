import { describe, expect, it } from 'vitest'
import { getCounterChanges } from './missionProgress.js'

describe('missionProgress stage ids', () => {
  it('출시 Stage 1~6 생존 기록은 스테이지별 best 카운터로 들어간다', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']) {
      expect(getCounterChanges({ type: 'survival_updated', stageId, value: 200 }))
        .toEqual([{ key: `stage.${stageId}.bestSurvivalSec`, value: 200, mode: 'max' }])
    }
  })

  it('미출시 초안 Stage 7~10과 알 수 없는 id는 카운터를 만들지 않는다', () => {
    for (const stageId of ['stage7', 'stage10', 'stage5 ', '', undefined, 'constructor']) {
      expect(getCounterChanges({ type: 'survival_updated', stageId, value: 200 })).toEqual([])
    }
  })

  // Stage 6(1부 피날레)의 클리어·처치가 스테이지 카운터로 남아야 미션(E04 대응)과 집계가 이어진다.
  it('Stage 6 클리어·E04 처치가 스테이지 카운터로 남는다', () => {
    expect(getCounterChanges({ type: 'stage_cleared', stageId: 'stage6' })).toEqual([{ key: 'stage.stage6.clearCount', value: 1 }])
    expect(getCounterChanges({ type: 'enemy_killed', stageId: 'stage6', enemyType: 'E04' }))
      .toEqual([{ key: 'enemy.E04.killCount', value: 1 }, { key: 'stage.stage6.enemy.E04.killCount', value: 1 }])
  })
})
