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
  isSolidPropStage,
  PART1_FINAL_STAGE_ID,
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

  it('lists Stage 1-6 in the lobby (2026-11-08 release) while unlock records stay separate', () => {
    expect(isStageUnlocked('stage1', {})).toBe(true)
    expect(Object.keys(STAGE_CONFIGS)).toEqual(Array.from({ length: 10 }, (_, i) => `stage${i + 1}`))
    expect(LOBBY_STAGE_IDS).toBe(VISIBLE_STAGE_IDS)
    expect(LOBBY_STAGE_IDS).toEqual(['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'])
    for (const id of ['stage7', 'stage8', 'stage9', 'stage10']) expect(LOBBY_STAGE_IDS).not.toContain(id)
    // 노출과 해금은 별개: 신규 기록에서는 5·6 모두 잠김, 이전 스테이지 보스 처치로만 하나씩 열린다.
    expect(isStageUnlocked('stage5', {})).toBe(false)
    expect(isStageUnlocked('stage6', {})).toBe(false)
    expect(isStageUnlocked('stage5', { stage4BossDefeats: 1 })).toBe(true)
    expect(isStageUnlocked('stage6', { stage4BossDefeats: 1 })).toBe(false)
    expect(isStageUnlocked('stage6', { stage5BossDefeats: 1 })).toBe(true)
  })

  it('maps portal progression stage 1 -> 2 -> 3 -> 4 -> 5 -> 6, then ends at the Part 1 finale', () => {
    expect(getNextStageId('stage1')).toBe('stage2')
    expect(getNextStageId('stage2')).toBe('stage3')
    expect(getNextStageId('stage3')).toBe('stage4')
    // 2026-11-08 릴리스: Stage 5·6 공개. Stage 6(PART1_FINAL)이 종착이고 비노출 7로는 보내지 않는다.
    expect(getNextStageId('stage4')).toBe('stage5')
    expect(getNextStageId('stage5')).toBe('stage6')
    expect(getNextStageId('stage6')).toBeNull()
    expect(getNextStageId('stage7')).toBeNull()
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

  it('wires Stage 5 staff room (B10 vice principal) config, bounds, portal anchor and milestones', () => {
    expect(getStageConfig('stage5')).toMatchObject({
      title: '교무실 최종 돌파',
      bossType: 'B10',
      e04IntroSec: 12,
      mapHalfX: 9.36,
      mapHalfZ: 16,
      portalAnchor: { x: 0, z: -11.4 },
      escapePortalSec: 210,
      matildaWarningSec: 205,
      matildaSec: 210,
      bossWarningSec: 150,
    })
    expect(getStageBossType('stage5')).toBe('B10')
    expect(getStageBounds('stage5')).toEqual({ halfX: 9.36, halfZ: 16 })
    const milestones = getStageConfig('stage5').survivalMilestones
    expect(milestones.map((m) => m.gold)).toEqual([5, 7, 11, 22])
    expect(milestones.map((m) => m.atMs)).toEqual([48_000, 144_000, 192_000, 240_000])
    expect(milestones.map((m) => m.label)).toEqual([
      '교무실 적응 보너스', '레인 돌파 보너스', '교감 조우 보너스', '현관 탈출 보너스',
    ])
    expect(isStageUnlocked('stage5', { stage4Clears: 1 })).toBe(false)
    expect(isStageUnlocked('stage5', { stage4BossDefeats: 1 })).toBe(true)
    // 출시 게이트: 2026-11-08 Stage 5 공개.
    expect(VISIBLE_STAGE_IDS).toContain('stage5')
  })

  it('marks Stage 4 and Stage 5 as solid-prop stages only', () => {
    expect(isSolidPropStage('stage4')).toBe(true)
    expect(isSolidPropStage('stage5')).toBe(true)
    for (const id of ['stage1', 'stage2', 'stage3', 'stage6', 'stage10', undefined]) {
      expect(isSolidPropStage(id)).toBe(false)
    }
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

  it('Stage 6 운동장: 1부 마지막이라 getNextStageId는 항상 null, 해금 증거는 stage5 보스 처치뿐', () => {
    expect(PART1_FINAL_STAGE_ID).toBe('stage6')
    expect(getNextStageId('stage6')).toBeNull()
    expect(isStageUnlocked('stage6', { stage5BossDefeats: 1 })).toBe(true)
    expect(isStageUnlocked('stage6', { stage5Clears: 3 })).toBe(false)
    expect(getStageConfig('stage6')).toMatchObject({
      title: '운동장 최후의 조회', bossType: 'B05', e04IntroSec: 8, mapHalfX: 12, mapHalfZ: 20,
      escapePortalSec: 210, matildaWarningSec: 205, matildaSec: 210, bossWarningSec: 150,
      description: '끝나지 않는 훈화 고리를 넘어, 열린 정문으로 탈출하세요.',
    })
    expect(getStageBounds('stage6')).toEqual({ halfX: 12, halfZ: 20 })
    // 원본 표(관리자 골드 배율 적용 전). 앞선 테스트가 배율을 바꿔 둘 수 있어 STAGE_CONFIGS를 본다.
    expect(STAGE_CONFIGS.stage6.survivalMilestones.map((m) => m.gold)).toEqual([6, 8, 13, 22])
    expect(VISIBLE_STAGE_IDS).toContain('stage6')
    expect(VISIBLE_STAGE_IDS).not.toContain('stage7')
  })
})
