// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_STAGE_ID,
  getNextStageId,
  getStageBossType,
  getStageBounds,
  getStageConfig,
  getStageDurationSec,
  isStageUnlocked,
} from './stageConfig.js'
import { saveAdminConfig } from './adminConfig.js'

describe('stage configuration registry', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps stage 1 as the default 240 second survival stage', () => {
    expect(DEFAULT_STAGE_ID).toBe('stage1')
    expect(getStageDurationSec('stage1')).toBe(240)
    expect(getStageConfig('stage1')).toMatchObject({
      id: 'stage1',
      label: 'Stage 1',
      clearRecordKey: 'stage1Clears',
      bossType: 'B01',
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
      bossType: 'B02',
    })
    expect(getStageBossType('stage2')).toBe('B02')
  })

  it('uses the current boss, escape portal, and Matilda timing for every stage', () => {
    for (const stageId of ['stage1', 'stage2']) {
      expect(getStageConfig(stageId)).toMatchObject({
        bossWarningSec: 120,
        escapePortalSec: 150,
        matildaWarningSec: 170,
        matildaSec: 180,
      })
    }
  })

  it('unlocks stage 2 after one stage 1 clear or three 180 second stage 1 runs', () => {
    expect(isStageUnlocked('stage2', {})).toBe(false)
    expect(isStageUnlocked('stage2', { stage1Clears: 1 })).toBe(true)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 3 })).toBe(true)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 2 })).toBe(false)
  })

  it('maps portal progression from stage 1 to stage 2 only', () => {
    expect(getNextStageId('stage1')).toBe('stage2')
    expect(getNextStageId('stage2')).toBeNull()
  })

  it('keeps Stage 1 classroom vertical length at the 20 percent reduced layout', () => {
    expect(getStageBounds('stage1')).toMatchObject({
      halfX: 10,
      halfZ: 14.4,
    })
  })

  it('keeps Stage 2 corridor width while reducing vertical length by 20 percent', () => {
    expect(getStageBounds('stage2')).toMatchObject({
      halfX: 7.5,
      halfZ: 38.4,
    })
  })

  it('applies admin balance duration and gold reward overrides', () => {
    saveAdminConfig({
      balance: {
        stageDurationSec: { stage1: 180 },
        rewards: { goldMultiplier: 2 },
      },
    })

    const stage = getStageConfig('stage1')

    expect(getStageDurationSec('stage1')).toBe(180)
    expect(stage.durationSec).toBe(180)
    expect(stage.survivalMilestones.map((milestone) => milestone.gold)).toEqual([2, 6, 8, 16])
  })
})
