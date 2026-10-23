import { describe, expect, it } from 'vitest'
import { STAGE_CONFIGS, VISIBLE_STAGE_IDS, getNextStageId, isStageVisible, isStageUnlocked } from './stageConfig.js'

describe('four-stage release policy preserves historical content', () => {
  it('has a fixed frozen whitelist, independent of every content definition', () => {
    expect(Object.isFrozen(VISIBLE_STAGE_IDS)).toBe(true)
    expect(VISIBLE_STAGE_IDS).toEqual(['stage1', 'stage2', 'stage3', 'stage4'])
    expect(Object.keys(STAGE_CONFIGS)).toHaveLength(10)
    for (const value of ['stage5','stage10','stage11','Stage1','stage01',null,undefined,'']) expect(isStageVisible(value)).toBe(false)
    expect(getNextStageId()).toBe('stage2')
    expect(getNextStageId('unknown')).toBeNull()
  })

  it('preserves every boss-evidence unlock relation, including hidden historical stages', () => {
    const records = {}
    for (let i = 1; i <= 10; i++) {
      records[`stage${i}BossDefeats`] = 1
      records[`stage${i}Clears`] = 7
      records[`stage${i}BestSurvivalSec`] = 400 + i
    }
    const before = structuredClone(records)
    const definitions = JSON.stringify(STAGE_CONFIGS)
    for (let i = 1; i <= 10; i++) {
      expect(isStageUnlocked(`stage${i}`, records)).toBe(true)
      if (i > 1) expect(isStageUnlocked(`stage${i}`, { ...records, [`stage${i - 1}BossDefeats`]: 0 })).toBe(false)
      expect(getNextStageId(`stage${i}`)).toBe(i < 4 ? `stage${i + 1}` : null)
    }
    expect(records).toEqual(before)
    expect(JSON.stringify(STAGE_CONFIGS)).toBe(definitions)
  })
})
