// 신규 좀비 2차 세트(E89~E106) 1차 구현분의 행동 런타임 정본. Level_Mini 소유.
// 데이터: lib/novelZombie2Content.js · 치프 계층: lib/stageChiefContent.js · 비주얼: lib/novelZombie2Visuals.js.
//
// 1차(wave 1) 8종 중 6종이 여기서 돈다:
//   E89 반장(치프, Stage 1) — "차렷! 경례!": 반경 안 일반 좀비를 동결시켰다가 확정 방향으로 동시 돌진시킨다.
//   E93 그림자밟기(Stage 2) — 늘 "2초 전 플레이어 위치"로 걷는다.
//   E96 드리블(Stage 3)    — 전역 0.5초 박자: 걸음·걸음·예고·돌진. 같은 종 전원이 같은 박에 움직인다.
//   E99 압력밥솥(Stage 4)  — 죽은 자리에 1.2초 예고 뒤 r 1.4u 폭발(피해 12, 플레이어만).
//   E103 커피 셔틀(Stage 5) — 아군 뒤에 머물며 일반 좀비 1기에 "카페인"(이동 ×1.35, 5초).
//   E105 2인3각(Stage 6)    — 두 몸이 하나처럼 움직이다 한쪽이 죽으면 남은 쪽이 2초 넘어진다.
// 나머지 2종(E94 대걸레 rootline, E97 뜀틀 hop)은 확장 공격 런타임(stepExpansionAttack)을 그대로 쓴다.
//
// 2차(wave 2, 2026-11-15) 4종:
//   E90 숙제 걷기 당번(Stage 1) — 플레이어 자석 범위 + 1u 밖의 바닥 교과서를 주워 가방에 담고(최대 8권) 3u 안이면 지그재그로 도망친다.
//                               공격 없음. 처치하면 주운 책 전부 + 보너스 1권(8XP)을 떨어뜨린다(lib/textbookTheftBridge.js).
//   E91 교과서 미믹(Stage 1)   — 바닥 교과서로 위장해 잠잔다(접촉 0·자동조준 제외). 1.4u 안이면 0.6초 예고 뒤 r 1.0u 물기(6), 그 뒤 깡충 추격.
//   E92 기차놀이 기관사(Stage 2 치프) — 초당 70°까지만 도는 머리 + 경로를 밟는 객차 E01 4기. 9초마다 0.9초 예고선 뒤 확정 방향 돌진 5.76u.
//                               머리가 죽으면 객차가 1.2초 기절했다가 일반 E01이 된다.
//   E95 긴줄넘기 듀오(Stage 3 치프, 두 몸) — 플레이어 양옆에 서서 2.0초 주기로 줄(선 공격, 피해 10)을 내려친다. 한 몸이 죽으면 남은 몸이 1.5배 속도로 추격.
//
// 3차(wave 3, 2026-11-16) 치프 3종(행동·스탯·등장 행 — 포즈·소품은 threemini 다음 차례):
//   E98 대식가(Stage 4 치프)   — 7초마다 1.0초 입을 벌리는 빨간 부채꼴(70°·r 2.2u) → 물기 14 + 부채꼴 안 약한 잡몹(HP ≤ 자기 최대 HP 25%)
//                               최대 3기를 0.4초 동안 입으로 끌어와 먹는다(먹을 때마다 최대 HP 8% 회복·크기 +6%·속도 −5%, 6마리까지).
//                               그 뒤 1.4초 제자리에서 씹는다. 먹힌 잡몹의 XP는 쌓였다가 대식가가 죽으면 교과서로 그대로 떨어진다.
//   E101 복사기(Stage 5 치프)  — 10초마다 반경 5u 안 가장 가까운 단순 잡몹(E01·E02·E03·E07)을 1.2초 노란 원으로 스캔한 뒤
//                               옆에 복사본 1기(HP 40%, XP·드롭 0, 20초 뒤 소멸, 동시 2기)를 만든다. 복사기가 죽으면 복사본도 사라진다.
//                               2.5u 안이면 1.0초 빨간 부채꼴(60°·r 2.4u) 뒤 피해 12. 4초 안에 최대 HP 20%를 맞으면 2.5초 "용지 걸림"(제자리·피해 0).
//   E104 공굴리기 대장(Stage 6 치프) — 8초마다(HP 50% 이하 6초) 1.3초 빨간 선(폭 1.8u, 맵 끝까지 최대 20u) 뒤 지름 1.8u 공을 6u/s로 굴린다.
//                               공은 플레이어 1회 10, 지나가는 일반 좀비 60(굴림당 6기까지, 플레이어 처치로 계산 — drainBallHits).
//                               멈춘 공은 0.8u/s로 주우러 간다.
//
// 불변식(테스트가 못박는다):
//  1. 예고(TELEGRAPH, 상태 8) 중에는 이 종의 피해가 0이다 — 접촉 피해도 끈다(noContact).
//  2. 공격 방향·위치는 예고가 시작/끝나는 순간 1회 확정되고 그 뒤로 추적하지 않는다 → 옆으로 비키면 빈 자리가 남는다.
//  3. 버프·지휘 대상은 일반 잡몹뿐이다: 마틸다·보스(풀 밖)·치프·E08(코인)·런 크루는 절대 대상이 아니다.
//  4. 로사리 투사체를 막거나 반사·흡수하지 않는다(이 모듈은 투사체를 전혀 다루지 않는다).
//  5. 프레임 경로에서 객체를 새로 만들지 않는다(예고 스냅샷 생성은 상태 전이 때 1회).
//  6. Math.random()을 쓰지 않는다(시뮬레이션 패리티).
//
// 거리 단위 = 월드 유닛(u), 1블록 = 4u. 시간 = 게임 시간 ms(일시정지 중 진행하지 않는다).
import { ENEMY_TYPE_NAMES, MAX_ENEMIES } from './enemyEntityPool.js'
import { NOVEL2_TYPE_CODES, NOVEL2_ZOMBIE_STATS } from './novelZombie2Content.js'
import { isChiefTypeCode } from './stageChiefContent.js'
import { advanceExpansionSnapshot, emitExpansionHazardSnapshot, expansionAttackContains, expansionAttackSnapshots, expansionChannelFree } from './expansionAttackRuntime.js'
import { EXPANSION_PLAYER_RADIUS, buildExpansionSafetyGeometry, certifyExpansionEscape, novel2NearSafetyObstacles } from './expansionAttackSafety.js'
import { isStageObjectSightBlocked } from '../components/StageObjects/stageObjectColliders.js'
import { markSupportImmune } from './projectileZombieBehavior.js'
import { findStealableTextbookInto, getTextbookTheftMagnetRadius, isStealableTextbook, stealTextbook, textbookPositionInto } from './textbookTheftBridge.js'

export const N2_STATE_APPROACH = 7
export const N2_STATE_TELEGRAPH = 8
export const N2_STATE_ATTACK = 9
export const N2_STATE_RECOVER = 10
export const N2_STATE_STUN = 4
// E91 미믹이 깨어나 깡충 추격하는 상태(회복 상태 번호를 빌린다 → 미니 몸 포즈 'stun' = 뚜껑이 살짝 열린 책).
export const N2_STATE_AWAKE = N2_STATE_RECOVER
// 지휘받은 일반 좀비의 상태(기존 E05 경고/돌진 코드 재사용 → 풀 렌더러의 경고 포즈·"GO!" 큐가 그대로 붙는다).
export const N2_COMMAND_STATE_FREEZE = 2
export const N2_COMMAND_STATE_LUNGE = 3

const CODE = NOVEL2_TYPE_CODES
export const E89_CODE = CODE.E89
export const E93_CODE = CODE.E93
export const E96_CODE = CODE.E96
export const E99_CODE = CODE.E99
export const E103_CODE = CODE.E103
export const E105_CODE = CODE.E105
export const E90_CODE = CODE.E90
export const E91_CODE = CODE.E91
export const E92_CODE = CODE.E92
export const E95_CODE = CODE.E95
export const E98_CODE = CODE.E98
export const E101_CODE = CODE.E101
export const E104_CODE = CODE.E104
export const E100_CODE = CODE.E100
export const E102_CODE = CODE.E102
export const E106_CODE = CODE.E106
export const E01_CODE = 1

// ── E89 반장 좀비 "차렷! 경례!" ─────────────────────────────────────────────
export const E89_COMMAND = Object.freeze({
  triggerDistance: 5.5,   // 플레이어가 이 거리(1.375블록) 안
  radius: 4.0,            // 지휘 반경(1.0블록)
  telegraphMs: 1200,      // "차렷!" 노란 원
  freezeMs: 800,          // 동결(이때 방향 확정)
  lungeMs: 400,
  lungeSpeed: 4.0,        // 4u/s × 0.4s = 1.6u(0.4블록)
  recoverMs: 1000,        // 인사
  cooldownMs: 7000,
  firstDelayMs: 3000,
  maxCommanded: 8,
})
// 지휘 가능한 타입 = 단순 추격 잡몹(E01·E02·E03·E06·E07). 자기 상태기계가 있는 종(E05·신형·투사체·확장)은 넣지 않는다.
const COMMANDABLE_CODES = new Set([1, 2, 3, 6, 15])
export function isCommandableTypeCode(typeCode) {
  return COMMANDABLE_CODES.has(typeCode)
}

// ── E93 그림자밟기 ───────────────────────────────────────────────────────────
export const E93_SHADOW = Object.freeze({
  sampleMs: 100,
  capacity: 40,           // 4초분
  lagMs: 2000,            // 2초 전 위치
  catchUpDistance: 1.5,
  catchUpSpeed: 1.6,
  arriveDistance: 0.05,
})

// ── E96 드리블(전역 메트로놈) ────────────────────────────────────────────────
// 박 0 = 돌진, 1·2 = 걸음, 3 = 예고. 예고(박 3) 시작에 방향을 확정한다.
export const E96_DRIBBLE = Object.freeze({
  beatMs: 500,
  stepMs: 250,
  stepSpeed: 2.0,         // 0.5u/박
  lungeSpeed: 2.4,        // 2.4u/s × 0.5s = 1.2u(0.3블록)
})

// ── E99 압력밥솥(사망 폭발) ──────────────────────────────────────────────────
export const E99_BURST_PATTERN = Object.freeze({
  id: 'e99_burst', shape: 'disk', rangeUnits: 1.4, widthUnits: 0,
  windupMs: 1200, activeMs: 200, recoveryMs: 200, damage: 12, maxHitsPerTarget: 1,
})
export const E99_MAX_BURSTS = 2

// ── E103 커피 셔틀 ────────────────────────────────────────────────────────────
export const E103_COFFEE = Object.freeze({
  minDist: 4, maxDist: 6,
  pickRadius: 4,
  telegraphMs: 800,
  recoverMs: 400,
  cooldownMs: 6000,
  firstDelayMs: 1500,
  buffMs: 5000,
  buffSpeedMul: 1.35,
  maxBuffed: 4,
})
// 커피를 받을 수 있는 타입 = 일반 잡몹. 치프·E08(16)·런 크루(7,8,13,14)·자기 자신(E103)은 제외. 마틸다·보스는 풀에 없다.
const BUFFABLE_BASE_CODES = new Set([1, 2, 3, 4, 5, 6, 15])
export function isBuffableTypeCode(typeCode) {
  if (!Number.isInteger(typeCode) || typeCode <= 0) return false
  if (typeCode === 16 || typeCode === 7 || typeCode === 8 || typeCode === 13 || typeCode === 14) return false
  if (isChiefTypeCode(typeCode) || typeCode === E103_CODE) return false
  if (BUFFABLE_BASE_CODES.has(typeCode)) return true
  // 확장 일반(17~31), Track B(37~48), 투사체 좀비(49~74, 64 예약 제외), 블록 좀비(76~93), 2차 일반(94~111 중 치프 아닌 것).
  return (typeCode >= 17 && typeCode <= 31) || (typeCode >= 37 && typeCode <= 74 && typeCode !== 64)
    || (typeCode >= 76 && typeCode <= 111)
}

// E104 공에 맞는 타입 = 풀 안의 일반 좀비. 치프(자기 포함)·E08(16)·런 크루(7·8·13·14)는 제외. 마틸다·보스는 풀에 없다.
export function isBallTargetTypeCode(typeCode) {
  if (!Number.isInteger(typeCode) || typeCode <= 0) return false
  if (typeCode === 16 || typeCode === 7 || typeCode === 8 || typeCode === 13 || typeCode === 14) return false
  if (isChiefTypeCode(typeCode)) return false
  return isBuffableTypeCode(typeCode) || typeCode === E103_CODE
}

// ── E105 2인3각 ───────────────────────────────────────────────────────────────
export const E105_PAIR = Object.freeze({
  spacing: 0.6,
  regroupDistance: 1.2,
  walkMs: 400,
  pauseMs: 200,
  tripMs: 2000,
  soloSpeed: 0.45,
  springGain: 3.0,
})

// ── E90 숙제 걷기 당번(도둑) ──────────────────────────────────────────────────
export const E90_THIEF = Object.freeze({
  seekRadius: 6,          // 이 반경(1.5블록) 안의 책만 노린다
  magnetMargin: 1,        // 플레이어 자석 반경 + 1u 밖의 책만
  pickupReach: 0.45,      // 이 거리 안이면 줍기 시작
  pickupMs: 400,          // 줍기(예고 상태 8 — 피해 없음)
  maxBooks: 8,
  bagScalePerBook: 0.08,  // 가방이 책마다 +8%
  fleeTrigger: 3.0,       // 플레이어가 이 거리 안이면 도망
  fleeMs: 2000,
  fleeSpeed: 1.25,        // 플레이어 3.0u/s보다 느리다 → 반드시 따라잡힌다
  zigzagHz: 2.5,
  zigzagAmp: 0.7,
  wanderMin: 5, wanderMax: 7,
  bonusXp: 8,             // 처치 보너스 1권
})

// ── E91 교과서 미믹 ───────────────────────────────────────────────────────────
// 물기 예고 0.85초(원 r 1.0u는 그대로 — 시각 예고와 같다). 정지한 플레이어가 원 밖(1.0u + 몸 반경)으로 나가려면
// 3u/s로 약 0.4초가 걸린다 → 반응 한계 약 0.45초(기준 반응 0.35초 + 0.1초 여유).
// 2026-11-15 balanceqa: 0.6초에서는 반응 한계가 0.2초 아래였다(0.2초 반응이면 물렸다) — 서 있는 플레이어에게 사실상 못 피하는 함정.
// (설계안 0.5초는 탈출 인증(1.2u 중앙 통로 + 몸 반경, 1.79u)이 절대 통과하지 않는다.)
export const E91_MIMIC = Object.freeze({
  triggerDistance: 1.4,   // 0.35블록
  biteRadius: 1.0,
  telegraphMs: 850,
  biteMs: 150,
  biteDamage: 6,
  maxDormant: 4,          // 잠든 미믹이 4기를 넘으면 가장 오래 잔 미믹부터 깨어나 추격한다
  hopCycleMs: 500,
  hopMoveMs: 300,         // 0.5초 주기 중 0.3초만 움직인다(깡충)
})

// ── E92 복도 기차놀이 기관사(치프) ────────────────────────────────────────────
// 돌진 예고선 폭 1.1u(반폭 0.55) ≥ 머리 접촉 0.4u + 옆 밀림 허용 0.15u. 길이 6.2u ≥ 돌진 5.76u + 머리 접촉 0.4u.
// (설계안 폭 0.6u는 머리 접촉 판정 0.8u 폭보다 좁아 선 밖에서도 맞는다.)
// 2026-11-15 balanceqa 리뷰 후속(스2 기준 봇, 같은 시드 짝비교 — 기관사 있음 vs 없음, 사망률 차. 모두 머리 실효 120·객차 방패/회복 제외):
//   120초 앵커(240판): 객차 6기 +6.7%p(p=0.007) · 4기 +5.8%p · 3기 +8.3%p · 3기+대시 간격 9초 +5.0%p · 4기+9초 +4.6%p.
//   객차 수는 판 운 폭(±3%p) 안에서 효과가 없었다. 184초 앵커 +0%p(교전이 거의 없어 치프 의미가 사라짐).
//   144초 앵커(480판): 4기+간격 6초 +4.0%p(p=0.02) · 4기+간격 9초 +1.9%p(p=0.25).
//   → 객차 4기(기차 정체성 최소 3기), 대시 간격 9초, 앵커 144초(burstEvents.js). 객차는 방패·회복을 받지 않는다(_buildTrain).
export const E92_TRAIN = Object.freeze({
  carCount: 4,
  carSpacing: 0.7,
  carMaxSpeed: 1.6,
  carBaseHp: 8,           // E01 base. 객차 HP = 8 × (머리 실효 HP ÷ 머리 base HP) — 스테이지 배수를 그대로 탄다
  reserveSlots: 2,        // 보스·마틸다 몫(동시 150 상한) — 풀에 이만큼 비어 있지 않으면 객차를 덜 세운다
  pathSample: 0.1,
  pathCapacity: 128,      // 12.8u
  turnRateRad: 70 * Math.PI / 180,
  firstDelayMs: 2500,
  cooldownMs: 9000,
  triggerDistance: 6.0,
  telegraphMs: 900,
  chargeSpeed: 3.6,
  chargeMs: 1600,         // 3.6 × 1.6 = 5.76u(1.44블록)
  recoverMs: 1200,
  lineLength: 6.2,
  lineWidth: 1.1,
  lateralTolerance: 0.15, // 돌진 중 선 중심에서 이만큼 밀리면 그 자리에서 멈춘다(예고선 밖으로 못 나간다)
  derailMs: 1200,
})

// 머리 접촉 반경 = contactDist × ENEMY_SIZE_MULTIPLIER(4/3, enemySimulation.js — 순환 import를 피해 값만 쓴다).
export const E92_HEAD_CONTACT = (NOVEL2_ZOMBIE_STATS.E92?.contactDist ?? 0.3) * (4 / 3)

// ── E95 긴줄넘기 듀오(치프, 두 몸) ────────────────────────────────────────────
export const E95_ROPE = Object.freeze({
  flankHalf: 2.25,        // 줄 4.5u(1.125블록)의 절반 — 플레이어 양옆
  arriveDistance: 0.08,
  minSpan: 2.0,
  maxSpan: 6.5,
  triggerDistance: 1.2,   // 플레이어가 두 몸 사이 선분에서 이 거리 안
  ropeWidth: 0.5,
  windupMs: 900,          // 줄을 들어 올림(양끝 고정)
  slamMs: 300,            // 내려침 — 선 판정, 피해 10
  safeMs: 800,            // 줄이 위에 떠 있는 안전 구간
  damage: 10,
  soloSpeedMul: 1.5,
  unpairedGraceMs: 3000,  // 짝 없이 이만큼 지나면 혼자 추격(장부·동시 상한에 한 몸만 나온 경우)
})

// ── 3차 치프 공통: 먹기·복사 대상 = 단순 추격 잡몹(E01·E02·E03·E07). 자기 상태기계가 있는 종(투사체·신형·확장·E05)은 넣지 않는다 —
// 상태기계 도중에 끌려가거나 복제되면 예약된 탄·예고가 꼬인다. E06(거대)은 엘리트 보상이 있어 복제 대상이 아니다.
const SIMPLE_MOB_CODES = new Set([1, 2, 3, 15])

// ── E98 대식가(치프, Stage 4) ─────────────────────────────────────────────────
// 물기 부채꼴 r 2.2u(0.55블록)·70°, 예고 1.0초(wave 2 교훈 ≥ 0.85초). 부채꼴은 예고 시작 자리·방향으로 고정된다.
// 정지한 플레이어가 부채꼴 밖(옆으로 최대 2.2u × sin35° + 몸 반경)으로 나가는 데 3u/s로 약 0.5초 — 반응 여유 0.5초.
// 먹기(흡입)는 같은 부채꼴 안만 — 그려진 범위 밖의 좀비는 끌려오지 않는다.
export const E98_EATER = Object.freeze({
  firstDelayMs: 2500,
  cooldownMs: 7000,
  biteTrigger: 2.5,       // 플레이어가 이 거리 안이면(먹이가 없어도) 입을 벌린다
  coneRadius: 2.2,
  coneAngleDeg: 70,
  telegraphMs: 1000,      // 입을 벌림(빨간 부채꼴, 피해 0)
  biteMs: 200,            // 물기 판정(부채꼴 안, 1회 14)
  biteDamage: 14,
  suckMs: 400,            // 먹이를 입으로 끌어옴(ATTACK — 몸 접촉 피해 0)
  chewMs: 1400,           // 제자리에서 씹기(처치 기회)
  mouthOffset: 0.4,       // 끌려온 먹이가 모이는 자리 = 부채꼴 원점 + 방향 × 0.4u
  edibleHpRatio: 0.25,    // 먹이 HP ≤ 대식가 최대 HP의 25%(스4 173 → 43 이하: E01 14·E03 17·E07 28)
  maxPerGulp: 3,
  maxEaten: 8,            // 저장 칸(XP를 쌓는 상한). 다 차면 먹지 않고 물기만 한다
  healPerEat: 0.08,
  growPerEat: 0.06,
  growCapEats: 6,         // 크기 +36%, 속도 −30%에서 멈춘다
  slowPerEat: 0.05,
})

// ── E101 복사기(치프, Stage 5) ────────────────────────────────────────────────
// 복사본은 동시 2기(설계 4 → 스5 사망률이 이미 가장 높아 절반), 20초 뒤 소멸, HP 40%, XP·드롭 0. 동시 150 상한은 보스·마틸다 몫 2칸을 남긴다.
// 설계의 "용지 걸림 중 받는 피해 +30%"는 넣지 않았다 — 무기 보상 판정(Enemies.jsx 히트 브리지)이 시뮬레이션보다 먼저 처치 여부를 정하므로
// 배율을 시뮬레이션 쪽에만 걸면 처치 보상이 어긋난다. 대신 걸림 2.5초는 제자리·접촉 피해 0이다.
export const E101_COPIER = Object.freeze({
  firstDelayMs: 3000,
  // 복사
  pickRadius: 5,
  scanMs: 1200,           // 노란 원(피해 0) — 복사 대상 발밑
  scanRadius: 0.8,
  scanRecoverMs: 400,
  copyCooldownMs: 10000,
  maxCopies: 1,
  copyHpRatio: 0.4,
  copyLifeMs: 20000,
  copyOffset: 0.8,
  reserveSlots: 2,
  // 근접 부채꼴
  fanTrigger: 2.5,
  fanRadius: 2.4,
  fanAngleDeg: 60,
  fanTelegraphMs: 1000,
  fanActiveMs: 150,
  fanRecoverMs: 500,
  fanDamage: 12,
  fanCooldownMs: 4000,
  // 용지 걸림
  jamWindowMs: 4000,
  jamDamageRatio: 0.2,
  jamMs: 2500,
  jamImmuneMs: 3000,      // 걸림이 끝난 뒤 이만큼은 다시 걸리지 않는다(영구 경직 방지)
})

// ── E104 공굴리기 대장(치프, Stage 6) ─────────────────────────────────────────
// 예고선 폭 1.8u = 공 지름. 공 중심은 선 안쪽 [r, 길이 − r]만 지나므로 공 판정이 그려진 선 밖으로 나가지 않는다.
// 플레이어 피해는 "공 원 안 + 그려진 선 안" 둘 다일 때만(선 전체가 3초 동안 아픈 게 아니라 공이 지나가는 자리만).
// 정지한 플레이어가 선 밖(반폭 0.9 + 몸 0.19)으로 나가는 데 3u/s로 약 0.4초 — 예고 1.3초.
export const E104_BALL = Object.freeze({
  firstDelayMs: 2500,
  cooldownMs: 8000,
  enragedCooldownMs: 6000,
  enrageHpRatio: 0.5,
  triggerDistance: 12,    // 3블록 — 화면 안
  telegraphMs: 1300,
  ballRadius: 0.9,        // 지름 1.8u(0.45블록)
  lineWidth: 1.8,
  maxLength: 20,          // 5블록
  minLength: 4,
  edgeMargin: 0.2,
  rollSpeed: 6,
  // 공 피해 10 = 스6 E19 접촉 10(교장 B05 훈화 9보다 1 높다). 설계 14는 스6 짝비교(연필 봇 60시드, 치프 있음/없음)에서
  // 사망 27 대 15(+20%p)였다 — 그 판들에서 늘어난 피해의 대부분이 공(판당 약 18)이었다.
  damage: 10,
  zombieDamage: 60,       // 지나가는 일반 좀비(치프·E08·런 크루 제외). 처치는 플레이어 처치로 계산된다(Enemies.jsx drainBallHits)
  zombieHitPad: 0.3,
  // 굴림 한 번에 좀비를 이만큼만 친다(그 뒤로는 공이 좀비를 그냥 지나간다). 상한이 없으면 공이 쫓아오는 무리를 매번 쓸어
  // XP가 폭주한다 — 스6 프로브(연필 봇, 치프가 끝까지 산다) 6시드: 공 처치 판당 106~169 · 레벨 7~11(공 처치 없으면 1~6 · 레벨 1~2).
  // 조회 줄(12명) 절반을 쓸 수 있는 6으로 둔다(balanceqa 확인 항목).
  maxZombieHitsPerRoll: 3,
  kickMs: 600,            // 찬 뒤 제자리(접촉은 켜진다)
  retrieveSpeed: 0.8,
  pickupReach: 0.8,
  pickupDelayMs: 1000,    // 주운 뒤 이만큼은 다시 굴리지 않는다
  retrieveTimeoutMs: 12000, // 굴린 뒤 이만큼 지나도 못 주우면 새 공을 꺼낸다(막힌 자리 대비)
})

// ── E100 찹쌀떡(Stage 4) ──────────────────────────────────────────────────────
// 1.3u 안이면 0.9초 웅크림(빨간 선 1.75 × 0.9u, 피해 0 — 방향·착지점은 예고 시작에 고정) → 3u/s로 착지점까지 도약 →
// 착지점 0.45u 안이면서 그려진 선 안이면 플레이어 등에 매달린다(매달리는 순간 물기 6 한 번).
// 매달린 동안 이동 −25%(2기 −40%, 그 이상은 매달리지 못한다), 추가 피해 없음. 플레이어가 누적 4u를 움직이면(대응) · 4초가 지나면 ·
// 처치하면 떨어진다. 떨어진 떡은 1초 퍼져 있고(접촉 0) 5초 동안 다시 매달리지 못한다. 매달림이 끝나면 플레이어는 1.5초 동안
// 새 매달림을 받지 않는다(감속이 이어 붙어 영구 감속이 되지 않게). 마틸다 경고(205초) 뒤에는 매달리지 않고, 매달린 떡은 떨어진다.
// 설계 E82의 "매달림 초당 피해 2"는 넣지 않았다: 플레이어 피해 경로(store.damagePlayer)는 한 번 맞을 때마다 0.52초 무적과 넉백을
// 건다 — 초당 피해로 넣으면 매달린 떡이 다른 좀비 피해를 막는 방패가 되고 플레이어를 계속 밀친다. 그래서 매달리는 순간 1회 6으로 바꿨다.
// 거리: 웅크림 시작 1.3u(0.325블록) · 선 1.75u(0.44블록) · 매달림 판정 0.45u(0.11블록) · 떨쳐내기 4u(1블록).
export const E100_MOCHI = Object.freeze({
  firstDelayMs: 1000,
  triggerDistance: 1.3,
  telegraphMs: 900,       // 설계 0.5초 → 예고 ≥ 0.85초 불변식
  lineLength: 1.75,       // 웅크림 시작 거리 1.3 + 매달림 판정 0.45
  lineWidth: 0.9,         // 반폭 0.45 = 매달림 판정 반경(옆으로 0.45 + 몸 0.19 비키면 빗나간다 — 3u/s로 약 0.21초)
  leapSpeed: 3.0,
  clingReach: 0.45,
  latchDamage: 6,
  missRecoverMs: 800,     // 빗나가면 바닥에 퍼진 채(처치 기회, 접촉 0)
  cooldownMs: 3000,
  maxClingers: 2,
  slowOne: 0.75,
  slowTwo: 0.6,
  shakeOffDistance: 4,
  maxClingMs: 4000,
  maxStepMove: 0.5,       // 한 스텝에 이보다 크게 움직인 몫(순간이동)은 떨쳐내기에 세지 않는다
  dropStunMs: 1000,
  reclingCooldownMs: 5000,
  playerImmuneMs: 1500,
  noClingAfterSec: 205,
  attachOffset: 0.3,      // 플레이어 등 뒤(떡마다 좌우로 비켜) 0.3u
  // 2026-11-17 비주얼 맞춤: 매달린 자리는 로사리 몸 방향 기준 등 뒤에서 좌우로 0.6rad(약 34°) 비킨 곳 — 첫 떡 왼등, 둘째 떡 오른등.
  // 로사리가 돌면 초당 720°까지 따라 돈다(그린 몸 = 맞는 몸 자리).
  clingBackAngleRad: 0.6,
  clingTurnRateRad: 4 * Math.PI,
})

// ── E102 회전의자(Stage 5) ────────────────────────────────────────────────────
// 사무용 회전의자(바퀴 5개)에 앉은 교사. 보조기구가 아니다. 5u 안이면 0.9초 제자리 회전 예고(빨간 선 4.2 × 1.8u, 방향 고정, 피해 0) →
// 1.6초 활주(2.0u/s²로 최대 2.6u/s, 플레이어 쪽으로 초당 25°까지만 꺾음) → 1.0초 표류(방향 전환 없이 감속) → 1.2초 쉼 → 반복.
// 활주·표류 중 피해 = 몸 접촉 10. 의자 중심은 선 축에서 옆으로 0.553u(반폭 0.9 − 접촉 0.347) 안, 앞으로 4.2 − 0.347u 안만 다닌다 →
// 접촉 판정이 그려진 선 밖으로 나가지 않는다. 장애물에 미끄러지거나 밀려 선을 벗어나려 하면 그 자리에서 멈춘다(순간이동 없음).
// 최대 이동: 활주 0.5·2·1.3² + 2.6·0.3 = 2.47u + 표류 2.6·1.0/2 = 1.3u = 3.77u ≤ 4.2 − 0.347.
// 설계 E84의 예고 0.6초는 불변식(≥ 0.85초)에 맞춰 0.9초로 늘렸다.
export const E102_CHAIR = Object.freeze({
  firstDelayMs: 1000,
  triggerDistance: 5,     // 1.25블록
  telegraphMs: 900,
  lineLength: 4.2,        // 1.05블록
  lineWidth: 1.8,         // 0.45블록
  accel: 2.0,
  maxSpeed: 2.6,
  glideMs: 1600,
  turnRateRad: 25 * Math.PI / 180,
  driftMs: 1000,
  cooldownMs: 1200,
})
// 의자 접촉 반경 = contactDist × 4/3(enemySimulation ENEMY_SIZE_MULTIPLIER — 순환 import를 피해 값만 쓴다).
export const E102_CONTACT = (NOVEL2_ZOMBIE_STATS.E102?.contactDist ?? 0.26) * (4 / 3)

// ── E106 기마전(Stage 6, 몸 4개) ──────────────────────────────────────────────
// 한 행(count 4)의 몸 4개가 첫 걸음에 편대가 된다: 가장 낮은 슬롯이 기수, 나머지 셋이 말(앞 · 왼뒤 · 오른뒤).
// 편대는 기수를 축으로 0.75u/s, 초당 90°까지만 돈다. 말은 자기 자리로 따라간다(최대 1.4u/s). 막 나온 몸끼리면 자리로 바로 모은다.
// 기수의 "모자 뺏기": 2.0u 안이면 0.9초 빨간 부채꼴(90°·r 2.2u, 기수 자리·방향 고정, 피해 0) → 피해 10 → 0.5초 쉼, 쿨다운 4초.
//   2026-11-17 브라우저 확인 뒤: 1.5u/1.6u에서는 편대가 멈출 때 앞 말(기수 앞 0.8u)이 로사리에서 0.7u — 화면에서 로사리 위에 겹치고 부채꼴 안에
//   들어가 있었다. 2.0u에서 멈추면 앞 말 중심이 로사리에서 약 1.2u, 몸끼리 약 0.66u(앞 말 접촉 0.347 + 로사리 0.192를 뺀 값) 떨어진다.
//   부채꼴 r 2.2u는 멈춘 거리 + 0.2u라 가만히 선 플레이어는 맞고, 뒤로 0.4u(0.13초) 또는 옆으로 약 1.6u(0.53초) 비키면 빗나간다.
//   예고·판정 동안 편대 전체가 멈추고 몸 접촉도 끈다. 말 위의 기수는 몸 접촉이 없다(공격은 모자 뺏기뿐).
// 처치 순서: 기수를 먼저 잡으면 말 셋이 0.8초 휘청였다가 흩어져 E19처럼 0.6u/s로 추격한다.
//   말 셋을 먼저 잡으면 기수가 1초 낙마했다가 1.2u/s로 질주한다(몸 접촉 10, 모자 뺏기 없음).
// 몸이 4개가 다 나오지 못했으면(동시 150 상한) 1.5초 뒤 있는 몸끼리 편대를 짓는다(혼자면 E19처럼 추격).
// 설계 E88의 예고 0.8초는 불변식(≥ 0.85초)에 맞춰 0.9초로 늘렸다.
export const E106_CAVALRY = Object.freeze({
  bodies: 4,
  linkGraceMs: 1500,
  // 말 자리(진행 방향 기준 [옆, 앞] u): 앞 · 왼뒤 · 오른뒤. 기수는 가운데(0, 0).
  slots: Object.freeze([Object.freeze([0, 0.8]), Object.freeze([-0.7, -0.4]), Object.freeze([0.7, -0.4])]),
  formSpeed: 0.75,
  horseCatchUpSpeed: 1.4,
  turnRateRad: 90 * Math.PI / 180,
  edgeMargin: 0.4,
  firstDelayMs: 1500,
  triggerDistance: 2.0,   // 0.5블록 — 멈춘 편대의 앞 말이 로사리와 겹치지 않는 거리
  coneRadius: 2.2,        // 0.55블록
  coneAngleDeg: 90,
  telegraphMs: 900,
  activeMs: 150,
  recoverMs: 500,
  cooldownMs: 4000,
  damage: 10,
  scatterStunMs: 800,
  horseSoloSpeed: 0.6,
  dismountStunMs: 1000,
  riderSoloSpeed: 1.2,
})

const COMMAND_TELEGRAPH_KEY_PREFIX = 'novel2:e89:'
const COFFEE_TELEGRAPH_KEY_PREFIX = 'novel2:e103:'
const BURST_KEY_PREFIX = 'novel2:e99:'
// 안전 기하·탈출 인증 실패 시 재시도 간격(expansionAttackSafety EXPANSION_SAFETY_LIMITS.retryMs와 같다).
const SAFETY_RETRY_MS = 250
const BITE_KEY_PREFIX = 'novel2:e91:'
const TRAIN_LINE_KEY_PREFIX = 'novel2:e92:'
const ROPE_KEY_PREFIX = 'novel2:e95:'
const EATER_KEY_PREFIX = 'novel2:e98:'
const COPIER_SCAN_KEY_PREFIX = 'novel2:e101scan:'
const COPIER_FAN_KEY_PREFIX = 'novel2:e101fan:'
const BALL_KEY_PREFIX = 'novel2:e104:'
const MOCHI_KEY_PREFIX = 'novel2:e100:'
const CHAIR_KEY_PREFIX = 'novel2:e102:'
const HAT_KEY_PREFIX = 'novel2:e106:'
const NOVEL2_ESCAPE_OPTIONS = Object.freeze({ obstacleIngress: true })
// 3차 둘째 묶음(E100·E102·E106) 공격 인증 실패 상한: 연속 4번(0.25초 간격 = 약 1초) 실패하면 "선 못 세움" 상태 — 평범한 접촉 추격
// (의자 0.9u/s 굴러오기·접촉 10, 떡 1.0u/s·접촉 6, 편대 0.75u/s·말 접촉 10)을 하며 1초에 한 번만 다시 묻는다. 선이 서면 그 자리에서
// 바로 예고하고 상태가 풀린다. 2026-11-17: 선을 못 세우는 자리(책상 사이)에서 0.25초마다 영원히 재시도하며 로사리 옆에 서 있던 문제.
export const NOVEL2_LANE_RETRY = Object.freeze({ maxFails: 4, slowRetryMs: 1000 })
// E106 편대를 자리로 바로 모아도 되는 "막 나온 몸"(enemySimulation ENEMY_SPAWN_REVEAL_MS 300과 같다 — 등장 연출 중).
const CAVALRY_SNAP_MAX_SPAWN_MS = 300

export function createNovel2Result() {
  return { velocityX: 0, velocityZ: 0, moving: false, preserveFacing: false, noContact: false, hasYaw: false, yaw: 0 }
}

function resetResult(out) {
  out.velocityX = 0; out.velocityZ = 0; out.moving = false; out.preserveFacing = false; out.noContact = false; out.hasYaw = false; out.yaw = 0
  return out
}

function slotAlive(pool, index, generation) {
  return index >= 0 && index < pool.active.length && pool.active[index] === 1 && pool.generation[index] === generation
}

/**
 * 시뮬레이션 런타임 1개당 1개. 슬롯별 보조 상태(지휘·버프·짝)와 전역 시계(메트로놈·플레이어 경로·폭발)를 갖는다.
 * 슬롯 세대(generation)가 바뀌면 그 슬롯의 보조 상태는 자동으로 무효가 된다.
 */
export class Novel2Runtime {
  constructor(capacity = MAX_ENEMIES) {
    this.capacity = capacity
    this.slotGen = new Int32Array(capacity).fill(-1)
    // 지휘(E89) — 지휘받은 일반 좀비 쪽에 기록한다.
    this.cmdPhase = new Uint8Array(capacity)        // 0 없음 / 1 동결 / 2 돌진
    this.cmdMs = new Float32Array(capacity)
    this.cmdDirX = new Float32Array(capacity)
    this.cmdDirZ = new Float32Array(capacity)
    this.cmdOwner = new Int16Array(capacity).fill(-1)
    this.cmdOwnerGen = new Int32Array(capacity)
    // 반장 자신의 예고 중심(예고 시작에 고정)과 예고 스냅샷 키.
    this.chiefCenterX = new Float32Array(capacity)
    this.chiefCenterZ = new Float32Array(capacity)
    // 커피(E103) — 받은 쪽에 기록한다.
    this.buffMs = new Float32Array(capacity)
    // 커피 셔틀 자신의 목표(예고 시작에 고정).
    this.coffeeTarget = new Int16Array(capacity).fill(-1)
    this.coffeeTargetGen = new Int32Array(capacity)
    // 2인3각(E105) 짝.
    this.partner = new Int16Array(capacity).fill(-1)
    this.partnerGen = new Int32Array(capacity)
    this.wasPaired = new Uint8Array(capacity)
    this.solo = new Uint8Array(capacity)
    // E90 도둑: 가방(권수·책마다 XP)·노리는 책·도주.
    this.bagBooks = new Uint8Array(capacity)
    this.bagValues = new Float32Array(capacity * E90_THIEF.maxBooks)
    this.thiefTarget = new Array(capacity).fill(null)
    // 처치된 도둑이 떨어뜨릴 책: [x, z, value] 세 개씩. 필드(Enemies.jsx·프로브)가 drainThiefLoot로 가져간다.
    this.thiefLoot = []
    // E91 미믹: 잠듦 여부와 잠든 시각(가장 오래 잔 미믹부터 깨운다).
    this.dormant = new Uint8Array(capacity)
    this.dormantSince = new Float64Array(capacity)
    this.biteX = new Float32Array(capacity)
    this.biteZ = new Float32Array(capacity)
    // E92 기차: 객차 쪽 기록(머리 슬롯·세대·순번·탈선 기절)과 머리 쪽 기록(진행 방향·돌진 원점·경로).
    this.carHead = new Int16Array(capacity).fill(-1)
    this.carHeadGen = new Int32Array(capacity)
    this.carOrder = new Uint8Array(capacity)
    this.carDerailMs = new Float32Array(capacity)
    this.headHeading = new Float32Array(capacity)
    this.trainBuilt = new Uint8Array(capacity)
    this.chargeOriginX = new Float32Array(capacity)
    this.chargeOriginZ = new Float32Array(capacity)
    this.trains = new Map() // 머리 슬롯 → { generation, pathX, pathZ, head, count }
    // E95 줄넘기: 줄 스냅샷 키는 짝 중 낮은 슬롯(줄 주인)에 둔다. 줄 상태는 그 스냅샷의 단계가 정본이다
    // (windup = 들어 올림·예고, active = 내려침, recovery = 안전) — 넉백 등으로 몸 걸음이 건너뛰어도 피해 시각과 어긋나지 않는다.
    this.ropeKey = new Array(capacity).fill(null)
    // 소유한 피해 스냅샷(E91 물기·E95 줄·E98 물기·E101 부채꼴). 주인이 죽으면 피해 없이 지운다.
    this.attacks = []
    // E98 대식가: 먹히는 쪽(끌려가는 중) 기록과 대식가 쪽(먹은 수·먹은 XP·기본 크기·입 자리).
    this.eatenBy = new Int16Array(capacity).fill(-1)
    this.eatenByGen = new Int32Array(capacity)
    this.eatCount = new Uint8Array(capacity)
    this.eatXp = new Float32Array(capacity * E98_EATER.maxEaten)
    this.eaterBaseScale = new Float32Array(capacity)
    this.mouthX = new Float32Array(capacity)
    this.mouthZ = new Float32Array(capacity)
    // E101 복사기: 복사기 쪽(모드 0 없음 / 1 스캔 / 2 부채꼴, 복사 쿨다운, 스캔 대상, 용지 걸림 누적)과 복사본 쪽(주인·남은 수명).
    this.copierMode = new Uint8Array(capacity)
    this.copyCooldownMs = new Float32Array(capacity)
    this.copyTarget = new Int16Array(capacity).fill(-1)
    this.copyTargetGen = new Int32Array(capacity)
    this.copyOwner = new Int16Array(capacity).fill(-1)
    this.copyOwnerGen = new Int32Array(capacity)
    this.copyMs = new Float32Array(capacity)
    this.jamAcc = new Float32Array(capacity)
    this.jamStartMs = new Float64Array(capacity)
    this.jamImmuneUntil = new Float64Array(capacity)
    // E104 공굴리기 대장: 공 단계(0 듦 / 1 겨눔(예고) / 2 구름 / 3 바닥에 멈춤)·공 자리·회수 시간. 맞은 좀비 쪽에는 굴림 번호.
    this.ballPhase = new Uint8Array(capacity)
    this.ballX = new Float32Array(capacity)
    this.ballZ = new Float32Array(capacity)
    this.ballRetrieveMs = new Float32Array(capacity)
    this.ballKey = new Array(capacity).fill(null)
    this.ballHitRoll = new Int32Array(capacity).fill(-1)
    this.ballHitGen = new Int32Array(capacity)
    this.balls = []
    this.rollSeq = 0
    // 공에 맞은 좀비: [index, generation, damage, ballX, ballZ] 다섯 개씩. 매 스텝 머리말에 비운다 — 필드(Enemies.jsx)가 스텝 직후
    // drainBallHits로 가져가 무기 히트 브리지(처치 보상·XP 포함)로 넘긴다. 가져가는 쪽이 없으면(프로브·테스트) 좀비 피해는 없다.
    this.ballHits = []
    // E100 찹쌀떡: 떡 쪽(단계 0 없음 / 1 웅크림 / 2 도약 / 3 매달림 / 4 빗나감 / 5 떨어짐, 도약 착지점, 매달린 시간·떨쳐낸 거리, 등 뒤 자리, 예고 키).
    this.mochiPhase = new Uint8Array(capacity)
    this.leapX = new Float32Array(capacity)
    this.leapZ = new Float32Array(capacity)
    this.clingMs = new Float32Array(capacity)
    this.clingMoved = new Float32Array(capacity)
    this.clingOffX = new Float32Array(capacity)
    this.clingOffZ = new Float32Array(capacity)
    // 매달린 자리: 옆(+1 왼등 / −1 오른등)과 지금 자리 방향(yaw, 플레이어 → 떡).
    this.clingSide = new Int8Array(capacity)
    this.clingAngle = new Float32Array(capacity)
    // 로사리 몸 방향(필드가 context.playerFacingX/Z로 넣는다 — 없으면 플레이어 이동 방향, 처음은 +z).
    this.facingX = 0
    this.facingZ = 1
    this.mochiKey = new Array(capacity).fill(null)
    // 매달린 떡 [index, generation] 두 개씩. 플레이어 쪽: 새 매달림 면역 시각, 이번 스텝 감속 배율, 직전 위치(떨쳐내기 거리).
    this.clingers = []
    this.clingImmuneUntil = 0
    this.clingSlowMul = 1
    this.lastPlayerX = NaN
    this.lastPlayerZ = NaN
    this.elapsedSec = 0
    this._onDamage = null
    // E102 회전의자: 선 키, 현재 속도·진행 방향(활주 중 플레이어 쪽으로 초당 25°까지), 표류 시작 속도.
    this.chairKey = new Array(capacity).fill(null)
    this.glideSpeed = new Float32Array(capacity)
    this.glideHeading = new Float32Array(capacity)
    this.driftStartSpeed = new Float32Array(capacity)
    this.glideDirX = new Float32Array(capacity)
    this.glideDirZ = new Float32Array(capacity)
    // E106 기마전: 역할(0 없음 / 1 기수 / 2 말), 말 자리(0 앞 · 1 왼뒤 · 2 오른뒤), 기수 슬롯·세대, 편대 연결 여부, 혼자 추격(흩어진 말·낙마한 기수),
    // 기수의 진행 방향과 말 세 슬롯.
    this.cavRole = new Uint8Array(capacity)
    this.cavSlot = new Int8Array(capacity).fill(-1)
    this.cavRider = new Int16Array(capacity).fill(-1)
    this.cavRiderGen = new Int32Array(capacity)
    this.cavLinked = new Uint8Array(capacity)
    this.cavSolo = new Uint8Array(capacity)
    this.cavHeading = new Float32Array(capacity)
    this.cavHorse = new Int16Array(capacity * 3).fill(-1)
    this.cavHorseGen = new Int32Array(capacity * 3)
    // 3차 둘째 묶음 연속 인증 실패 횟수(NOVEL2_LANE_RETRY.maxFails 이상 = 선 못 세움 — 평범한 접촉 추격, 1초 간격 재시도).
    this.laneFails = new Uint8Array(capacity)
    // 시뮬레이션 런타임이 넣어 주는 연결: 보상 없는 퇴장(먹힘·복사본 소멸)과 타입별 XP 표(enemySimulation ENEMY_RUNTIME_XP).
    this.despawnHook = null
    this.xpTable = null
    // 전역 시계.
    this.clockMs = 0
    // 플레이어 경로(E93): 0.1초 간격 링버퍼.
    this.pathX = new Float32Array(E93_SHADOW.capacity)
    this.pathZ = new Float32Array(E93_SHADOW.capacity)
    this.pathHead = 0
    this.pathCount = 0
    this.pathAccMs = 0
    // 폭발(E99) 진행 목록과 예고 스냅샷 키.
    this.bursts = []
    this.ownedKeys = new Set()
    // 시각 전용 예고(E89 지휘 원·E103 커피 선): 키 → 주인 슬롯. 주인이 예고 중에 죽으면 다음 스텝에 지운다.
    this.telegraphOwners = new Map()
    this.seq = 0
    this.stageId = null
    this.halfX = 0
    this.halfZ = 0
    this.playerX = 0
    this.playerZ = 0
  }

  reset() {
    this.slotGen.fill(-1)
    this.cmdPhase.fill(0); this.cmdMs.fill(0); this.cmdOwner.fill(-1)
    this.buffMs.fill(0)
    this.coffeeTarget.fill(-1)
    this.partner.fill(-1); this.wasPaired.fill(0); this.solo.fill(0)
    this.bagBooks.fill(0); this.bagValues.fill(0); this.thiefTarget.fill(null); this.thiefLoot.length = 0
    this.dormant.fill(0); this.dormantSince.fill(0)
    this.carHead.fill(-1); this.carDerailMs.fill(0); this.trainBuilt.fill(0); this.trains.clear()
    this.ropeKey.fill(null)
    this.attacks.length = 0
    this.eatenBy.fill(-1); this.eatCount.fill(0); this.eatXp.fill(0); this.eaterBaseScale.fill(0)
    this.copierMode.fill(0); this.copyCooldownMs.fill(0); this.copyTarget.fill(-1); this.copyOwner.fill(-1); this.copyMs.fill(0)
    this.jamAcc.fill(0); this.jamStartMs.fill(0); this.jamImmuneUntil.fill(0)
    this.ballPhase.fill(0); this.ballRetrieveMs.fill(0); this.ballKey.fill(null); this.ballHitRoll.fill(-1)
    this.balls.length = 0
    this.ballHits.length = 0
    this.mochiPhase.fill(0); this.clingMs.fill(0); this.clingMoved.fill(0); this.mochiKey.fill(null)
    this.clingers.length = 0
    this.clingImmuneUntil = 0; this.clingSlowMul = 1; this.lastPlayerX = NaN; this.lastPlayerZ = NaN; this.elapsedSec = 0
    this.clingSide.fill(0); this.facingX = 0; this.facingZ = 1
    this.laneFails.fill(0)
    this.chairKey.fill(null); this.glideSpeed.fill(0); this.driftStartSpeed.fill(0)
    this.cavRole.fill(0); this.cavSlot.fill(-1); this.cavRider.fill(-1); this.cavLinked.fill(0); this.cavSolo.fill(0); this.cavHorse.fill(-1)
    this.clockMs = 0
    this.pathHead = 0; this.pathCount = 0; this.pathAccMs = 0
    this.bursts.length = 0
    for (const key of this.ownedKeys) expansionAttackSnapshots.delete(key)
    this.ownedKeys.clear()
    this.telegraphOwners.clear()
  }

  _claimSlot(pool, index) {
    const generation = pool.generation[index]
    if (this.slotGen[index] === generation) return
    this.slotGen[index] = generation
    this.cmdPhase[index] = 0; this.cmdMs[index] = 0; this.cmdOwner[index] = -1
    this.buffMs[index] = 0
    this.coffeeTarget[index] = -1
    this.partner[index] = -1; this.wasPaired[index] = 0; this.solo[index] = 0
    this.chiefCenterX[index] = 0; this.chiefCenterZ[index] = 0
    this.bagBooks[index] = 0; this.thiefTarget[index] = null
    // 미믹은 잠든 채 나온다(풀 스폰 직후 첫 머리말).
    this.dormant[index] = pool.type[index] === E91_CODE ? 1 : 0
    this.dormantSince[index] = this.clockMs
    this.carHead[index] = -1; this.carOrder[index] = 0; this.carDerailMs[index] = 0
    this.trainBuilt[index] = 0
    if (this.trains.has(index)) this.trains.delete(index)
    this.ropeKey[index] = null
    this.eatenBy[index] = -1
    this.eatCount[index] = 0
    this.eaterBaseScale[index] = pool.type[index] === E98_CODE ? pool.visualScale[index] : 0
    this.copierMode[index] = 0; this.copyCooldownMs[index] = 0; this.copyTarget[index] = -1
    this.copyOwner[index] = -1; this.copyMs[index] = 0
    this.jamAcc[index] = 0; this.jamStartMs[index] = 0; this.jamImmuneUntil[index] = 0
    this.ballPhase[index] = 0; this.ballRetrieveMs[index] = 0; this.ballKey[index] = null; this.ballHitRoll[index] = -1
    this.ballX[index] = pool.posX[index]; this.ballZ[index] = pool.posZ[index]
    this.mochiPhase[index] = 0; this.clingMs[index] = 0; this.clingMoved[index] = 0; this.mochiKey[index] = null
    this.chairKey[index] = null; this.glideSpeed[index] = 0; this.driftStartSpeed[index] = 0
    this.glideDirX[index] = 0; this.glideDirZ[index] = 0
    this.cavRole[index] = 0; this.cavSlot[index] = -1; this.cavRider[index] = -1; this.cavLinked[index] = 0; this.cavSolo[index] = 0
    this.cavHorse[index * 3] = -1; this.cavHorse[index * 3 + 1] = -1; this.cavHorse[index * 3 + 2] = -1
    this.laneFails[index] = 0
  }

  // 3차 둘째 묶음 공격 인증 실패. 연속 NOVEL2_LANE_RETRY.maxFails번부터는 1초 간격으로만 다시 묻는다(그동안 평범한 접촉 추격).
  _laneFailed(pool, index) {
    if (this.laneFails[index] < 255) this.laneFails[index] += 1
    const retry = this.laneFails[index] >= NOVEL2_LANE_RETRY.maxFails ? NOVEL2_LANE_RETRY.slowRetryMs : SAFETY_RETRY_MS
    pool.attackCooldown[index] = Math.max(pool.attackCooldown[index], retry)
  }

  /** 선을 못 세워 평범한 접촉 추격 중인가(비주얼·테스트용). 선이 서면(예고 시작) 풀린다. */
  laneBlocked(pool, index) {
    return index >= 0 && index < this.capacity && this.slotGen[index] === pool.generation[index] && this.laneFails[index] >= NOVEL2_LANE_RETRY.maxFails
  }

  _addSnapshot(snapshot, pool = null, ownerIndex = -1) {
    expansionAttackSnapshots.set(snapshot.key, snapshot)
    this.ownedKeys.add(snapshot.key)
    if (pool && ownerIndex >= 0) this.telegraphOwners.set(snapshot.key, { index: ownerIndex, generation: pool.generation[ownerIndex] })
    return snapshot
  }

  _removeSnapshot(key) {
    expansionAttackSnapshots.delete(key)
    this.ownedKeys.delete(key)
    this.telegraphOwners.delete(key)
  }

  _cleanupOrphanTelegraphs(pool) {
    for (const [key, owner] of this.telegraphOwners) {
      if (!slotAlive(pool, owner.index, owner.generation) || !expansionAttackSnapshots.has(key)) this._removeSnapshot(key)
    }
  }

  _recordPlayer(playerX, playerZ, deltaMs) {
    this.pathAccMs += deltaMs
    if (this.pathCount === 0) this.pathAccMs = E93_SHADOW.sampleMs
    while (this.pathAccMs >= E93_SHADOW.sampleMs) {
      this.pathAccMs -= E93_SHADOW.sampleMs
      this.pathX[this.pathHead] = playerX
      this.pathZ[this.pathHead] = playerZ
      this.pathHead = (this.pathHead + 1) % E93_SHADOW.capacity
      if (this.pathCount < E93_SHADOW.capacity) this.pathCount += 1
    }
  }

  /** 2초 전 플레이어 위치(기록이 모자라면 가장 오래된 기록, 기록이 없으면 현재 위치). */
  shadowTargetInto(out, playerX, playerZ) {
    if (this.pathCount === 0) { out.x = playerX; out.z = playerZ; return out }
    const back = Math.min(this.pathCount - 1, Math.round(E93_SHADOW.lagMs / E93_SHADOW.sampleMs))
    const slot = (this.pathHead - 1 - back + E93_SHADOW.capacity * 2) % E93_SHADOW.capacity
    out.x = this.pathX[slot]
    out.z = this.pathZ[slot]
    return out
  }

  /** E96 박 번호(0 돌진, 1·2 걸음, 3 예고)와 박 안 경과 ms. */
  beatIndex() {
    return Math.floor(this.clockMs / E96_DRIBBLE.beatMs) % 4
  }

  beatElapsedMs() {
    return this.clockMs % E96_DRIBBLE.beatMs
  }

  /**
   * 스텝 머리말: 시계·경로·버프 타이머·짝 연결·폭발 진행. 피해가 나면 onDamage(damage, x, z)를 부른다.
   */
  beginStep(pool, context, deltaMs, onDamage) {
    this.clockMs += deltaMs
    this.stageId = context.stageId ?? this.stageId
    this.halfX = context.halfX
    this.halfZ = context.halfZ
    this.playerX = context.playerX
    this.playerZ = context.playerZ
    this.obstacles = context.obstacles && Number.isInteger(context.obstacleCount) && context.obstacleCount > 0 ? context.obstacles : null
    this.ballHits.length = 0
    this.elapsedSec = Number.isFinite(context.elapsedSec) ? context.elapsedSec : this.elapsedSec
    this._onDamage = onDamage ?? null
    this._recordPlayer(context.playerX, context.playerZ, deltaMs)
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    let dormantCount = 0
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1) continue
      this._claimSlot(pool, index)
      if (this.buffMs[index] > 0) this.buffMs[index] = Math.max(0, this.buffMs[index] - deltaMs)
      if (this.dormant[index]) dormantCount += 1
    }
    if (dormantCount > E91_MIMIC.maxDormant) this._wakeOldestMimics(pool, highest, dormantCount - E91_MIMIC.maxDormant)
    this._linkPairs(pool, highest)
    this._linkCavalry(pool, highest)
    this._updatePlayerFacing(context)
    this._stepClings(pool, context.playerX, context.playerZ, deltaMs)
    this._stepTrains(pool, highest)
    this._stepCopies(pool, highest, deltaMs)
    this._cleanupOrphanTelegraphs(pool)
    this._stepBursts(context.playerX, context.playerZ, deltaMs, onDamage)
    this._stepAttacks(pool, context.playerX, context.playerZ, deltaMs, onDamage)
    this._stepBalls(pool, context.playerX, context.playerZ, deltaMs, onDamage)
  }

  /** 보상 없이 퇴장시킨다(먹힘·복사본 소멸). 시뮬레이션 런타임이 연결을 넣어 주면 그쪽 퇴장 이벤트 경로를 탄다. */
  _despawnQuiet(pool, index) {
    if (this.despawnHook) this.despawnHook(pool, index)
    else pool.despawnIndex(index, pool.generation[index])
  }

  // E101 복사본: 수명이 다했거나 복사기가 죽었으면 보상 없이 사라진다.
  _stepCopies(pool, highest, deltaMs) {
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1 || this.copyOwner[index] < 0 || this.slotGen[index] !== pool.generation[index]) continue
      this.copyMs[index] -= deltaMs
      const owner = this.copyOwner[index]
      if (this.copyMs[index] <= 0 || !slotAlive(pool, owner, this.copyOwnerGen[index]) || pool.type[owner] !== E101_CODE) {
        this.copyOwner[index] = -1
        this._despawnQuiet(pool, index)
      }
    }
  }

  _linkPairs(pool, highest) {
    for (let index = 0; index <= highest; index += 1) {
      const type = pool.type[index]
      if (pool.active[index] !== 1 || (type !== E105_CODE && type !== E95_CODE) || this.partner[index] >= 0 || this.wasPaired[index]) continue
      let best = -1
      let bestDist = Infinity
      for (let other = 0; other <= highest; other += 1) {
        if (other === index || pool.active[other] !== 1 || pool.type[other] !== type) continue
        if (this.slotGen[other] !== pool.generation[other] || this.partner[other] >= 0 || this.wasPaired[other]) continue
        const dist = Math.hypot(pool.posX[other] - pool.posX[index], pool.posZ[other] - pool.posZ[index])
        if (dist < bestDist) { bestDist = dist; best = other }
      }
      if (best < 0) continue
      this.partner[index] = best; this.partnerGen[index] = pool.generation[best]; this.wasPaired[index] = 1
      this.partner[best] = index; this.partnerGen[best] = pool.generation[index]; this.wasPaired[best] = 1
    }
  }

  _stepBursts(playerX, playerZ, deltaMs, onDamage) {
    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i]
      // 판 리셋(clearExpansionAttacks)으로 맵에서 지워진 폭발은 더 진행하지도, 피해를 주지도 않는다.
      if (expansionAttackSnapshots.get(burst.key) !== burst) {
        this.ownedKeys.delete(burst.key)
        this.bursts.splice(i, 1)
        continue
      }
      const damage = advanceExpansionSnapshot(burst, { deltaMs, playerX, playerZ })
      if (damage > 0 && onDamage) onDamage(damage, burst.originXZ[0], burst.originXZ[1])
      if (burst.elapsedMs >= burst.windupMs + burst.activeMs + burst.recoveryMs) {
        this._removeSnapshot(burst.key)
        this.bursts.splice(i, 1)
      }
    }
  }

  // 소유 피해 스냅샷(E91 물기·E95 줄) 진행. 주인(들) 중 하나라도 죽었으면 피해 없이 지운다(예고 주인이 사라지면 공격도 없다).
  _stepAttacks(pool, playerX, playerZ, deltaMs, onDamage) {
    for (let i = this.attacks.length - 1; i >= 0; i -= 1) {
      const attack = this.attacks[i]
      const ownersAlive = slotAlive(pool, attack.n2OwnerA, attack.n2OwnerGenA)
        && (attack.n2OwnerB < 0 || slotAlive(pool, attack.n2OwnerB, attack.n2OwnerGenB))
      if (expansionAttackSnapshots.get(attack.key) !== attack || !ownersAlive) {
        this._removeSnapshot(attack.key)
        this.attacks.splice(i, 1)
        continue
      }
      const damage = advanceExpansionSnapshot(attack, { deltaMs, playerX, playerZ })
      if (damage > 0 && onDamage) onDamage(damage, attack.originXZ[0], attack.originXZ[1])
      if (attack.elapsedMs >= attack.windupMs + attack.activeMs + attack.recoveryMs) {
        this._removeSnapshot(attack.key)
        this.attacks.splice(i, 1)
      }
    }
  }

  /**
   * 안전 기하 + 탈출 인증을 통과한 선/원 스냅샷을 만든다(맵에는 아직 넣지 않는다). 실패면 null.
   * 장애물은 공격자·플레이어 둘레 10u 안 가까운 32개(Stage 3 체육관 39개 대응, expansionAttackSafety.novel2NearSafetyObstacles).
   */
  _buildCertifiedSnapshot(key, type, patternId, shape, ox, oz, dirX, dirZ, rangeUnits, widthUnits, windupMs, activeMs, recoveryMs, damage, angleDeg = 0) {
    const snapshot = {
      id: patternId, patternId, type, key, attackId: key, sourceEntityId: key, shape,
      originXZ: [ox, oz], sourceXZ: [ox, oz], targetXZ: [this.playerX, this.playerZ], directionXZ: [dirX, dirZ], yaw: Math.atan2(dirX, dirZ),
      rangeUnits, widthUnits, windupMs, activeMs, recoveryMs, damage, maxHitsPerTarget: damage > 0 ? 1 : 0,
      phase: 'windup', elapsedMs: 0, hit: false, novel2: true, zeroDamage: damage <= 0,
      n2OwnerA: -1, n2OwnerGenA: 0, n2OwnerB: -1, n2OwnerGenB: 0,
    }
    // 부채꼴(E98 물기·E101 부채꼴)의 벌어진 각. 안전 기하·텔레그래프가 같은 값을 읽는다.
    if (shape === 'sector') snapshot.angleDeg = angleDeg
    const halfX = this.halfX > 0 ? this.halfX : 7.5
    const halfZ = this.halfZ > 0 ? this.halfZ : 19.2
    const context = { stageId: this.stageId, halfX, halfZ, obstacles: novel2NearSafetyObstacles(this.obstacles ?? [], ox, oz, this.playerX, this.playerZ) }
    snapshot.safetyBounds = { halfX, halfZ }
    snapshot.safetyPolygons = buildExpansionSafetyGeometry(snapshot, context)
    // obstacleIngress: 플레이어가 책상·사물함에 붙어 서 있어도(통로 반폭 0.792u 안) 몸이 빠져나갈 짧은 진입 구간 뒤 전체 폭 통로가 있으면 인증한다.
    // 없으면 붙어 선 자리가 "공격이 영원히 오지 않는 자리"가 된다(2026-11-17 E101 복사기 교무실 책상 사이 실측 — expansionAttackSafety.js 주석).
    snapshot.escapeChannel = certifyExpansionEscape(snapshot, { playerX: this.playerX, playerZ: this.playerZ }, context, expansionAttackSnapshots.values(), NOVEL2_ESCAPE_OPTIONS)
    if (!snapshot.safetyPolygons.length || !snapshot.escapeChannel) return null
    return snapshot
  }

  _addAttack(snapshot, pool, ownerA, ownerB = -1) {
    snapshot.n2OwnerA = ownerA; snapshot.n2OwnerGenA = pool.generation[ownerA]
    if (ownerB >= 0) { snapshot.n2OwnerB = ownerB; snapshot.n2OwnerGenB = pool.generation[ownerB] }
    expansionAttackSnapshots.set(snapshot.key, snapshot)
    this.ownedKeys.add(snapshot.key)
    this.attacks.push(snapshot)
    return snapshot
  }

  /** E99이 죽은 자리에 폭발 예고. 상한·채널·탈출 인증에 걸리면 피해 없는 김(=아무것도 안 함)으로 끝난다. */
  queueDeathBurst(x, z) {
    if (!Number.isFinite(x + z) || this.bursts.length >= E99_MAX_BURSTS || !expansionChannelFree()) return null
    const key = `${BURST_KEY_PREFIX}${++this.seq}`
    const snapshot = emitExpansionHazardSnapshot({
      hazardId: 'E99', pattern: E99_BURST_PATTERN, originXZ: [x, z], key,
      playerX: this.playerX, playerZ: this.playerZ, stageId: this.stageId ?? 'stage4',
      halfX: this.halfX > 0 ? this.halfX : 9.36, halfZ: this.halfZ > 0 ? this.halfZ : 16,
    })
    if (!snapshot) return null
    // 해저드 스테핑(Stage 6 훈화 경로)이 두 번 진행시키지 않도록 hazard 표식을 내리고 이 런타임이 소유한다.
    snapshot.hazard = false
    snapshot.novel2 = true
    this.ownedKeys.add(key)
    this.bursts.push(snapshot)
    return snapshot
  }

  // ── E90 도둑 보조 ────────────────────────────────────────────────────────────
  /** 가방 소품 배율(MiniZombieLayer propScale 'bagScale'): 1 + 0.08 × 권수. 다른 슬롯·세대면 1. */
  bagScale(pool, index) {
    if (index < 0 || index >= this.capacity || this.slotGen[index] !== pool.generation[index] || pool.type[index] !== E90_CODE) return 1
    return 1 + E90_THIEF.bagScalePerBook * this.bagBooks[index]
  }

  /** 도둑이 죽은 자리: 주운 책 전부 + 보너스 1권을 떨어뜨릴 목록에 올린다(applyHitIndex 사망 경로가 부른다). */
  queueThiefLoot(pool, index) {
    if (pool.type[index] !== E90_CODE) return 0
    const x = pool.posX[index]
    const z = pool.posZ[index]
    if (!Number.isFinite(x + z)) return 0
    const books = this.slotGen[index] === pool.generation[index] ? this.bagBooks[index] : 0
    const base = index * E90_THIEF.maxBooks
    for (let book = 0; book < books; book += 1) this.thiefLoot.push(x, z, this.bagValues[base + book])
    this.thiefLoot.push(x, z, E90_THIEF.bonusXp)
    this.bagBooks[index] = 0
    return books + 1
  }

  /** 떨어뜨릴 책을 하나씩 넘기고 목록을 비운다. cb(x, z, value). */
  drainThiefLoot(cb) {
    const loot = this.thiefLoot
    for (let i = 0; i + 2 < loot.length; i += 3) cb(loot[i], loot[i + 1], loot[i + 2])
    loot.length = 0
  }

  // ── E91 미믹 보조 ────────────────────────────────────────────────────────────
  /** 잠든 미믹은 자동조준 대상이 아니다(weaponTargeting·프로브 연필). 광역 무기는 그대로 맞는다(맞으면 깨어난다). */
  isUntargetable(pool, index) {
    return index >= 0 && index < this.capacity && this.dormant[index] === 1
      && this.slotGen[index] === pool.generation[index] && pool.type[index] === E91_CODE
  }

  isDormant(index) {
    return this.dormant[index] === 1
  }

  _wakeOldestMimics(pool, highest, count) {
    for (let n = 0; n < count; n += 1) {
      let oldest = -1
      for (let index = 0; index <= highest; index += 1) {
        if (pool.active[index] !== 1 || !this.dormant[index]) continue
        if (oldest < 0 || this.dormantSince[index] < this.dormantSince[oldest]) oldest = index
      }
      if (oldest < 0) return
      this.dormant[oldest] = 0
      pool.state[oldest] = N2_STATE_AWAKE
    }
  }

  // ── E92 기차 보조 ────────────────────────────────────────────────────────────
  isTrainCar(pool, index) {
    return this.carHead[index] >= 0 && this.slotGen[index] === pool.generation[index]
  }

  /** 머리마다 1회 객차를 세우고(풀에 직접 — 동시 150 상한 안에서만), 머리 경로를 0.1u 간격으로 기록한다. */
  _stepTrains(pool, highest) {
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1 || pool.type[index] !== E92_CODE) continue
      if (!this.trainBuilt[index]) this._buildTrain(pool, index)
      const train = this.trains.get(index)
      if (!train || train.generation !== pool.generation[index]) continue
      this._recordTrainPath(train, pool.posX[index], pool.posZ[index])
    }
  }

  _recordTrainPath(train, x, z) {
    const T = E92_TRAIN
    const last = (train.head - 1 + T.pathCapacity) % T.pathCapacity
    const fromX = train.pathX[last]
    const fromZ = train.pathZ[last]
    const dx = x - fromX
    const dz = z - fromZ
    const dist = Math.hypot(dx, dz)
    if (!(dist >= T.pathSample)) return
    // 큰 이동(돌진)도 0.1u 간격으로 채워 객차가 경로를 그대로 밟게 한다.
    const steps = Math.min(T.pathCapacity, Math.floor(dist / T.pathSample))
    for (let k = 1; k <= steps; k += 1) {
      const t = (k * T.pathSample) / dist
      train.pathX[train.head] = fromX + dx * t
      train.pathZ[train.head] = fromZ + dz * t
      train.head = (train.head + 1) % T.pathCapacity
      if (train.count < T.pathCapacity) train.count += 1
    }
  }

  /** 머리 경로에서 머리(현재 위치)로부터 거리 back만큼 뒤의 점. 기록이 모자라면 가장 오래된 기록. */
  trainPathPointInto(out, train, headX, headZ, back) {
    const T = E92_TRAIN
    let px = headX
    let pz = headZ
    let remaining = back
    for (let k = 1; k <= train.count; k += 1) {
      const slot = (train.head - k + T.pathCapacity) % T.pathCapacity
      const sx = train.pathX[slot]
      const sz = train.pathZ[slot]
      const seg = Math.hypot(sx - px, sz - pz)
      if (seg >= remaining && seg > 1e-6) {
        const t = remaining / seg
        out.x = px + (sx - px) * t
        out.z = pz + (sz - pz) * t
        return out
      }
      remaining -= seg
      px = sx
      pz = sz
    }
    out.x = px
    out.z = pz
    return out
  }

  _buildTrain(pool, headIndex) {
    const T = E92_TRAIN
    this.trainBuilt[headIndex] = 1
    const hx = pool.posX[headIndex]
    const hz = pool.posZ[headIndex]
    // 처음 진행 방향 = 플레이어 쪽. 객차는 그 반대(머리 뒤)로 늘어선다 — 맵 밖이면 경계 안쪽으로 접는다.
    let fx = this.playerX - hx
    let fz = this.playerZ - hz
    const fl = Math.hypot(fx, fz)
    if (fl > 1e-6) { fx /= fl; fz /= fl } else { fx = 0; fz = 1 }
    this.headHeading[headIndex] = Math.atan2(fx, fz)
    const train = { generation: pool.generation[headIndex], pathX: new Float32Array(T.pathCapacity), pathZ: new Float32Array(T.pathCapacity), head: 0, count: 0 }
    this.trains.set(headIndex, train)
    const limitX = (this.halfX > 0 ? this.halfX : 7.5) - 0.4
    const limitZ = (this.halfZ > 0 ? this.halfZ : 19.2) - 0.4
    const tail = T.carSpacing * T.carCount + 0.5
    // 오래된 쪽부터 기록한다(꼬리 → 머리).
    for (let d = tail; d > 1e-6; d -= T.pathSample) {
      const x = Math.max(-limitX, Math.min(limitX, hx - fx * d))
      const z = Math.max(-limitZ, Math.min(limitZ, hz - fz * d))
      train.pathX[train.head] = x
      train.pathZ[train.head] = z
      train.head = (train.head + 1) % T.pathCapacity
      if (train.count < T.pathCapacity) train.count += 1
    }
    const base = NOVEL2_ZOMBIE_STATS.E92?.hp || 1
    const ratio = pool.maxHp[headIndex] > 0 ? pool.maxHp[headIndex] / base : 1
    const carHp = Math.max(1, Math.round(T.carBaseHp * ratio))
    const point = this._carScratch ??= { x: 0, z: 0 }
    const handle = this._carHandle ??= { index: -1, generation: 0 }
    const source = this._carSource ??= { type: 'E01', x: 0, y: 0, z: 0, hp: 1, maxHp: 1, visualScale: 1, spawnTimer: 1, yaw: 0, runDirX: 0, runDirZ: 1 }
    for (let order = 1; order <= T.carCount; order += 1) {
      if (pool.activeCount >= MAX_ENEMIES - T.reserveSlots) break
      this.trainPathPointInto(point, train, hx, hz, T.carSpacing * order)
      source.x = point.x; source.z = point.z; source.y = pool.posY[headIndex]
      source.hp = carHp; source.maxHp = carHp
      source.visualScale = pool.visualScale[headIndex] > 0 ? pool.visualScale[headIndex] / (NOVEL2_ZOMBIE_STATS.E92?.scale || 1) : 1
      source.yaw = this.headHeading[headIndex]
      source.runDirX = fx; source.runDirZ = fz
      if (!pool.spawnInto(handle, source)) break
      this._claimSlot(pool, handle.index)
      // 객차는 회복(E56·E84)·방패(E67·E78·E86)를 받지 않는다 — 기차가 연필을 더 오래 받아 내지 않게(스2 120초 E67과 같은 순간에 나온다).
      markSupportImmune(pool, handle.index)
      this.carHead[handle.index] = headIndex
      this.carHeadGen[handle.index] = pool.generation[headIndex]
      this.carOrder[handle.index] = order
    }
  }

  /** 객차면 이번 프레임 이동을 대신 정하고 true. 머리가 죽으면 1.2초 기절(탈선) 뒤 일반 E01로 풀려 false. */
  stepTrainCar(pool, index, deltaMs, out) {
    if (!this.isTrainCar(pool, index)) return false
    resetResult(out)
    out.preserveFacing = true
    const head = this.carHead[index]
    if (!slotAlive(pool, head, this.carHeadGen[index]) || pool.type[head] !== E92_CODE) {
      if (this.carDerailMs[index] <= 0 && pool.state[index] !== N2_STATE_STUN) {
        this.carDerailMs[index] = E92_TRAIN.derailMs
        pool.state[index] = N2_STATE_STUN
        return out
      }
      this.carDerailMs[index] = Math.max(0, this.carDerailMs[index] - deltaMs)
      if (this.carDerailMs[index] > 0) return out
      this.carHead[index] = -1
      this.carOrder[index] = 0
      pool.state[index] = 1
      return false
    }
    const train = this.trains.get(head)
    if (!train || train.generation !== pool.generation[head]) return out
    const target = this.trainPathPointInto(this._carScratch ??= { x: 0, z: 0 }, train, pool.posX[head], pool.posZ[head], E92_TRAIN.carSpacing * this.carOrder[index])
    const dx = target.x - pool.posX[index]
    const dz = target.z - pool.posZ[index]
    const dist = Math.hypot(dx, dz)
    pool.state[index] = 1
    if (dist < 1e-4) return out
    const speed = Math.min(E92_TRAIN.carMaxSpeed, dist / Math.max(1e-6, deltaMs / 1000))
    out.velocityX = dx / dist * speed
    out.velocityZ = dz / dist * speed
    out.moving = true
    out.hasYaw = true
    out.yaw = Math.atan2(dx, dz)
    return out
  }

  /** 지휘받은 개체면 이번 프레임 이동을 대신 정하고 true. 반장이 죽으면 즉시 풀린다. */
  stepCommanded(pool, index, deltaMs, out) {
    const phase = this.cmdPhase[index]
    if (phase === 0) return false
    resetResult(out)
    const owner = this.cmdOwner[index]
    if (owner < 0 || !slotAlive(pool, owner, this.cmdOwnerGen[index])) {
      this._releaseCommand(pool, index)
      return false
    }
    this.cmdMs[index] -= deltaMs
    out.preserveFacing = true
    if (phase === 1) {
      pool.state[index] = N2_COMMAND_STATE_FREEZE
      if (this.cmdMs[index] <= 0) {
        this.cmdPhase[index] = 2
        this.cmdMs[index] += E89_COMMAND.lungeMs
        pool.state[index] = N2_COMMAND_STATE_LUNGE
      }
    }
    if (this.cmdPhase[index] === 2) {
      if (this.cmdMs[index] <= 0) {
        this._releaseCommand(pool, index)
        return false
      }
      out.velocityX = this.cmdDirX[index] * E89_COMMAND.lungeSpeed
      out.velocityZ = this.cmdDirZ[index] * E89_COMMAND.lungeSpeed
      out.moving = true
      out.hasYaw = true
      out.yaw = Math.atan2(this.cmdDirX[index], this.cmdDirZ[index])
    }
    return true
  }

  _releaseCommand(pool, index) {
    this.cmdPhase[index] = 0
    this.cmdMs[index] = 0
    this.cmdOwner[index] = -1
    pool.state[index] = 1
  }

  isCommanded(index) {
    return this.cmdPhase[index] !== 0
  }

  speedMultiplier(index) {
    return this.buffMs[index] > 0 ? E103_COFFEE.buffSpeedMul : 1
  }

  countBuffed(pool) {
    let count = 0
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) if (pool.active[index] === 1 && this.buffMs[index] > 0) count += 1
    return count
  }

  /** 행동 디스패치. a = { playerX, playerZ, posX, posZ, distance, nx, nz, speed, deltaMs }. */
  step(pool, index, a, out) {
    resetResult(out)
    const type = pool.type[index]
    if (type === E89_CODE) return this._stepE89(pool, index, a, out)
    if (type === E93_CODE) return this._stepE93(pool, index, a, out)
    if (type === E96_CODE) return this._stepE96(pool, index, a, out)
    if (type === E103_CODE) return this._stepE103(pool, index, a, out)
    if (type === E105_CODE) return this._stepE105(pool, index, a, out)
    if (type === E90_CODE) return this._stepE90(pool, index, a, out)
    if (type === E91_CODE) return this._stepE91(pool, index, a, out)
    if (type === E92_CODE) return this._stepE92(pool, index, a, out)
    if (type === E95_CODE) return this._stepE95(pool, index, a, out)
    if (type === E98_CODE) return this._stepE98(pool, index, a, out)
    if (type === E101_CODE) return this._stepE101(pool, index, a, out)
    if (type === E104_CODE) return this._stepE104(pool, index, a, out)
    if (type === E100_CODE) return this._stepE100(pool, index, a, out)
    if (type === E102_CODE) return this._stepE102(pool, index, a, out)
    if (type === E106_CODE) return this._stepE106(pool, index, a, out)
    // E99(평범한 추격 — 특이점은 사망 시 폭발)과 확장 행동형(E94/E97의 접근)은 단순 추격.
    out.velocityX = a.nx * a.speed
    out.velocityZ = a.nz * a.speed
    out.moving = true
    pool.state[index] = N2_STATE_APPROACH
    return out
  }

  _chase(a, out, speed) {
    out.velocityX = a.nx * speed
    out.velocityZ = a.nz * speed
    out.moving = speed > 0
    return out
  }

  // ── E89 ─────────────────────────────────────────────────────────────────────
  _stepE89(pool, index, a, out) {
    const C = E89_COMMAND
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    if (state === N2_STATE_APPROACH) {
      pool.state[index] = N2_STATE_APPROACH
      const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= C.firstDelayMs && a.distance <= C.triggerDistance
      if (ready && expansionChannelFree() && this._countCommandable(pool, index, pool.posX[index], pool.posZ[index]) > 0) {
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = C.telegraphMs
        this.chiefCenterX[index] = pool.posX[index]
        this.chiefCenterZ[index] = pool.posZ[index]
        this._addSnapshot(makeZeroDamageSnapshot(`${COMMAND_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`, 'E89', 'e89_command',
          'disk', pool.posX[index], pool.posZ[index], C.radius, 0, C.telegraphMs, 0, 0), pool, index)
        out.noContact = true
        out.preserveFacing = true
        return out
      }
      return this._chase(a, out, a.speed)
    }
    if (state === N2_STATE_TELEGRAPH) {
      out.noContact = true
      out.preserveFacing = true
      this._advanceOwnedSnapshot(`${COMMAND_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`, a.deltaMs)
      if (pool.stateTimer[index] > 0) return out
      this._removeSnapshot(`${COMMAND_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`)
      this._issueCommand(pool, index, a.playerX, a.playerZ)
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = C.freezeMs + C.lungeMs + C.recoverMs
      pool.attackCooldown[index] = C.cooldownMs
      return out
    }
    // RECOVER(인사): 정지.
    out.preserveFacing = true
    if (pool.stateTimer[index] <= 0) pool.state[index] = N2_STATE_APPROACH
    return out
  }

  _countCommandable(pool, chiefIndex, cx, cz) {
    let count = 0
    const r2 = E89_COMMAND.radius * E89_COMMAND.radius
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (index === chiefIndex || pool.active[index] !== 1 || !COMMANDABLE_CODES.has(pool.type[index]) || this.cmdPhase[index] !== 0) continue
      if (this.isChiefMinion(pool, index)) continue // 기관사 객차·복사기 복사본·먹히는 중인 개체는 치프에 묶인 몸이다
      const dx = pool.posX[index] - cx
      const dz = pool.posZ[index] - cz
      if (dx * dx + dz * dz <= r2) count += 1
    }
    return count
  }

  _issueCommand(pool, chiefIndex, playerX, playerZ) {
    const cx = this.chiefCenterX[chiefIndex]
    const cz = this.chiefCenterZ[chiefIndex]
    const r2 = E89_COMMAND.radius * E89_COMMAND.radius
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    let issued = 0
    for (let index = 0; index <= highest && issued < E89_COMMAND.maxCommanded; index += 1) {
      if (index === chiefIndex || pool.active[index] !== 1 || !COMMANDABLE_CODES.has(pool.type[index]) || this.cmdPhase[index] !== 0) continue
      if (this.isChiefMinion(pool, index)) continue
      const dx = pool.posX[index] - cx
      const dz = pool.posZ[index] - cz
      if (dx * dx + dz * dz > r2) continue
      this._claimSlot(pool, index)
      const px = playerX - pool.posX[index]
      const pz = playerZ - pool.posZ[index]
      const len = Math.hypot(px, pz)
      this.cmdDirX[index] = len > 1e-6 ? px / len : 0
      this.cmdDirZ[index] = len > 1e-6 ? pz / len : 1
      this.cmdPhase[index] = 1
      this.cmdMs[index] = E89_COMMAND.freezeMs
      this.cmdOwner[index] = chiefIndex
      this.cmdOwnerGen[index] = pool.generation[chiefIndex]
      pool.state[index] = N2_COMMAND_STATE_FREEZE
      issued += 1
    }
    return issued
  }

  _advanceOwnedSnapshot(key, deltaMs) {
    const snapshot = expansionAttackSnapshots.get(key)
    if (snapshot) advanceExpansionSnapshot(snapshot, { deltaMs, playerX: this.playerX, playerZ: this.playerZ })
  }

  // ── E93 ─────────────────────────────────────────────────────────────────────
  _stepE93(pool, index, a, out) {
    pool.state[index] = N2_STATE_APPROACH
    const target = this.shadowTargetInto(this._shadowScratch ??= { x: 0, z: 0 }, a.playerX, a.playerZ)
    const dx = target.x - a.posX
    const dz = target.z - a.posZ
    const dist = Math.hypot(dx, dz)
    if (dist <= E93_SHADOW.arriveDistance) return out
    const speed = dist > E93_SHADOW.catchUpDistance ? E93_SHADOW.catchUpSpeed : a.speed
    const step = Math.min(speed, dist / Math.max(1e-6, a.deltaMs / 1000))
    out.velocityX = dx / dist * step
    out.velocityZ = dz / dist * step
    out.moving = true
    return out
  }

  // ── E96 ─────────────────────────────────────────────────────────────────────
  _stepE96(pool, index, a, out) {
    const D = E96_DRIBBLE
    const beat = this.beatIndex()
    const prev = pool.state[index]
    if (beat === 3) {
      if (prev !== N2_STATE_TELEGRAPH) {
        // 예고 시작 = 방향 확정(그 뒤로 추적하지 않는다).
        pool.runDirX[index] = a.distance > 1e-6 ? a.nx : 0
        pool.runDirZ[index] = a.distance > 1e-6 ? a.nz : 1
      }
      pool.state[index] = N2_STATE_TELEGRAPH
      out.noContact = true
      out.preserveFacing = true
      return out
    }
    if (beat === 0 && (prev === N2_STATE_TELEGRAPH || prev === N2_STATE_ATTACK)) {
      pool.state[index] = N2_STATE_ATTACK
      out.velocityX = pool.runDirX[index] * D.lungeSpeed
      out.velocityZ = pool.runDirZ[index] * D.lungeSpeed
      out.moving = true
      out.preserveFacing = true
      out.hasYaw = true
      out.yaw = Math.atan2(pool.runDirX[index], pool.runDirZ[index])
      return out
    }
    pool.state[index] = N2_STATE_APPROACH
    if (this.beatElapsedMs() < D.stepMs) return this._chase(a, out, D.stepSpeed)
    return out
  }

  // ── E103 ─────────────────────────────────────────────────────────────────────
  _stepE103(pool, index, a, out) {
    const C = E103_COFFEE
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    if (state === N2_STATE_TELEGRAPH) {
      out.noContact = true
      out.preserveFacing = true
      const key = `${COFFEE_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`
      this._advanceOwnedSnapshot(key, a.deltaMs)
      if (pool.stateTimer[index] > 0) return out
      this._removeSnapshot(key)
      const target = this.coffeeTarget[index]
      if (target >= 0 && slotAlive(pool, target, this.coffeeTargetGen[index]) && isBuffableTypeCode(pool.type[target])
        && this.countBuffed(pool) < C.maxBuffed) {
        this._claimSlot(pool, target)
        this.buffMs[target] = C.buffMs
      }
      this.coffeeTarget[index] = -1
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = C.recoverMs
      pool.attackCooldown[index] = C.cooldownMs
      return out
    }
    if (state === N2_STATE_RECOVER) {
      out.preserveFacing = true
      if (pool.stateTimer[index] <= 0) pool.state[index] = N2_STATE_APPROACH
      return out
    }
    pool.state[index] = N2_STATE_APPROACH
    if (pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= C.firstDelayMs && expansionChannelFree()
      && this.countBuffed(pool) < C.maxBuffed) {
      const target = this.pickCoffeeTarget(pool, index)
      if (target >= 0) {
        this.coffeeTarget[index] = target
        this.coffeeTargetGen[index] = pool.generation[target]
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = C.telegraphMs
        const dx = pool.posX[target] - a.posX
        const dz = pool.posZ[target] - a.posZ
        const len = Math.hypot(dx, dz) || 1
        const snapshot = makeZeroDamageSnapshot(`${COFFEE_TELEGRAPH_KEY_PREFIX}${index}:${pool.generation[index]}`, 'E103', 'e103_coffee',
          'line', a.posX, a.posZ, Math.max(0.3, len), 0.3, C.telegraphMs, 0, 0)
        snapshot.yaw = Math.atan2(dx / len, dz / len)
        snapshot.directionXZ = [dx / len, dz / len]
        this._addSnapshot(snapshot, pool, index)
        out.noContact = true
        out.preserveFacing = true
        return out
      }
    }
    // 지원형 이동: 플레이어와 4~6u를 유지하고, 그 사이에서는 천천히 옆걸음.
    if (a.distance < C.minDist) {
      out.velocityX = -a.nx * a.speed; out.velocityZ = -a.nz * a.speed; out.moving = true
    } else if (a.distance > C.maxDist) {
      out.velocityX = a.nx * a.speed; out.velocityZ = a.nz * a.speed; out.moving = true
    } else {
      const side = (index & 1) === 0 ? 1 : -1
      out.velocityX = -a.nz * a.speed * 0.5 * side; out.velocityZ = a.nx * a.speed * 0.5 * side; out.moving = true
    }
    return out
  }

  /** 셔틀 반경 4u 안에서 가장 가까운, 아직 커피를 안 받은 일반 좀비. 없으면 -1. */
  pickCoffeeTarget(pool, shuttleIndex) {
    const r2 = E103_COFFEE.pickRadius * E103_COFFEE.pickRadius
    const x = pool.posX[shuttleIndex]
    const z = pool.posZ[shuttleIndex]
    let best = -1
    let bestD2 = Infinity
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (index === shuttleIndex || pool.active[index] !== 1 || !isBuffableTypeCode(pool.type[index])) continue
      if (this.isChiefMinion(pool, index)) continue // 기관사 객차·복사본·먹히는 중인 개체(치프에 묶인 몸)는 버프 대상이 아니다
      if (this.slotGen[index] === pool.generation[index] && this.buffMs[index] > 0) continue
      const dx = pool.posX[index] - x
      const dz = pool.posZ[index] - z
      const d2 = dx * dx + dz * dz
      if (d2 <= r2 && d2 < bestD2) { bestD2 = d2; best = index }
    }
    return best
  }

  // ── E90 ─────────────────────────────────────────────────────────────────────
  _stepE90(pool, index, a, out) {
    const T = E90_THIEF
    out.noContact = true // 공격하지 않는다(피해 0)
    let state = pool.state[index]
    if (state === N2_STATE_TELEGRAPH) {
      out.preserveFacing = true
      if (a.distance <= T.fleeTrigger) {
        this.thiefTarget[index] = null
        return this._startFlee(pool, index, a, out)
      }
      if (pool.stateTimer[index] > 0) return out
      const item = this.thiefTarget[index]
      this.thiefTarget[index] = null
      if (item && isStealableTextbook(item) && this.bagBooks[index] < T.maxBooks) {
        const book = textbookPositionInto(this._bookScratch ??= { x: 0, z: 0 }, item)
        const keep = getTextbookTheftMagnetRadius() + T.magnetMargin
        const reach = Math.hypot(book.x - a.posX, book.z - a.posZ) <= T.pickupReach + 0.05
        const away = Math.hypot(book.x - a.playerX, book.z - a.playerZ) > keep
        if (reach && away) {
          const value = stealTextbook(item)
          this.bagValues[index * T.maxBooks + this.bagBooks[index]] = value
          this.bagBooks[index] += 1
        }
      }
      pool.state[index] = N2_STATE_APPROACH
      return out
    }
    if (a.distance <= T.fleeTrigger && state !== N2_STATE_ATTACK) return this._startFlee(pool, index, a, out)
    if (state === N2_STATE_ATTACK) {
      if (pool.stateTimer[index] > 0) return this._flee(index, a, out)
      state = N2_STATE_APPROACH
    }
    pool.state[index] = N2_STATE_APPROACH
    if (this.bagBooks[index] < T.maxBooks) {
      const book = this._bookScratch ??= { x: 0, z: 0 }
      const item = findStealableTextbookInto(book, a.posX, a.posZ, T.seekRadius, a.playerX, a.playerZ, getTextbookTheftMagnetRadius() + T.magnetMargin)
      if (item) {
        const dx = book.x - a.posX
        const dz = book.z - a.posZ
        const dist = Math.hypot(dx, dz)
        if (dist <= T.pickupReach) {
          this.thiefTarget[index] = item
          pool.state[index] = N2_STATE_TELEGRAPH
          pool.stateTimer[index] = T.pickupMs
          out.preserveFacing = true
          return out
        }
        const speed = Math.min(a.speed, dist / Math.max(1e-6, a.deltaMs / 1000))
        out.velocityX = dx / dist * speed
        out.velocityZ = dz / dist * speed
        out.moving = true
        return out
      }
    }
    // 주울 책이 없으면 플레이어와 5~7u를 유지하며 배회한다.
    if (a.distance < T.wanderMin) { out.velocityX = -a.nx * a.speed; out.velocityZ = -a.nz * a.speed; out.moving = true }
    else if (a.distance > T.wanderMax) { out.velocityX = a.nx * a.speed; out.velocityZ = a.nz * a.speed; out.moving = true }
    else {
      const side = (index & 1) === 0 ? 1 : -1
      out.velocityX = -a.nz * a.speed * 0.5 * side; out.velocityZ = a.nx * a.speed * 0.5 * side; out.moving = true
    }
    return out
  }

  _startFlee(pool, index, a, out) {
    pool.state[index] = N2_STATE_ATTACK
    pool.stateTimer[index] = E90_THIEF.fleeMs
    return this._flee(index, a, out)
  }

  // 지그재그 도주: 플레이어 반대쪽 + 옆으로 흔들기, 1.25u/s(플레이어보다 느리다).
  _flee(index, a, out) {
    const T = E90_THIEF
    let ax = -a.nx
    let az = -a.nz
    if (a.distance <= 1e-6) { ax = 0; az = 1 }
    const wiggle = Math.sin((this.clockMs / 1000) * Math.PI * 2 * T.zigzagHz + index) * T.zigzagAmp
    const vx = ax - az * wiggle
    const vz = az + ax * wiggle
    const len = Math.hypot(vx, vz) || 1
    out.velocityX = vx / len * T.fleeSpeed
    out.velocityZ = vz / len * T.fleeSpeed
    out.moving = true
    out.noContact = true
    return out
  }

  // ── E91 ─────────────────────────────────────────────────────────────────────
  _stepE91(pool, index, a, out) {
    const M = E91_MIMIC
    if (this.dormant[index]) {
      // 잠든 책: 피해 0, 움직이지 않는다.
      out.noContact = true
      out.preserveFacing = true
      pool.state[index] = N2_STATE_APPROACH
      if (pool.hp[index] < pool.maxHp[index] || pool.hitFlashTimer[index] > 0) {
        // 광역 무기에 맞으면 물기 없이 깨어나 추격한다.
        this.dormant[index] = 0
        pool.state[index] = N2_STATE_AWAKE
        return out
      }
      if (a.distance <= M.triggerDistance && pool.spawnTimer[index] >= 600 && pool.attackCooldown[index] <= 0 && expansionChannelFree()) {
        // 물기 자리 = 예고 시작 순간의 플레이어 위치(그 뒤로 따라가지 않는다).
        const dirX = a.distance > 1e-6 ? a.nx : 0
        const dirZ = a.distance > 1e-6 ? a.nz : 1
        const snapshot = this._buildCertifiedSnapshot(`${BITE_KEY_PREFIX}${index}:${pool.generation[index]}:${++this.seq}`, 'E91', 'e91_bite', 'disk',
          a.playerX, a.playerZ, dirX, dirZ, M.biteRadius, 0, M.telegraphMs, M.biteMs, 0, M.biteDamage)
        if (snapshot) {
          this._addAttack(snapshot, pool, index)
          this.dormant[index] = 0
          this.biteX[index] = a.playerX
          this.biteZ[index] = a.playerZ
          pool.state[index] = N2_STATE_TELEGRAPH
          pool.stateTimer[index] = M.telegraphMs
          pool.runDirX[index] = dirX
          pool.runDirZ[index] = dirZ
        } else {
          pool.attackCooldown[index] = SAFETY_RETRY_MS
        }
      }
      return out
    }
    const state = pool.state[index]
    if (state === N2_STATE_TELEGRAPH) {
      out.noContact = true
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_ATTACK
      pool.stateTimer[index] = M.biteMs
    }
    if (pool.state[index] === N2_STATE_ATTACK) {
      // 물기: 확정된 자리로 덮친다. 피해는 물기 원(스냅샷)만 — 몸 접촉은 끈다.
      out.noContact = true
      out.preserveFacing = true
      const dx = this.biteX[index] - a.posX
      const dz = this.biteZ[index] - a.posZ
      const dist = Math.hypot(dx, dz)
      const remaining = Math.max(pool.stateTimer[index], a.deltaMs) / 1000
      if (dist > 0.05) {
        const speed = Math.min(dist / remaining, dist / Math.max(1e-6, a.deltaMs / 1000))
        out.velocityX = dx / dist * speed
        out.velocityZ = dz / dist * speed
        out.moving = true
        out.hasYaw = true
        out.yaw = Math.atan2(dx, dz)
      }
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_AWAKE
      return out
    }
    // 깨어난 미믹: 0.5초 주기 중 0.3초만 움직이는 깡충 추격(평균 속도 = 이동 속도).
    pool.state[index] = N2_STATE_AWAKE
    const cycle = this.clockMs % M.hopCycleMs
    if (cycle >= M.hopMoveMs) return out
    return this._chase(a, out, a.speed * (M.hopCycleMs / M.hopMoveMs))
  }

  // ── E92 ─────────────────────────────────────────────────────────────────────
  _stepE92(pool, index, a, out) {
    const T = E92_TRAIN
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_ATTACK && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    const lineKey = `${TRAIN_LINE_KEY_PREFIX}${index}:${pool.generation[index]}`
    if (state === N2_STATE_TELEGRAPH) {
      out.noContact = true
      out.preserveFacing = true
      this._advanceOwnedSnapshot(lineKey, a.deltaMs)
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_ATTACK
      pool.stateTimer[index] = T.chargeMs
      state = N2_STATE_ATTACK
    }
    if (state === N2_STATE_ATTACK) {
      out.preserveFacing = true
      this._advanceOwnedSnapshot(lineKey, a.deltaMs)
      const dirX = pool.runDirX[index]
      const dirZ = pool.runDirZ[index]
      const relX = a.posX - this.chargeOriginX[index]
      const relZ = a.posZ - this.chargeOriginZ[index]
      const along = relX * dirX + relZ * dirZ
      const lateral = relX * -dirZ + relZ * dirX
      // 예고선 안에서만 달린다: 남은 길이(선 길이 − 머리 접촉 반경)를 넘지 않고, 옆으로 밀리면 바로잡고, 허용치를 넘으면 멈춘다.
      const reachLimit = T.lineLength - E92_HEAD_CONTACT
      const remaining = reachLimit - along
      if (pool.stateTimer[index] <= 0 || remaining <= 1e-3 || Math.abs(lateral) > T.lateralTolerance) return this._endTrainCharge(pool, index, lineKey, out)
      const dt = Math.max(1e-6, a.deltaMs / 1000)
      const speed = Math.min(T.chargeSpeed, remaining / dt)
      const correct = Math.max(-T.chargeSpeed, Math.min(T.chargeSpeed, -lateral / dt * 0.5))
      out.velocityX = dirX * speed + -dirZ * correct
      out.velocityZ = dirZ * speed + dirX * correct
      out.moving = true
      out.hasYaw = true
      out.yaw = Math.atan2(dirX, dirZ)
      return out
    }
    if (state === N2_STATE_RECOVER) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_APPROACH
    }
    pool.state[index] = N2_STATE_APPROACH
    // 머리는 초당 70°까지만 돈다(굽이쳐 다가온다).
    let heading = this.headHeading[index]
    if (a.distance > 1e-6) {
      const want = Math.atan2(a.nx, a.nz)
      let diff = want - heading
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      const maxTurn = T.turnRateRad * a.deltaMs / 1000
      heading += Math.max(-maxTurn, Math.min(maxTurn, diff))
      this.headHeading[index] = heading
    }
    const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= T.firstDelayMs && a.distance <= T.triggerDistance && a.distance > 1e-6
    if (ready && expansionChannelFree()) {
      // 예고 시작 = 방향 확정(플레이어 쪽, 머리 진행 방향과 무관 — "급커브"). 선은 시각 예고(피해 0) — 피해는 머리 접촉.
      const snapshot = this._buildCertifiedSnapshot(lineKey, 'E92', 'e92_charge', 'line', a.posX, a.posZ, a.nx, a.nz,
        T.lineLength, T.lineWidth, T.telegraphMs, T.chargeMs, 0, 0)
      if (snapshot) {
        snapshot.contactAttack = true
        this._addSnapshot(snapshot, pool, index)
        pool.runDirX[index] = a.nx
        pool.runDirZ[index] = a.nz
        this.chargeOriginX[index] = a.posX
        this.chargeOriginZ[index] = a.posZ
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = T.telegraphMs
        pool.attackCooldown[index] = T.cooldownMs
        out.noContact = true
        out.preserveFacing = true
        return out
      }
      pool.attackCooldown[index] = SAFETY_RETRY_MS // 인증 실패: 0.25초 뒤 다시(기존 확장 공격 재시도 간격)
    }
    const hx = Math.sin(heading)
    const hz = Math.cos(heading)
    out.velocityX = hx * a.speed
    out.velocityZ = hz * a.speed
    out.moving = true
    out.hasYaw = true
    out.yaw = heading
    return out
  }

  /** E92 머리가 예고·돌진 중이면 true — 자리·방향이 예고 시작에 고정된다(무리 밀어내기·넉백·끼임 순간이동을 받지 않는다). */
  isTrainLocked(pool, index) {
    if (pool.type[index] !== E92_CODE) return false
    const state = pool.state[index]
    return state === N2_STATE_TELEGRAPH || state === N2_STATE_ATTACK
  }

  /**
   * 돌진 중 머리의 이번 프레임 도착점이 그려진 예고선 안인가: 옆 밀림 ≤ 허용치(0.15u — 머리 접촉 0.4u와 합쳐 반폭 0.55u),
   * 앞쪽 ≤ 선 길이 − 머리 접촉, 뒤로 물러나지 않음. 장애물 미끄러짐·벽 클램프로 선을 벗어나면 false.
   */
  trainChargeKeepsLine(pool, index, x, z) {
    const T = E92_TRAIN
    const dirX = pool.runDirX[index]
    const dirZ = pool.runDirZ[index]
    const relX = x - this.chargeOriginX[index]
    const relZ = z - this.chargeOriginZ[index]
    const along = relX * dirX + relZ * dirZ
    const lateral = relX * -dirZ + relZ * dirX
    return Math.abs(lateral) <= T.lateralTolerance && along <= T.lineLength - E92_HEAD_CONTACT + 1e-4 && along >= -0.01
  }

  /** 돌진 취소(막혔거나 선을 벗어나려 했다): 피해 없이 예고선을 지우고 회복 상태로. 순간이동하지 않는다. */
  cancelTrainCharge(pool, index) {
    this._endTrainCharge(pool, index, `${TRAIN_LINE_KEY_PREFIX}${index}:${pool.generation[index]}`, this._cancelScratch ??= createNovel2Result())
  }

  _endTrainCharge(pool, index, lineKey, out) {
    this._removeSnapshot(lineKey)
    pool.state[index] = N2_STATE_RECOVER
    pool.stateTimer[index] = E92_TRAIN.recoverMs
    this.headHeading[index] = Math.atan2(pool.runDirX[index], pool.runDirZ[index])
    out.velocityX = 0
    out.velocityZ = 0
    out.moving = false
    out.preserveFacing = true
    return out
  }

  // ── E95 ─────────────────────────────────────────────────────────────────────
  _stepE95(pool, index, a, out) {
    const R = E95_ROPE
    const partner = this.partner[index]
    const partnerAlive = partner >= 0 && slotAlive(pool, partner, this.partnerGen[index])
    if (!partnerAlive) {
      // 짝을 잃었거나(줄이 떨어진다) 처음부터 짝이 없다 → 1.5배 속도로 일반 추격.
      if (this.wasPaired[index] || pool.spawnTimer[index] >= R.unpairedGraceMs) {
        this.solo[index] = 1
        this.partner[index] = -1
        pool.state[index] = N2_STATE_APPROACH
        return this._chase(a, out, a.speed * R.soloSpeedMul)
      }
      pool.state[index] = N2_STATE_APPROACH
      return this._chase(a, out, a.speed)
    }
    const leader = index < partner ? index : partner
    const other = leader === index ? partner : index
    const isLeader = leader === index
    if (isLeader && this.ropePhase(leader) === 0) this._tryRope(pool, leader, other, a)
    const phase = this.ropePhase(leader)
    if (phase === 1 || phase === 2) {
      // 줄을 들어 올림(예고) · 내려침: 두 몸 모두 제자리. 피해는 줄(선 스냅샷)만 — 몸 접촉은 끈다.
      pool.state[index] = phase === 1 ? N2_STATE_TELEGRAPH : N2_STATE_ATTACK
      out.noContact = true
      out.preserveFacing = true
      const ox = pool.posX[other] - a.posX
      const oz = pool.posZ[other] - a.posZ
      if (Math.hypot(ox, oz) > 1e-6) { out.hasYaw = true; out.yaw = Math.atan2(ox, oz) }
      return out
    }
    pool.state[index] = N2_STATE_APPROACH
    // 플레이어 양옆 자리: 줄 축 u = (주인 → 짝) 방향을 유지한 채 플레이어 −u·2.25 / +u·2.25.
    let ux = isLeader ? pool.posX[other] - a.posX : a.posX - pool.posX[leader]
    let uz = isLeader ? pool.posZ[other] - a.posZ : a.posZ - pool.posZ[leader]
    let ul = Math.hypot(ux, uz)
    if (ul < 1e-6) { ux = 1; uz = 0; ul = 1 }
    ux /= ul; uz /= ul
    const sign = isLeader ? -1 : 1
    const tx = a.playerX + ux * R.flankHalf * sign
    const tz = a.playerZ + uz * R.flankHalf * sign
    const dx = tx - a.posX
    const dz = tz - a.posZ
    const dist = Math.hypot(dx, dz)
    if (dist <= R.arriveDistance) return out
    const speed = Math.min(a.speed, dist / Math.max(1e-6, a.deltaMs / 1000))
    out.velocityX = dx / dist * speed
    out.velocityZ = dz / dist * speed
    out.moving = true
    return out
  }

  /** 줄 단계: 0 대기 · 1 들어 올림(예고 0.9초) · 2 내려침(0.3초) · 3 안전(0.8초). 줄 주인 슬롯의 스냅샷에서 읽는다. */
  ropePhase(leader) {
    const key = this.ropeKey[leader]
    if (!key) return 0
    const snapshot = expansionAttackSnapshots.get(key)
    if (!snapshot) { this.ropeKey[leader] = null; return 0 }
    return snapshot.phase === 'windup' ? 1 : snapshot.phase === 'active' ? 2 : 3
  }

  // 줄 주인(낮은 슬롯)만 부른다. 대기 중에만.
  _tryRope(pool, leader, other, a) {
    const R = E95_ROPE
    // 대기: 플레이어가 두 몸 사이 선분 가까이 있으면 줄을 든다(양끝은 이 순간 고정).
    const ax = pool.posX[leader]
    const az = pool.posZ[leader]
    const bx = pool.posX[other]
    const bz = pool.posZ[other]
    const sx = bx - ax
    const sz = bz - az
    const span = Math.hypot(sx, sz)
    if (span < R.minSpan || span > R.maxSpan || pool.spawnTimer[leader] < 1000 || pool.attackCooldown[leader] > 0 || !expansionChannelFree()) return
    const t = ((a.playerX - ax) * sx + (a.playerZ - az) * sz) / (span * span)
    if (t < 0 || t > 1) return
    const lateral = Math.abs((a.playerX - ax) * sz - (a.playerZ - az) * sx) / span
    if (lateral > R.triggerDistance) return
    const snapshot = this._buildCertifiedSnapshot(`${ROPE_KEY_PREFIX}${leader}:${pool.generation[leader]}:${++this.seq}`, 'E95', 'e95_rope', 'line',
      ax, az, sx / span, sz / span, span, R.ropeWidth, R.windupMs, R.slamMs, R.safeMs, R.damage)
    if (!snapshot) { pool.attackCooldown[leader] = SAFETY_RETRY_MS; return }
    this._addAttack(snapshot, pool, leader, other)
    this.ropeKey[leader] = snapshot.key
  }

  /** 짝 슬롯(E105·E95). 없으면 -1. MiniZombieLayer pickVariant(두 몸이 서로 다른 몸)용. */
  partnerOf(pool, index) {
    const partner = this.partner[index]
    return partner >= 0 && slotAlive(pool, partner, this.partnerGen[index]) ? partner : -1
  }

  // ── 3차 치프 공통 ─────────────────────────────────────────────────────────────
  /** 치프에 묶인 몸(E92 객차·E101 복사본·E98에게 먹히는 중) — 지휘·커피·먹기·복사 대상이 아니다. */
  isChiefMinion(pool, index) {
    return this.isTrainCar(pool, index) || this.isCopy(pool, index) || this.isBeingEaten(pool, index)
  }

  _removeOwnedAttacks(owner) {
    for (let i = this.attacks.length - 1; i >= 0; i -= 1) {
      if (this.attacks[i].n2OwnerA !== owner) continue
      this._removeSnapshot(this.attacks[i].key)
      this.attacks.splice(i, 1)
    }
  }

  // ── E98 대식가 ────────────────────────────────────────────────────────────────
  isBeingEaten(pool, index) {
    return index >= 0 && index < this.capacity && this.eatenBy[index] >= 0 && this.slotGen[index] === pool.generation[index]
  }

  /** 먹을 수 있는 개체: 단순 잡몹 · HP ≤ 대식가 최대 HP × 25% · 치프에 묶인 몸·지휘받는 중·잠든 미믹이 아님. */
  _isEdible(pool, eater, index) {
    if (index === eater || pool.active[index] !== 1 || !SIMPLE_MOB_CODES.has(pool.type[index])) return false
    if (this.slotGen[index] === pool.generation[index] && (this.isChiefMinion(pool, index) || this.cmdPhase[index] !== 0)) return false
    return pool.hp[index] <= pool.maxHp[eater] * E98_EATER.edibleHpRatio
  }

  _inCone(ox, oz, dirX, dirZ, x, z, radius, angleDeg) {
    const dx = x - ox
    const dz = z - oz
    const dist = Math.hypot(dx, dz)
    if (dist > radius) return false
    if (dist < 1e-6) return true
    return (dx * dirX + dz * dirZ) / dist >= Math.cos(angleDeg * Math.PI / 360)
  }

  _countEdible(pool, eater, ox, oz, dirX, dirZ) {
    const E = E98_EATER
    let count = 0
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (!this._isEdible(pool, eater, index)) continue
      if (this._inCone(ox, oz, dirX, dirZ, pool.posX[index], pool.posZ[index], E.coneRadius, E.coneAngleDeg)) count += 1
    }
    return count
  }

  /** 대식가 속도 배율: 먹을 때마다 −5%, 6마리에서 멈춘다(0.7). */
  eaterSpeedMultiplier(index) {
    return 1 - E98_EATER.slowPerEat * Math.min(this.eatCount[index], E98_EATER.growCapEats)
  }

  /** 대식가 성장 배율(크기): 1 + 0.06 × min(먹은 수, 6). 비주얼은 pool.visualScale에 이미 반영된다. */
  eaterGrowth(pool, index) {
    if (index < 0 || index >= this.capacity || pool.type[index] !== E98_CODE || this.slotGen[index] !== pool.generation[index]) return 1
    return 1 + E98_EATER.growPerEat * Math.min(this.eatCount[index], E98_EATER.growCapEats)
  }

  _stepE98(pool, index, a, out) {
    const E = E98_EATER
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_ATTACK && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    if (state === N2_STATE_TELEGRAPH) {
      // 입을 벌림: 제자리, 피해 0(부채꼴은 예고 시작 자리·방향으로 고정 — 물기 피해는 스냅샷이 낸다).
      out.noContact = true
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      this._startGulp(pool, index)
      pool.state[index] = N2_STATE_ATTACK
      pool.stateTimer[index] = E.suckMs
      return out
    }
    if (state === N2_STATE_ATTACK) {
      // 흡입: 먹이가 입으로 끌려온다. 몸 접촉 피해는 끈다(피해는 물기 부채꼴만).
      out.noContact = true
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      this._finishGulp(pool, index)
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = E.chewMs
      return out
    }
    if (state === N2_STATE_RECOVER) {
      // 씹기: 제자리(처치 기회).
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
    }
    pool.state[index] = N2_STATE_APPROACH
    const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= E.firstDelayMs && a.distance > 1e-6 && expansionChannelFree()
    if (ready) {
      const food = this.eatCount[index] < E.maxEaten && this._countEdible(pool, index, a.posX, a.posZ, a.nx, a.nz) > 0
      if (a.distance <= E.biteTrigger || food) {
        const snapshot = this._buildCertifiedSnapshot(`${EATER_KEY_PREFIX}${index}:${pool.generation[index]}:${++this.seq}`, 'E98', 'e98_bite', 'sector',
          a.posX, a.posZ, a.nx, a.nz, E.coneRadius, 0, E.telegraphMs, E.biteMs, 0, E.biteDamage, E.coneAngleDeg)
        if (snapshot) {
          this._addAttack(snapshot, pool, index)
          this.mouthX[index] = a.posX + a.nx * E.mouthOffset
          this.mouthZ[index] = a.posZ + a.nz * E.mouthOffset
          this.chargeOriginX[index] = a.posX
          this.chargeOriginZ[index] = a.posZ
          pool.runDirX[index] = a.nx
          pool.runDirZ[index] = a.nz
          pool.state[index] = N2_STATE_TELEGRAPH
          pool.stateTimer[index] = E.telegraphMs
          pool.attackCooldown[index] = E.cooldownMs
          out.noContact = true
          out.preserveFacing = true
          out.hasYaw = true
          out.yaw = Math.atan2(a.nx, a.nz)
          return out
        }
        pool.attackCooldown[index] = SAFETY_RETRY_MS
      }
    }
    return this._chase(a, out, a.speed * this.eaterSpeedMultiplier(index))
  }

  // 흡입 시작: 예고 때 고정한 부채꼴 안의 먹이를 가까운 순으로 최대 3기(저장 칸이 남은 만큼) 고른다.
  _startGulp(pool, eater) {
    const E = E98_EATER
    const room = Math.min(E.maxPerGulp, E.maxEaten - this.eatCount[eater])
    const ox = this.chargeOriginX[eater]
    const oz = this.chargeOriginZ[eater]
    const dirX = pool.runDirX[eater]
    const dirZ = pool.runDirZ[eater]
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let n = 0; n < room; n += 1) {
      let best = -1
      let bestD2 = Infinity
      for (let index = 0; index <= highest; index += 1) {
        if (!this._isEdible(pool, eater, index)) continue
        const x = pool.posX[index]
        const z = pool.posZ[index]
        if (!this._inCone(ox, oz, dirX, dirZ, x, z, E.coneRadius, E.coneAngleDeg)) continue
        const d2 = (x - ox) * (x - ox) + (z - oz) * (z - oz)
        if (d2 < bestD2) { bestD2 = d2; best = index }
      }
      if (best < 0) return
      this._claimSlot(pool, best)
      this.eatenBy[best] = eater
      this.eatenByGen[best] = pool.generation[eater]
    }
  }

  // 흡입 끝: 끌려온 먹이를 먹는다(보상 없이 퇴장). XP는 대식가 칸에 쌓이고, 회복·성장·감속이 붙는다.
  _finishGulp(pool, eater) {
    const E = E98_EATER
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1 || this.eatenBy[index] !== eater || this.eatenByGen[index] !== pool.generation[eater]) continue
      if (this.slotGen[index] !== pool.generation[index]) continue
      this.eatenBy[index] = -1
      if (this.eatCount[eater] < E.maxEaten) {
        this.eatXp[eater * E.maxEaten + this.eatCount[eater]] = this.xpTable?.[pool.type[index]] ?? 0
        this.eatCount[eater] += 1
        pool.hp[eater] = Math.min(pool.maxHp[eater], pool.hp[eater] + pool.maxHp[eater] * E.healPerEat)
      }
      this._despawnQuiet(pool, index)
    }
    if (this.eaterBaseScale[eater] > 0) pool.visualScale[eater] = this.eaterBaseScale[eater] * this.eaterGrowth(pool, eater)
  }

  /** 먹히는 중인 개체: 이번 프레임 이동을 대신 정하고 true(입으로 끌려간다, 접촉 피해 0). 대식가가 죽었거나 흡입이 끝났으면 풀려 false. */
  stepEaten(pool, index, deltaMs, out) {
    if (!this.isBeingEaten(pool, index)) return false
    const eater = this.eatenBy[index]
    if (!slotAlive(pool, eater, this.eatenByGen[index]) || pool.type[eater] !== E98_CODE || pool.state[eater] !== N2_STATE_ATTACK) {
      this.eatenBy[index] = -1
      return false
    }
    resetResult(out)
    out.preserveFacing = true
    out.noContact = true
    const dx = this.mouthX[eater] - pool.posX[index]
    const dz = this.mouthZ[eater] - pool.posZ[index]
    const dist = Math.hypot(dx, dz)
    if (dist < 0.05) return out
    const dt = Math.max(1e-6, deltaMs / 1000)
    const remaining = Math.max(pool.stateTimer[eater] / 1000, dt)
    const speed = Math.min(dist / remaining, dist / dt)
    out.velocityX = dx / dist * speed
    out.velocityZ = dz / dist * speed
    out.moving = true
    out.hasYaw = true
    out.yaw = Math.atan2(dx, dz)
    return out
  }

  /** 대식가가 죽은 자리: 먹은 잡몹의 XP를 한 권씩 떨어뜨릴 목록(E90 도둑과 같은 drainThiefLoot)에 올린다. */
  queueEaterLoot(pool, index) {
    if (pool.type[index] !== E98_CODE || this.slotGen[index] !== pool.generation[index]) return 0
    const x = pool.posX[index]
    const z = pool.posZ[index]
    if (!Number.isFinite(x + z)) return 0
    const count = this.eatCount[index]
    const base = index * E98_EATER.maxEaten
    for (let k = 0; k < count; k += 1) if (this.eatXp[base + k] > 0) this.thiefLoot.push(x, z, this.eatXp[base + k])
    this.eatCount[index] = 0
    return count
  }

  // ── E101 복사기 ───────────────────────────────────────────────────────────────
  isCopy(pool, index) {
    return index >= 0 && index < this.capacity && this.copyOwner[index] >= 0 && this.slotGen[index] === pool.generation[index]
  }

  liveCopies(pool, owner) {
    let count = 0
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] === 1 && this.copyOwner[index] === owner && this.copyOwnerGen[index] === pool.generation[owner] && this.isCopy(pool, index)) count += 1
    }
    return count
  }

  _isCopyable(pool, index) {
    if (pool.active[index] !== 1 || !SIMPLE_MOB_CODES.has(pool.type[index])) return false
    return !(this.slotGen[index] === pool.generation[index] && (this.isChiefMinion(pool, index) || this.cmdPhase[index] !== 0))
  }

  /** 복사기 반경 5u 안에서 가장 가까운 복사 대상(단순 잡몹, 복사본·치프에 묶인 몸 제외). 없으면 -1. */
  pickCopyTarget(pool, copier) {
    const r2 = E101_COPIER.pickRadius * E101_COPIER.pickRadius
    const x = pool.posX[copier]
    const z = pool.posZ[copier]
    let best = -1
    let bestD2 = Infinity
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (index === copier || !this._isCopyable(pool, index)) continue
      const d2 = (pool.posX[index] - x) ** 2 + (pool.posZ[index] - z) ** 2
      if (d2 <= r2 && d2 < bestD2) { bestD2 = d2; best = index }
    }
    return best
  }

  _spawnCopy(pool, copier, target) {
    const C = E101_COPIER
    if (pool.activeCount >= MAX_ENEMIES - C.reserveSlots) return -1
    const name = ENEMY_TYPE_NAMES[pool.type[target]]
    if (!name) return -1
    // 대상 옆(복사기 → 대상 방향의 수직)으로 0.8u. 좌우는 번갈아.
    let ux = pool.posX[target] - pool.posX[copier]
    let uz = pool.posZ[target] - pool.posZ[copier]
    const ul = Math.hypot(ux, uz)
    if (ul > 1e-6) { ux /= ul; uz /= ul } else { ux = 0; uz = 1 }
    const side = (this.seq & 1) === 0 ? 1 : -1
    const limitX = (this.halfX > 0 ? this.halfX : 9.36) - 0.4
    const limitZ = (this.halfZ > 0 ? this.halfZ : 16) - 0.4
    const source = this._copySource ??= { type: 'E01', x: 0, y: 0, z: 0, hp: 1, maxHp: 1, visualScale: 1, spawnTimer: 1, yaw: 0, runDirX: 0, runDirZ: 1 }
    const handle = this._copyHandle ??= { index: -1, generation: 0 }
    const hp = Math.max(1, Math.round(pool.maxHp[target] * C.copyHpRatio))
    source.type = name
    source.x = Math.max(-limitX, Math.min(limitX, pool.posX[target] - uz * side * C.copyOffset))
    source.z = Math.max(-limitZ, Math.min(limitZ, pool.posZ[target] + ux * side * C.copyOffset))
    source.y = pool.posY[target]
    source.hp = hp; source.maxHp = hp
    source.visualScale = pool.visualScale[target]
    source.yaw = pool.yaw[target]
    if (!pool.spawnInto(handle, source)) return -1
    this.seq += 1
    this._claimSlot(pool, handle.index)
    // 복사본은 회복(E56·E84)·방패(E67·E78·E86)·커피·지휘를 받지 않는다(치프 부하 제외 규칙).
    markSupportImmune(pool, handle.index)
    this.copyOwner[handle.index] = copier
    this.copyOwnerGen[handle.index] = pool.generation[copier]
    this.copyMs[handle.index] = C.copyLifeMs
    return handle.index
  }

  _scanKey(pool, index) {
    return `${COPIER_SCAN_KEY_PREFIX}${index}:${pool.generation[index]}`
  }

  _stepE101(pool, index, a, out) {
    const C = E101_COPIER
    if (this.copyCooldownMs[index] > 0) this.copyCooldownMs[index] = Math.max(0, this.copyCooldownMs[index] - a.deltaMs)
    let state = pool.state[index]
    if (state === N2_STATE_STUN) {
      // 용지 걸림: 제자리, 접촉 피해 0.
      out.noContact = true
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      state = N2_STATE_APPROACH
    }
    if (state === N2_STATE_TELEGRAPH) {
      out.noContact = true
      out.preserveFacing = true
      if (this.copierMode[index] === 1) {
        const key = this._scanKey(pool, index)
        this._advanceOwnedSnapshot(key, a.deltaMs)
        if (pool.stateTimer[index] > 0) return out
        this._removeSnapshot(key)
        const target = this.copyTarget[index]
        // 스캔 중 대상이 죽었으면 "용지 없음" — 복사하지 않는다.
        if (target >= 0 && slotAlive(pool, target, this.copyTargetGen[index]) && this._isCopyable(pool, target)
          && this.liveCopies(pool, index) < C.maxCopies) this._spawnCopy(pool, index, target)
        this.copyTarget[index] = -1
        this.copierMode[index] = 0
        pool.state[index] = N2_STATE_RECOVER
        pool.stateTimer[index] = C.scanRecoverMs
        return out
      }
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_ATTACK
      pool.stateTimer[index] = C.fanActiveMs
      return out
    }
    if (state === N2_STATE_ATTACK) {
      out.noContact = true
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      this.copierMode[index] = 0
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = C.fanRecoverMs
      return out
    }
    if (state === N2_STATE_RECOVER) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
    }
    pool.state[index] = N2_STATE_APPROACH
    this.copierMode[index] = 0
    const ready = pool.spawnTimer[index] >= C.firstDelayMs && expansionChannelFree()
    if (ready && pool.attackCooldown[index] <= 0 && a.distance <= C.fanTrigger && a.distance > 1e-6) {
      const snapshot = this._buildCertifiedSnapshot(`${COPIER_FAN_KEY_PREFIX}${index}:${pool.generation[index]}:${++this.seq}`, 'E101', 'e101_fan', 'sector',
        a.posX, a.posZ, a.nx, a.nz, C.fanRadius, 0, C.fanTelegraphMs, C.fanActiveMs, 0, C.fanDamage, C.fanAngleDeg)
      if (snapshot) {
        this._addAttack(snapshot, pool, index)
        this.copierMode[index] = 2
        pool.runDirX[index] = a.nx
        pool.runDirZ[index] = a.nz
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = C.fanTelegraphMs
        pool.attackCooldown[index] = C.fanCooldownMs
        out.noContact = true
        out.preserveFacing = true
        out.hasYaw = true
        out.yaw = Math.atan2(a.nx, a.nz)
        return out
      }
      pool.attackCooldown[index] = SAFETY_RETRY_MS
    } else if (ready && this.copyCooldownMs[index] <= 0 && pool.activeCount < MAX_ENEMIES - C.reserveSlots && this.liveCopies(pool, index) < C.maxCopies) {
      const target = this.pickCopyTarget(pool, index)
      if (target >= 0) {
        this.copyTarget[index] = target
        this.copyTargetGen[index] = pool.generation[target]
        this.copierMode[index] = 1
        // 노란 원(피해 0): 스캔 대상 발밑(예고 시작 자리로 고정).
        this._addSnapshot(makeZeroDamageSnapshot(this._scanKey(pool, index), 'E101', 'e101_scan', 'disk',
          pool.posX[target], pool.posZ[target], C.scanRadius, 0, C.scanMs, 0, 0), pool, index)
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = C.scanMs
        this.copyCooldownMs[index] = C.copyCooldownMs
        out.noContact = true
        out.preserveFacing = true
        const dx = pool.posX[target] - a.posX
        const dz = pool.posZ[target] - a.posZ
        if (Math.hypot(dx, dz) > 1e-6) { out.hasYaw = true; out.yaw = Math.atan2(dx, dz) }
        return out
      }
    }
    return this._chase(a, out, a.speed)
  }

  /**
   * E101 용지 걸림 판정(applyHitIndex가 피해를 뺀 뒤 부른다). 4초 창 안에 최대 HP 20% 이상을 맞으면 2.5초 제자리 경직.
   * 걸리는 순간 진행 중이던 스캔·부채꼴 예고는 피해 없이 지운다. 걸림이 끝나고 3초 동안은 다시 걸리지 않는다.
   */
  noteCopierDamage(pool, index, damage) {
    if (pool.type[index] !== E101_CODE || !(damage > 0) || !(pool.hp[index] > 0)) return false
    const C = E101_COPIER
    this._claimSlot(pool, index)
    if (pool.state[index] === N2_STATE_STUN || this.clockMs < this.jamImmuneUntil[index]) return false
    if (this.clockMs - this.jamStartMs[index] > C.jamWindowMs || this.jamAcc[index] <= 0) {
      this.jamStartMs[index] = this.clockMs
      this.jamAcc[index] = 0
    }
    this.jamAcc[index] += damage
    if (this.jamAcc[index] < pool.maxHp[index] * C.jamDamageRatio) return false
    this._removeSnapshot(this._scanKey(pool, index))
    this._removeOwnedAttacks(index)
    this.copyTarget[index] = -1
    this.copierMode[index] = 0
    this.jamAcc[index] = 0
    this.jamImmuneUntil[index] = this.clockMs + C.jamMs + C.jamImmuneMs
    pool.state[index] = N2_STATE_STUN
    pool.stateTimer[index] = C.jamMs
    return true
  }

  isJammed(pool, index) {
    return pool.type[index] === E101_CODE && pool.state[index] === N2_STATE_STUN
  }

  // ── E104 공굴리기 대장 ─────────────────────────────────────────────────────────
  /** 공이 굴러갈 길이: 대장 → 맵 끝(여백 0.2u, 최대 20u). 장애물(골대)에 막히면 그 앞까지. */
  _ballLaneLength(ox, oz, dirX, dirZ) {
    const B = E104_BALL
    const hx = this.halfX > 0 ? this.halfX : 12
    const hz = this.halfZ > 0 ? this.halfZ : 20
    let edge = Infinity
    if (dirX > 1e-6) edge = Math.min(edge, (hx - ox) / dirX)
    else if (dirX < -1e-6) edge = Math.min(edge, (-hx - ox) / dirX)
    if (dirZ > 1e-6) edge = Math.min(edge, (hz - oz) / dirZ)
    else if (dirZ < -1e-6) edge = Math.min(edge, (-hz - oz) / dirZ)
    let length = Math.min(B.maxLength, edge - B.edgeMargin)
    if (!(length > 0)) return 0
    const obstacles = this.obstacles
    if (obstacles && obstacles.length) {
      const from = this._laneFrom ??= { x: 0, z: 0 }
      const to = this._laneTo ??= { x: 0, z: 0 }
      from.x = ox; from.z = oz
      const pad = B.ballRadius * 0.5
      to.x = ox + dirX * length; to.z = oz + dirZ * length
      if (isStageObjectSightBlocked(from, to, obstacles, pad)) {
        let lo = 0
        let hi = length
        for (let i = 0; i < 16; i += 1) {
          const mid = (lo + hi) / 2
          to.x = ox + dirX * mid; to.z = oz + dirZ * mid
          if (isStageObjectSightBlocked(from, to, obstacles, pad)) hi = mid
          else lo = mid
        }
        length = lo
      }
    }
    return length
  }

  _startRoll(pool, index, a) {
    const B = E104_BALL
    const length = this._ballLaneLength(a.posX, a.posZ, a.nx, a.nz)
    if (!(length >= B.minLength)) return false
    const rollMs = (length - 2 * B.ballRadius) / B.rollSpeed * 1000
    const key = `${BALL_KEY_PREFIX}${index}:${pool.generation[index]}:${++this.seq}`
    const snapshot = this._buildCertifiedSnapshot(key, 'E104', 'e104_ball', 'line', a.posX, a.posZ, a.nx, a.nz,
      length, B.lineWidth, B.telegraphMs, rollMs, 0, B.damage)
    if (!snapshot) return false
    snapshot.n2OwnerA = index
    snapshot.n2OwnerGenA = pool.generation[index]
    snapshot.ballRadius = B.ballRadius
    snapshot.ballStartAlong = B.ballRadius
    snapshot.ballEndAlong = length - B.ballRadius
    snapshot.ballXZ = [a.posX + a.nx * B.ballRadius, a.posZ + a.nz * B.ballRadius]
    snapshot.rollId = ++this.rollSeq
    snapshot.zombieHits = 0
    expansionAttackSnapshots.set(key, snapshot)
    this.ownedKeys.add(key)
    this.balls.push(snapshot)
    this.ballKey[index] = key
    this.ballPhase[index] = 1
    this.ballX[index] = snapshot.ballXZ[0]
    this.ballZ[index] = snapshot.ballXZ[1]
    this.ballRetrieveMs[index] = 0
    pool.runDirX[index] = a.nx
    pool.runDirZ[index] = a.nz
    pool.state[index] = N2_STATE_TELEGRAPH
    pool.stateTimer[index] = B.telegraphMs
    const enraged = pool.maxHp[index] > 0 && pool.hp[index] <= pool.maxHp[index] * B.enrageHpRatio
    pool.attackCooldown[index] = enraged ? B.enragedCooldownMs : B.cooldownMs
    return true
  }

  _stepE104(pool, index, a, out) {
    const B = E104_BALL
    let state = pool.state[index]
    if (state === N2_STATE_TELEGRAPH) {
      // 겨눔: 제자리, 피해 0. 공 경로(선)는 예고 시작 자리·방향으로 고정 — 대장이 밀려도 공은 그려진 선 위로만 간다.
      out.noContact = true
      out.preserveFacing = true
      const key = this.ballKey[index]
      if (key && expansionAttackSnapshots.has(key)) {
        if (pool.stateTimer[index] > 0) return out
        pool.state[index] = N2_STATE_ATTACK
        pool.stateTimer[index] = B.kickMs
        return out
      }
      this.ballPhase[index] = 0 // 예고가 지워졌다(판 리셋 등) — 공을 든 채로 돌아간다
      state = N2_STATE_APPROACH
    }
    if (state === N2_STATE_ATTACK) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
    }
    pool.state[index] = N2_STATE_APPROACH
    const phase = this.ballPhase[index]
    if (phase === 2 || phase === 3) {
      // 공을 주우러 간다(0.8u/s). 굴리지 못하는 동안이 처치 기회다.
      this.ballRetrieveMs[index] += a.deltaMs
      const dx = this.ballX[index] - a.posX
      const dz = this.ballZ[index] - a.posZ
      const dist = Math.hypot(dx, dz)
      if (phase === 3 && (dist <= B.pickupReach || this.ballRetrieveMs[index] >= B.retrieveTimeoutMs)) {
        this.ballPhase[index] = 0
        pool.attackCooldown[index] = Math.max(pool.attackCooldown[index], B.pickupDelayMs)
        return out
      }
      if (dist < 1e-3) return out
      const speed = Math.min(B.retrieveSpeed, dist / Math.max(1e-6, a.deltaMs / 1000))
      out.velocityX = dx / dist * speed
      out.velocityZ = dz / dist * speed
      out.moving = true
      out.hasYaw = true
      out.yaw = Math.atan2(dx, dz)
      return out
    }
    this.ballPhase[index] = 0
    const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= B.firstDelayMs && a.distance <= B.triggerDistance
      && a.distance > 1e-6 && expansionChannelFree()
    if (ready) {
      if (this._startRoll(pool, index, a)) {
        out.noContact = true
        out.preserveFacing = true
        out.hasYaw = true
        out.yaw = Math.atan2(a.nx, a.nz)
        return out
      }
      pool.attackCooldown[index] = SAFETY_RETRY_MS
    }
    return this._chase(a, out, a.speed)
  }

  // 공 진행(머리말). 공 중심은 [r, 길이 − r]만 지난다. 플레이어 피해 = 공 원 안 + 그려진 선 안(1회). 지나가는 일반 좀비는 굴림마다 1회 60.
  _stepBalls(pool, playerX, playerZ, deltaMs, onDamage) {
    const B = E104_BALL
    for (let i = this.balls.length - 1; i >= 0; i -= 1) {
      const s = this.balls[i]
      const owner = s.n2OwnerA
      const alive = slotAlive(pool, owner, s.n2OwnerGenA)
      if (expansionAttackSnapshots.get(s.key) !== s || !alive) {
        // 대장이 죽었거나 판 리셋으로 지워졌다: 피해 없이 지운다.
        this._removeSnapshot(s.key)
        this.balls.splice(i, 1)
        if (alive && this.ballKey[owner] === s.key) { this.ballKey[owner] = null; this.ballPhase[owner] = 0 }
        continue
      }
      s.elapsedMs += deltaMs
      const end = s.windupMs + s.activeMs
      s.phase = s.elapsedMs < s.windupMs ? 'windup' : s.elapsedMs < end ? 'active' : 'recovery'
      if (s.phase === 'windup') continue
      const along = Math.min(s.ballEndAlong, s.ballStartAlong + B.rollSpeed * (s.elapsedMs - s.windupMs) / 1000)
      const cx = s.originXZ[0] + s.directionXZ[0] * along
      const cz = s.originXZ[1] + s.directionXZ[1] * along
      s.ballXZ[0] = cx
      s.ballXZ[1] = cz
      this.ballX[owner] = cx
      this.ballZ[owner] = cz
      if (s.phase === 'active') {
        this.ballPhase[owner] = 2
        if (!s.hit && Math.hypot(playerX - cx, playerZ - cz) <= B.ballRadius + EXPANSION_PLAYER_RADIUS
          && expansionAttackContains(s, playerX, playerZ, EXPANSION_PLAYER_RADIUS)) {
          s.hit = true
          if (onDamage) onDamage(s.damage, cx, cz)
        }
        this._ballHitZombies(pool, owner, s, cx, cz)
        continue
      }
      // 굴림 끝: 공은 멈춘 자리에 놓인다(대장이 주우러 간다).
      this.ballPhase[owner] = 3
      this.ballKey[owner] = null
      this._removeSnapshot(s.key)
      this.balls.splice(i, 1)
    }
  }

  _ballHitZombies(pool, owner, s, cx, cz) {
    const B = E104_BALL
    if (s.zombieHits >= B.maxZombieHitsPerRoll) return
    const rollId = s.rollId
    const reach = B.ballRadius + B.zombieHitPad
    const reach2 = reach * reach
    const highest = Math.min(pool.highestActive, this.capacity - 1)
    for (let index = 0; index <= highest && s.zombieHits < B.maxZombieHitsPerRoll; index += 1) {
      if (index === owner || pool.active[index] !== 1 || !isBallTargetTypeCode(pool.type[index])) continue
      if (this.ballHitRoll[index] === rollId && this.ballHitGen[index] === pool.generation[index]) continue
      const dx = pool.posX[index] - cx
      const dz = pool.posZ[index] - cz
      if (dx * dx + dz * dz > reach2) continue
      this.ballHitRoll[index] = rollId
      this.ballHitGen[index] = pool.generation[index]
      this.ballHits.push(index, pool.generation[index], B.zombieDamage, cx, cz)
      s.zombieHits += 1
    }
  }

  /** 이번 스텝에 공에 맞은 좀비를 넘기고 목록을 비운다. cb(index, generation, damage, ballX, ballZ). */
  drainBallHits(cb) {
    const hits = this.ballHits
    for (let i = 0; i + 4 < hits.length; i += 5) cb(hits[i], hits[i + 1], hits[i + 2], hits[i + 3], hits[i + 4])
    hits.length = 0
  }

  /** 소품 배율 훅 'ballHeld'(MiniZombieLayer): 공을 들고 있거나 겨누는 동안 1, 굴러가거나 바닥에 있으면 0(숨김). */
  ballHeldScale(pool, index) {
    if (index < 0 || index >= this.capacity || pool.type[index] !== E104_CODE || this.slotGen[index] !== pool.generation[index]) return 1
    return this.ballPhase[index] <= 1 ? 1 : 0
  }

  /** 공 상태(비주얼용): phase 0 듦 · 1 겨눔 · 2 구름 · 3 바닥. x·z = 공 중심(구름·바닥일 때 의미가 있다), radius = 0.9u. */
  ballStateInto(pool, index, out) {
    const valid = index >= 0 && index < this.capacity && pool.type[index] === E104_CODE && this.slotGen[index] === pool.generation[index]
    out.phase = valid ? this.ballPhase[index] : 0
    out.x = valid ? this.ballX[index] : 0
    out.z = valid ? this.ballZ[index] : 0
    out.radius = E104_BALL.ballRadius
    return out
  }

  // ── 3차 둘째 묶음 공통: 선에 묶인 몸(E92 머리·E102 의자·E100 떡) ─────────────────
  /** 넉백을 받지 않는 상태: E92 예고·돌진, E102 예고·활주·표류(선이 그려져 있는 동안), E100 웅크림·도약·매달림. */
  isLineLocked(pool, index) {
    const type = pool.type[index]
    if (type === E92_CODE) return this.isTrainLocked(pool, index)
    if (this.slotGen[index] !== pool.generation[index]) return false
    if (type === E102_CODE) return pool.state[index] === N2_STATE_TELEGRAPH || this.chairKey[index] !== null
    if (type === E100_CODE) return this.mochiPhase[index] >= 1 && this.mochiPhase[index] <= 3
    return false
  }

  /** 자리 고정(무리 밀어내기·이동 없음): E92·E102 예고, E100 웅크림 — 예고 시작 자리가 선의 원점이다. */
  isLinePinned(pool, index) {
    const type = pool.type[index]
    if (type === E92_CODE) return this.isTrainLocked(pool, index) && pool.state[index] === N2_STATE_TELEGRAPH
    if (this.slotGen[index] !== pool.generation[index]) return false
    if (type === E102_CODE) return pool.state[index] === N2_STATE_TELEGRAPH
    if (type === E100_CODE) return this.mochiPhase[index] === 1
    return false
  }

  /** 선 안에서만 움직이는 이동 중(이번 프레임 도착점이 선 밖이면 이동을 버리고 멈춘다): E92 돌진, E102 활주·표류. */
  isLineCharging(pool, index) {
    const type = pool.type[index]
    if (type === E92_CODE) return this.isTrainLocked(pool, index) && pool.state[index] === N2_STATE_ATTACK
    if (type === E102_CODE) return this.slotGen[index] === pool.generation[index] && this.chairKey[index] !== null
      && (pool.state[index] === N2_STATE_ATTACK || pool.state[index] === N2_STATE_RECOVER)
    return false
  }

  lineChargeKeepsLine(pool, index, x, z) {
    return pool.type[index] === E102_CODE ? this.chairKeepsLine(pool, index, x, z) : this.trainChargeKeepsLine(pool, index, x, z)
  }

  cancelLineCharge(pool, index) {
    if (pool.type[index] === E102_CODE) this.cancelChairGlide(pool, index)
    else this.cancelTrainCharge(pool, index)
  }

  /**
   * 넉백으로 행동 걸음을 건너뛴 프레임에도 몸 접촉 피해를 끄는 상태(예고 중 피해 0 불변식).
   * E100: 웅크림·도약·매달림·빗나감·떨어짐 전부(피해는 매달리는 순간 1회뿐). E102: 회전 예고.
   * E106: 말 위의 기수(공격은 모자 뺏기뿐), 모자 뺏기 예고·판정 중인 편대 전체, 휘청·낙마 기절.
   */
  forcesNoContact(pool, index) {
    const type = pool.type[index]
    if (type !== E100_CODE && type !== E102_CODE && type !== E106_CODE) return false
    if (this.slotGen[index] !== pool.generation[index]) return false
    const state = pool.state[index]
    if (type === E100_CODE) return this.mochiPhase[index] !== 0
    if (type === E102_CODE) return state === N2_STATE_TELEGRAPH
    if (state === N2_STATE_TELEGRAPH || state === N2_STATE_ATTACK || state === N2_STATE_STUN) return true
    return this.cavRole[index] === 1 && !this.cavSolo[index]
  }

  /** 무리 밀어내기를 받지 않는 상태: E100 도약(그려진 선 위)·매달림(로사리 등의 정해진 자리 — 그린 몸 = 맞는 몸). */
  ignoresCrowd(pool, index) {
    return pool.type[index] === E100_CODE && this.slotGen[index] === pool.generation[index]
      && (this.mochiPhase[index] === 2 || this.mochiPhase[index] === 3)
  }

  // ── E100 찹쌀떡 ───────────────────────────────────────────────────────────────
  /** 지금 매달린 떡 수에 따른 플레이어 이동 배율(1 · 0.75 · 0.6). 필드(Enemies.jsx)가 매 스텝 플레이어 감속으로 건다. */
  playerSlowMul() {
    return this.clingSlowMul
  }

  clingerCount() {
    return this.clingers.length / 2
  }

  // 머리말: 매달린 떡의 시간·떨쳐낸 거리를 쌓고 조건이 되면 떨어뜨린다. 죽은 떡도 목록에서 빼며 면역을 건다.
  _stepClings(pool, playerX, playerZ, deltaMs) {
    const M = E100_MOCHI
    let move = 0
    if (Number.isFinite(this.lastPlayerX + this.lastPlayerZ) && Number.isFinite(playerX + playerZ)) {
      move = Math.min(M.maxStepMove, Math.hypot(playerX - this.lastPlayerX, playerZ - this.lastPlayerZ))
    }
    this.lastPlayerX = playerX
    this.lastPlayerZ = playerZ
    const late = this.elapsedSec >= M.noClingAfterSec
    const list = this.clingers
    for (let i = list.length - 2; i >= 0; i -= 2) {
      const index = list[i]
      const generation = list[i + 1]
      if (!slotAlive(pool, index, generation) || pool.type[index] !== E100_CODE || this.slotGen[index] !== generation || this.mochiPhase[index] !== 3) {
        // 처치(또는 퇴장)로 떨어졌다 — 대응 성공. 새 매달림 면역을 건다.
        list.splice(i, 2)
        this.clingImmuneUntil = Math.max(this.clingImmuneUntil, this.clockMs + M.playerImmuneMs)
        continue
      }
      this.clingMs[index] += deltaMs
      this.clingMoved[index] += move
      if (late || this.clingMoved[index] >= M.shakeOffDistance || this.clingMs[index] >= M.maxClingMs) {
        list.splice(i, 2)
        this._dropMochi(pool, index)
        continue
      }
      // 등 뒤 자리가 로사리 몸 방향을 따라 돈다(초당 720°까지).
      let diff = this._clingTargetYaw(this.clingSide[index]) - this.clingAngle[index]
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      const maxTurn = M.clingTurnRateRad * deltaMs / 1000
      this.clingAngle[index] += Math.max(-maxTurn, Math.min(maxTurn, diff))
      this._setClingOffset(index)
    }
    const count = list.length / 2
    this.clingSlowMul = count <= 0 ? 1 : count === 1 ? M.slowOne : M.slowTwo
  }

  // 로사리 몸 방향: 필드가 넣어 준 값(playerFacingX/Z) → 없으면 이번 스텝 이동 방향 → 그대로.
  _updatePlayerFacing(context) {
    const fx = context.playerFacingX
    const fz = context.playerFacingZ
    const fl = Math.hypot(fx, fz)
    if (Number.isFinite(fl) && fl > 1e-6) { this.facingX = fx / fl; this.facingZ = fz / fl; return }
    if (!Number.isFinite(this.lastPlayerX + this.lastPlayerZ)) return
    const mx = context.playerX - this.lastPlayerX
    const mz = context.playerZ - this.lastPlayerZ
    const ml = Math.hypot(mx, mz)
    if (Number.isFinite(ml) && ml > 1e-4) { this.facingX = mx / ml; this.facingZ = mz / ml }
  }

  /** 매달린 자리 방향(yaw, 플레이어 → 떡): 등(−facing)에서 왼쪽(side +1) 또는 오른쪽(−1)으로 0.6rad. 왼쪽 = facing을 y축으로 +90° 돌린 (fz, −fx). */
  _clingTargetYaw(side) {
    const a = E100_MOCHI.clingBackAngleRad
    const fx = this.facingX
    const fz = this.facingZ
    const dx = -fx * Math.cos(a) + fz * Math.sin(a) * side
    const dz = -fz * Math.cos(a) - fx * Math.sin(a) * side
    return Math.atan2(dx, dz)
  }

  _setClingOffset(index) {
    this.clingOffX[index] = Math.sin(this.clingAngle[index]) * E100_MOCHI.attachOffset
    this.clingOffZ[index] = Math.cos(this.clingAngle[index]) * E100_MOCHI.attachOffset
  }

  _dropMochi(pool, index) {
    const M = E100_MOCHI
    this.mochiPhase[index] = 5
    pool.state[index] = N2_STATE_STUN
    pool.stateTimer[index] = M.dropStunMs
    pool.attackCooldown[index] = Math.max(pool.attackCooldown[index], M.reclingCooldownMs)
    this.clingImmuneUntil = Math.max(this.clingImmuneUntil, this.clockMs + M.playerImmuneMs)
  }

  _mochiLineKey(pool, index) {
    return `${MOCHI_KEY_PREFIX}${index}:${pool.generation[index]}`
  }

  _stepE100(pool, index, a, out) {
    const M = E100_MOCHI
    out.preserveFacing = true
    let phase = this.mochiPhase[index]
    if (phase === 3) {
      // 매달림: 플레이어 등 뒤 자리에 붙어 다닌다(몸 접촉 0 — 피해는 매달리는 순간 1회였다). 맞으면 정상적으로 맞는다.
      out.noContact = true
      pool.state[index] = N2_STATE_ATTACK
      const dx = a.playerX + this.clingOffX[index] - a.posX
      const dz = a.playerZ + this.clingOffZ[index] - a.posZ
      const dist = Math.hypot(dx, dz)
      if (dist > 1e-4) {
        const speed = Math.min(12, dist / Math.max(1e-6, a.deltaMs / 1000))
        out.velocityX = dx / dist * speed
        out.velocityZ = dz / dist * speed
        out.moving = true
      }
      const fx = a.playerX - a.posX
      const fz = a.playerZ - a.posZ
      if (Math.hypot(fx, fz) > 1e-6) { out.hasYaw = true; out.yaw = Math.atan2(fx, fz) }
      return out
    }
    if (phase === 5 || phase === 4) {
      // 떨어짐(1초) · 빗나감(0.8초): 바닥에 퍼져 있다. 접촉 0, 처치 기회.
      out.noContact = true
      pool.state[index] = phase === 5 ? N2_STATE_STUN : N2_STATE_RECOVER
      if (pool.stateTimer[index] > 0) return out
      this.mochiPhase[index] = 0
      phase = 0
    }
    const key = this._mochiLineKey(pool, index)
    if (phase === 1) {
      // 웅크림(예고): 제자리, 피해 0. 착지점·선은 예고 시작에 고정.
      out.noContact = true
      pool.state[index] = N2_STATE_TELEGRAPH
      this._advanceOwnedSnapshot(key, a.deltaMs)
      if (pool.stateTimer[index] > 0 && expansionAttackSnapshots.has(key)) return out
      if (!expansionAttackSnapshots.has(key)) {
        // 예고가 지워졌다(판 리셋 등) — 도약하지 않는다.
        this.mochiPhase[index] = 0
        pool.state[index] = N2_STATE_APPROACH
        return out
      }
      this.mochiPhase[index] = 2
      phase = 2
      pool.state[index] = N2_STATE_ATTACK
      const dist = Math.hypot(this.leapX[index] - a.posX, this.leapZ[index] - a.posZ)
      pool.stateTimer[index] = dist / M.leapSpeed * 1000 + 50
    }
    if (phase === 2) {
      // 도약: 고정된 착지점으로 3u/s. 몸 접촉 0.
      out.noContact = true
      pool.state[index] = N2_STATE_ATTACK
      this._advanceOwnedSnapshot(key, a.deltaMs)
      const dx = this.leapX[index] - a.posX
      const dz = this.leapZ[index] - a.posZ
      const dist = Math.hypot(dx, dz)
      const dt = Math.max(1e-6, a.deltaMs / 1000)
      if (dist > 0.02 && pool.stateTimer[index] > 0) {
        const speed = Math.min(M.leapSpeed, dist / dt)
        out.velocityX = dx / dist * speed
        out.velocityZ = dz / dist * speed
        out.moving = true
        out.hasYaw = true
        out.yaw = Math.atan2(dx, dz)
        // 이번 프레임에 닿으면 착지 판정은 다음 프레임(도착한 자리에서) 한다.
        return out
      }
      this._landMochi(pool, index, a, key)
      return out
    }
    pool.state[index] = N2_STATE_APPROACH
    out.preserveFacing = false
    const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= M.firstDelayMs && a.distance <= M.triggerDistance
      && a.distance > 1e-6 && this.elapsedSec < M.noClingAfterSec && expansionChannelFree()
    if (ready) {
      const snapshot = this._buildCertifiedSnapshot(key, 'E100', 'e100_leap', 'line', a.posX, a.posZ, a.nx, a.nz,
        M.lineLength, M.lineWidth, M.telegraphMs, Math.ceil(M.triggerDistance / M.leapSpeed * 1000) + 100, 0, 0)
      if (snapshot) {
        snapshot.contactAttack = true // 피해는 스냅샷이 아니라 매달림 판정 — 빨간 선
        this._addSnapshot(snapshot, pool, index)
        this.mochiKey[index] = key
        this.leapX[index] = a.playerX
        this.leapZ[index] = a.playerZ
        this.chargeOriginX[index] = a.posX
        this.chargeOriginZ[index] = a.posZ
        pool.runDirX[index] = a.nx
        pool.runDirZ[index] = a.nz
        this.mochiPhase[index] = 1
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = M.telegraphMs
        pool.attackCooldown[index] = M.cooldownMs
        out.noContact = true
        out.preserveFacing = true
        out.hasYaw = true
        out.yaw = Math.atan2(a.nx, a.nz)
        this.laneFails[index] = 0
        return out
      }
      this._laneFailed(pool, index)
    }
    return this._chase(a, out, a.speed)
  }

  // 착지: 착지점 0.45u 안 + 그려진 선 안 + 매달린 떡 2기 미만 + 면역 아님 + 마틸다 경고 전이면 매달린다(물기 6 한 번).
  _landMochi(pool, index, a, key) {
    const M = E100_MOCHI
    const snapshot = expansionAttackSnapshots.get(key)
    const px = a.playerX
    const pz = a.playerZ
    const near = Math.hypot(px - a.posX, pz - a.posZ) <= M.clingReach
    const drawn = snapshot ? expansionAttackContains(snapshot, px, pz, 0) : false
    this._removeSnapshot(key)
    this.mochiKey[index] = null
    const ok = near && drawn && this.clingerCount() < M.maxClingers && this.clockMs >= this.clingImmuneUntil && this.elapsedSec < M.noClingAfterSec
    if (!ok) {
      this.mochiPhase[index] = 4
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = M.missRecoverMs
      return false
    }
    this.mochiPhase[index] = 3
    pool.state[index] = N2_STATE_ATTACK
    this.clingMs[index] = 0
    this.clingMoved[index] = 0
    // 등 뒤 자리(로사리 몸 방향 기준): 첫 떡 왼등(+1), 둘째 떡 오른등(−1). 남은 떡이 왼등이면 새 떡은 오른등.
    let leftTaken = false
    for (let k = 0; k < this.clingers.length; k += 2) if (this.clingSide[this.clingers[k]] === 1) leftTaken = true
    this.clingSide[index] = leftTaken ? -1 : 1
    this.clingAngle[index] = this._clingTargetYaw(this.clingSide[index])
    this._setClingOffset(index)
    this.clingers.push(index, pool.generation[index])
    this.clingSlowMul = this.clingerCount() === 1 ? M.slowOne : M.slowTwo
    if (this._onDamage) this._onDamage(M.latchDamage, a.posX, a.posZ)
    return true
  }

  /** 비주얼용 떡 상태: phase(0 추격·1 웅크림·2 도약·3 매달림·4 빗나감·5 떨어짐), clinging, progress(떨쳐내기 0~1 = 거리·시간 중 큰 쪽),
   *  offsetX·offsetZ(매달린 자리 = 플레이어 + 이 값 — 로사리 몸 방향 기준 왼등/오른등 0.3u, 판정 몸이 서는 바로 그 자리),
   *  side(+1 왼등 / −1 오른등, 매달리지 않았으면 0), leapX·leapZ(도약 착지점). */
  mochiStateInto(pool, index, out) {
    const valid = index >= 0 && index < this.capacity && pool.type[index] === E100_CODE && this.slotGen[index] === pool.generation[index]
    const phase = valid ? this.mochiPhase[index] : 0
    out.phase = phase
    out.clinging = phase === 3
    out.progress = phase === 3 ? Math.min(1, Math.max(this.clingMoved[index] / E100_MOCHI.shakeOffDistance, this.clingMs[index] / E100_MOCHI.maxClingMs)) : 0
    out.offsetX = valid ? this.clingOffX[index] : 0
    out.offsetZ = valid ? this.clingOffZ[index] : 0
    out.side = phase === 3 ? this.clingSide[index] : 0
    out.laneBlocked = valid && this.laneBlocked(pool, index)
    out.leapX = valid ? this.leapX[index] : 0
    out.leapZ = valid ? this.leapZ[index] : 0
    return out
  }

  // ── E102 회전의자 ─────────────────────────────────────────────────────────────
  _chairLineKey(pool, index) {
    return `${CHAIR_KEY_PREFIX}${index}:${pool.generation[index]}`
  }

  _chairLimits() {
    const C = E102_CHAIR
    return { lateral: C.lineWidth / 2 - E102_CONTACT, along: C.lineLength - E102_CONTACT }
  }

  /** 의자의 이번 프레임 도착점이 그려진 선 안인가(옆 ≤ 반폭 − 접촉, 앞 ≤ 길이 − 접촉, 뒤로 물러나지 않음, 그려진 다각형 안). */
  chairKeepsLine(pool, index, x, z) {
    const C = E102_CHAIR
    const dirX = pool.runDirX[index]
    const dirZ = pool.runDirZ[index]
    const relX = x - this.chargeOriginX[index]
    const relZ = z - this.chargeOriginZ[index]
    const along = relX * dirX + relZ * dirZ
    const lateral = relX * -dirZ + relZ * dirX
    if (!(Math.abs(lateral) <= C.lineWidth / 2 - E102_CONTACT + 1e-4 && along <= C.lineLength - E102_CONTACT + 1e-4 && along >= -0.01)) return false
    const key = this.chairKey[index]
    const snapshot = key ? expansionAttackSnapshots.get(key) : null
    return !snapshot || expansionAttackContains(snapshot, x, z, 0)
  }

  /** 활주·표류 취소(막혔거나 선을 벗어나려 했다): 선을 지우고 그 자리에서 멈춘다(순간이동 없음). */
  cancelChairGlide(pool, index) {
    const key = this.chairKey[index]
    if (key) this._removeSnapshot(key)
    this.chairKey[index] = null
    this.glideSpeed[index] = 0
    pool.state[index] = N2_STATE_RECOVER
    pool.stateTimer[index] = 500
    pool.attackCooldown[index] = Math.max(pool.attackCooldown[index], E102_CHAIR.cooldownMs)
  }

  _stepE102(pool, index, a, out) {
    const C = E102_CHAIR
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_ATTACK && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    const key = this.chairKey[index]
    const dirYaw = Math.atan2(pool.runDirX[index], pool.runDirZ[index])
    if (state === N2_STATE_TELEGRAPH) {
      // 제자리 회전(예고): 피해 0. 두 바퀴 돌고 고정된 방향을 보며 멈춘다.
      out.noContact = true
      out.preserveFacing = true
      if (!key || !expansionAttackSnapshots.has(key)) {
        this.chairKey[index] = null
        pool.state[index] = N2_STATE_APPROACH
        return out
      }
      this._advanceOwnedSnapshot(key, a.deltaMs)
      out.hasYaw = true
      out.yaw = dirYaw + Math.max(0, pool.stateTimer[index]) / C.telegraphMs * Math.PI * 4
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_ATTACK
      pool.stateTimer[index] = C.glideMs
      this.glideSpeed[index] = 0
      this.glideHeading[index] = dirYaw
      state = N2_STATE_ATTACK
    }
    if ((state === N2_STATE_ATTACK || state === N2_STATE_RECOVER) && key) {
      out.preserveFacing = true
      if (!expansionAttackSnapshots.has(key)) { this.cancelChairGlide(pool, index); return out }
      this._advanceOwnedSnapshot(key, a.deltaMs)
      const dt = Math.max(1e-6, a.deltaMs / 1000)
      const lim = this._chairLimits()
      const dirX = pool.runDirX[index]
      const dirZ = pool.runDirZ[index]
      const relX = a.posX - this.chargeOriginX[index]
      const relZ = a.posZ - this.chargeOriginZ[index]
      const along = relX * dirX + relZ * dirZ
      const lateral = relX * -dirZ + relZ * dirX
      // 밀려서 선 밖에 있으면(넉백은 막지만 다른 경로 대비) 끌어오지 않고 그 자리에서 멈춘다.
      if (Math.abs(lateral) > lim.lateral + 1e-3 || along < -0.02) { this.cancelChairGlide(pool, index); return out }
      let speed
      if (state === N2_STATE_ATTACK) {
        if (pool.stateTimer[index] <= 0) {
          // 활주 끝 → 표류: 방향 전환 없이 1.0초 동안 0까지 감속.
          pool.state[index] = N2_STATE_RECOVER
          pool.stateTimer[index] = C.driftMs
          this.driftStartSpeed[index] = this.glideSpeed[index]
          state = N2_STATE_RECOVER
          speed = this.glideSpeed[index]
        } else {
          speed = Math.min(C.maxSpeed, this.glideSpeed[index] + C.accel * dt)
          // 플레이어 쪽으로 초당 25°까지만 꺾는다(관성).
          if (a.distance > 1e-6) {
            let diff = Math.atan2(a.nx, a.nz) - this.glideHeading[index]
            while (diff > Math.PI) diff -= Math.PI * 2
            while (diff < -Math.PI) diff += Math.PI * 2
            const maxTurn = C.turnRateRad * dt
            this.glideHeading[index] += Math.max(-maxTurn, Math.min(maxTurn, diff))
          }
        }
      }
      if (state === N2_STATE_RECOVER) {
        if (pool.stateTimer[index] <= 0) {
          // 표류 끝: 선을 지우고 쉰다.
          this._removeSnapshot(key)
          this.chairKey[index] = null
          this.glideSpeed[index] = 0
          pool.state[index] = N2_STATE_APPROACH
          pool.attackCooldown[index] = Math.max(pool.attackCooldown[index], C.cooldownMs)
          return out
        }
        speed = this.driftStartSpeed[index] * pool.stateTimer[index] / C.driftMs
      }
      this.glideSpeed[index] = speed
      const hx = state === N2_STATE_ATTACK ? Math.sin(this.glideHeading[index]) : (this.glideDirX[index] || dirX)
      const hz = state === N2_STATE_ATTACK ? Math.cos(this.glideHeading[index]) : (this.glideDirZ[index] || dirZ)
      // 다음 자리를 선 띠 안으로 자른다: 옆은 ±(반폭 − 접촉), 앞은 길이 − 접촉. 뒤로는 가지 않는다.
      let nextAlong = along + (hx * dirX + hz * dirZ) * speed * dt
      let nextLat = lateral + (hx * -dirZ + hz * dirX) * speed * dt
      nextLat = Math.max(-lim.lateral, Math.min(lim.lateral, nextLat))
      nextAlong = Math.max(along, Math.min(lim.along, nextAlong))
      const nx = this.chargeOriginX[index] + dirX * nextAlong - dirZ * nextLat
      const nz = this.chargeOriginZ[index] + dirZ * nextAlong + dirX * nextLat
      const vx = (nx - a.posX) / dt
      const vz = (nz - a.posZ) / dt
      const v = Math.hypot(vx, vz)
      if (v > 1e-4) {
        out.velocityX = vx
        out.velocityZ = vz
        out.moving = true
        out.hasYaw = true
        out.yaw = Math.atan2(vx, vz)
        this.glideDirX[index] = vx / v
        this.glideDirZ[index] = vz / v
      } else if (nextAlong >= lim.along - 1e-6) {
        this.glideSpeed[index] = 0 // 선 끝에 닿았다
      }
      return out
    }
    if (state === N2_STATE_RECOVER) {
      // 취소 뒤 쉼(선 없음).
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
    }
    pool.state[index] = N2_STATE_APPROACH
    this.glideSpeed[index] = 0
    const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= C.firstDelayMs && a.distance <= C.triggerDistance
      && a.distance > 1e-6 && expansionChannelFree()
    if (ready) {
      const lineKey = this._chairLineKey(pool, index)
      const snapshot = this._buildCertifiedSnapshot(lineKey, 'E102', 'e102_glide', 'line', a.posX, a.posZ, a.nx, a.nz,
        C.lineLength, C.lineWidth, C.telegraphMs, C.glideMs + C.driftMs, 0, 0)
      if (snapshot) {
        snapshot.contactAttack = true // 피해는 의자 몸 접촉 — 빨간 선
        this._addSnapshot(snapshot, pool, index)
        this.chairKey[index] = lineKey
        this.chargeOriginX[index] = a.posX
        this.chargeOriginZ[index] = a.posZ
        pool.runDirX[index] = a.nx
        pool.runDirZ[index] = a.nz
        this.glideDirX[index] = a.nx
        this.glideDirZ[index] = a.nz
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = C.telegraphMs
        out.noContact = true
        out.preserveFacing = true
        out.hasYaw = true
        out.yaw = Math.atan2(a.nx, a.nz) + Math.PI * 4
        this.laneFails[index] = 0
        return out
      }
      this._laneFailed(pool, index)
    }
    return this._chase(a, out, a.speed)
  }

  /** 비주얼용 의자 상태: phase(0 굴러옴·1 회전 예고·2 활주·3 표류), dirX·dirZ(활주 진행 방향), speed(u/s), spin(회전 예고 진행 0~1). */
  chairStateInto(pool, index, out) {
    const valid = index >= 0 && index < this.capacity && pool.type[index] === E102_CODE && this.slotGen[index] === pool.generation[index]
    const state = valid ? pool.state[index] : 0
    const gliding = valid && this.chairKey[index] !== null
    out.phase = !valid ? 0 : state === N2_STATE_TELEGRAPH ? 1 : gliding && state === N2_STATE_ATTACK ? 2 : gliding && state === N2_STATE_RECOVER ? 3 : 0
    out.dirX = valid ? this.glideDirX[index] : 0
    out.dirZ = valid ? this.glideDirZ[index] : 0
    out.speed = valid && gliding ? this.glideSpeed[index] : 0
    out.spin = out.phase === 1 ? Math.min(1, Math.max(0, 1 - pool.stateTimer[index] / E102_CHAIR.telegraphMs)) : 0
    out.laneBlocked = valid && this.laneBlocked(pool, index)
    return out
  }

  // ── E106 기마전 ───────────────────────────────────────────────────────────────
  // 머리말: 아직 편대가 없는 E106 몸을 넷씩 묶는다. 넷이 안 되면 가장 낮은 슬롯이 1.5초 기다린 뒤 있는 몸끼리 묶는다.
  _linkCavalry(pool, highest) {
    const V = E106_CAVALRY
    let free = null
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1 || pool.type[index] !== E106_CODE || this.cavLinked[index] || this.slotGen[index] !== pool.generation[index]) continue
      free ??= (this._cavFree ??= [])
      free.push(index)
    }
    if (!free) return
    while (free.length > 0) {
      const first = free[0]
      if (free.length < V.bodies && pool.spawnTimer[first] < V.linkGraceMs) break
      // 첫 몸 + 가장 가까운 몸 셋(있는 만큼).
      const group = this._cavGroup ??= []
      group.length = 0
      group.push(first)
      const rest = free.slice(1).sort((p, q) => Math.hypot(pool.posX[p] - pool.posX[first], pool.posZ[p] - pool.posZ[first])
        - Math.hypot(pool.posX[q] - pool.posX[first], pool.posZ[q] - pool.posZ[first]))
      for (let k = 0; k < rest.length && group.length < V.bodies; k += 1) group.push(rest[k])
      group.sort((p, q) => p - q)
      for (const member of group) free.splice(free.indexOf(member), 1)
      this._formCavalry(pool, group)
    }
    free.length = 0
  }

  _formCavalry(pool, group) {
    const V = E106_CAVALRY
    const rider = group[0]
    if (group.length === 1) {
      // 혼자 나왔다(동시 상한): E19처럼 추격하는 말.
      this.cavLinked[rider] = 1
      this.cavRole[rider] = 2
      this.cavSolo[rider] = 1
      return
    }
    const fresh = group.every((member) => pool.spawnTimer[member] < CAVALRY_SNAP_MAX_SPAWN_MS)
    let fx = this.playerX - pool.posX[rider]
    let fz = this.playerZ - pool.posZ[rider]
    const fl = Math.hypot(fx, fz)
    if (fl > 1e-6) { fx /= fl; fz /= fl } else { fx = 0; fz = 1 }
    const heading = Math.atan2(fx, fz)
    this.cavLinked[rider] = 1
    this.cavRole[rider] = 1
    this.cavSlot[rider] = -1
    this.cavRider[rider] = rider
    this.cavRiderGen[rider] = pool.generation[rider]
    this.cavHeading[rider] = heading
    const limitX = (this.halfX > 0 ? this.halfX : 12) - V.edgeMargin
    const limitZ = (this.halfZ > 0 ? this.halfZ : 20) - V.edgeMargin
    for (let k = 1; k < group.length; k += 1) {
      const horse = group[k]
      const slot = k - 1
      this.cavLinked[horse] = 1
      this.cavRole[horse] = 2
      this.cavSlot[horse] = slot
      this.cavRider[horse] = rider
      this.cavRiderGen[horse] = pool.generation[rider]
      this.cavHorse[rider * 3 + slot] = horse
      this.cavHorseGen[rider * 3 + slot] = pool.generation[horse]
      if (fresh) {
        // 막 나온 몸끼리면 자리로 바로 모은다(아직 등장 연출 중 — 흩어진 채 걸어 모이지 않게).
        const [side, ahead] = V.slots[slot]
        pool.posX[horse] = Math.max(-limitX, Math.min(limitX, pool.posX[rider] + fz * side + fx * ahead))
        pool.posZ[horse] = Math.max(-limitZ, Math.min(limitZ, pool.posZ[rider] - fx * side + fz * ahead))
        pool.yaw[horse] = heading
      }
    }
    if (fresh) {
      pool.yaw[rider] = heading
      pool.markSpatialChanged?.()
    }
  }

  _cavHorsesAlive(pool, rider) {
    let count = 0
    for (let slot = 0; slot < 3; slot += 1) {
      const horse = this.cavHorse[rider * 3 + slot]
      if (horse >= 0 && slotAlive(pool, horse, this.cavHorseGen[rider * 3 + slot]) && pool.type[horse] === E106_CODE) count += 1
    }
    return count
  }

  _cavHatKey(pool, rider) {
    return `${HAT_KEY_PREFIX}${rider}:${pool.generation[rider]}`
  }

  _stepE106(pool, index, a, out) {
    const V = E106_CAVALRY
    const role = this.cavRole[index]
    if (role === 0) {
      // 편대를 기다리는 중(최대 1.5초): 천천히 다가온다.
      pool.state[index] = N2_STATE_APPROACH
      return this._chase(a, out, V.formSpeed)
    }
    if (this.cavSolo[index]) {
      // 흩어진 말(0.8초 휘청 뒤 0.6u/s) · 낙마한 기수(1초 뒤 1.2u/s). 일반 몸 접촉 10.
      if (pool.state[index] === N2_STATE_STUN) {
        out.noContact = true
        out.preserveFacing = true
        if (pool.stateTimer[index] > 0) return out
      }
      pool.state[index] = N2_STATE_APPROACH
      return this._chase(a, out, role === 1 ? V.riderSoloSpeed : V.horseSoloSpeed)
    }
    if (role === 2) return this._stepCavalryHorse(pool, index, a, out)
    return this._stepCavalryRider(pool, index, a, out)
  }

  _stepCavalryRider(pool, index, a, out) {
    const V = E106_CAVALRY
    out.noContact = true // 말 위의 기수는 몸 접촉이 없다(공격은 모자 뺏기뿐)
    if (this._cavHorsesAlive(pool, index) === 0) {
      // 말 셋이 다 쓰러졌다: 낙마.
      this.cavSolo[index] = 1
      this._removeOwnedAttacks(index)
      pool.state[index] = N2_STATE_STUN
      pool.stateTimer[index] = V.dismountStunMs
      out.preserveFacing = true
      return out
    }
    let state = pool.state[index]
    if (state !== N2_STATE_TELEGRAPH && state !== N2_STATE_ATTACK && state !== N2_STATE_RECOVER) state = N2_STATE_APPROACH
    if (state === N2_STATE_TELEGRAPH) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_ATTACK
      pool.stateTimer[index] = V.activeMs
      return out
    }
    if (state === N2_STATE_ATTACK) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_RECOVER
      pool.stateTimer[index] = V.recoverMs
      return out
    }
    if (state === N2_STATE_RECOVER) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
    }
    pool.state[index] = N2_STATE_APPROACH
    // 편대 방향은 초당 90°까지만 돈다.
    let heading = this.cavHeading[index]
    if (a.distance > 1e-6) {
      let diff = Math.atan2(a.nx, a.nz) - heading
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      const maxTurn = V.turnRateRad * a.deltaMs / 1000
      heading += Math.max(-maxTurn, Math.min(maxTurn, diff))
      this.cavHeading[index] = heading
    }
    const ready = pool.attackCooldown[index] <= 0 && pool.spawnTimer[index] >= V.firstDelayMs && a.distance <= V.triggerDistance
      && a.distance > 1e-6 && expansionChannelFree()
    if (ready) {
      const snapshot = this._buildCertifiedSnapshot(`${this._cavHatKey(pool, index)}:${++this.seq}`, 'E106', 'e106_hat', 'sector',
        a.posX, a.posZ, a.nx, a.nz, V.coneRadius, 0, V.telegraphMs, V.activeMs, 0, V.damage, V.coneAngleDeg)
      if (snapshot) {
        this._addAttack(snapshot, pool, index)
        pool.runDirX[index] = a.nx
        pool.runDirZ[index] = a.nz
        pool.state[index] = N2_STATE_TELEGRAPH
        pool.stateTimer[index] = V.telegraphMs
        pool.attackCooldown[index] = V.cooldownMs
        out.preserveFacing = true
        out.hasYaw = true
        out.yaw = Math.atan2(a.nx, a.nz)
        this.laneFails[index] = 0
        return out
      }
      this._laneFailed(pool, index)
    }
    out.velocityX = Math.sin(heading) * V.formSpeed
    out.velocityZ = Math.cos(heading) * V.formSpeed
    out.moving = true
    out.preserveFacing = true
    out.hasYaw = true
    out.yaw = heading
    return out
  }

  _stepCavalryHorse(pool, index, a, out) {
    const V = E106_CAVALRY
    out.preserveFacing = true
    const rider = this.cavRider[index]
    if (rider < 0 || !slotAlive(pool, rider, this.cavRiderGen[index]) || pool.type[rider] !== E106_CODE) {
      // 기수가 쓰러졌다: 휘청였다가 흩어진다.
      this.cavSolo[index] = 1
      pool.state[index] = N2_STATE_STUN
      pool.stateTimer[index] = V.scatterStunMs
      out.noContact = true
      return out
    }
    const riderState = pool.state[rider]
    if (!this.cavSolo[rider] && (riderState === N2_STATE_TELEGRAPH || riderState === N2_STATE_ATTACK || riderState === N2_STATE_RECOVER)) {
      // 모자 뺏기 동안 편대 전체가 멈춘다(예고·판정 중 몸 접촉 0).
      pool.state[index] = riderState
      if (riderState !== N2_STATE_RECOVER) out.noContact = true
      out.hasYaw = true
      out.yaw = this.cavHeading[rider]
      return out
    }
    pool.state[index] = N2_STATE_APPROACH
    const heading = this.cavHeading[rider]
    const fx = Math.sin(heading)
    const fz = Math.cos(heading)
    const [side, ahead] = V.slots[Math.max(0, this.cavSlot[index])]
    const tx = pool.posX[rider] + fz * side + fx * ahead
    const tz = pool.posZ[rider] - fx * side + fz * ahead
    const dx = tx - a.posX
    const dz = tz - a.posZ
    const dist = Math.hypot(dx, dz)
    out.hasYaw = true
    out.yaw = heading
    if (dist < 1e-4) return out
    const speed = Math.min(V.horseCatchUpSpeed, dist / Math.max(1e-6, a.deltaMs / 1000))
    out.velocityX = dx / dist * speed
    out.velocityZ = dz / dist * speed
    out.moving = true
    return out
  }

  /** 비주얼용 기마전 상태: role(0 없음·1 기수·2 말), slot(말 자리 0 앞·1 왼뒤·2 오른뒤, 기수 −1), rider(기수 슬롯, 없으면 −1),
   *  mounted(기수가 말 위), scattered(흩어진 말·낙마한 기수), heading(편대 진행 방향 yaw). */
  cavalryStateInto(pool, index, out) {
    const valid = index >= 0 && index < this.capacity && pool.type[index] === E106_CODE && this.slotGen[index] === pool.generation[index]
    const role = valid ? this.cavRole[index] : 0
    const rider = valid ? this.cavRider[index] : -1
    const riderAlive = rider >= 0 && slotAlive(pool, rider, this.cavRiderGen[index])
    out.role = role
    out.slot = valid && role === 2 ? this.cavSlot[index] : -1
    out.rider = riderAlive ? rider : -1
    out.mounted = role === 1 && !this.cavSolo[index]
    out.scattered = valid && this.cavSolo[index] === 1
    out.heading = riderAlive ? this.cavHeading[rider] : (valid ? pool.yaw[index] : 0)
    out.laneBlocked = riderAlive && this.laneBlocked(pool, rider)
    return out
  }

  // ── E105 ─────────────────────────────────────────────────────────────────────
  _stepE105(pool, index, a, out) {
    const P = E105_PAIR
    const partner = this.partner[index]
    const partnerAlive = partner >= 0 && slotAlive(pool, partner, this.partnerGen[index])
    if (this.wasPaired[index] && !partnerAlive && !this.solo[index]) {
      // 짝을 잃은 첫 프레임: 넘어진다(기절 2초) → 이후 혼자 느리게.
      this.solo[index] = 1
      this.partner[index] = -1
      pool.state[index] = N2_STATE_STUN
      pool.stateTimer[index] = P.tripMs
    }
    if (pool.state[index] === N2_STATE_STUN) {
      out.preserveFacing = true
      if (pool.stateTimer[index] > 0) return out
      pool.state[index] = N2_STATE_APPROACH
    }
    pool.state[index] = N2_STATE_APPROACH
    if (!partnerAlive) return this._chase(a, out, P.soloSpeed)
    const ox = pool.posX[partner]
    const oz = pool.posZ[partner]
    const pdx = ox - a.posX
    const pdz = oz - a.posZ
    const pdist = Math.hypot(pdx, pdz)
    if (pdist > P.regroupDistance) {
      // 흩어진 채 스폰됐으면 먼저 짝에게 간다.
      out.velocityX = pdx / pdist * a.speed
      out.velocityZ = pdz / pdist * a.speed
      out.moving = true
      return out
    }
    // 하나-둘: 0.4초 걷고 0.2초 멈춘다(두 몸이 같은 시계).
    const cycle = this.clockMs % (P.walkMs + P.pauseMs)
    if (cycle >= P.walkMs) return out
    const cx = (a.posX + ox) * 0.5
    const cz = (a.posZ + oz) * 0.5
    const hx = a.playerX - cx
    const hz = a.playerZ - cz
    const hl = Math.hypot(hx, hz) || 1
    const ux = hx / hl
    const uz = hz / hl
    // 진행 방향의 옆으로 0.3u씩 갈라 선다(낮은 슬롯이 왼쪽).
    const side = index < partner ? -1 : 1
    const wantX = cx - uz * side * P.spacing * 0.5
    const wantZ = cz + ux * side * P.spacing * 0.5
    out.velocityX = ux * a.speed + (wantX - a.posX) * P.springGain
    out.velocityZ = uz * a.speed + (wantZ - a.posZ) * P.springGain
    out.moving = true
    out.hasYaw = true
    out.yaw = Math.atan2(ux, uz)
    return out
  }
}

/** 피해 0 예고 스냅샷(시각 전용). 확장 텔레그래프 레이어가 노란 채움으로 그린다. 탈출 인증이 필요 없다(피해가 없다). */
export function makeZeroDamageSnapshot(key, type, patternId, shape, x, z, rangeUnits, widthUnits, windupMs, activeMs, recoveryMs) {
  return {
    id: patternId, patternId, type, key, attackId: key, sourceEntityId: key, shape,
    originXZ: [x, z], sourceXZ: [x, z], targetXZ: [x, z], directionXZ: [0, 1], yaw: 0,
    rangeUnits, widthUnits, windupMs, activeMs, recoveryMs, damage: 0, maxHitsPerTarget: 0,
    phase: 'windup', elapsedMs: 0, hit: false, novel2: true, zeroDamage: true,
  }
}

export function createNovel2Runtime(capacity) {
  return new Novel2Runtime(capacity)
}
