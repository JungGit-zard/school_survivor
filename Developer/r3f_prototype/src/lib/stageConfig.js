// Stage timing and progression rules live in one place so future modes can reuse them.
export const DEFAULT_STAGE_ID = 'stage1'

export const STAGE_DURATION_SEC = 300

export const STAGE_CONFIGS = {
  stage1: {
    id: 'stage1',
    label: 'Stage 1',
    title: '교실 생존',
    description: '감염된 교실에서 300초 동안 버티기',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage1Clears',
    bestRecordKey: 'bestSurvivalSeconds',
    bossWarningSec: 240,
    survivalMilestones: [
      { atMs: 60_000, gold: 1, label: '1분 생존 보너스' },
      { atMs: 180_000, gold: 3, label: '3분 돌파 보너스' },
      { atMs: 240_000, gold: 4, label: '보스 조우 보너스' },
      { atMs: 300_000, gold: 8, label: '학교 탈출 보너스' },
    ],
  },
  stage2: {
    id: 'stage2',
    label: 'Stage 2',
    title: '복도 투사체 시험',
    description: '복도에서 탄환을 피하며 300초 생존',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage2Clears',
    bestRecordKey: 'stage2BestSurvivalSec',
    bossWarningSec: 240,
    e04IntroSec: 90,
    survivalMilestones: [
      { atMs: 60_000, gold: 2, label: '복도 적응 보너스' },
      { atMs: 180_000, gold: 4, label: '탄환 회피 보너스' },
      { atMs: 240_000, gold: 5, label: '복도 보스 조우 보너스' },
      { atMs: 300_000, gold: 10, label: '복도 탈출 보너스' },
    ],
  },
}

export function getStageConfig(stageId = DEFAULT_STAGE_ID) {
  return STAGE_CONFIGS[stageId] ?? STAGE_CONFIGS[DEFAULT_STAGE_ID]
}

export function getStageDurationSec(stageId = DEFAULT_STAGE_ID) {
  return getStageConfig(stageId).durationSec
}

export function isStageUnlocked(stageId, records = {}) {
  if (stageId === 'stage1') return true
  if (stageId === 'stage2') {
    return (records.stage1Clears ?? 0) >= 1 || (records.stage1Survival180Runs ?? 0) >= 3
  }
  return false
}
