// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_STAGE_ID,
  STAGE_CONFIGS,
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

  it('uses the current boss, escape portal, and Matilda timing for each stage', () => {
    expect(getStageConfig('stage1')).toMatchObject({
      bossWarningSec: 120,
      escapePortalSec: 150,
      matildaWarningSec: 170,
      matildaSec: 180,
    })
    expect(getStageConfig('stage2')).toMatchObject({
      bossWarningSec: 120,
      escapePortalSec: 240,
      matildaWarningSec: 170,
      matildaSec: 180,
    })
  })

  it('unlocks stage 2 after one stage 1 clear or three 180 second stage 1 runs', () => {
    expect(isStageUnlocked('stage2', {})).toBe(false)
    expect(isStageUnlocked('stage2', { stage1Clears: 1 })).toBe(true)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 3 })).toBe(true)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 2 })).toBe(false)
  })

  it('defines stage 3 as a 240 second gymnasium stage with the PE teacher (B03) boss', () => {
    expect(getStageDurationSec('stage3')).toBe(240)
    expect(getStageConfig('stage3')).toMatchObject({
      id: 'stage3',
      label: 'Stage 3',
      clearRecordKey: 'stage3Clears',
      bestRecordKey: 'stage3BestSurvivalSec',
      e04IntroSec: 34,
      escapePortalSec: 240,
      bossWarningSec: 129,
      matildaWarningSec: 210,
      matildaSec: 220,
      bossType: 'B03',
    })
    // 로비 카드와 실제 전투가 일치하므로 lobbyBossType 분리는 제거됨.
    expect(getStageConfig('stage3').lobbyBossType).toBeUndefined()
    // 가로폭(X) 1/3 축소로 세로로 긴 통로형 경계(halfX 18→6, halfZ 유지).
    expect(getStageBounds('stage3')).toMatchObject({ halfX: 6, halfZ: 18 })
    // 체육교사 B03 단일 보스.
    expect(getStageBossType('stage3')).toBe('B03')
  })

  it('unlocks stage 3 after one stage 2 clear', () => {
    expect(isStageUnlocked('stage3', {})).toBe(false)
    expect(isStageUnlocked('stage3', { stage2Clears: 1 })).toBe(true)
    expect(isStageUnlocked('stage3', { stage1Clears: 5 })).toBe(false)
  })

  it('adds Stage 4 as a playable B04 cafeteria stage after the existing stages', () => {
    expect(Object.keys(STAGE_CONFIGS)).toEqual(['stage1', 'stage2', 'stage3', 'stage4'])
    expect(getStageDurationSec('stage4')).toBe(240)
    expect(getStageConfig('stage4')).toMatchObject({
      id: 'stage4',
      label: 'Stage 4',
      title: '급식실 대탈출',
      description: '주방장 좀비가 지키는 급식실에서 240초 동안 버티기',
      clearRecordKey: 'stage4Clears',
      bestRecordKey: 'stage4BestSurvivalSec',
      bossType: 'B04',
    })
    // balanceqa 게이트 통과로 playable 해제됨(게이트 필드 제거 = 기본 플레이어블).
    expect(getStageConfig('stage4').playable).toBeUndefined()
    expect(getStageBossType('stage4')).toBe('B04')
  })

  it('unlocks Stage 4 only after one Stage 3 clear', () => {
    expect(isStageUnlocked('stage4', {})).toBe(false)
    expect(isStageUnlocked('stage4', { stage2Clears: 5 })).toBe(false)
    expect(isStageUnlocked('stage4', { stage3Clears: 1 })).toBe(true)
  })

  it('maps portal progression stage 1 -> stage 2 -> stage 3 -> stage 4, then ends', () => {
    expect(getNextStageId('stage1')).toBe('stage2')
    expect(getNextStageId('stage2')).toBe('stage3')
    // stage4가 playable로 해제되어 stage3 클리어→stage4 경로가 열렸다.
    expect(getNextStageId('stage3')).toBe('stage4')
    // stage4는 마지막 스테이지 — 다음 없음.
    expect(getNextStageId('stage4')).toBeNull()
  })

  it('wires Stage 4 cafeteria timing, bounds, and cafeteria-themed milestones', () => {
    expect(getStageConfig('stage4')).toMatchObject({
      bossType: 'B04',
      bossWarningSec: 134,
      e04IntroSec: 18,
      escapePortalSec: 240,
      matildaWarningSec: 205,
      matildaSec: 215,
    })
    // 급식실 맵 경계 12×16(스3 18×18보다 좁음 — 밀도 억제 근거).
    expect(getStageBounds('stage4')).toMatchObject({ halfX: 12, halfZ: 16 })
    // 마일스톤 골드 4/6/9/18, atMs 48k/144k/192k/240k, 급식실 테마 라벨.
    const milestones = getStageConfig('stage4').survivalMilestones
    expect(milestones.map((m) => m.gold)).toEqual([4, 6, 9, 18])
    expect(milestones.map((m) => m.atMs)).toEqual([48_000, 144_000, 192_000, 240_000])
    expect(milestones.every((m) => typeof m.label === 'string' && m.label.length > 0)).toBe(true)
  })

  it('keeps Stage 1 classroom vertical length at the 20 percent reduced layout', () => {
    expect(getStageBounds('stage1')).toMatchObject({
      halfX: 10,
      halfZ: 14.4,
    })
  })

  it('keeps Stage 2 corridor width while halving the vertical length again', () => {
    expect(getStageBounds('stage2')).toMatchObject({
      halfX: 7.5,
      halfZ: 19.2,
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
