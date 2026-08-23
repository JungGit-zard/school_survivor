import { describe, it, expect } from 'vitest'
import {
  BURST_EVENTS,
  STAGE2_BURST_EVENTS,
  STAGE3_BURST_EVENTS,
  STAGE4_BURST_EVENTS,
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
  getBossSpawnSec,
  getBossPhaseStatus,
  isBossPhase,
} from './burstEvents.js'

const allStageBurstTables = [
  ['stage1', BURST_EVENTS],
  ['stage2', STAGE2_BURST_EVENTS],
  ['stage3', STAGE3_BURST_EVENTS],
  ['stage4', STAGE4_BURST_EVENTS],
]

const STAGE1_FIRST_WAVE_SEC = 5
const ORDINARY_ZOMBIE_TYPE_RE = /^E0[1-7]$/
const STAGE2_BASE_HP = { E01: 8, E02: 70, E03: 10, E04: 32, E05: 70, E06: 320, E07: 16, RZT: 140, RZG: 48 }
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
      { sec: 24, type: 'E01', count: 9 },
      { sec: 40, type: 'E01', count: 6 }, { sec: 40, type: 'E07', count: 3 },
      { sec: 60, type: 'E01', count: 6 }, { sec: 60, type: 'E07', count: 6 }, { sec: 60, type: 'E02', count: 2 },
      { sec: 72, type: 'E03', count: 2 },
      { sec: 108, type: 'E01', count: 6 }, { sec: 108, type: 'E02', count: 3 },
      { sec: 110, type: 'E07', count: 3 }, { sec: 110, type: 'E02', count: 3 },
      { sec: 120, type: 'E05', count: 3 }, { sec: 144, type: 'E05', count: 3 },
      { sec: 150, type: 'E07', count: 6 }, { sec: 150, type: 'E01', count: 6 },
      { sec: 168, type: 'E06', count: 1 },
      { sec: 184, type: 'E01', count: 6 }, { sec: 184, type: 'E02', count: 3 }, { sec: 184, type: 'E05', count: 2 },
      { sec: 216, type: 'E05', count: 3 },
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
      { type: 'E01', count: 12 },
      { type: 'E03', count: 6 },
      { type: 'E07', count: 5 },
      { type: 'E04', count: 2 },
      { type: 'E07', count: 6 },
      { type: 'E05', count: 3 },
      { type: 'E06', count: 1 },
      { type: 'E05', count: 3 },
      { type: 'E05', count: 3 },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'E01', count: 8, formation: 'swarm' },
      { type: 'E03', count: 6, formation: 'ring' },
      { type: 'E02', count: 2, formation: 'pincer' },
      { type: 'E07', count: 3 },
      { type: 'E02', count: 3 },
      { type: 'E01', count: 8, mixedTypes: ['E01', 'E03'], reinforcement: 'stage2MixedReinforcement' },
      { type: 'E01', count: 10, mixedTypes: ['E01', 'E03'], reinforcement: 'stage2MixedReinforcement' },
    ])
    expect(ordinary.reduce((sum, event) => sum + (event.count ?? 1), 0)).toBe(95)
    expect(declaredCountByType(ordinary)).toEqual({ E01: 38, E02: 5, E03: 12, E04: 2, E05: 9, E06: 1, E07: 14, RZT: 14 })
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
    // 이제 네 스테이지 모두 공유 배열 1건씩만 갖는다 = 배열 분리 없이 공유를 유지할 수 있는 상태다.
    expect(baseEvents.filter((event) => event.sec === 110 && event.type === 'E02' && event.count === 3)).toHaveLength(1)
  })

  it('Stage 2 웃는좀비 버스트는 사다리 예산에 맞춰 60초 5마리·108초 6마리로 재편성된다', () => {
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 60, type: 'E07', count: 5 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E07', count: 6 })
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
    expect(uniqueSeconds(ordinary)).toEqual([5, 24, 40, 60, 72, 110, 120, 150, 184, 216])
    expect(ordinary.map(payloadWithoutSec)).toEqual([
      { type: 'E01', count: 10 }, { type: 'E03', count: 4 }, { type: 'E04', count: 1 }, { type: 'E05', count: 1 },
      { type: 'E05', count: 3 },
      { type: 'RZL', count: 13, formation: RUN_ZOMBIE_CREW_FORMATION },
      { type: 'E07', count: 3 }, { type: 'E02', count: 3 },
      { type: 'E03', count: 6, formation: 'ring' }, { type: 'E05', count: 3, formation: 'ring' },
      { type: 'E02', count: 3, formation: 'pincer' }, { type: 'E06', count: 2, formation: 'pincer' },
    ])
    expect(ordinary.reduce((sum, event) => sum + event.count, 0)).toBe(52)
    const nonCrewHp = ordinary.reduce((sum, event) => sum + ({ E01: 12, E02: 101, E03: 14, E04: 46, E05: 101, E06: 461, E07: 23 }[event.type] ?? 0) * event.count, 0)
    expect(nonCrewHp + Math.round(90 * 1.44) + 12 * Math.round(28 * 1.44)).toBe(3220)
    // 거대는 184초 앞뒤 벽 한 곳으로 모았다 — pincer는 ×2라야 성립하므로 ×1짜리 110초 건을 뺐다.
    expect(ordinary.filter((event) => event.type === 'E06').map(payloadWithoutSec))
      .toEqual([{ type: 'E06', count: 2, formation: 'pincer' }])
  })
})

describe('보스 타입 단일 소스(isBossType) + B04 배선', () => {
  it('BOSS_BURST_TYPES는 B01~B04를 포함하고 isBossType이 판별한다', () => {
    expect(BOSS_BURST_TYPES).toEqual(['B01', 'B02', 'B03', 'B04'])
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
      { type: 'E01', count: 10 }, { type: 'E04', count: 4 }, { type: 'E05', count: 2 }, { type: 'E06', count: 1 },
      { type: 'E07', count: 2 }, { type: 'E04', count: 4 }, { type: 'E02', count: 2 }, { type: 'E05', count: 3 },
      { type: 'E03', count: 6 }, { type: 'E07', count: 4 }, { type: 'E05', count: 4 },
      { type: 'E07', count: 3 }, { type: 'E02', count: 3 },
      { type: 'E03', count: 6, formation: 'ring' }, { type: 'E02', count: 4, formation: 'pincer' },
      { type: 'E05', count: 4, formation: 'ring' }, { type: 'E04', count: 4, formation: 'ring' },
      { type: 'E06', count: 2, formation: 'pincer' },
    ])
    expect(ordinary.reduce((sum, event) => sum + event.count, 0)).toBe(68)
    const appliedHp = ordinary.reduce((sum, event) => sum + ({ E01: 14, E02: 121, E03: 17, E04: 55, E05: 121, E06: 553, E07: 28 }[event.type] ?? 0) * event.count, 0)
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

// ── 2026-08-17 사용자 정본: 스테이지 총체력 1.3배 사다리 + 전 스테이지 공통 스폰 앵커 ────────────
// 런타임 좀비 스폰 경로는 이 버스트 표 / 마틸다 / 오버타임 3개뿐이고, 240초 스테이지에서는
// 오버타임(300초 시작)이 발화하지 않는다. 따라서 "스테이지 총 HP"는 이 표만으로 결정된다
// — 웨이브 타임라인(waveTimelines.js)은 밀도 파생용 분석 데이터일 뿐 스폰을 만들지 않는다.
// 그래서 이 파일에서 총량을 단언하는 것이 곧 실제 게임 총량을 단언하는 것이다.
describe('스테이지 총체력 1.3배 사다리 (스1 앵커 고정)', () => {
  const STAGE_HP_MULTIPLIER = { stage1: 1, stage2: 1.2, stage3: 1.44, stage4: 1.728 }
  const BASE_HP = {
    E01: 8, E02: 70, E03: 10, E04: 32, E05: 70, E06: 320, E07: 16,
    RZL: 90, RZC: 28, RZT: 140, RZG: 48,
    // B03만 1246 — 2026-08-24 사용자 지시("스3 보스 = 스2 보스 × 1.3")를 stage3 배수 1.44로
    // 역산한 base다. 실효 HP는 round(1246 × 1.44) = 1,794 = round(1150 × 1.2) × 1.3.
    B01: 1150, B02: 1150, B03: 1246, B04: 1500,
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
  }
  // 사다리 단언 대상. stage3는 위 판정으로 사다리를 적용하지 않으므로 명시적으로 제외한다
  // — 위반 항목을 필터로 걸러 초록을 만드는 2026-08-19식 사고를 반복하지 않기 위해,
  // "제외"를 여기 한 줄로 못박고 stage3 총량은 아래 실측 단언이 따로 고정한다.
  const LADDER_STAGES = ['stage1', 'stage2', 'stage4']

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
    const total = stageTotalHp(stageId)
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
    const stage3RestoredRunCrewAnchors = [5, 24, 40, 60, 72, 110, 120, 150, 184, 216]
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

  it('반복 보강은 stage3 전용 명시 예외이며 계열별 균일 간격 규칙을 지킨다', () => {
    for (const [stageId, events] of allStageBurstTables) {
      const repeating = events.filter(isRepeatingBurstEvent)
      if (stageId !== 'stage3') {
        expect(repeating).toEqual([])
        continue
      }
      // 두 계열 × 두 타입(E01·E07) = 4건. 태그 없는 반복 이벤트가 끼어들면 여기서 걸린다.
      expect(repeating).toHaveLength(4)
      for (const event of repeating) {
        const family = REPEATING_FAMILIES[event.reinforcement]
        expect(family).toBeDefined()
        const ticks = repeatingBurstTickCount(event)
        const secs = Array.from({ length: ticks }, (_, tick) => repeatingBurstSecAtTick(event, tick))
        expect(secs).toEqual(family.secs)
        expect(secs.every((sec) => sec >= event.sec && sec < event.endExclusiveSec)).toBe(true)
        // 반복 보강 풀은 경량대(E01 8hp·E07 16hp)로 제한한다 — 확정 발화라 무거운 타입은 예산을 뚫는다.
        expect(['E01', 'E07']).toContain(event.type)
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
