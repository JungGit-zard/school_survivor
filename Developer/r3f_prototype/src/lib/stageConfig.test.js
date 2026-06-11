import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STAGE_ID,
  getStageConfig,
  getStageDurationSec,
  isStageUnlocked,
} from './stageConfig.js'

describe('stage configuration registry', () => {
  it('keeps stage 1 as the default 240 second survival stage', () => {
    expect(DEFAULT_STAGE_ID).toBe('stage1')
    expect(getStageDurationSec('stage1')).toBe(240)
    expect(getStageConfig('stage1')).toMatchObject({
      id: 'stage1',
      label: 'Stage 1',
      clearRecordKey: 'stage1Clears',
    })
  })

  it('defines stage 2 as a separate 240 second corridor projectile stage', () => {
    expect(getStageDurationSec('stage2')).toBe(240)
    expect(getStageConfig('stage2')).toMatchObject({
      id: 'stage2',
      label: 'Stage 2',
      clearRecordKey: 'stage2Clears',
      bestRecordKey: 'stage2BestSurvivalSec',
      e04IntroSec: 72,
    })
  })

  it('unlocks stage 2 after one stage 1 clear or three 180 second stage 1 runs', () => {
    expect(isStageUnlocked('stage2', {})).toBe(false)
    expect(isStageUnlocked('stage2', { stage1Clears: 1 })).toBe(true)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 3 })).toBe(true)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 2 })).toBe(false)
  })
})
