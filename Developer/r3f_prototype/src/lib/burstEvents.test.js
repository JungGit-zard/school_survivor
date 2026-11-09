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
const ORDINARY_ZOMBIE_TYPE_RE = /^E(?:0[1-7]|3[4-9]|4[0-9]|5[0-9]|60)$/
// 신규 12종의 base hp는 대체 대상(host)과 같은 값으로 못박혀 있다(Enemy.jsx NOVEL_ZOMBIE_STATS).
// 그래서 아래 모든 총 HP 단언의 기대값이 교체 전후로 변하지 않는다.
const NOVEL_BASE_HP = { E34: 8, E35: 10, E36: 8, E37: 8, E38: 10, E39: 16, E40: 70, E41: 10, E42: 70, E43: 70, E44: 16, E45: 10,
  // 투사체 좀비 15종 — host와 같은 base hp(lib/projectileZombieBehavior.js PROJECTILE_ZOMBIE_STATS).
  E46: 8, E47: 16, E48: 16, E49: 70, E50: 16, E51: 8, E52: 32, E53: 10, E54: 32, E55: 70, E56: 70, E57: 70, E58: 8, E59: 70, E60: 16,
  // 2차 10종(2026-11-07) — host와 같은 base hp.
  E61: 70, E62: 70, E63: 32, E64: 8, E65: 8, E66: 16, E67: 70, E68: 10, E69: 16, E70: 10 }
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
      // 2026-10-25 Track B: 24초 E01×9 → E01×5 + E34×4, 60초 E01×6 → E01×3 + E36×3,
      // 72초 E03×2 → E35×2. 전부 hp 동일 교체라 마릿수 92와 총 HP 3,710이 그대로다.
      { sec: 24, type: 'E01', count: 5 }, { sec: 24, type: 'E34', count: 4 },
      { sec: 40, type: 'E01', count: 6 }, { sec: 40, type: 'E07', count: 3 },
      // 2026-11-04 분산 재배치: 60초 E36×3 → E34×3(복습, E02 첫 등장과 새 패턴 분리),
      // 108초 혼합 E01×6 → E01×3 + E36×3(E36 단독 도입), 184초 혼합 E01×6 → E01×2 + E34×2 + E36×2(후반 조합).
      // 전부 hp 8 맞교환이라 마릿수와 총 HP가 그대로다.
      { sec: 60, type: 'E01', count: 3 }, { sec: 60, type: 'E34', count: 3 },
      // 2026-11-07 2차 10종: 60초 E07×6 → E07×5 + E66(첫 등장), 120초 E05×3 → E05×2 + E62(첫 등장). 둘 다 탄 없음, hp 맞교환.
      { sec: 60, type: 'E07', count: 5 }, { sec: 60, type: 'E66', count: 1 }, { sec: 60, type: 'E02', count: 2 },
      { sec: 72, type: 'E35', count: 2 },
      { sec: 108, type: 'E01', count: 3 }, { sec: 108, type: 'E36', count: 3 }, { sec: 108, type: 'E02', count: 3 },
      { sec: 110, type: 'E07', count: 3 }, { sec: 110, type: 'E02', count: 3 },
      // 2026-11-04 투사체 좀비: 144초 E05×3 → E05×2 + E56(첫 등장), 184초 E02×3 → E02×2 + E49(첫 등장),
      // 216초 E05×3 → E05×2 + E56(복습). 스1은 피해를 주지 않는 두 종만 쓴다. 전부 hp 70 맞교환.
      { sec: 120, type: 'E05', count: 2 }, { sec: 120, type: 'E62', count: 1 },
      { sec: 144, type: 'E05', count: 2 }, { sec: 144, type: 'E56', count: 1 },
      { sec: 150, type: 'E07', count: 6 }, { sec: 150, type: 'E01', count: 6 },
      { sec: 168, type: 'E06', count: 1 },
      { sec: 184, type: 'E01', count: 2 }, { sec: 184, type: 'E34', count: 2 }, { sec: 184, type: 'E36', count: 2 },
      { sec: 184, type: 'E02', count: 2 }, { sec: 184, type: 'E49', count: 1 }, { sec: 184, type: 'E05', count: 2 },
      { sec: 216, type: 'E05', count: 2 }, { sec: 216, type: 'E56', count: 1 },
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
    const ordinary = stageZombieEvents(STAGE2_BURST_EVENTS)

    expect(ordinary.map(payloadWithoutSec)).toEqual([
      // 2026-10-25 Track B: 5초 E01×12 → E01×7 + E37×5, 24초 E03×6 → E03×3 + E38×3,
      // 108초 E07×6 → E07×3 + E39×3. hp 동일 교체라 마릿수 95와 적용 HP 3,458이 불변이다.
      { type: 'E01', count: 7 },
      { type: 'E37', count: 5 },
      { type: 'E03', count: 3 },
      { type: 'E38', count: 3 },
      // 2026-11-04 투사체 좀비: 60·108초 E07 1기씩 → E47, 120초 E05 1기 → E49, 216초 E05 1기 → E56,
      // 150초 E37 1기 → 144초 E51, 216초 E34 1기 → 184초 E46, 216초 E37 1기 → E51. 전부 hp 동일, 마릿수 95 불변.
      { type: 'E07', count: 4 },
      { type: 'E47', count: 1 },
      // 2026-11-07 2차 10종: 72초 E04 1기 → E63, 120초 E05 1기 → E67, 40초 스웜 E01 1기 → E65. 전부 hp 동일, 마릿수 95 불변.
      { type: 'E04', count: 1 },
      { type: 'E63', count: 1 },
      { type: 'E07', count: 2 },
      { type: 'E47', count: 1 },
      { type: 'E39', count: 3 },
      { type: 'E05', count: 1 },
      { type: 'E67', count: 1 },
      { type: 'E49', count: 1 },
      { type: 'E51', count: 1 },
      { type: 'E06', count: 1 },
      { type: 'E05', count: 3 },
      { type: 'E46', count: 1 },
      { type: 'E05', count: 2 },
      { type: 'E56', count: 1 },
      // 2026-11-04 분산 재배치: 혼합 보강 E01 몫 7마리(150초 3 + 216초 4)를 같은 hp 8의 E37/E34로 옮겼다.
      { type: 'E37', count: 2 },
      { type: 'E37', count: 1 },
      { type: 'E51', count: 1 },
      { type: 'E34', count: 1 },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'E01', count: 7, formation: 'swarm' },
      { type: 'E65', count: 1 },
      { type: 'E03', count: 6, formation: 'ring' },
      { type: 'E02', count: 2, formation: 'pincer' },
      { type: 'E07', count: 3 },
      { type: 'E02', count: 3 },
      { type: 'E01', count: 5, mixedTypes: ['E01', 'E03'], reinforcement: 'stage2MixedReinforcement' },
      { type: 'E01', count: 6, mixedTypes: ['E01', 'E03'], reinforcement: 'stage2MixedReinforcement' },
    ])
    expect(ordinary.reduce((sum, event) => sum + (event.count ?? 1), 0)).toBe(95)
    expect(declaredCountByType(ordinary)).toEqual({ E01: 25, E37: 8, E34: 1, E02: 5, E03: 9, E38: 3, E04: 1, E05: 6, E06: 1, E07: 9, E39: 3, RZT: 14,
      E46: 1, E47: 2, E49: 1, E51: 2, E56: 1, E63: 1, E65: 1, E67: 1 })
    expect(stage2HpMultipliedBurstHp(ordinary)).toBe(3458)
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
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 60, type: 'E07', count: 4 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 60, type: 'E47', count: 1 })
    // 2026-10-25 Track B: 108초 6마리 중 3마리를 E39(선끝접기형)가, 2026-11-04 1마리를 E47이 대체한다. 합은 6마리다.
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E07', count: 2 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E47', count: 1 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E39', count: 3 })
  })
})

describe('Stage 1 2:30 웃는좀비·녹색좀비 보강', () => {
  // 2026-08-13 스폰 +10%: 5→6. E01 쪽은 경량대 랜덤 구성(mixedTypes)이 붙었다.
  it('stage1만 150초에 E07 6마리와 E01 6마리를 정확히 추가한다', () => {
    expect(BURST_EVENTS.filter((event) => event.sec === 150 && event.type === 'E07' && event.count === 6)).toHaveLength(1)
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
  it('stage1에만 정확히 E01 6마리와 E07 3마리를 추가한다', () => {
    expect(BURST_EVENTS.filter((event) => event.sec === 40 && event.type === 'E01' && event.count === 6)).toHaveLength(1)
    expect(BURST_EVENTS.filter((event) => event.sec === 40 && event.type === 'E07' && event.count === 3)).toHaveLength(1)
  })

  it.each([
    ['stage2', STAGE2_BURST_EVENTS],
    ['stage3', STAGE3_BURST_EVENTS],
    ['stage4', STAGE4_BURST_EVENTS],
  ])('%s에는 이 40초 추가 스폰이 없다', (_stageId, events) => {
    const baseEvents = singleShotEvents(events)
    expect(baseEvents.filter((event) => event.sec === 40 && event.type === 'E01' && event.count === 6)).toHaveLength(0)
    expect(baseEvents.filter((event) => event.sec === 40 && event.type === 'E07' && event.count === 3)).toHaveLength(0)
  })

  it('런타임 스케줄에도 동일하게 포함한다', () => {
    const runtime = getRuntimeBurstEventsForStage('stage1')
    expect(runtime).toContainEqual({ sec: 40, type: 'E01', count: 6 })
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
    const ordinary = singleShotEvents(STAGE3_BURST_EVENTS).filter((event) => !isBossType(event.type))
    expect(uniqueSeconds(ordinary)).toEqual([5, 24, 40, 60, 72, 110, 120, 150, 168, 184, 216])
    expect(ordinary.map(payloadWithoutSec)).toEqual([
      // 2026-10-25 Track B: 24초 E03×4 → E03×2 + E41×2, 216초 E05×3 → E05×1 + E40×2,
      // 120초 포위 E05×3 → E42×3(타입 전량 교체). hp 동일 교체라 마릿수 52와 실제 HP 3,220이 불변이다.
      // 2026-11-04 분산 재배치: 5초 E01×10 → E01×7 + E37×3(스2 복습), 216초 E40×2 중 1기를 168초로
      // 당겨 탈출 전 첫 등장을 만든다. hp 동일 맞교환·이동이라 마릿수·HP 불변.
      // 2026-11-04 투사체 좀비: 5초 E37 1기 → E46(스2 복습), 216초 E05×1 → 72초 E57(첫 등장). hp 동일.
      // 2026-11-07 2차 10종: 5초 E01 1기 → E64(첫 등장), 60초 포위 E03 1기 → E68(첫 등장, 단독 행). hp 동일.
      { type: 'E01', count: 6 }, { type: 'E64', count: 1 }, { type: 'E37', count: 2 }, { type: 'E46', count: 1 }, { type: 'E03', count: 2 }, { type: 'E41', count: 2 },
      { type: 'E04', count: 1 }, { type: 'E05', count: 1 }, { type: 'E57', count: 1 },
      { type: 'E40', count: 1 }, { type: 'E40', count: 1 },
      { type: 'RZL', count: 13, formation: RUN_ZOMBIE_CREW_FORMATION },
      { type: 'E07', count: 3 }, { type: 'E02', count: 3 },
      { type: 'E03', count: 5, formation: 'ring' }, { type: 'E68', count: 1 }, { type: 'E42', count: 3, formation: 'ring' },
      { type: 'E02', count: 3, formation: 'pincer' },
      { type: 'E06', count: 2, formation: 'pincer' },
    ])
    expect(ordinary.reduce((sum, event) => sum + event.count, 0)).toBe(52)
    const nonCrewHp = ordinary.reduce((sum, event) => sum + ({
      E01: 12, E02: 101, E03: 14, E04: 46, E05: 101, E06: 461, E07: 23,
      // host와 같은 stage3 실효 HP: E41←E03(14), E40←E05(101), E42←E02(101).
      E40: 101, E41: 14, E42: 101, E37: 12,
      // 투사체 좀비: E46←E01(12), E57←E05(101).
      E46: 12, E57: 101,
      // 2차 10종: E64←E01(12), E68←E03(14).
      E64: 12, E68: 14,
    }[event.type] ?? 0) * event.count, 0)
    expect(nonCrewHp + Math.round(90 * 1.44) + 12 * Math.round(28 * 1.44)).toBe(3220)
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

  it('Stage 3 공통 앵커에 맞춘 조기 등장 버스트: E04@24·E05@40·E06@72', () => {
    const at = (sec, type) => STAGE4_BURST_EVENTS.some((e) => e.sec === sec && e.type === type && !e.formation)
    expect(at(24, 'E04')).toBe(true)
    expect(at(40, 'E05')).toBe(true)
    expect(at(72, 'E06')).toBe(true)
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
    const ordinary = STAGE4_BURST_EVENTS.filter((event) => !isBossType(event.type))
    expect(uniqueSeconds(ordinary)).toEqual([5, 24, 40, 60, 72, 108, 110, 120, 144, 150, 168, 184, 216])
    expect(ordinary.map(payloadWithoutSec)).toEqual([
      // 2026-10-25 Track B: 144초 E02×2 → E02×1 + E43×1, 150초 E03×6 → E03×3 + E45×3,
      // 168초 E07×4 → E07×2 + E44×2. hp 동일 교체라 마릿수 68과 적용 HP 5,577이 불변이다.
      // 2026-11-04 분산 재배치: 첫 등장을 E43@40 · E44@108로 앞당겼다(40초 E05×2 → E05×1 + E43×1,
      // 108초 E07×2 → E44×2). 5초 E01×10 → E01×7 + E37×3(스2 복습). 전부 hp 동일 맞교환.
      // 2026-11-04 투사체 좀비: 5초 E01 1기 → E58(첫 등장), 108초 E44 1기 → 72초 E50(첫 등장),
      // 144초 E02×1 → E57(스3 복습), 168초 E07·E44 1기씩 → E47(스2 복습)·E50(복습),
      // 216초 E05 1기 → 184초 E59(첫 등장), 1기 → 216초 E59(복습). 전부 hp 동일, 마릿수 68 불변.
      { type: 'E01', count: 6 }, { type: 'E58', count: 1 }, { type: 'E37', count: 3 }, { type: 'E04', count: 4 },
      { type: 'E05', count: 1 }, { type: 'E43', count: 1 }, { type: 'E06', count: 1 }, { type: 'E50', count: 1 },
      // 2026-11-07 2차 10종: 144초 E57 복습 → E61(첫 등장), 168초 E07 → E69(첫 등장), 60초 포위 E03 1기 → E70(첫 등장).
      { type: 'E44', count: 1 }, { type: 'E04', count: 4 },
      { type: 'E61', count: 1 }, { type: 'E43', count: 1 }, { type: 'E05', count: 3 },
      { type: 'E03', count: 3 }, { type: 'E45', count: 3 },
      { type: 'E69', count: 1 }, { type: 'E47', count: 1 }, { type: 'E44', count: 1 }, { type: 'E50', count: 1 },
      { type: 'E59', count: 1 }, { type: 'E05', count: 2 }, { type: 'E59', count: 1 },
      { type: 'E07', count: 3 }, { type: 'E02', count: 3 },
      { type: 'E03', count: 5, formation: 'ring' }, { type: 'E70', count: 1 }, { type: 'E02', count: 4, formation: 'pincer' },
      { type: 'E05', count: 4, formation: 'ring' }, { type: 'E04', count: 4, formation: 'ring' },
      { type: 'E06', count: 2, formation: 'pincer' },
    ])
    expect(ordinary.reduce((sum, event) => sum + event.count, 0)).toBe(68)
    const appliedHp = ordinary.reduce((sum, event) => sum + ({
      E01: 14, E02: 121, E03: 17, E04: 55, E05: 121, E06: 553, E07: 28,
      // host와 같은 stage4 실효 HP: E43←E02(121), E44←E07(28), E45←E03(17).
      E43: 121, E44: 28, E45: 17, E37: 14,
      // 투사체 좀비: E58←E01(14), E50·E47←E07/E44(28), E57←E02(121), E59←E05(121).
      E58: 14, E50: 28, E47: 28, E57: 121, E59: 121,
      // 2차 10종: E61←E57(121), E69←E07(28), E70←E03(17).
      E61: 121, E69: 28, E70: 17,
    }[event.type] ?? 0) * event.count, 0)
    expect(appliedHp).toBe(5577)
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

  it('E04 편성은 투사체 슬롯 포화점을 넘지 않는다 (등장당 4마리 · 총 12마리)', () => {
    expect(E04_SATURATION_SHOOTERS).toBeCloseTo(4.125, 3)
    const perBurst = Math.floor(E04_SATURATION_SHOOTERS)
    const e04Events = STAGE4_BURST_EVENTS.filter((event) => event.type === 'E04')

    expect(e04Events.map((event) => event.sec)).toEqual([24, 144, 168])
    for (const event of e04Events) expect(event.count).toBe(perBurst)

    const e04Total = e04Events.reduce((sum, event) => sum + event.count, 0)
    expect(e04Total).toBe(12)
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
    expect([...perSec.entries()].sort((a, b) => a[0] - b[0])).toEqual([[5, 2], [24, 2], [72, 1], [144, 4], [216, 1]])
    for (const count of perSec.values()) expect(count).toBeLessThanOrEqual(4)
    expect(STAGE5_BURST_EVENTS.filter((e) => e.type === 'E04' && e.sec >= 150 && e.sec < 210)).toEqual([])
    // 0~48초 포화점: 5초 2 + 24초 2 = 4.
    expect([...perSec.entries()].filter(([sec]) => sec < 48).reduce((sum, [, c]) => sum + c, 0)).toBe(4)
  })

  it('단발 82기·실효 5,305, 앵커별 합이 스펙 §15-2와 같다', () => {
    const single = singleShotEvents(STAGE5_BURST_EVENTS).filter((event) => !isBossType(event.type))
    expect(single.reduce((sum, event) => sum + event.count, 0)).toBe(82)
    const byAnchor = {}
    for (const event of single) byAnchor[event.sec] = (byAnchor[event.sec] ?? 0) + rowHp(event)
    expect(byAnchor).toEqual({ 5: 306, 24: 361, 40: 165, 60: 168, 72: 813, 108: 613, 110: 534, 120: 580, 144: 495, 150: 136, 168: 198, 184: 435, 216: 501 })
    expect(single.reduce((sum, event) => sum + rowHp(event), 0)).toBe(5305)
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

  it('총 HP 사다리: 단발 5,305 + 반복 672 + 호출 702 + B10 3,241 + 소집 684 = 10,604 (목표 10,596, ±2%)', () => {
    const total = STAGE5_BURST_EVENTS.reduce((sum, event) => sum + rowHp(event)
      * (isRepeatingBurstEvent(event) ? repeatingBurstTickCount(event) : 1), 0) + STAGE5_B10_SUMMON_FIXED_HP
    expect(applied('B10')).toBe(3241)
    expect(total).toBe(10604)
    const target = Math.round(3710 * 1.3 ** 4)
    expect(target).toBe(10596)
    expect(Math.abs(total / target - 1)).toBeLessThanOrEqual(0.02)
  })

  it('2차 10종 복습 3종(E70·E66·E65)은 같은 hp 맞교환으로 보존된다', () => {
    const at = (sec, type) => STAGE5_BURST_EVENTS.filter((e) => e.sec === sec && e.type === type && !isRepeatingBurstEvent(e))
      .reduce((sum, e) => sum + e.count, 0)
    expect([at(24, 'E03'), at(24, 'E70')]).toEqual([3, 1])
    expect([at(40, 'E07'), at(40, 'E66')]).toEqual([1, 1])
    expect([at(150, 'E01'), at(150, 'E65')]).toEqual([4, 1])
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
  const STAGE3_MEASURED_TOTAL_HP = 8214
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
  const stageTotalHp = (stageId) => getRuntimeBurstEventsForStage(stageId)
    .reduce((sum, event) => sum + eventTotalHp(event, stageId), 0)

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
    expect(totals).toEqual([3710, 4838, STAGE3_MEASURED_TOTAL_HP, 8169])
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
