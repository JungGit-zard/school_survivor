// 크리스마스 한정 산타 좀비 2종(2026-11-24 Terry: "지금부터 12월 25일까지 등장할 산타좀비 만들어, 죽이면 골드 두개 드랍").
//
//  - XSG "산타 좀비" (선물보따리): 골드 고블린처럼 스폰 자리를 서성거리다가 로사리를 발견하면 도망간다.
//    행동은 E08 코인 몬스터 경로(lib/enemySimulation.js resolveCoinMonsterVelocityInto — 감지 4.5u, 놓침 6.25u,
//    배회 1.2u, 집 복귀 1.85u)를 그대로 탄다. 집 복귀(leash)가 있어 화면 밖으로 영영 달아나지 않는다.
//  - XSL "썰매 산타" (루돌프가 끄는 썰매, 한 몸): Stage 3 런좀비 크루처럼 화면 위 가장자리 밖에서 나타나
//    위 → 아래로 곧게 종단한다(같은 화면 러너 경로·같은 despawn 선). 반대편으로 빠져나가면 보상 없이 사라진다.
//  - 처치 보상: 둘 다 골드 코인 정확히 2개(components/Enemies.jsx ELITE_BONUS — 교과서 0).
//
// 기간: 플레이어 기기 로컬 시계로 2026-12-25까지(= 로컬 2026-12-26 00:00 전). 기간이 지나면 런타임 스폰 표에
// 아무것도 붙지 않아 오늘과 완전히 같은 게임이 된다.
// 무대: 공개 스테이지 1~6만. 7~10(초안)·Sltera 레이서 라이드(별도 장면)·튜토리얼은 이 스폰 표를 타지 않는다.
// 웨이브 예산 밖: E08처럼 rewardEvent 보너스 행이라 웨이브 구성·70% 밥줄 표준·HP 사다리와 무관하다.
//
// 순수 데이터 + 순수 함수. three / React / Firebase / storage import 없음.

export const SANTA_GIFT_TYPE = 'XSG'
export const SANTA_SLEIGH_TYPE = 'XSL'
// typeCode 113·114 = RDZ(112) 다음 빈 번호. 고정 — 재배열 금지(enemyEntityPool.js ENEMY_TYPE_NAMES 끝에 붙는다).
export const SANTA_GIFT_TYPE_CODE = 113
export const SANTA_SLEIGH_TYPE_CODE = 114
export const SANTA_TYPES = Object.freeze([SANTA_GIFT_TYPE, SANTA_SLEIGH_TYPE])

// 수치 정본. components/Enemy.jsx ENEMY_STATS와 lib/enemySimulation.js 런타임 표가 이 객체를 그대로 읽는다(복사본 없음).
// XSG: E08(hp 12, speed 0.88, damage 0)과 같은 결 — 도망 속도 = 0.88 × E08_COIN_FLEE_SPEED_MULTIPLIER(1.35) ≈ 1.19u/s.
//      접촉 피해 0(보상 몬스터). hp 16 = E07 한 마리 정도.
// XSL: 런좀비 크루(RZC)와 같은 속도 1.3189u/s·같은 접촉 피해 7. 세로 시야 ≈ 19.6u(위 12.4 + 아래 7.2, 390x844)라
//      화면 체류 ≈ 15초. hp 60 = 초반 무기로 한 번 지나가는 동안 잡을 수 있는 몸.
export const SANTA_GIFT_STATS = Object.freeze({ hp: 16, speed: 0.88, damage: 0, scale: 1.0, xp: 6, contactDist: 0.26 })
export const SANTA_SLEIGH_STATS = Object.freeze({ hp: 60, speed: 1.3189, damage: 7, scale: 1.3, xp: 10, contactDist: 0.34, runCrew: true })

// 처치 보상(ELITE_BONUS 행). 교과서 0 + 골드 2.
export const SANTA_KILL_BONUS = Object.freeze({ textbook: 0, gold: 2 })

// 기간 끝(배타). new Date(y, m, d)는 로컬 시각이라 플레이어 기기의 시간대를 따른다.
export const SANTA_EVENT_END_YEAR = 2026
export const SANTA_EVENT_END_MONTH_INDEX = 11 // 12월
export const SANTA_EVENT_END_EXCLUSIVE_DAY = 26

export function santaEventEndExclusive() {
  return new Date(SANTA_EVENT_END_YEAR, SANTA_EVENT_END_MONTH_INDEX, SANTA_EVENT_END_EXCLUSIVE_DAY, 0, 0, 0, 0)
}

// 지금(2026-11-24)부터 12-25 끝까지 true. 시작 하한은 두지 않는다(배포 시점부터 바로 켜진다).
export function isSantaEventActive(date = new Date()) {
  const time = date instanceof Date ? date.getTime() : Number.NaN
  if (!Number.isFinite(time)) return false
  return time < santaEventEndExclusive().getTime()
}

// 공개 스테이지 1~6(lib/stageConfig.js VISIBLE_STAGE_IDS와 같은 집합). 7~10 초안은 넣지 않는다.
export const SANTA_EVENT_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6'])
export function isSantaEventStage(stageId) {
  return SANTA_EVENT_STAGE_IDS.includes(stageId)
}

// 스폰 시각(초). 스테이지 1~6 어느 표의 단발 버스트 초와도, E08 90·180초와도, 보스 150초·탈출구/마틸다 210초와도
// 겹치지 않는 초만 골랐다(가장 가까운 큰 버스트와 최소 2초 이상 떨어진다).
//  XSG ≈ 75초 간격, 40초대 시작: 47 → 122 → 196.
//  XSL ≈ 120초 간격, 70초대 시작: 78 → 202. (70~72초는 스3 런좀비 크루 72초와 겹쳐 78초로 미뤘다.)
// 한 번에 1마리. 같은 종이 아직 살아 있으면 그 회차는 건너뛴다(Enemies.jsx) → 동시 최대 1마리.
export const SANTA_GIFT_SPAWN_SECS = Object.freeze([47, 122, 196])
export const SANTA_SLEIGH_SPAWN_SECS = Object.freeze([78, 202])
export const SANTA_REWARD_EVENT = 'santa'

export const SANTA_RUNTIME_EVENTS = Object.freeze([
  ...SANTA_GIFT_SPAWN_SECS.map((sec) => Object.freeze({ sec, type: SANTA_GIFT_TYPE, count: 1, rewardEvent: SANTA_REWARD_EVENT })),
  ...SANTA_SLEIGH_SPAWN_SECS.map((sec) => Object.freeze({ sec, type: SANTA_SLEIGH_TYPE, count: 1, rewardEvent: SANTA_REWARD_EVENT })),
].sort((a, b) => a.sec - b.sec))

const NO_EVENTS = Object.freeze([])

// 런 시작 때 한 번 부른다(런 도중 자정이 지나도 그 판은 그대로 — 4분짜리 판이다).
export function getSantaRuntimeEvents(stageId, date = new Date()) {
  return isSantaEventActive(date) && isSantaEventStage(stageId) ? SANTA_RUNTIME_EVENTS : NO_EVENTS
}

export function isSantaType(type) {
  return type === SANTA_GIFT_TYPE || type === SANTA_SLEIGH_TYPE
}

export function isSantaEvent(evt) {
  return evt?.rewardEvent === SANTA_REWARD_EVENT && isSantaType(evt.type)
}
