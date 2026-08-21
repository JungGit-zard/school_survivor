// Stage timing and progression rules live in one place so future modes can reuse them.
import { getAdminBalanceConfig } from './adminConfig.js'

export const DEFAULT_STAGE_ID = 'stage1'

export const STAGE_DURATION_SEC = 240
export const BOSS_SPAWN_CENTER_SEC = 150
export const BOSS_SPAWN_JITTER_SEC = 0
export const ESCAPE_PORTAL_OPEN_SEC = 210
export const STAGE1_BOSS_SPAWN_SEC = 150
export const MATILDA_SPAWN_SEC = 210
export const MATILDA_WARNING_SEC = MATILDA_SPAWN_SEC - 5
export const STAGE1_MATILDA_SPAWN_SEC = MATILDA_SPAWN_SEC
export const STAGE1_MATILDA_WARNING_SEC = MATILDA_WARNING_SEC

export function rollBossSpawnSec() {
  return BOSS_SPAWN_CENTER_SEC
}

export const STAGE_CONFIGS = {
  stage1: {
    id: 'stage1',
    label: 'Stage 1',
    title: '교실 생존',
    description: '3분 30초 후 열린 탈출구로 탈출하기',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage1Clears',
    bestRecordKey: 'bestSurvivalSeconds',
    bossWarningSec: STAGE1_BOSS_SPAWN_SEC,
    bossType: 'B01',
    escapePortalSec: ESCAPE_PORTAL_OPEN_SEC,
    matildaWarningSec: STAGE1_MATILDA_WARNING_SEC,
    matildaSec: STAGE1_MATILDA_SPAWN_SEC,
    // 맵 경계(월드 유닛, 중심 0). 교실 구도에 맞춰 세로로 긴 직사각형 — 화면 세로=Z, 가로=X.
    mapHalfX: 10,
    mapHalfZ: 14.4,
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
    description: '3분 30초 후 열린 탈출구로 탈출하기',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage2Clears',
    bestRecordKey: 'stage2BestSurvivalSec',
    bossWarningSec: BOSS_SPAWN_CENTER_SEC,
    bossType: 'B02',
    e04IntroSec: 72,
    escapePortalSec: ESCAPE_PORTAL_OPEN_SEC,
    matildaWarningSec: MATILDA_WARNING_SEC,
    matildaSec: MATILDA_SPAWN_SEC,
    // 복도형: 벽/바닥/포탈/이동경계 모두 이 값에서 파생.
    mapHalfX: 7.5,
    mapHalfZ: 19.2,
    survivalMilestones: [
      { atMs: 48_000, gold: 2, label: '복도 적응 보너스' },
      { atMs: 144_000, gold: 4, label: '탄환 회피 보너스' },
      { atMs: 192_000, gold: 5, label: '복도 보스 조우 보너스' },
      { atMs: 240_000, gold: 10, label: '복도 탈출 보너스' },
    ],
  },
  stage3: {
    id: 'stage3',
    label: 'Stage 3',
    title: '체육관 총력전',
    description: '3분 30초 후 열린 탈출구로 탈출하기',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage3Clears',
    bestRecordKey: 'stage3BestSurvivalSec',
    // 보스 = 체육교사 B03 단일. 명시 버스트 시각에 고정 등장한다.
    bossWarningSec: BOSS_SPAWN_CENTER_SEC,
    bossType: 'B03',
    // 원거리 조기 등장(HUD 튜토 힌트용, 스2는 72). 실제 발사 게이트는 Enemy.jsx 소관.
    e04IntroSec: 34,
    escapePortalSec: ESCAPE_PORTAL_OPEN_SEC,
    matildaWarningSec: MATILDA_WARNING_SEC,
    matildaSec: MATILDA_SPAWN_SEC,
    // 체육관 아레나. 맵 경계를 stage2와 동일하게 맞춘다(2026-07-23 사용자 지시): halfX 6→7.5, halfZ 18→19.2.
    // 잡몹 총 HP +10% 개편의 밀도 배율(×1.23)이 좁은 폭에 몰리던 R1 리스크를 폭 확장으로 근본 해소.
    mapHalfX: 7.5,
    mapHalfZ: 19.2,
    survivalMilestones: [
      { atMs: 48_000, gold: 3, label: '아레나 적응 보너스' },
      { atMs: 144_000, gold: 5, label: '3축 돌파 보너스' },
      { atMs: 192_000, gold: 7, label: '체육교사 조우 보너스' },
      { atMs: 240_000, gold: 14, label: '총력전 탈출 보너스' },
    ],
  },
  stage4: {
    id: 'stage4',
    label: 'Stage 4',
    title: '급식실 대탈출',
    description: '3분 30초 후 열린 탈출구로 탈출하기',
    durationSec: STAGE_DURATION_SEC,
    clearRecordKey: 'stage4Clears',
    bestRecordKey: 'stage4BestSurvivalSec',
    bossType: 'B04',
    // 단일 보스 B04(주방장). 명시 버스트 시각에 고정 등장한다.
    bossWarningSec: BOSS_SPAWN_CENTER_SEC,
    // 원거리 E04 조기 도입/발사 게이트(스4 시그니처 "안전지대 소멸"). 실제 발사 게이트도 이 값(Enemy.jsx).
    e04IntroSec: 18,
    escapePortalSec: ESCAPE_PORTAL_OPEN_SEC,
    matildaWarningSec: MATILDA_WARNING_SEC,
    matildaSec: MATILDA_SPAWN_SEC,
    // 급식실 맵 경계(월드 유닛, 중심 0).
    // 프롭 정책(2026-07-25): 대형 가구 8종(조리대·쿡라인·싱크대·냉장고·배식랙·선반카트·
    // 쓰레기통·크레이트)은 콜라이더가 있는 solid 장애물이고, 중앙 조리대 4기도 여기 포함된다.
    // 바닥 잡동사니(kitchenClutter)만 통과 가능 — E04 원거리 시야를 끊지 않도록 타입 자체를
    // BLOCKING_STAGE_OBJECT_TYPES에서 제외했다(stageObjectColliders.js).
    // 가로(X)를 이전 12에서 약 +20%(→14.4)로 확장(2026-07-22 사용자 지시).
    mapHalfX: 14.4,
    mapHalfZ: 16,
    survivalMilestones: [
      { atMs: 48_000, gold: 4, label: '배식 개시 보너스' },
      { atMs: 144_000, gold: 6, label: '급식실 돌파 보너스' },
      { atMs: 192_000, gold: 9, label: '주방장 조우 보너스' },
      { atMs: 240_000, gold: 18, label: '급식실 탈출 보너스' },
    ],
  },
}

const NEXT_STAGE_BY_STAGE = {
  stage1: 'stage2',
  stage2: 'stage3',
  stage3: 'stage4',
}

export function getStageConfig(stageId = DEFAULT_STAGE_ID) {
  const base = STAGE_CONFIGS[stageId] ?? STAGE_CONFIGS[DEFAULT_STAGE_ID]
  return applyAdminStageOverrides(base)
}

export function getNextStageId(stageId = DEFAULT_STAGE_ID) {
  const next = NEXT_STAGE_BY_STAGE[stageId] ?? null
  // 비플레이어블 스테이지로는 클리어→다음 경로도 진입 금지(로비 카드 게이트와 동일 규칙).
  if (next && STAGE_CONFIGS[next]?.playable === false) return null
  return next
}

export function getStageDurationSec(stageId = DEFAULT_STAGE_ID) {
  return getStageConfig(stageId).durationSec
}

export function getStageBossType(stageId = DEFAULT_STAGE_ID) {
  return getStageConfig(stageId).bossType ?? 'B01'
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
    return (records.stage1Clears ?? 0) >= 1
  }
  if (stageId === 'stage3') {
    return (records.stage2Clears ?? 0) >= 1
  }
  if (stageId === 'stage4') {
    return (records.stage3Clears ?? 0) >= 1
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
