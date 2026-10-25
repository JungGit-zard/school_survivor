// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_STAGE_ID,
  BOSS_SPAWN_CENTER_SEC,
  BOSS_SPAWN_JITTER_SEC,
  STAGE_CONFIGS,
  LOBBY_STAGE_IDS,
  VISIBLE_STAGE_IDS,
  getNextStageId,
  getStageBossType,
  getStageBounds,
  getStageConfig,
  getStageDurationSec,
  isStageUnlocked,
  rollBossSpawnSec,
} from './stageConfig.js'
import { saveAdminConfig } from './adminConfig.js'

describe('stage configuration registry', () => {
  beforeEach(() => {
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

  it('spawns Matilda in every stage at 3:30 after the shared five-second warning grace', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      expect(getStageConfig(stageId)).toMatchObject({
        matildaWarningSec: 205,
        matildaSec: 210,
      })
    }
  })

  it('unlocks stage 2 only after clearing stage 1 through the exit', () => {
    expect(isStageUnlocked('stage2', {})).toBe(false)
    expect(isStageUnlocked('stage2', { stage1BossDefeats: 1 })).toBe(true)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 3 })).toBe(false)
    expect(isStageUnlocked('stage2', { stage1Survival180Runs: 2 })).toBe(false)
  })

  it('spawns every boss at exactly 2:30 with no jitter', () => {
    expect(BOSS_SPAWN_CENTER_SEC).toBe(150)
    expect(BOSS_SPAWN_JITTER_SEC).toBe(0)
    expect(rollBossSpawnSec(() => 0)).toBe(150)
    expect(rollBossSpawnSec(() => 0.5)).toBe(150)
    expect(rollBossSpawnSec(() => 0.999999)).toBe(150)
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      expect(getStageConfig(stageId).bossWarningSec).toBe(150)
    }
  })

  it('defines stage 3 as a 240 second gymnasium stage with the PE teacher (B03) boss', () => {
    expect(getStageDurationSec('stage3')).toBe(240)
    expect(getStageConfig('stage3')).toMatchObject({
      id: 'stage3',
      label: 'Stage 3',
      clearRecordKey: 'stage3Clears',
      bestRecordKey: 'stage3BestSurvivalSec',
      e04IntroSec: 34,
      escapePortalSec: 210,
      matildaWarningSec: 205,
      matildaSec: 210,
      bossType: 'B03',
    })
    // 로비 카드와 실제 전투가 일치하므로 lobbyBossType 분리는 제거됨.
    expect(getStageConfig('stage3').lobbyBossType).toBeUndefined()
    // 맵 경계를 stage2와 동일하게 맞춤(2026-07-23): halfX 6→7.5, halfZ 18→19.2 (R1 밀도 완화).
    expect(getStageBounds('stage3')).toMatchObject({ halfX: 7.5, halfZ: 19.2 })
    // 체육교사 B03 단일 보스.
    expect(getStageBossType('stage3')).toBe('B03')
  })

  it('unlocks stage 3 after one stage 2 clear', () => {
    expect(isStageUnlocked('stage3', {})).toBe(false)
    expect(isStageUnlocked('stage3', { stage2BossDefeats: 1 })).toBe(true)
    expect(isStageUnlocked('stage3', { stage1Clears: 5 })).toBe(false)
  })

  it('adds Stage 4 as a playable B04 cafeteria stage after the existing stages', () => {
    expect(Object.keys(STAGE_CONFIGS)).toEqual(Array.from({length:10},(_,i)=>`stage${i+1}`))
    expect(getStageDurationSec('stage4')).toBe(240)
    expect(getStageConfig('stage4')).toMatchObject({
      id: 'stage4',
      label: 'Stage 4',
      title: '급식실 대탈출',
      description: '3분 30초 후 열린 탈출구로 탈출하기',
      clearRecordKey: 'stage4Clears',
      bestRecordKey: 'stage4BestSurvivalSec',
      bossType: 'B04',
    })
    // balanceqa 게이트 통과로 playable 해제됨(게이트 필드 제거 = 기본 플레이어블).
    expect(getStageConfig('stage4').playable).toBeUndefined()
    expect(getStageBossType('stage4')).toBe('B04')
  })

  // 계약 2026-10-24 §3: Stage3 대표 보스(B03) 사망 기록만 Stage4를, Stage4 보스(B04) 사망 기록만
  // Stage5를 해금한다. 기록 키는 upstream의 이전 스테이지 보스 증거(`stage{N}BossDefeats`)다.
  it('unlocks Stage 4 only with the Stage 3 boss defeat record', () => {
    expect(getStageBossType('stage3')).toBe('B03')
    expect(isStageUnlocked('stage4', {})).toBe(false)
    expect(isStageUnlocked('stage4', { stage2Clears: 5 })).toBe(false)
    expect(isStageUnlocked('stage4', { stage3BossDefeats: 1 })).toBe(true)
    expect(isStageUnlocked('stage4', { stage3BossDefeats: 3 })).toBe(true)
  })

  it('refuses every non-boss-defeat evidence for Stage 4', () => {
    // clear(포탈 탈출)·누적 생존 시간·퀘스트·총 보스 처치수는 대체 증거가 아니다.
    expect(isStageUnlocked('stage4', { stage3Clears: 1 })).toBe(false)
    expect(isStageUnlocked('stage4', { stage3Clears: 99, stage2Clears: 5 })).toBe(false)
    expect(isStageUnlocked('stage4', { stage3BestSurvivalSec: 240 })).toBe(false)
    expect(isStageUnlocked('stage4', { totalSurvivalSeconds: 99_999 })).toBe(false)
    expect(isStageUnlocked('stage4', { bossKills: 50 })).toBe(false)
    expect(isStageUnlocked('stage4', { stage4BossDefeats: 1 })).toBe(false)
  })

  it('unlocks Stage 5 only with the Stage 4 (B04) boss defeat record, never with a Stage 4 clear', () => {
    expect(getStageBossType('stage4')).toBe('B04')
    expect(isStageUnlocked('stage5', {})).toBe(false)
    expect(isStageUnlocked('stage5', { stage4Clears: 1 })).toBe(false)
    expect(isStageUnlocked('stage5', { stage4Clears: 9, stage4BestSurvivalSec: 240, bossKills: 9 })).toBe(false)
    expect(isStageUnlocked('stage5', { stage3BossDefeats: 1 })).toBe(false)
    expect(isStageUnlocked('stage5', { stage4BossDefeats: 1 })).toBe(true)
  })

  it('keeps the lobby list at Stage 1-4 while unlock records stay separate', () => {
    expect(isStageUnlocked('stage1', {})).toBe(true)
    expect(Object.keys(STAGE_CONFIGS)).toEqual(Array.from({ length: 10 }, (_, i) => `stage${i + 1}`))
    expect(LOBBY_STAGE_IDS).toBe(VISIBLE_STAGE_IDS)
    expect(LOBBY_STAGE_IDS).toEqual(['stage1', 'stage2', 'stage3', 'stage4'])
    expect(isStageUnlocked('stage5', { stage4BossDefeats: 1 })).toBe(true)
    expect(LOBBY_STAGE_IDS).not.toContain('stage5')
  })

  it('maps portal progression stage 1 -> stage 2 -> stage 3 -> stage 4, then ends', () => {
    expect(getNextStageId('stage1')).toBe('stage2')
    expect(getNextStageId('stage2')).toBe('stage3')
    // stage4가 playable로 해제되어 stage3 클리어→stage4 경로가 열렸다.
    expect(getNextStageId('stage3')).toBe('stage4')
    // 계약 §3 + 릴리스 경계: Stage4가 종착이다. 포탈은 목록에 없는 Stage5로 보내지 않는다.
    // 해금 기록(stage4BossDefeats)은 그대로 남고, 진입만 닫혀 있다.
    expect(getNextStageId('stage4')).toBeNull()
    expect(getNextStageId('stage5')).toBeNull()
    expect(getNextStageId('stage10')).toBeNull()
    expect(isStageUnlocked('stage5', { stage4BossDefeats: 1 })).toBe(true)
  })

  it('wires Stage 4 cafeteria timing, bounds, and cafeteria-themed milestones', () => {
    expect(getStageConfig('stage4')).toMatchObject({
      bossType: 'B04',
      e04IntroSec: 18,
      escapePortalSec: 210,
      matildaWarningSec: 205,
      matildaSec: 210,
    })
    // 급식실은 직전 가로폭에서 30% 확장하고 세로는 기존 길이를 유지한다.
    expect(getStageBounds('stage4')).toMatchObject({ halfX: 9.36, halfZ: 16 })
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
