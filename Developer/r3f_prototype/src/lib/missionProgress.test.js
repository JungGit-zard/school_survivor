import { describe, expect, it } from 'vitest'
import { getCounterChanges } from './missionProgress.js'

describe('missionProgress stage ids', () => {
  it('Stage 1~5 생존 기록은 스테이지별 best 카운터로 들어간다', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']) {
      expect(getCounterChanges({ type: 'survival_updated', stageId, value: 200 }))
        .toEqual([{ key: `stage.${stageId}.bestSurvivalSec`, value: 200, mode: 'max' }])
    }
  })

  it('미출시 초안 Stage 6~10과 알 수 없는 id는 카운터를 만들지 않는다', () => {
    for (const stageId of ['stage6', 'stage10', 'stage5 ', '', undefined]) {
      expect(getCounterChanges({ type: 'survival_updated', stageId, value: 200 })).toEqual([])
    }
  })
})
