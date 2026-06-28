// Stage timing and progression rules live in one place so future modes can reuse them.
import { getAdminBalanceConfig } from './adminConfig.js'

export const DEFAULT_STAGE_ID = 'stage1'

export const STAGE_DURATION_SEC = 240

export const STAGE_CONFIGS = {
  stage1: {
    id: 'stage1',
    label: 'Stage 1',
    title: '교실 생존',
    description: '감염된 교실에서 240초 동안 버티기',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage1Clears',
    bestRecordKey: 'bestSurvivalSeconds',
    bossWarningSec: 192,
    escapePortalSec: 240,
    matildaWarningSec: 410,
    matildaSec: 420,
    // 맵 경계(월드 유닛, 중심 0). 교실 구도에 맞춰 세로로 긴 직사각형 — 화면 세로=Z, 가로=X.
    mapHalfX: 10,
    mapHalfZ: 54,
    survivalMilestones: [
      { atMs: 48_000, gold: 1, label: '초반 생존 보너스' },
      { atMs: 144_000, gold: 3, label: '중반 돌파 보너스' },
      { atMs: 192_000, gold: 4, label: '보스 조우 보너스' },
      { atMs: 240_000, gold: 8, label: '학교 탈출 보너스' },
    ],
  },
  stage2: {
    id: 'stage2',
    label: 'Stage 2',
    title: '복도 투사체 시험',
    description: '복도에서 탄환을 피하며 240초 생존',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage2Clears',
    bestRecordKey: 'stage2BestSurvivalSec',
    bossWarningSec: 192,
    e04IntroSec: 72,
    escapePortalSec: 240,
    matildaWarningSec: 410,
    matildaSec: 420,
    // 복도형: 현재 정사각 경계 유지 (코리도 시각 연출은 ClassroomFloor에서 별도 처리).
    mapHalfX: 10,
    mapHalfZ: 48,
    survivalMilestones: [
      { atMs: 48_000, gold: 2, label: '복도 적응 보너스' },
      { atMs: 144_000, gold: 4, label: '탄환 회피 보너스' },
      { atMs: 192_000, gold: 5, label: '복도 보스 조우 보너스' },
      { atMs: 240_000, gold: 10, label: '복도 탈출 보너스' },
    ],
  },
}

export function getStageConfig(stageId = DEFAULT_STAGE_ID) {
  const base = STAGE_CONFIGS[stageId] ?? STAGE_CONFIGS[DEFAULT_STAGE_ID]
  return applyAdminStageOverrides(base)
}

export function getStageDurationSec(stageId = DEFAULT_STAGE_ID) {
  return getStageConfig(stageId).durationSec
}

// 맵 경계 반-크기(중심 0 기준). 바닥·벽·카메라 클램프·플레이어 바운드·스폰 클램프가 모두 참조하는 단일 진실.
export const DEFAULT_MAP_HALF_X = 48
export const DEFAULT_MAP_HALF_Z = 48

export function getStageBounds(stageId = DEFAULT_STAGE_ID) {
  const config = getStageConfig(stageId)
  return {
    halfX: config.mapHalfX ?? DEFAULT_MAP_HALF_X,
    halfZ: config.mapHalfZ ?? DEFAULT_MAP_HALF_Z,
  }
}

export function isStageUnlocked(stageId, records = {}) {
  if (stageId === 'stage1') return true
  if (stageId === 'stage2') {
    return (records.stage1Clears ?? 0) >= 1 || (records.stage1Survival180Runs ?? 0) >= 3
  }
  return false
}

function applyAdminStageOverrides(base) {
  const balance = getAdminBalanceConfig()
  const durationSec = balance.stageDurationSec?.[base.id] ?? base.durationSec
  const goldMultiplier = balance.rewards?.goldMultiplier ?? 1
  return {
    ...base,
    durationSec,
    survivalMilestones: base.survivalMilestones.map((milestone) => ({
      ...milestone,
      gold: Math.max(0, Math.round(milestone.gold * goldMultiplier)),
    })),
  }
}
