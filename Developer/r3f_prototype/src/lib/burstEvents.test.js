import { describe, it, expect } from 'vitest'
import {
  BURST_EVENTS,
  COIN_MONSTER_RUNTIME_EVENTS,
  STAGE2_BURST_EVENTS,
  STAGE3_BURST_EVENTS,
  STAGE4_BURST_EVENTS,
  STAGE5_BURST_EVENTS,
  STAGE5_BOSS_PHASE_REINFORCEMENT,
  STAGE5_CALL_LANE_FORMATION,
  STAGE5_CALL_LANE_REINFORCEMENT,
  STAGE3_25_SECOND_GREEN_SMILING_REINFORCEMENT_EVENTS,
  STAGE3_25_SECOND_REINFORCEMENT_START_SEC,
  STAGE3_25_SECOND_REINFORCEMENT_END_EXCLUSIVE_SEC,
  STAGE3_25_SECOND_REINFORCEMENT_INTERVAL_SEC,
  STAGE3_25_SECOND_REINFORCEMENT,
  STAGE3_BOSS_PHASE_REINFORCEMENT,
  isRepeatingBurstEvent,
  repeatingBurstTickAt,
  repeatingBurstTickCount,
  repeatingBurstSecAtTick,
  RUN_ZOMBIE_CREW_FORMATION,
  STAGE2_GUARD_CHASE_FORMATION,
  BOSS_BURST_TYPES,
  isBossType,
  getBurstEventsForStage,
  getRuntimeBurstEventsForStage,
  getRuntimeSpawnEventsForStage,
  getBossSpawnSec,
  getBossPhaseStatus,
  isBossPhase,
} from './burstEvents.js'
import { STAGE5_SPAWN_TELEGRAPHS } from './waveTimelines.js'
import { STAGE5_B10_SUMMON_FIXED_HP } from './stage5ViceBoss.js'
import { chiefBodyCount, isChiefType } from './stageChiefContent.js'
import { NOVEL2_ZOMBIE_STATS, isNovel2AbsoluteHp } from './novelZombie2Content.js'

const allStageBurstTables = [
  ['stage1', BURST_EVENTS],
  ['stage2', STAGE2_BURST_EVENTS],
  ['stage3', STAGE3_BURST_EVENTS],
  ['stage4', STAGE4_BURST_EVENTS],
  ['stage5', STAGE5_BURST_EVENTS],
]

const STAGE1_FIRST_WAVE_SEC = 5
// Track B 신규 12종(E34~E45, 2026-10-25)은 기존 E01/E03/E07/E02/E05 슬롯을 "대체"한 잡몹이라
// 일반 좀비 앵커 집합에 함께 들어가야 한다. 빠지면 전량 교체된 앵커(스1 72초)가 사라진 것처럼 보인다.
// 2026-11-04: 투사체 좀비 15종(E46~E60)도 같은 방식(host와 같은 hp의 맞교환)으로 들어간 잡몹이다.
// 2026-11-16: 2차 10종(E61~E70)도 host와 같은 hp의 맞교환 잡몹이다. 좀비 배치 총검토로 스1 72·168초 앵커가 E66 행만 남아
// 이 집합에 넣지 않으면 앵커가 사라진 것처럼 보인다.
const ORDINARY_ZOMBIE_TYPE_RE = /^E(?:0[1-7]|3[4-9]|4[0-9]|5[0-9]|6[0-9]|70|7[1-9]|8[0-8])$/
// 신규 12종의 base hp는 대체 대상(host)과 같은 값으로 못박혀 있다(Enemy.jsx NOVEL_ZOMBIE_STATS).
// 그래서 아래 모든 총 HP 단언의 기대값이 교체 전후로 변하지 않는다.
const NOVEL_BASE_HP = { E34: 8, E35: 10, E36: 8, E37: 8, E38: 10, E39: 16, E40: 70, E41: 10, E42: 70, E43: 70, E44: 16, E45: 10,
  // 투사체 좀비 15종 — host와 같은 base hp(lib/projectileZombieBehavior.js PROJECTILE_ZOMBIE_STATS).
  E46: 8, E47: 16, E48: 16, E49: 70, E50: 16, E51: 8, E52: 32, E53: 10, E54: 32, E55: 70, E56: 70, E57: 70, E58: 8, E59: 70, E60: 16,
  // 2차 10종(2026-11-07) — host와 같은 base hp.
  E61: 70, E62: 70, E63: 32, E64: 8, E65: 8, E66: 16, E67: 70, E68: 10, E69: 16, E70: 10,
  // 블록 좀비 18종(2026-11-14) — host와 같은 base hp.
  E71: 8, E72: 16, E73: 32, E74: 8, E75: 16, E76: 70, E77: 8, E78: 8, E79: 8, E80: 10, E81: 8, E82: 16, E83: 10, E84: 8, E85: 8, E86: 8, E87: 8, E88: 10,
  // 2026-11-14 2차 신규 일반 6종(E89~E106 세트) — host와 같은 base hp(lib/novelZombie2Content.js). E105(스6 절대 HP)는 이 표 밖이다.
  E93: 10, E94: 16, E96: 16, E97: 10, E99: 70, E103: 32,
  // 2026-11-15 2차 신규 2차분(wave 2) 일반 2종 — host와 같은 base hp. 치프 E92·E95는 순증이라 이 표 밖이다.
  E90: 16, E91: 8 }
const STAGE2_BASE_HP = { E01: 8, E02: 70, E03: 10, E04: 32, E05: 70, E06: 320, E07: 16, RZT: 140, RZG: 48, ...NOVEL_BASE_HP }
const STAGE2_HP_MULTIPLIER = 1.2

const ordinaryZombieEvents = (events) => events.filter((event) => ORDINARY_ZOMBIE_TYPE_RE.test(event.type))
const stageZombieEvents = (events) => events.filter((event) => !isBossType(event.type))
// 앵커 불변식 전용 필터. 반복 보강(repeatIntervalSec)은 정의상 앵커 밖에서도 발화하는 명시적 예외라
// 여기서만 제외하고, 그 대신 "반복 보강 규칙" describe가 따로 단언한다.
// 총 HP 단언에서는 절대 쓰지 않는다 — 총량은 반복 전개까지 포함한 전체를 세야 한다.
const singleShotEvents = (events) => events.filter((event) => !isRepeatingBurstEvent(event))
const uniqueSeconds = (events) => [...new Set(events.map((event) => event.sec))].sort((a, b) => a - b)
const payloadWithoutSec = (event) => Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'sec'))
const declaredCountByType = (events) => events.reduce((acc, event) => {
  acc[event.type] = (acc[event.type] ?? 0) + (event.count ?? 1)
  return acc
}, {})
const stage2HpMultipliedBurstHp = (events) => events.reduce((sum, event) => {
  if (event.formation === STAGE2_GUARD_CHASE_FORMATION) {
    return sum
      + Math.round(STAGE2_BASE_HP.RZT * STAGE2_HP_MULTIPLIER)
      + 6 * Math.round(STAGE2_BASE_HP.RZG * STAGE2_HP_MULTIPLIER)
  }
  const baseHp = STAGE2_BASE_HP[event.type]
  return sum + (event.count ?? 1) * Math.round(baseHp * STAGE2_HP_MULTIPLIER)
}, 0)

describe('coin monster runtime reward events', () => {
  it('spawns exactly one E08 at 90s and 180s in every stage without mutating static wave budgets', () => {
    expect(COIN_MONSTER_RUNTIME_EVENTS).toEqual([
      { sec: 90, type: 'E08', count: 1, rewardEvent: 'coinMonster' },
      { sec: 180, type: 'E08', count: 1, rewardEvent: 'coinMonster' },
    ])
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      expect(getRuntimeSpawnEventsForStage(stageId).filter((event) => event.type === 'E08')).toEqual(COIN_MONSTER_RUNTIME_EVENTS)
      expect(getBurstEventsForStage(stageId).some((event) => event.type === 'E08')).toBe(false)
    }
  })
})

describe('Stage 1 첫 웨이브 5초 게이트', () => {
  it('런타임 좀비 버스트는 첫 웨이브 전(sec < 5)에 나오지 않고 E01 18마리 버스트를 예약하지 않는다', () => {
    const stage1Runtime = getRuntimeBurstEventsForStage('stage1')
    const zombieEventsBeforeFirstWave = stage1Runtime.filter((event) => /^E\d+/.test(event.type) && event.sec < STAGE1_FIRST_WAVE_SEC)

    expect(zombieEventsBeforeFirstWave).toEqual([])
    expect(stage1Runtime).not.toContainEqual(expect.objectContaining({ type: 'E01', count: 18 }))
    expect(stage1Runtime[0]).toEqual({ sec: STAGE1_FIRST_WAVE_SEC, type: 'E01', count: 10 })
  })

  it('일반 좀비 고정 시간표가 승인된 Stage 1 스폰 순서와 1:1로 일치한다', () => {
    const schedule = getRuntimeBurstEventsForStage('stage1')
      .filter((event) => !isBossType(event.type))
      .map(({ sec, type, count }) => ({ sec, type, count }))

    expect(schedule).toEqual([
      { sec: 5, type: 'E01', count: 10 },
      // 2026-10-25 Track B: 24초 E01×9 → E01×5 + E34×4, 72초 E03×2 → E35×2. hp 동일 교체.
      // 2026-11-16 좀비 배치 총검토(Terry 승인, balanceqa 판정표): 24초 E01 5 → 3, 40초 E01 6 → 8(#9·#10),
      // E35 72 → 40초(#5), E36 108 → 60초(#6), E66 60 → 72초(#7), E77 108 → 120초(#8), E02×3 108 → 120초(#11),
      // E06 168 → 184초(#12), 168초 E66 복습(#14 수정), 184초 E02 +1(#15), 216초 E02 +1·E77 복습(#16·#18).
      // E62·E82 → 스3(184초 행), E78 → 스6, E49 → 스4로 옮겼다. 빠짐 164 = 더함 164라 총 HP 3,710 그대로.
      { sec: 24, type: 'E01', count: 3 }, { sec: 24, type: 'E34', count: 4 },
      { sec: 40, type: 'E01', count: 8 }, { sec: 40, type: 'E07', count: 3 }, { sec: 40, type: 'E35', count: 2 },
      { sec: 60, type: 'E01', count: 3 }, { sec: 60, type: 'E34', count: 3 }, { sec: 60, type: 'E07', count: 4 }, { sec: 60, type: 'E36', count: 3 }, { sec: 60, type: 'E02', count: 2 },
      { sec: 72, type: 'E66', count: 1 },
      // 2026-11-14 2차 신규: 108초에 치프 E89 반장 좀비 1기를 더한다(치프만 순증이다, 잡몹 행은 그대로).
      // 2026-11-15: E89 base 400 → 240(기준 봇 119판 처치 0회). 순증 240.
      { sec: 108, type: 'E01', count: 2 }, { sec: 108, type: 'E89', count: 1 },
      { sec: 110, type: 'E07', count: 3 }, { sec: 110, type: 'E02', count: 3 },
      { sec: 120, type: 'E05', count: 2 }, { sec: 120, type: 'E77', count: 1 }, { sec: 120, type: 'E02', count: 3 },
      { sec: 144, type: 'E05', count: 2 }, { sec: 144, type: 'E56', count: 1 },
      // 2026-11-15 2차 신규(wave 2): 150초 E07×6 → ×5 + E90(숙제 걷기 당번), 184초 혼합 E01×1 → E91(교과서 미믹).
      { sec: 150, type: 'E07', count: 5 }, { sec: 150, type: 'E01', count: 6 }, { sec: 150, type: 'E90', count: 1 },
      { sec: 168, type: 'E66', count: 1 },
      { sec: 184, type: 'E91', count: 1 }, { sec: 184, type: 'E34', count: 2 }, { sec: 184, type: 'E36', count: 2 },
      { sec: 184, type: 'E02', count: 3 }, { sec: 184, type: 'E05', count: 2 }, { sec: 184, type: 'E06', count: 1 },
      { sec: 216, type: 'E05', count: 2 }, { sec: 216, type: 'E56', count: 1 }, { sec: 216, type: 'E02', count: 1 }, { sec: 216, type: 'E77', count: 1 },
    ])
  })
})

describe('Stage 2 좀비 시간표 Stage 1 앵커 재배열', () => {
  it('Stage 2의 경비 추격을 포함한 모든 비보스 좀비 고유 초 배열은 Stage 1 일반 좀비 앵커와 정확히 일치하고 B02는 150초에 등장한다', () => {
    expect(uniqueSeconds(stageZombieEvents(STAGE2_BURST_EVENTS))).toEqual(uniqueSeconds(ordinaryZombieEvents(BURST_EVENTS)))
    expect(STAGE2_BURST_EVENTS.filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B02', count: 1 }])
  })

  // 2026-08-17 총체력 사다리(스1 ×1.3^n): 잡몹 예산 9,202 → 3,458. 경비추격 4→2회,
  // 혼합 보강 4×17 → 경량 2회가 감축의 대부분이다. 마릿수는 224 → 95로 스1(92)과 나란히 맞췄다.
  it('Stage 2 비보스 좀비 payload·마릿수·적용 HP는 1.3배 사다리 예산에 맞춰 재편성된다', () => {
    // 치프(2026-11-15 E92 기관사)는 사다리 밖 순증이라 여기서 빼고 아래 치프 단언이 따로 못박는다.
    expect(STAGE2_BURST_EVENTS.filter((event) => isChiefType(event.type))).toEqual([{ sec: 144, type: 'E92', count: 1 }])
    const ordinary = stageZombieEvents(STAGE2_BURST_EVENTS).filter((event) => !isChiefType(event.type))

    expect(ordinary.map(payloadWithoutSec)).toEqual([
      // 2026-10-25 Track B: 5초 E01×12 → E01×7 + E37×5, 24초 E03×6 → E03×3 + E38×3,
      // 108초 E07×6 → E07×3 + E39×3. hp 동일 교체.
      // 2026-11-16 좀비 배치 총검토(Terry 승인, balanceqa 판정표): E83(24초)·E72(108초) → 스6, E46 184 → 40초(#21),
      // E47 60 → 72초(#23), E63 72 → 108초(#24), E94 60 → 110초(#22 수정), E65 40 → 120초(#20 수정 — 144초는 치프 E92 자리),
      // E67 120 → 168초(#26), E06 168 → 184초(#29), 스3에서 E57(168초)·E74(184초) 받음(#27·#28), 184초 E65 복습(#30).
      // 마릿수 95 → 96, 잡몹 3,458 → 3,531(+ B02 1,380 = 4,911, 목표 4,823의 +1.8%).
      { type: 'E01', count: 7 },
      { type: 'E37', count: 5 },
      { type: 'E03', count: 2 },
      { type: 'E38', count: 3 },
      { type: 'E46', count: 1 },
      { type: 'E07', count: 3 },
      { type: 'E04', count: 1 },
      { type: 'E47', count: 1 },
      { type: 'E07', count: 1 },
      { type: 'E63', count: 1 },
      { type: 'E47', count: 1 },
      { type: 'E39', count: 3 },
      { type: 'E94', count: 1 },
      { type: 'E05', count: 1 },
      { type: 'E49', count: 1 },
      { type: 'E65', count: 1 },
      { type: 'E51', count: 1 },
      { type: 'E67', count: 1 },
      { type: 'E57', count: 1 },
      { type: 'E05', count: 3 },
      { type: 'E74', count: 1 },
      { type: 'E06', count: 1 },
      { type: 'E65', count: 1 },
      { type: 'E05', count: 2 },
      { type: 'E56', count: 1 },
      // 2026-11-04 분산 재배치: 혼합 보강 E01 몫 7마리(150초 3 + 216초 4)를 같은 hp 8의 E37/E34로 옮겼다.
      { type: 'E37', count: 2 },
      { type: 'E81', count: 1 },
      { type: 'E37', count: 1 },
      { type: 'E51', count: 1 },
      { type: 'E34', count: 1 },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'E01', count: 7, formation: 'swarm' },
      { type: 'E03', count: 5, formation: 'ring' },
      { type: 'E93', count: 1 },
      { type: 'E02', count: 2, formation: 'pincer' },
      { type: 'E07', count: 3 },
      { type: 'E02', count: 3 },
      { type: 'E01', count: 4, mixedTypes: ['E01', 'E03'], reinforcement: 'stage2MixedReinforcement' },
      { type: 'E01', count: 6, mixedTypes: ['E01', 'E03'], reinforcement: 'stage2MixedReinforcement' },
    ])
    expect(ordinary.reduce((sum, event) => sum + (event.count ?? 1), 0)).toBe(96)
    expect(declaredCountByType(ordinary)).toEqual({ E01: 24, E37: 8, E34: 1, E02: 5, E03: 7, E38: 3, E04: 1, E05: 6, E06: 1, E07: 7, E39: 3, RZT: 14,
      E46: 1, E47: 2, E49: 1, E51: 2, E56: 1, E57: 1, E63: 1, E65: 2, E67: 1, E74: 1, E81: 1, E93: 1, E94: 1 })
    expect(stage2HpMultipliedBurstHp(ordinary)).toBe(3531)
  })

  it('경비추격은 2회(도입 40 + 보스 구간 재현 144)로 남고 혼합 보강 풀은 경량대뿐이다', () => {
    const chases = STAGE2_BURST_EVENTS.filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION)
    expect(chases.map((event) => event.sec)).toEqual([40, 144])
    // 혼합 풀에 무거운 타입(E02/E04/E05/E06)이 들어가면 pickMixedReinforcementTypes의
    // "각 타입 1마리 선보장" 때문에 랜덤이 아니라 확정 난이도 상승이 된다 — 경량대만 허용한다.
    for (const event of STAGE2_BURST_EVENTS.filter((e) => e.mixedTypes)) {
      expect(event.mixedTypes).toEqual(['E01', 'E03'])
    }
  })
})

describe('전 스테이지 1:50 웃는좀비·탱커 보강', () => {
  it.each(allStageBurstTables)('%s는 110초 E07 3마리와 E02 3마리를 정확히 1개씩 추가한다', (_stageId, events) => {
    const baseEvents = singleShotEvents(events)
    expect(baseEvents.filter((event) => event.sec === 110 && event.type === 'E07' && event.count === 3)).toHaveLength(1)
    // 2026-08-17: 스2가 따로 얹고 있던 110초 E02×3 중복분은 예산 감축으로 제거됐다.
    // 이제 다섯 스테이지 모두 공유 배열 1건씩만 갖는다 = 배열 분리 없이 공유를 유지할 수 있는 상태다.
    expect(baseEvents.filter((event) => event.sec === 110 && event.type === 'E02' && event.count === 3)).toHaveLength(1)
  })

  it('Stage 2 웃는좀비 버스트는 사다리 예산에 맞춰 60초 5마리·108초 6마리로 재편성된다', () => {
    // 2026-11-04: 60초 5마리 중 1마리를 E47(종이비행기, hp 16)이 대체한다. 합은 여전히 5마리다.
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 60, type: 'E07', count: 3 })
    // 2026-11-16 좀비 배치 총검토: 60초 E47(#23)은 72초로, 108초 E72는 스6으로, 60초 E94(#22)는 110초로 옮겼다.
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 72, type: 'E47', count: 1 })
    // 2026-10-25 Track B: 108초 6마리 중 3마리를 E39(선끝접기형)가, 2026-11-04 1마리를 E47이 대체한다. 합은 6마리다.
    // 2026-11-14 블록 좀비: 108초 E07 1마리를 E72(교통지도, hp 16)가 대체한다. 합은 여전히 6마리다.
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E07', count: 1 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E63', count: 1 })
    expect(STAGE2_BURST_EVENTS.some((event) => event.type === 'E72')).toBe(false)
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 110, type: 'E94', count: 1 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E47', count: 1 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E39', count: 3 })
  })
})

describe('Stage 1 2:30 웃는좀비·녹색좀비 보강', () => {
  // 2026-08-13 스폰 +10%: 5→6. E01 쪽은 경량대 랜덤 구성(mixedTypes)이 붙었다.
  it('stage1만 150초에 E07 6마리(그중 1기는 같은 hp E90)와 E01 6마리를 정확히 추가한다', () => {
    // 2026-11-15 2차 신규(wave 2): E07×6 → ×5 + E90(숙제 걷기 당번, hp 16 = E07). 웃는좀비 자리 6마리는 그대로다.
    expect(BURST_EVENTS.filter((event) => event.sec === 150 && event.type === 'E07' && event.count === 5)).toHaveLength(1)
    expect(BURST_EVENTS.filter((event) => event.sec === 150 && event.type === 'E90' && event.count === 1)).toHaveLength(1)
    expect(BURST_EVENTS.filter((event) => event.sec === 150 && event.type === 'E01' && event.count === 6)).toHaveLength(1)
  })

  it.each([
    ['stage2', STAGE2_BURST_EVENTS],
    ['stage3', STAGE3_BURST_EVENTS],
    ['stage4', STAGE4_BURST_EVENTS],
  ])('%s에는 150초 E07/E01 보강을 넣지 않는다', (_stageId, events) => {
    expect(events.filter((event) => event.sec === 150 && event.type === 'E07' && event.count === 6)).toHaveLength(0)
    expect(events.filter((event) => event.sec === 150 && event.type === 'E01' && event.count === 6)).toHaveLength(0)
  })

  it('기존 110초 전 스테이지 E07 3 + E02 3 보강을 보존한다', () => {
    expect(BURST_EVENTS).toContainEqual({ sec: 110, type: 'E07', count: 3 })
    expect(BURST_EVENTS).toContainEqual({ sec: 110, type: 'E02', count: 3 })
  })
})

describe('Stage 1 40초 녹색좀비·웃는좀비 추가 스폰', () => {
  // 2026-08-13 스폰 +10%: E01 5→6. E07 3은 round(3×1.1)=3이라 불변.
  // 2026-11-16 좀비 배치 총검토 #10: E01 6 → 8(24초 E01 2기를 옮겨 30~60초가 첫 30초보다 약하던 역전을 푼다).
  it('stage1에만 정확히 E01 8마리와 E07 3마리를 추가한다', () => {
    expect(BURST_EVENTS.filter((event) => event.sec === 40 && event.type === 'E01' && event.count === 8)).toHaveLength(1)
    expect(BURST_EVENTS.filter((event) => event.sec === 40 && event.type === 'E07' && event.count === 3)).toHaveLength(1)
  })

  it.each([
    ['stage2', STAGE2_BURST_EVENTS],
    ['stage3', STAGE3_BURST_EVENTS],
    ['stage4', STAGE4_BURST_EVENTS],
  ])('%s에는 이 40초 추가 스폰이 없다', (_stageId, events) => {
    const baseEvents = singleShotEvents(events)
    expect(baseEvents.filter((event) => event.sec === 40 && event.type === 'E01' && event.count === 8)).toHaveLength(0)
    expect(baseEvents.filter((event) => event.sec === 40 && event.type === 'E07' && event.count === 3)).toHaveLength(0)
  })

  it('런타임 스케줄에도 동일하게 포함한다', () => {
    const runtime = getRuntimeBurstEventsForStage('stage1')
    expect(runtime).toContainEqual({ sec: 40, type: 'E01', count: 8 })
    expect(runtime).toContainEqual({ sec: 40, type: 'E07', count: 3 })
  })
})

describe('burstEvents 보스 등장 시각 파생', () => {
  it('classifies the fixed boss center threshold without claiming a variable phase', () => {
    expect(getBossPhaseStatus(149)).toBe('before')
    expect(getBossPhaseStatus(150)).toBe('after')
    expect(getBossPhaseStatus(149, 'stage2')).toBe('before')
    expect(getBossPhaseStatus(150, 'stage2')).toBe('after')
  })
  it('getBurstEventsForStage: stage2는 STAGE2, 그 외 stage1 기본', () => {
    expect(getBurstEventsForStage('stage2')).toBe(STAGE2_BURST_EVENTS)
    expect(getBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    expect(getBurstEventsForStage(undefined)).toBe(BURST_EVENTS)
  })

  it('보스 등장 시각 = 보스 버스트 sec 단일 소스', () => {
    expect(getBossSpawnSec('stage1')).toBe(150)
    expect(getBossSpawnSec('stage2')).toBe(150)
  })

  it('런타임 버스트는 명시 이벤트 표 전체를 반환한다', () => {
    expect(getRuntimeBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    const stage2 = getRuntimeBurstEventsForStage('stage2')
    expect(stage2).toBe(STAGE2_BURST_EVENTS)
    expect(stage2.filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B02', count: 1 }])
    expect(stage2.filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION).map((event) => event.sec)).toEqual([40, 144])
  })

  it('runtime schedule emits every stage boss at the user-specified 150 seconds', () => {
    expect(getRuntimeBurstEventsForStage('stage1').filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B01', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage2').filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B02', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage3').filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B03', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage4').filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B04', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage5').filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B10', count: 1 }])
  })

  it('보스 버스트가 없는 스테이지는 Infinity (보스 구간 없음)', () => {
    // 존재하지 않는 스테이지는 stage1 기본으로 폴백되지만, 보스 없는 목록을 가정한 경계 확인
    const noBoss = [{ sec: 0, type: 'E01', count: 5 }]
    const min = Math.min(...noBoss.filter((e) => ['B01', 'B02'].includes(e.type)).map((e) => e.sec))
    expect(min).toBe(Infinity)
  })

  it('isBossPhase: 시작 시각이 보스 등장 이후면 true (경계 포함)', () => {
    expect(isBossPhase(150, 'stage2')).toBe(true)
    expect(isBossPhase(149, 'stage2')).toBe(false)
    expect(isBossPhase(150, 'stage1')).toBe(true)
    expect(isBossPhase(149, 'stage1')).toBe(false)
  })
})

describe('stage3 체육교사 B03 단일 보스 + 형태 버스트 런타임 복원', () => {
  it('getBurstEventsForStage: stage3는 STAGE3 목록', () => {
    expect(getBurstEventsForStage('stage3')).toBe(STAGE3_BURST_EVENTS)
  })

  it('체육교사 B03 단일 보스(150) — 스1/스2 보스는 스3 전투에 등장하지 않는다', () => {
    const bosses = STAGE3_BURST_EVENTS.filter((e) => e.type === 'B01' || e.type === 'B02' || e.type === 'B03')
    expect(bosses).toEqual([
      { sec: 150, type: 'B03', count: 1 },
    ])
    expect(getBossSpawnSec('stage3')).toBe(150)
  })

  it('isBossPhase(stage3): 150 이후 시작 phase만 보스 구간', () => {
    expect(isBossPhase(150, 'stage3')).toBe(true)
    expect(isBossPhase(149, 'stage3')).toBe(false)
  })

  it('런타임 버스트: stage3는 보스 외 형태/그룹까지 모두 발화 대상(stage1/2는 보스만 불변)', () => {
    const runtime = getRuntimeBurstEventsForStage('stage3')
    // stage3 런타임은 전체 목록(형태 포함)을 반환한다.
    expect(runtime).toBe(STAGE3_BURST_EVENTS)
    expect(runtime.some((e) => e.formation)).toBe(true)
    expect(runtime.filter((e) => e.type === 'B03')).toHaveLength(1)
    expect(runtime.filter((e) => e.type === 'B01' || e.type === 'B02')).toHaveLength(0)
    // 회귀 방지: stage1/stage2도 명시 이벤트 표 전체를 런타임 발화한다.
    expect(getRuntimeBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    expect(getRuntimeBurstEventsForStage('stage2')).toBe(STAGE2_BURST_EVENTS)
    expect(getRuntimeBurstEventsForStage('stage2').filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION)).toHaveLength(2)
  })

  it('stage3는 이전 단일 런좀비 크루 대각선 횡단 버스트를 포함한다', () => {
    const crews = STAGE3_BURST_EVENTS.filter((e) => e.formation === RUN_ZOMBIE_CREW_FORMATION)
    expect(crews).toEqual([{ sec: 72, type: 'RZL', count: 13, formation: RUN_ZOMBIE_CREW_FORMATION }])
  })

  it('25초부터 125초까지 25초마다 E01×3+E07×3 런타임 보강을 추가한다', () => {
    const reinforcement = STAGE3_BURST_EVENTS.filter((event) => event.reinforcement === 'stage3TwentyFiveSecondE01E07')
    expect(reinforcement).toEqual(STAGE3_25_SECOND_GREEN_SMILING_REINFORCEMENT_EVENTS)
    expect(reinforcement).toHaveLength(2)
    expect(reinforcement).toEqual([
      { sec: STAGE3_25_SECOND_REINFORCEMENT_START_SEC, type: 'E01', count: 3, repeatIntervalSec: STAGE3_25_SECOND_REINFORCEMENT_INTERVAL_SEC, endExclusiveSec: STAGE3_25_SECOND_REINFORCEMENT_END_EXCLUSIVE_SEC, reinforcement: 'stage3TwentyFiveSecondE01E07' },
      { sec: STAGE3_25_SECOND_REINFORCEMENT_START_SEC, type: 'E07', count: 3, repeatIntervalSec: STAGE3_25_SECOND_REINFORCEMENT_INTERVAL_SEC, endExclusiveSec: STAGE3_25_SECOND_REINFORCEMENT_END_EXCLUSIVE_SEC, reinforcement: 'stage3TwentyFiveSecondE01E07' },
    ])
    expect(reinforcement.every(isRepeatingBurstEvent)).toBe(true)
    expect(reinforcement.map(repeatingBurstTickCount)).toEqual([5, 5])
    expect(reinforcement.map((event) => repeatingBurstSecAtTick(event, 0))).toEqual([25, 25])
    expect(reinforcement.map((event) => repeatingBurstSecAtTick(event, 4))).toEqual([125, 125])
    expect(reinforcement.map((event) => repeatingBurstSecAtTick(event, 5))).toEqual([null, null])
    expect(reinforcement.map((event) => repeatingBurstTickAt(event, 24.999))).toEqual([null, null])
    expect(reinforcement.map((event) => repeatingBurstTickAt(event, 150))).toEqual([4, 4])
    expect(reinforcement.filter((event) => event.type === 'E01').reduce((sum, event) => sum + event.count * repeatingBurstTickCount(event), 0)).toBe(15)
    expect(reinforcement.filter((event) => event.type === 'E07').reduce((sum, event) => sum + event.count * repeatingBurstTickCount(event), 0)).toBe(15)
    expect(reinforcement.reduce((sum, event) => sum + event.count * repeatingBurstTickCount(event), 0)).toBe(30)
    expect(getRuntimeBurstEventsForStage('stage3')).toBe(STAGE3_BURST_EVENTS)
    for (const stageId of ['stage1', 'stage2', 'stage4']) {
      expect(getRuntimeBurstEventsForStage(stageId).some((event) => event.reinforcement === 'stage3TwentyFiveSecondE01E07')).toBe(false)
    }
  })

  it('형태 버스트 중 stage3는 플레이어 상대 포위(ring/pincer) + runZombieCrew만 쓴다 (개방 맵 안티카이팅)', () => {
    // 재설계(2026-07-18): swarm(한 방향)·gauntlet(양벽)은 개방 아레나서 카이팅되므로 배제.
    const formations = STAGE3_BURST_EVENTS.filter((e) => e.formation).map((e) => e.formation)
    expect(new Set(formations)).toEqual(new Set(['ring', 'pincer', RUN_ZOMBIE_CREW_FORMATION]))
    expect(formations).not.toContain('swarm')
    expect(formations).not.toContain('gauntlet')
    // 120s는 차저 포위(ring), 150s는 탱커 협공(pincer, 110→150 이동), 184s는 거대 앞뒤 벽(pincer).
    expect(STAGE3_BURST_EVENTS.find((e) => e.sec === 120 && e.formation)?.formation).toBe('ring')
    expect(STAGE3_BURST_EVENTS.find((e) => e.sec === 150 && e.formation)?.formation).toBe('pincer')
    expect(STAGE3_BURST_EVENTS.find((e) => e.sec === 184)?.formation).toBe('pincer')
  })

  // 2026-08-17 총체력 사다리: 잡몹 예산 5,541 → 4,652. 시그니처 RZL 크루 4회는 전부 유지하고
  // 무거운 덩어리에서만 뺐다(150초 E06 삭제, 110초 협공 6→3, 120초 포위 4→3, 오프닝 12→10).
  // 2026-08-19 25초 반복 상쇄: 반복 보강이 25~125초 창에 525 HP를 새로 넣어 스3 총합이 목표 대비 +8.98%로
  // 뚫려 있었다. 같은 창에서만 562를 빼 되돌린다 — 110초 E06×1(461) 삭제 + 72초 차저 2→1(-101).
  // 2026-08-22: 런좀비 크루는 이전 사용자 정본 단일 RZL@72×13(리더+팔로워 12)으로 되돌린다.
  // 단발 예산은 4,090 → 3,220이고, 반복 525를 더한 잡몹 실측은 3,745다.
  it('단발 비보스 이벤트는 공통 13개 앵커만 쓰며 1.3배 사다리 예산에 맞는 payload·마릿수·실제 HP를 갖는다', () => {
    // 치프(2026-11-15 E95 줄넘기 듀오, 몸 2)는 사다리 밖 순증 — 기존 앵커 110초에 두고 여기서는 뺀다.
    expect(STAGE3_BURST_EVENTS.filter((event) => isChiefType(event.type))).toEqual([{ sec: 110, type: 'E95', count: 2 }])
    const ordinary = singleShotEvents(STAGE3_BURST_EVENTS).filter((event) => !isBossType(event.type) && !isChiefType(event.type))
    expect(uniqueSeconds(ordinary)).toEqual([5, 24, 40, 60, 72, 110, 120, 150, 168, 184, 216])
    expect(ordinary.map(payloadWithoutSec)).toEqual([
      // 2026-10-25 Track B: 24초 E03×4 → E03×2 + E41×2, 216초 E05×3 → E05×1 + E40×2,
      // 120초 포위 E05×3 → E42×3(타입 전량 교체). hp 동일 교체라 마릿수 52와 실제 HP 3,220이 불변이다.
      // 2026-11-04 분산 재배치: 5초 E01×10 → E01×7 + E37×3(스2 복습), 216초 E40×2 중 1기를 168초로
      // 당겨 탈출 전 첫 등장을 만든다. hp 동일 맞교환·이동이라 마릿수·HP 불변.
      // 2026-11-04 투사체 좀비: 5초 E37 1기 → E46(스2 복습), 216초 E05×1 → 72초 E57(첫 등장). hp 동일.
      // 2026-11-07 2차 10종: 5초 E01 1기 → E64(첫 등장), 60초 포위 E03 1기 → E68(첫 등장, 단독 행). hp 동일.
      // 2026-11-14 블록 좀비: 5초 E01 2기 → E85·E74(첫 등장), 24초 E03 1기 → E80(첫 등장). hp 동일.
      { type: 'E01', count: 4 }, { type: 'E85', count: 1 }, { type: 'E74', count: 1 }, { type: 'E64', count: 1 }, { type: 'E37', count: 2 }, { type: 'E46', count: 1 },
      { type: 'E03', count: 1 }, { type: 'E80', count: 1 }, { type: 'E41', count: 2 },
      // 2026-11-14 2차 신규: 40초 E96 순증 1기(같은 hp 자리가 남지 않음), 60초 포위 E03 1기 → E97(24초 E03은 E80 몫).
      { type: 'E04', count: 1 }, { type: 'E96', count: 1 }, { type: 'E05', count: 1 }, { type: 'E57', count: 1 },
      // 2026-11-16 S3 재결정: 216초 E40 복습 행 삭제(168초 첫 등장만 남김), 184초 거대 벽 뒤에 E58·E82·E62 추가(스1·스4·스5에서 옮겨 와
      // 스3에 없으면 스1~6 어디에도 남지 않는 세 종). 나머지는 23df529d 표 그대로다.
      { type: 'E40', count: 1 },
      { type: 'RZL', count: 13, formation: RUN_ZOMBIE_CREW_FORMATION },
      { type: 'E07', count: 3 }, { type: 'E02', count: 3 },
      { type: 'E03', count: 4, formation: 'ring' }, { type: 'E97', count: 1 }, { type: 'E68', count: 1 }, { type: 'E42', count: 3, formation: 'ring' },
      { type: 'E02', count: 3, formation: 'pincer' },
      { type: 'E06', count: 2, formation: 'pincer' }, { type: 'E58', count: 1 }, { type: 'E82', count: 1 }, { type: 'E62', count: 1 },
      // 216초 앵커는 지운 E40 복습 대신 씨름부 E82 복습 행이 쓴다.
      { type: 'E82', count: 1 },
    ])
    // 2026-11-14 2차 신규: E96 순증 1기 → 52 + 1 = 53. 2026-11-16 S3 재결정: −E40 1 + E58·E82·E62 3 + 216초 E82 복습 1 = 56.
    expect(ordinary.reduce((sum, event) => sum + event.count, 0)).toBe(56)
    const nonCrewHp = ordinary.reduce((sum, event) => sum + ({
      E01: 12, E02: 101, E03: 14, E04: 46, E05: 101, E06: 461, E07: 23,
      // host와 같은 stage3 실효 HP: E41←E03(14), E40←E05(101), E42←E02(101).
      E40: 101, E41: 14, E42: 101, E37: 12,
      // 투사체 좀비: E46←E01(12), E57←E05(101).
      E46: 12, E57: 101,
      // 2차 10종: E64←E01(12), E68←E03(14).
      E64: 12, E68: 14,
      // 블록 좀비: E85·E74←E01(12), E80←E03(14).
      E85: 12, E74: 12, E80: 14,
      // 2026-11-14 2차 신규: E96 순증(round(16 × 1.44) = 23), E97←E03(14).
      E96: 23, E97: 14,
      // 2026-11-16 S3 재결정: E58 round(8 × 1.44) = 12, E82 round(16 × 1.44) = 23, E62 round(70 × 1.44) = 101.
      E58: 12, E82: 23, E62: 101,
    }[event.type] ?? 0) * event.count, 0)
    // 2026-11-14 2차 신규: E96 순증 round(16 × 1.44) = 23 → 3,220 + 23 = 3,243.
    // 2026-11-16 S3 재결정: 3,243 − E40 101 + E58 12 + E82 23 + E62 101 + 216초 E82 23 = 3,301.
    expect(nonCrewHp + Math.round(90 * 1.44) + 12 * Math.round(28 * 1.44)).toBe(3301)
    // 거대는 184초 앞뒤 벽 한 곳으로 모았다 — pincer는 ×2라야 성립하므로 ×1짜리 110초 건을 뺐다.
    expect(ordinary.filter((event) => event.type === 'E06').map(payloadWithoutSec))
      .toEqual([{ type: 'E06', count: 2, formation: 'pincer' }])
  })
})

describe('보스 타입 단일 소스(isBossType) + B04 배선', () => {
  it('BOSS_BURST_TYPES는 B01~B04를 포함하고 isBossType이 판별한다', () => {
    expect(BOSS_BURST_TYPES).toEqual(['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10'])
    expect(isBossType('B10')).toBe(true)
    expect(isBossType('B04')).toBe(true)
    expect(isBossType('B01')).toBe(true)
    expect(isBossType('E04')).toBe(false)
    expect(isBossType('RZL')).toBe(false)
  })
})

describe('stage4 급식실 대탈출 버스트', () => {
  it('getBurstEventsForStage: stage4는 STAGE4 목록', () => {
    expect(getBurstEventsForStage('stage4')).toBe(STAGE4_BURST_EVENTS)
  })

  it('보스 B04@150 count 1 — 보스 등장 시각은 150', () => {
    const bosses = STAGE4_BURST_EVENTS.filter((e) => isBossType(e.type))
    expect(bosses).toEqual([{ sec: 150, type: 'B04', count: 1 }])
    expect(getBossSpawnSec('stage4')).toBe(150)
  })

  it('isBossPhase(stage4): 150 이후 시작 phase만 보스 구간(경계 포함)', () => {
    expect(isBossPhase(150, 'stage4')).toBe(true)
    expect(isBossPhase(149, 'stage4')).toBe(false)
  })

  // 2026-11-16 좀비 배치 총검토: 첫 E04는 24초 ×4 → 40초 ×2(#44·#45, 24초 앵커는 E01×4 #46), 단발 거대는 72 → 216초(#49 —
  // 정예보다 먼저 나오던 553HP를 탈출구 개방 직후로). 72초 앵커는 급식판 E61(#50)·E02(#51)가 쓴다.
  it('Stage 3 공통 앵커에 맞춘 조기 등장 버스트: E04@40·E05@40, 단발 거대는 탈출구 개방 뒤 216', () => {
    const at = (sec, type) => STAGE4_BURST_EVENTS.some((e) => e.sec === sec && e.type === type && !e.formation)
    expect(at(24, 'E04')).toBe(false)
    expect(at(24, 'E01')).toBe(true)
    expect(at(40, 'E04')).toBe(true)
    expect(at(40, 'E05')).toBe(true)
    expect(at(72, 'E06')).toBe(false)
    expect(at(216, 'E06')).toBe(true)
  })

  it('런타임 버스트: stage4는 stage3처럼 형태 포함 전 버스트를 발화한다', () => {
    const runtime = getRuntimeBurstEventsForStage('stage4')
    expect(runtime).toBe(STAGE4_BURST_EVENTS)
    expect(runtime.some((e) => e.formation)).toBe(true)
    expect(runtime.filter((e) => e.type === 'B04')).toHaveLength(1)
    // 회귀 방지: stage1/stage2도 명시 이벤트 표 전체를 런타임 발화.
    expect(getRuntimeBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    expect(getRuntimeBurstEventsForStage('stage2')).toBe(STAGE2_BURST_EVENTS)
    expect(getRuntimeBurstEventsForStage('stage2').filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION)).toHaveLength(2)
  })

  it('형태 버스트는 개방 맵 안티카이팅(ring/pincer)만 — swarm/gauntlet/RZL 미채용', () => {
    const formations = STAGE4_BURST_EVENTS.filter((e) => e.formation).map((e) => e.formation)
    expect(new Set(formations)).toEqual(new Set(['ring', 'pincer']))
    expect(formations).not.toContain('swarm')
    expect(formations).not.toContain('gauntlet')
    expect(formations).not.toContain(RUN_ZOMBIE_CREW_FORMATION)
    // 2026-08-17: 빈 앵커 168초에 원거리 포위(ring E04)를 추가해 4 → 5개가 됐다.
    expect(formations.length).toBe(5)
  })

  // 2026-08-17 총체력 사다리: 잡몹 예산 3,855 → 5,574(+45%). 빈 앵커 144/150/168/216을 메워
  // 2:00~3:04의 64초 보스 단독 공백을 없앴다. 다만 증분을 전부 E04로 넣어 26마리가 됐던 건
  // 2026-08-19에 12마리로 되돌렸다(아래 포화 테스트 참조). 잡몹 예산은 5,577로 유지된다.
  it('비보스 이벤트는 공통 13개 앵커를 모두 쓰며 사다리 예산을 만족한다', () => {
    // 치프(2026-11-16 wave 3 E98 대식가)는 사다리 밖 순증 — 72초 행 하나만 따로 못박고 여기서는 뺀다.
    expect(STAGE4_BURST_EVENTS.filter((event) => isChiefType(event.type))).toEqual([{ sec: 72, type: 'E98', count: 1 }])
    const ordinary = STAGE4_BURST_EVENTS.filter((event) => !isBossType(event.type) && !isChiefType(event.type))
    expect(uniqueSeconds(ordinary)).toEqual([5, 24, 40, 60, 72, 108, 110, 120, 144, 150, 168, 184, 216])
    expect(ordinary.map(payloadWithoutSec)).toEqual([
      // 2026-10-25 Track B: 144초 E02×2 → E02×1 + E43×1, 150초 E03×6 → E03×3 + E45×3, 168초 E07×4 → E07×2 + E44×2. hp 동일 교체.
      // 2026-11-16 좀비 배치 총검토(Terry 승인, balanceqa 판정표): E87·E58·E50(72·168)·E70·E76·E88을 내보내고(E58 → 스3 184초, E50은 스5 168초 행에만 남음, 나머지 → 스6)
      // (#43·#37·#39·#40·#47·#54·#55), E85(스3)·E60·E84(스5)·E49(스1)를 받는다(#31·#48·#52·#4). 24초 E04×4 → 40초 E04×2 + 24초 E01×4
      // (#44~#46), 거대 72 → 216초(#49), E61 144 → 72초(#50), 72초 E02 ×1(#51 수정), E59 184 → 144초(#56), E43 144 → 184초(#58),
      // 216초 E84 복습(#60). 216초 E99(#59)는 기각. 마릿수 68 → 69, 적용 HP 5,577 → 5,596(+ B04 2,592 = 8,188).
      { type: 'E01', count: 5 }, { type: 'E85', count: 1 }, { type: 'E37', count: 3 }, { type: 'E01', count: 4 },
      // 40초는 E05·E43을 E04 앞에 둔다 — 로스터 순환이 E37·E85 몫으로 host 앞자리를 가져가도 E04 1기가 40초에 남는다.
      { type: 'E05', count: 1 }, { type: 'E43', count: 1 }, { type: 'E04', count: 2 },
      { type: 'E60', count: 1 }, { type: 'E61', count: 1 }, { type: 'E02', count: 1 },
      { type: 'E44', count: 1 }, { type: 'E84', count: 1 },
      { type: 'E04', count: 4 }, { type: 'E59', count: 1 },
      { type: 'E05', count: 2 }, { type: 'E03', count: 2 }, { type: 'E45', count: 3 }, { type: 'E49', count: 1 },
      { type: 'E69', count: 1 }, { type: 'E47', count: 1 }, { type: 'E44', count: 1 },
      { type: 'E43', count: 1 },
      { type: 'E05', count: 2 }, { type: 'E59', count: 1 }, { type: 'E06', count: 1 }, { type: 'E84', count: 1 },
      { type: 'E07', count: 3 }, { type: 'E02', count: 3 },
      { type: 'E03', count: 5, formation: 'ring' }, { type: 'E02', count: 4, formation: 'pincer' },
      // 2026-11-14 2차 신규: 120초 포위 E05×4 → E05×3(포위) + E99×1(단독 행). hp 70 맞교환.
      { type: 'E05', count: 3, formation: 'ring' }, { type: 'E99', count: 1 }, { type: 'E04', count: 4, formation: 'ring' },
      { type: 'E06', count: 2, formation: 'pincer' },
    ])
    expect(ordinary.reduce((sum, event) => sum + event.count, 0)).toBe(69)
    const appliedHp = ordinary.reduce((sum, event) => sum + ({
      E01: 14, E02: 121, E03: 17, E04: 55, E05: 121, E06: 553, E07: 28,
      // host와 같은 stage4 실효 HP: E43←E02(121), E44←E07(28), E45←E03(17).
      E43: 121, E44: 28, E45: 17, E37: 14,
      // 투사체 좀비: E47←E07(28), E59←E05(121). 2026-11-16 이동분: E49 round(70 × 1.728) = 121, E60 round(16 × 1.728) = 28.
      E47: 28, E59: 121, E49: 121, E60: 28,
      // 2차 10종: E61(121), E69←E07(28).
      E61: 121, E69: 28,
      // 블록 좀비 이동분(2026-11-16): E85·E84 round(8 × 1.728) = 14.
      E85: 14, E84: 14,
      // 2026-11-14 2차 신규: E99←E05(121).
      E99: 121,
    }[event.type] ?? 0) * event.count, 0)
    expect(appliedHp).toBe(5596)
  })

  // ── E04 포화 상한 감시(2026-08-19) ────────────────────────────────────────────
  // 옛 26마리 편성의 근거였던 getE04Cap은 런타임 호출자가 없는 죽은 코드다. 실제로 발사를 막는 건
  // enemySimulation.js isE04FireAllowed의 `projectileCount < E04_MAX_PROJECTILES(6)` 하나뿐이고,
  // 투사체는 명중하거나 수명 3,200ms가 다 차야 슬롯을 반납한다(경계 despawn 없음).
  //   처리량 천장  = 6발 / 3.2s          = 1.875발/초
  //   사수 1기     = 1 / 2,200ms(쿨다운) = 0.4545발/초
  //   포화 사수 수 = 1.875 / 0.4545      = 4.13기
  // 4기면 이미 천장의 97%이고 5기째부터는 슬롯 대기만 길어진다. E04는 preferDist 5.5에서
  // 스트레이핑만 하므로 초과분은 접촉 위협도 못 준다 = 순수 HP 낭비. 그래서 등장당 4마리로 못 박는다.
  const E04_MAX_PROJECTILES = 6
  const E04_PROJECTILE_LIFETIME_MS = 3200
  const E04_COOLDOWN_MS = 2200
  const E04_SATURATION_SHOOTERS = (E04_MAX_PROJECTILES / E04_PROJECTILE_LIFETIME_MS) * E04_COOLDOWN_MS

  // 2026-11-16 좀비 배치 총검토 #44·#45: 첫 벽은 24초 ×4 → 40초 ×2(첫 30초가 가장 무거운 사수 구간이던 것을 푼다).
  // 보스 구간 앞뒤 두 벽(144 · 168)은 포화점 4기 그대로다.
  it('E04 편성은 투사체 슬롯 포화점을 넘지 않는다 (40초 2마리 + 보스 앞뒤 벽 4마리씩 · 총 10마리)', () => {
    expect(E04_SATURATION_SHOOTERS).toBeCloseTo(4.125, 3)
    const perBurst = Math.floor(E04_SATURATION_SHOOTERS)
    const e04Events = STAGE4_BURST_EVENTS.filter((event) => event.type === 'E04')

    expect(e04Events.map((event) => event.sec)).toEqual([40, 144, 168])
    expect(e04Events.map((event) => event.count)).toEqual([2, perBurst, perBurst])

    const e04Total = e04Events.reduce((sum, event) => sum + event.count, 0)
    expect(e04Total).toBe(10)
    // 어느 단일 앵커도 포화점을 넘지 않는다 = 발사 기회를 못 얻는 사수가 생기지 않는다.
    expect(Math.max(...e04Events.map((event) => event.count))).toBeLessThanOrEqual(perBurst)
    // 시그니처는 마릿수가 아니라 "보스 구간까지 사선이 유지된다"로 유지한다(stage4만 bossPressure 예외).
    // 보스 등장(150)을 앞뒤로 한 벽씩 감싼다: 144 직전 · 168 보스 구간 내부.
    const bossSec = getBossSpawnSec('stage4')
    expect(e04Events.some((event) => event.sec < bossSec && event.sec >= bossSec - 10)).toBe(true)
    expect(e04Events.some((event) => event.sec > bossSec)).toBe(true)
    // 다른 스테이지로 이 물량이 번지지 않는지도 함께 본다.
    for (const stageId of ['stage1', 'stage2', 'stage3']) {
      const other = getRuntimeBurstEventsForStage(stageId)
        .filter((event) => event.type === 'E04')
        .reduce((sum, event) => sum + (event.count ?? 1), 0)
      expect(other).toBeLessThanOrEqual(perBurst)
    }
  })
})

// ── Stage 5 「교무실 최종 돌파」(2026-11-08 스펙 Part B §5-1·§15) ──────────────────────────────
describe('stage5 교무실 최종 돌파 버스트', () => {
  const S5 = 1.2 ** 4
  const S5_BASE_HP = { E01: 8, E02: 70, E03: 10, E04: 32, E05: 70, E06: 320, E07: 16, ...NOVEL_BASE_HP, B10: 1563 }
  const applied = (type) => Math.round(S5_BASE_HP[type] * S5)
  const rowHp = (event) => applied(event.type) * (event.count ?? 1)

  it('getBurstEventsForStage/런타임: stage5는 STAGE5 목록 전체', () => {
    expect(getBurstEventsForStage('stage5')).toBe(STAGE5_BURST_EVENTS)
    expect(getRuntimeBurstEventsForStage('stage5')).toBe(STAGE5_BURST_EVENTS)
    expect(isBossPhase(150, 'stage5')).toBe(true)
    expect(isBossPhase(149, 'stage5')).toBe(false)
  })

  it('보스는 B10 교감 좀비 1기, 150초 — 옛 B03 재탕은 없다', () => {
    expect(STAGE5_BURST_EVENTS.filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B10', count: 1 }])
    expect(STAGE5_BURST_EVENTS.some((event) => event.type === 'B03')).toBe(false)
  })

  it('형태 버스트(ring/pincer) 4건은 STAGE5_SPAWN_TELEGRAPHS와 sec 순서까지 1:1', () => {
    const shaped = STAGE5_BURST_EVENTS.filter((event) => event.formation === 'ring' || event.formation === 'pincer')
    expect(shaped.map((event) => event.sec)).toEqual([60, 108, 120, 184])
    expect(shaped.map((event) => event.sec)).toEqual(STAGE5_SPAWN_TELEGRAPHS.map((t) => t.sec))
    expect(shaped.map(payloadWithoutSec)).toEqual([
      { type: 'E03', count: 8, formation: 'ring' },
      { type: 'E02', count: 4, formation: 'pincer' },
      { type: 'E05', count: 4, formation: 'ring' },
      { type: 'E05', count: 2, formation: 'pincer' },
    ])
    // 형태 버스트 외 formation은 반복 descriptor의 전교 호출 레인뿐이다(예고 배너 대상 아님).
    const others = STAGE5_BURST_EVENTS.filter((event) => event.formation && !shaped.includes(event))
    expect(others).toHaveLength(2)
    expect(others.every((event) => event.formation === STAGE5_CALL_LANE_FORMATION && isRepeatingBurstEvent(event))).toBe(true)
  })

  it('E04 사수는 앵커당 ≤ 4(포화점 4.13기)이고 보스 구간 150~210초에는 0이다', () => {
    const perSec = new Map()
    for (const event of STAGE5_BURST_EVENTS.filter((e) => e.type === 'E04')) perSec.set(event.sec, (perSec.get(event.sec) ?? 0) + event.count)
    // 2026-11-14: 144초 E04 1기 → E103 커피 셔틀(탄 없음, hp 32 맞교환).
    // 2026-11-16 좀비 배치 총검토 #63: 24초 E04×2 → 40초(첫 30초 투척 4기 몰림을 편다).
    expect([...perSec.entries()].sort((a, b) => a[0] - b[0])).toEqual([[5, 2], [40, 2], [72, 1], [144, 3], [216, 1]])
    for (const count of perSec.values()) expect(count).toBeLessThanOrEqual(4)
    expect(STAGE5_BURST_EVENTS.filter((e) => e.type === 'E04' && e.sec >= 150 && e.sec < 210)).toEqual([])
    // 0~48초 포화점: 5초 2 + 40초 2 = 4.
    expect([...perSec.entries()].filter(([sec]) => sec < 48).reduce((sum, [, c]) => sum + c, 0)).toBe(4)
  })

  // 2026-11-16 좀비 배치 총검토(Terry 승인, balanceqa 판정표): E84·E60·E58·E70·E55를 내보내고(#52·#48·#38·#65·#68) E64(40초)·E68(108초)을
  // 받는다(#32·#36). E48 40 → 5(#61), E57 24 → 168(#62), E04×2 24 → 40(#63), E39 40 → 24(#64), E53 5 → 60(#66), 거대 72 → 184초(#67),
  // 216초 E103 복습(#71), 40초 E02 1기(추가 변경 A1). 단발 82 → 81기, 실효 5,305 → 5,321.
  it('단발 81기·실효 5,321, 앵커별 합(2026-11-16 좀비 배치 총검토 뒤)', () => {
    // 치프(2026-11-16 wave 3 E101 복사기)는 사다리 밖 순증 — 40초 행 하나만 따로 못박고 여기서는 뺀다.
    expect(STAGE5_BURST_EVENTS.filter((event) => isChiefType(event.type))).toEqual([{ sec: 40, type: 'E101', count: 1 }])
    const single = singleShotEvents(STAGE5_BURST_EVENTS).filter((event) => !isBossType(event.type) && !isChiefType(event.type))
    expect(single.reduce((sum, event) => sum + event.count, 0)).toBe(81)
    const byAnchor = {}
    for (const event of single) byAnchor[event.sec] = (byAnchor[event.sec] ?? 0) + rowHp(event)
    expect(byAnchor).toEqual({ 5: 301, 24: 96, 40: 393, 60: 189, 72: 149, 108: 601, 110: 534, 120: 580, 144: 495, 150: 119, 168: 343, 184: 954, 216: 567 })
    expect(single.reduce((sum, event) => sum + rowHp(event), 0)).toBe(5321)
  })

  it('반복: 보스 구간 잡몹 672(4 tick), 전교 호출 702(73·133·193 3회, 회당 E03 8 + E07 2)', () => {
    const repeating = STAGE5_BURST_EVENTS.filter(isRepeatingBurstEvent)
    const familyHp = (tag) => repeating.filter((e) => e.reinforcement === tag)
      .reduce((sum, e) => sum + rowHp(e) * repeatingBurstTickCount(e), 0)
    expect(familyHp(STAGE5_BOSS_PHASE_REINFORCEMENT)).toBe(672)
    expect(familyHp(STAGE5_CALL_LANE_REINFORCEMENT)).toBe(702)
    const anchors = [5, 24, 40, 60, 72, 108, 110, 120, 144, 150, 168, 184, 216]
    for (const event of repeating.filter((e) => e.reinforcement === STAGE5_CALL_LANE_REINFORCEMENT)) {
      expect(event.formation).toBe(STAGE5_CALL_LANE_FORMATION)
      const secs = Array.from({ length: repeatingBurstTickCount(event) }, (_, tick) => repeatingBurstSecAtTick(event, tick))
      expect(secs).toEqual([73, 133, 193])
      // 10초 스트림 [S, S+10)이 공통 앵커와 겹치지 않는다(스펙 §7-1 위상 근거).
      for (const start of secs) expect(anchors.filter((a) => a >= start && a < start + 10)).toEqual([])
      // 마지막 호출(193~203)은 마틸다 경고(205) 전에 끝난다.
      expect(secs.at(-1) + 10).toBeLessThan(205)
    }
  })

  it('총 HP 사다리: 단발 5,321 + 반복 672 + 호출 702 + B10 3,241 + 소집 684 = 10,620 (목표 10,596, ±2%)', () => {
    const total = STAGE5_BURST_EVENTS.filter((event) => !isChiefType(event.type)).reduce((sum, event) => sum + rowHp(event)
      * (isRepeatingBurstEvent(event) ? repeatingBurstTickCount(event) : 1), 0) + STAGE5_B10_SUMMON_FIXED_HP
    expect(applied('B10')).toBe(3241)
    expect(total).toBe(10620)
    const target = Math.round(3710 * 1.3 ** 4)
    expect(target).toBe(10596)
    expect(Math.abs(total / target - 1)).toBeLessThanOrEqual(0.02)
  })

  // 2026-11-16 좀비 배치 총검토 #65: 술래 E70은 스6 운동장 216초로 옮겼다(술래잡기 = 운동장). 24초 E03 3기는 그대로다.
  it('2차 10종 복습 E66·E65는 같은 hp 맞교환으로 보존되고, E70은 스6으로 옮겼다', () => {
    const at = (sec, type) => STAGE5_BURST_EVENTS.filter((e) => e.sec === sec && e.type === type && !isRepeatingBurstEvent(e))
      .reduce((sum, e) => sum + e.count, 0)
    expect([at(24, 'E03'), at(24, 'E70')]).toEqual([3, 0])
    expect(STAGE5_BURST_EVENTS.some((e) => e.type === 'E70')).toBe(false)
    expect([at(40, 'E07'), at(40, 'E66')]).toEqual([1, 1])
    // 2026-11-14 블록 좀비: 150초 E01 1기를 E86(장학사, hp 8)이 더 가져갔다(4 → 3 + 1).
    expect([at(150, 'E01'), at(150, 'E65'), at(150, 'E86')]).toEqual([3, 1, 1])
    expect([S5_BASE_HP.E70, S5_BASE_HP.E66, S5_BASE_HP.E65]).toEqual([S5_BASE_HP.E03, S5_BASE_HP.E07, S5_BASE_HP.E01])
  })
})

// ── 2026-08-17 사용자 정본: 스테이지 총체력 1.3배 사다리 + 전 스테이지 공통 스폰 앵커 ────────────
// 런타임 좀비 스폰 경로는 이 버스트 표 / 마틸다 / 오버타임 3개뿐이고, 240초 스테이지에서는
// 오버타임(300초 시작)이 발화하지 않는다. 따라서 "스테이지 총 HP"는 이 표만으로 결정된다
// — 웨이브 타임라인(waveTimelines.js)은 밀도 파생용 분석 데이터일 뿐 스폰을 만들지 않는다.
// 그래서 이 파일에서 총량을 단언하는 것이 곧 실제 게임 총량을 단언하는 것이다.
describe('스테이지 총체력 1.3배 사다리 (스1 앵커 고정)', () => {
  const STAGE_HP_MULTIPLIER = { stage1: 1, stage2: 1.2, stage3: 1.44, stage4: 1.728, stage5: 1.2 ** 4 }
  const BASE_HP = {
    E01: 8, E02: 70, E03: 10, E04: 32, E05: 70, E06: 320, E07: 16,
    RZL: 90, RZC: 28, RZT: 140, RZG: 48,
    // Track B 신규 12종 — host와 동일 base hp. appliedHp가 base에 round를 적용한 뒤 count를 곱하므로
    // 'E01×6' → 'E01×3 + E36×3' 같은 교체는 총합이 정확히 보존된다.
    ...NOVEL_BASE_HP,
    // B03만 1246 — 2026-08-24 사용자 지시("스3 보스 = 스2 보스 × 1.3")를 stage3 배수 1.44로
    // 역산한 base다. 실효 HP는 round(1246 × 1.44) = 1,794 = round(1150 × 1.2) × 1.3.
    B01: 1150, B02: 1150, B03: 1246, B04: 1500,
    // B10 교감 좀비(Stage 5): 실효 round(1563 × 2.0736) = 3,241 = S4 B04 2,592 × 1.25.
    B10: 1563,
  }
  // 런좀비 크루 인원은 evt.count가 아니라 Enemies.jsx의 RUN_ZOMBIE_CREW_SIZE가 정한다(리더 1 + 수하 8).
  const CREW_SIZE = 9
  const GUARD_CHASE_SIZE = 7
  const SPAWN_ANCHORS = [5, 24, 40, 60, 72, 108, 110, 120, 144, 150, 168, 184, 216]
  // 스1 3,710(사용자가 실플레이로 맞춘 정본) 기준 ×1.3^n.
  const STAGE1_TOTAL_HP = 3710
  // stage3 실측 정본. 2026-08-24 두 건의 사용자 지시가 누적된 값이다.
  //   (1) B03 실효 HP 1,656 → 1,794(= 스2 보스 1,380 × 1.3) : +138
  //   (2) 보스 구간 10초 반복 증원(150~300 exclusive, E01×10 + E07×3, 15 tick) : +2,835
  //   5,241 + 138 + 2,835 = 8,214. 스4 8,169를 앞선다.
  // 2026-08-24 사용자 판정 — E01 증원은 XP 공급도 함께 늘리므로 총 HP 사다리로 stage3 난이도를
  // 재지 않는다. 1.3 사다리에서의 이탈은 의도된 것이며 되돌리지 않는다.
  // 2026-11-14 2차 신규: 드리블 E96은 스3에 같은 hp 자리가 남지 않아(유일한 E01 행은 블록 좀비 몫) 40초 순증 1기다
  // — round(16 × 1.44) = 23. 8,214 → 8,237. 블록 좀비 맞교환은 전부 같은 hp라 그대로다.
  // 2026-11-16 좀비 배치 총검토 S3 재결정: 체육관 컨셉으로 표를 갈아엎은 안(8,303)은 S3 봇 사망률 +12~16pp(300시드, p < 0.004)로
  // 기준을 넘어 되돌렸다. 23df529d 표 그대로 + 216초 E40 복습 삭제(−101) + 184초 E58·E82·E62 추가(12 + 23 + 101) + 216초 E82 복습(23, 216초 앵커 유지)
  // → 8,237 + 58 = 8,295.
  const STAGE3_MEASURED_TOTAL_HP = 8295
  const TARGETS = {
    stage1: STAGE1_TOTAL_HP,
    stage2: Math.round(STAGE1_TOTAL_HP * 1.3),
    stage4: Math.round(STAGE1_TOTAL_HP * 1.3 ** 3),
    stage5: Math.round(STAGE1_TOTAL_HP * 1.3 ** 4),
  }
  // 버스트 표 밖에서 확정 발화하는 HP. Stage 5 B10 교무회의 소집(HP 85/50/25% 각 1회, E57+E51+E54 = 228) 최대 3회.
  const LADDER_FIXED_EXTRA_HP = { stage5: STAGE5_B10_SUMMON_FIXED_HP }
  // 사다리 단언 대상. stage3는 위 판정으로 사다리를 적용하지 않으므로 명시적으로 제외한다
  // — 위반 항목을 필터로 걸러 초록을 만드는 2026-08-19식 사고를 반복하지 않기 위해,
  // "제외"를 여기 한 줄로 못박고 stage3 총량은 아래 실측 단언이 따로 고정한다.
  const LADDER_STAGES = ['stage1', 'stage2', 'stage4', 'stage5']

  const appliedHp = (type, stageId) => Math.round(BASE_HP[type] * STAGE_HP_MULTIPLIER[stageId])
  const eventHp = (event, stageId) => {
    if (event.formation === RUN_ZOMBIE_CREW_FORMATION) {
      return appliedHp('RZL', stageId) + appliedHp('RZC', stageId) * (CREW_SIZE - 1)
    }
    if (event.formation === STAGE2_GUARD_CHASE_FORMATION) {
      return appliedHp('RZT', stageId) + appliedHp('RZG', stageId) * (GUARD_CHASE_SIZE - 1)
    }
    return appliedHp(event.type, stageId) * (event.count ?? 1)
  }
  // 2026-08-19: 여기 있던 stage3 25초 보강 면제 필터를 제거했다. 사다리를 지키라고 만든 단언이
  // 위반 항목만 골라 빼고 통과하던 상태였다(스3 실측 6,833 = 목표 +8.98%인데 테스트는 초록).
  // 이제 반복 이벤트를 tick 수만큼 전개해 런타임이 실제로 스폰하는 전량을 센다.
  const eventTotalHp = (event, stageId) => eventHp(event, stageId)
    * (isRepeatingBurstEvent(event) ? repeatingBurstTickCount(event) : 1)
  // 치프(lib/stageChiefContent.js)는 잡몹 사다리 밖의 순증이다 — 사다리 총량에서 빼고 아래 치프 단언이 따로 못박는다.
  const stageTotalHp = (stageId) => getRuntimeBurstEventsForStage(stageId)
    .filter((event) => !isChiefType(event.type))
    .reduce((sum, event) => sum + eventTotalHp(event, stageId), 0)

  // 2026-11-15: 치프 실효 HP는 balanceqa wave 2 권고값 — 스1 E89 120, 스2 E92 머리 120, 스3 E95 몸 40(두 몸 80).
  it('치프는 스테이지마다 작성 행 1개·몸 수만큼이고, 순증은 base × 스테이지 배수다(E89 120 · E92 120 · E95 몸 40)', () => {
    const chiefRows = (stageId) => getRuntimeBurstEventsForStage(stageId).filter((event) => isChiefType(event.type))
    expect(chiefRows('stage1')).toEqual([{ sec: 108, type: 'E89', count: 1 }])
    expect(Math.round(NOVEL2_ZOMBIE_STATS.E89.hp * STAGE_HP_MULTIPLIER.stage1)).toBe(120)
    expect(Math.round(NOVEL2_ZOMBIE_STATS.E92.hp * STAGE_HP_MULTIPLIER.stage2)).toBe(120)
    expect(Math.round(NOVEL2_ZOMBIE_STATS.E95.hp * STAGE_HP_MULTIPLIER.stage3)).toBe(40)
    // 2026-11-15 wave 2: Stage 2 E92 기관사(머리 1 — 객차 E01은 머리가 직접 세운다, 144초 앵커), Stage 3 E95 줄넘기 듀오(몸 2).
    expect(chiefRows('stage2')).toEqual([{ sec: 144, type: 'E92', count: 1 }])
    expect(chiefRows('stage3')).toEqual([{ sec: 110, type: 'E95', count: 2 }])
    // 2026-11-16 wave 3: Stage 4 E98 대식가 72초(실효 173), Stage 5 E101 복사기 40초(실효 187), Stage 6 E104 공굴리기 대장 72초(절대 250).
    expect(chiefRows('stage4')).toEqual([{ sec: 72, type: 'E98', count: 1 }])
    expect(chiefRows('stage5')).toEqual([{ sec: 40, type: 'E101', count: 1 }])
    expect(chiefRows('stage6')).toEqual([{ sec: 72, type: 'E104', count: 1 }])
    expect(Math.round(NOVEL2_ZOMBIE_STATS.E98.hp * STAGE_HP_MULTIPLIER.stage4)).toBe(173)
    expect(Math.round(NOVEL2_ZOMBIE_STATS.E101.hp * STAGE_HP_MULTIPLIER.stage5)).toBe(187)
    expect(isNovel2AbsoluteHp('E104')).toBe(true)
    expect(NOVEL2_ZOMBIE_STATS.E104.hp).toBe(250)
    for (const stageId of ['stage2', 'stage3', 'stage4', 'stage5', 'stage6']) {
      const rows = chiefRows(stageId)
      expect(rows.length).toBeLessThanOrEqual(1)
      for (const row of rows) expect(row.count).toBe(chiefBodyCount(row.type))
    }
  })

  it.each(LADDER_STAGES)('%s 총 HP(보스 포함)는 현재 정본 목표의 ±2% 안이다', (stageId) => {
    const total = stageTotalHp(stageId) + (LADDER_FIXED_EXTRA_HP[stageId] ?? 0)
    const target = TARGETS[stageId]
    expect(Math.abs(total / target - 1)).toBeLessThanOrEqual(0.02)
  })

  // stage3는 사다리 밖이다(위 LADDER_STAGES 주석 참조). 대신 실측 총량을 정확히 못박아
  // "모르는 사이에 흘러가는" 일이 없게 한다 — 예외는 검증 면제가 아니라 다른 규칙이다.
  it('stage3 총 HP는 사다리 대신 실측 정본으로 고정된다', () => {
    expect(stageTotalHp('stage3')).toBe(STAGE3_MEASURED_TOTAL_HP)
    // 스4를 앞서는 것이 현재 정상 상태다. 이 관계가 뒤집히면 누가 편성을 되돌린 것이다.
    expect(stageTotalHp('stage3')).toBeGreaterThan(stageTotalHp('stage4'))
  })

  it('실측 총 HP는 스1 고정, 스2는 스1의 1.3배 사다리를 지킨다', () => {
    const totals = ['stage1', 'stage2', 'stage3', 'stage4'].map(stageTotalHp)
    // 스1은 사용자 정본이라 절대 변하지 않는다 — 이 단언이 앵커를 지킨다.
    expect(totals[0]).toBe(STAGE1_TOTAL_HP)
    // 2026-11-16 좀비 배치 총검토: 스2 4,838 → 4,911(+1.8%), 스4 8,169 → 8,188(+0.5%). 스1 3,710 그대로.
    expect(totals).toEqual([3710, 4911, STAGE3_MEASURED_TOTAL_HP, 8188])
    expect(totals[1] / totals[0]).toBeGreaterThanOrEqual(1.27)
    expect(totals[1] / totals[0]).toBeLessThanOrEqual(1.33)
  })

  it.each(allStageBurstTables)('%s 단발 이벤트 sec은 보스를 빼면 공통 13개 앵커의 부분집합이다', (_stageId, events) => {
    const secs = uniqueSeconds(stageZombieEvents(singleShotEvents(events)))
    expect(secs.filter((sec) => !SPAWN_ANCHORS.includes(sec))).toEqual([])
  })

  it('stage3 이전 런좀비 복원 예외 외에는 단발 이벤트로 13개 앵커를 빠짐없이 쓴다', () => {
    // 2026-11-04: 168초에 E40 첫 등장(216초 2기 중 1기를 당김)이 들어와 스3 앵커가 하나 늘었다.
    const stage3RestoredRunCrewAnchors = [5, 24, 40, 60, 72, 110, 120, 150, 168, 184, 216]
    for (const [stageId, events] of allStageBurstTables) {
      const secs = uniqueSeconds(stageZombieEvents(singleShotEvents(events)))
      expect(secs).toEqual(stageId === 'stage3' ? stage3RestoredRunCrewAnchors : SPAWN_ANCHORS)
    }
  })

  // 앵커 불변식의 유일한 예외를 "면제"가 아니라 "별도 규칙"으로 명시 검증한다.
  // 반복 보강은 정의상 고정 간격으로 발화하므로 13개 앵커에 맞출 수 없다. 대신 아래를 강제한다:
  //   (1) 반복 이벤트가 존재하는 스테이지는 stage3 하나뿐이다(무단 확산 방지),
  //   (2) 전개된 발화 시각이 [start, endExclusive) 안의 균일 간격이고,
  //   (3) 각 계열이 자기 창 [start, endExclusive) 안에서만 발화한다.
  // 총 HP 단언은 이 예외를 봐주지 않는다 — stageTotalHp는 tick 전개분을 전부 센다.
  //
  // 2026-08-24: 반복 계열이 하나에서 둘로 늘었다. 사용자 지시로 보스 구간(150~300 exclusive)
  // 10초 증원이 추가되면서 "마지막 tick이 보스 등장보다 앞선다"는 옛 규칙 (3)은 폐기됐다.
  // 두 계열은 reinforcement 태그로 구분하며 창이 겹치지 않는다(25초 계열은 150에서 끝난다).
  const REPEATING_FAMILIES = {
    [STAGE3_25_SECOND_REINFORCEMENT]: { secs: [25, 50, 75, 100, 125], counts: { E01: 3, E07: 3 } },
    [STAGE3_BOSS_PHASE_REINFORCEMENT]: {
      secs: [150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290],
      counts: { E01: 10, E07: 3 },
    },
  }

  // 2026-11-08 Stage 5 교무실: 반복 계열 2개가 더 생겼다 — 보스 구간 잡몹 유지(160~240, 20초)와
  // 전교 호출 방송(73~240, 60초 = 73·133·193). 둘 다 reinforcement 태그로 계열을 밝힌다.
  Object.assign(REPEATING_FAMILIES, {
    [STAGE5_BOSS_PHASE_REINFORCEMENT]: { secs: [160, 180, 200, 220], counts: { E01: 6, E07: 2 } },
    [STAGE5_CALL_LANE_REINFORCEMENT]: { secs: [73, 133, 193], counts: { E03: 8, E07: 2 } },
  })
  const REPEATING_STAGE_EVENT_COUNT = { stage3: 4, stage5: 4 }

  it('반복 보강은 stage3·stage5 전용 명시 예외이며 계열별 균일 간격 규칙을 지킨다', () => {
    for (const [stageId, events] of allStageBurstTables) {
      const repeating = events.filter(isRepeatingBurstEvent)
      if (!REPEATING_STAGE_EVENT_COUNT[stageId]) {
        expect(repeating).toEqual([])
        continue
      }
      // 두 계열 × 두 타입 = 4건. 태그 없는 반복 이벤트가 끼어들면 여기서 걸린다.
      expect(repeating).toHaveLength(REPEATING_STAGE_EVENT_COUNT[stageId])
      for (const event of repeating) {
        const family = REPEATING_FAMILIES[event.reinforcement]
        expect(family).toBeDefined()
        const ticks = repeatingBurstTickCount(event)
        const secs = Array.from({ length: ticks }, (_, tick) => repeatingBurstSecAtTick(event, tick))
        expect(secs).toEqual(family.secs)
        expect(secs.every((sec) => sec >= event.sec && sec < event.endExclusiveSec)).toBe(true)
        // 반복 보강 풀은 경량대(E01 8hp·E03 10hp·E07 16hp)로 제한한다 — 확정 발화라 무거운 타입은 예산을 뚫는다.
        expect(['E01', 'E03', 'E07']).toContain(event.type)
        expect(event.count).toBe(family.counts[event.type])
      }
    }
  })

  // 2026-08-24 사용자 지시 전용 단언: "보스 출현(150) 뒤부터 5분 이전까지 10초에 한 번씩
  // 기본녹색좀비 10마리 + 웃는좀비 3마리". 지시의 네 숫자를 그대로 고정한다.
  it('stage3 보스 구간 증원은 150초 시작·10초 주기·300초 미만 종료로 15회 발화한다', () => {
    const bossPhase = STAGE3_BURST_EVENTS.filter((e) => e.reinforcement === STAGE3_BOSS_PHASE_REINFORCEMENT)
    expect(bossPhase.map((e) => e.type)).toEqual(['E01', 'E07'])
    expect(bossPhase.map((e) => e.count)).toEqual([10, 3])
    for (const event of bossPhase) {
      expect(event.sec).toBe(getBossSpawnSec('stage3'))   // 보스 출현 시각과 같은 150초
      expect(event.sec).toBe(150)
      expect(event.repeatIntervalSec).toBe(10)
      expect(event.endExclusiveSec).toBe(300)
      expect(repeatingBurstTickCount(event)).toBe(15)
      expect(repeatingBurstSecAtTick(event, 0)).toBe(150)
      expect(repeatingBurstSecAtTick(event, 14)).toBe(290)  // 마지막 발화 < 300
      expect(repeatingBurstSecAtTick(event, 15)).toBeNull()
    }
    // 전개 총량: (10 + 3) × 15 = 195마리, HP는 (10×12 + 3×23) × 15 = 2,835.
    const bodies = bossPhase.reduce((sum, e) => sum + e.count * repeatingBurstTickCount(e), 0)
    const hp = bossPhase.reduce((sum, e) => sum + eventTotalHp(e, 'stage3'), 0)
    expect(bodies).toBe(195)
    expect(hp).toBe(2835)
  })

  // 회귀 방어: 반복 보강 두 계열의 전개 총량을 계열별로 못 박는다.
  // 이 값이 움직이면 위 stage3 총 HP 단언이 같이 깨지도록 함께 둔다.
  it('stage3 25초 반복 보강의 전개 총량은 30마리·525 HP다', () => {
    const repeating = STAGE3_BURST_EVENTS.filter((e) => e.reinforcement === STAGE3_25_SECOND_REINFORCEMENT)
    const bodies = repeating.reduce((sum, event) => sum + event.count * repeatingBurstTickCount(event), 0)
    const hp = repeating.reduce((sum, event) => sum + eventTotalHp(event, 'stage3'), 0)
    expect(bodies).toBe(30)
    expect(hp).toBe(525)
    expect(stageTotalHp('stage3')).toBe(STAGE3_MEASURED_TOTAL_HP)
  })

  it('보스 시각은 네 스테이지 모두 사용자 지정 150초다', () => {
    expect(getBossSpawnSec('stage1')).toBe(150)
    expect(getBossSpawnSec('stage2')).toBe(150)
    expect(getBossSpawnSec('stage3')).toBe(150)
    expect(getBossSpawnSec('stage4')).toBe(150)
    expect(getBossSpawnSec('stage5')).toBe(150)
  })

  it('한 앵커에 몰린 스폰도 동시 상한 150을 넘지 않는다', () => {
    for (const [, events] of allStageBurstTables) {
      const perSec = new Map()
      for (const event of stageZombieEvents(events)) {
        const bodies = event.formation === RUN_ZOMBIE_CREW_FORMATION || event.formation === STAGE2_GUARD_CHASE_FORMATION
          ? CREW_SIZE
          : (event.count ?? 1)
        perSec.set(event.sec, (perSec.get(event.sec) ?? 0) + bodies)
      }
      expect(Math.max(...perSec.values())).toBeLessThanOrEqual(150)
    }
  })
})

// 2026-11-08: 확장 스테이지는 데이터 bonusEvents를 런타임이 읽는다(예전에는 공통 표만 붙였다). 값은 같은 90·180초 E08×1이고
// rewardEvent가 붙어 자리를 못 받으면 재시도 대상이 된다.
describe('expansion bonusEvents runtime', () => {
  it('stage6~10 런타임 스폰 표 끝의 코인 몬스터는 데이터 bonusEvents와 같고 rewardEvent를 가진다', async () => {
    const { EXPANSION_STAGES } = await import('./expansionContent.js')
    for (const stage of Object.values(EXPANSION_STAGES)) {
      const tail = getRuntimeSpawnEventsForStage(stage.id).slice(-stage.bonusEvents.length)
      expect(tail).toEqual(stage.bonusEvents.map((e) => ({ sec: e.sec, type: e.type, count: e.count, rewardEvent: 'coinMonster' })))
    }
    expect(getRuntimeSpawnEventsForStage('stage4').slice(-2)).toEqual([...COIN_MONSTER_RUNTIME_EVENTS])
  })
})

// 2026-11-13 Stage 6 재조정(levelmini): 1부 피날레는 가장 어려워야 하지만 S5에서 한 계단만 올라야 한다.
// 총량은 S5 실측 10,604의 1.3배 사다리 근처, 오프닝 60초는 예전 2.09배 급등 대신 ≤ 1.6배로 묶는다.
describe('Stage 5 → Stage 6 한 계단 상승', () => {
  const S5_MULT = 1.2 ** 4
  const S5_HP = { E01: 8, E02: 70, E03: 10, E04: 32, E05: 70, E06: 320, E07: 16, ...NOVEL_BASE_HP, B10: 1563 }
  const s5Hp = (event) => Math.round(S5_HP[event.type] * S5_MULT) * (event.count ?? 1)
    * (isRepeatingBurstEvent(event) ? repeatingBurstTickCount(event) : 1)

  it('S6 총 HP(B05 + 시간 소환 3~4회)는 S5의 1.25~1.33배, 오프닝 60초는 1.0~1.6배', async () => {
    const { EXPANSION_STAGES, EXPANSION_ENEMIES, EXPANSION_BOSSES } = await import('./expansionContent.js')
    const s6Mult = EXPANSION_STAGES.stage6.existingEnemyHpMultiplier
    // E105(2인3각, 2026-11-14)은 Stage 6 절대 HP(30)라 기존 종 배수를 타지 않는다.
    const s6Hp = (event) => (EXPANSION_ENEMIES[event.type]?.hp ?? EXPANSION_BOSSES[event.type]?.hp
      ?? (isNovel2AbsoluteHp(event.type) ? NOVEL2_ZOMBIE_STATS[event.type].hp : undefined)
      ?? Math.round(S5_HP[event.type] * s6Mult)) * (event.count ?? 1)
    // 치프(2026-11-16 wave 3: 스5 E101 40초·스6 E104 72초)는 사다리 밖 순증 — 총 HP·오프닝 비교에서 뺀다.
    const s5Total = STAGE5_BURST_EVENTS.filter((event) => !isChiefType(event.type)).reduce((sum, event) => sum + s5Hp(event), 0) + STAGE5_B10_SUMMON_FIXED_HP
    expect(s5Total).toBe(10620)
    const summon = EXPANSION_BOSSES.B05.summon
    const summonHp = summon.count * EXPANSION_ENEMIES[summon.type].hp
    const s6Events = getBurstEventsForStage('stage6').filter((event) => !isChiefType(event.type))
    const s6Base = s6Events.reduce((sum, event) => sum + s6Hp(event), 0)
    for (const summons of [3, 4]) {
      const ratio = (s6Base + summons * summonHp) / s5Total
      expect(ratio, `${summons} summons`).toBeGreaterThanOrEqual(1.25)
      expect(ratio, `${summons} summons`).toBeLessThanOrEqual(1.33)
    }
    const opening = (events, hp) => events.filter((event) => event.sec < 60 && !isBossType(event.type)).reduce((sum, event) => sum + hp(event), 0)
    const s5Opening = opening(STAGE5_BURST_EVENTS.filter((event) => !isChiefType(event.type)), s5Hp)
    const s6Opening = opening(s6Events, s6Hp)
    // 2026-11-14 2차 신규: E105 쌍은 150·168초 E01 3기씩(실효 20 × 3 = 절대 30 × 2) 자리라 오프닝 1,296 그대로.
    // 2026-11-16 좀비 배치 총검토: 스5 오프닝 832 → 790(40초 E02 A1 포함), 스6 오프닝 1,296 → 1,261(8초 E04 1기 → E87, 44초 E83).
    expect([s5Opening, s6Opening]).toEqual([790, 1261])
    expect(s6Opening / s5Opening).toBeGreaterThanOrEqual(1)
    expect(s6Opening / s5Opening).toBeLessThanOrEqual(1.6)
  })
})
