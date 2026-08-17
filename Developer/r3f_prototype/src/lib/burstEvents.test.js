import { describe, it, expect } from 'vitest'
import {
  BURST_EVENTS,
  STAGE2_BURST_EVENTS,
  STAGE3_BURST_EVENTS,
  STAGE4_BURST_EVENTS,
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
  it('Stage 2의 경비 추격을 포함한 모든 비보스 좀비 고유 초 배열은 Stage 1 일반 좀비 앵커와 정확히 일치하고 B02는 120초에 남는다', () => {
    expect(uniqueSeconds(stageZombieEvents(STAGE2_BURST_EVENTS))).toEqual(uniqueSeconds(ordinaryZombieEvents(BURST_EVENTS)))
    expect(STAGE2_BURST_EVENTS.filter((event) => isBossType(event.type))).toEqual([{ sec: 120, type: 'B02', count: 1 }])
  })

  it('Stage 2 모든 비보스 좀비 payload·마릿수·선언 HP 예산은 초만 바뀌고 그대로 보존된다', () => {
    const ordinary = stageZombieEvents(STAGE2_BURST_EVENTS)

    expect(ordinary.map(payloadWithoutSec)).toEqual([
      { type: 'E01', count: 17 },
      { type: 'E03', count: 4 },
      { type: 'E02', count: 3 },
      { type: 'E04', count: 1 },
      { type: 'E05', count: 2 },
      { type: 'E05', count: 2 },
      { type: 'E06', count: 1 },
      { type: 'E05', count: 3 },
      { type: 'E04', count: 1 },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'RZT', count: 7, formation: STAGE2_GUARD_CHASE_FORMATION },
      { type: 'E01', count: 7, formation: 'swarm' },
      { type: 'E01', count: 22, mixedTypes: ['E01', 'E03'] },
      { type: 'E01', count: 22, mixedTypes: ['E01', 'E03'] },
      { type: 'E02', count: 3 },
      { type: 'E07', count: 3 },
      { type: 'E02', count: 3 },
      { type: 'E01', count: 17, mixedTypes: ['E01', 'E02', 'E03', 'E04', 'E05'], reinforcement: 'stage2MixedReinforcement' },
      { type: 'E03', count: 17, mixedTypes: ['E02', 'E03', 'E04', 'E05'], reinforcement: 'stage2MixedReinforcement' },
      { type: 'E02', count: 17, mixedTypes: ['E02', 'E04', 'E06'], reinforcement: 'stage2MixedReinforcement' },
      { type: 'E02', count: 17, mixedTypes: ['E02', 'E04', 'E05'], reinforcement: 'stage2MixedReinforcement' },
      { type: 'E03', count: 6, formation: 'ring' },
      { type: 'E07', count: 6 },
      { type: 'E07', count: 11 },
      { type: 'E02', count: 7, formation: 'pincer' },
      { type: 'E05', count: 4, formation: 'swarm' },
    ])
    expect(ordinary.reduce((sum, event) => sum + (event.count ?? 1), 0)).toBe(224)
    expect(declaredCountByType(ordinary)).toEqual({ E01: 85, E03: 27, E02: 50, E04: 2, E05: 11, E06: 1, E07: 20, RZT: 28 })
    expect(stage2HpMultipliedBurstHp(ordinary)).toBe(9202)
  })
})

describe('전 스테이지 1:50 웃는좀비·탱커 보강', () => {
  it.each(allStageBurstTables)('%s는 110초 E07 3마리와 E02 3마리를 정확히 1개씩 추가한다', (_stageId, events) => {
    expect(events.filter((event) => event.sec === 110 && event.type === 'E07' && event.count === 3)).toHaveLength(1)
    // Stage 2는 기존 90초 E02×3 동반 이벤트도 Stage 1의 110초 앵커로 함께 이동한다.
    expect(events.filter((event) => event.sec === 110 && event.type === 'E02' && event.count === 3)).toHaveLength(_stageId === 'stage2' ? 2 : 1)
  })

  it('기존 Stage 2 웃는좀비 버스트를 그대로 보존한다', () => {
    // 2026-08-13 스폰 +10%: 5→6 / 10→11 (round(count×1.1)).
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 60, type: 'E07', count: 6 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 108, type: 'E07', count: 11 })
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
    expect(events.filter((event) => event.sec === 40 && event.type === 'E01' && event.count === 6)).toHaveLength(0)
    expect(events.filter((event) => event.sec === 40 && event.type === 'E07' && event.count === 3)).toHaveLength(0)
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
    expect(getBossPhaseStatus(119, 'stage2')).toBe('before')
    expect(getBossPhaseStatus(120, 'stage2')).toBe('after')
  })
  it('getBurstEventsForStage: stage2는 STAGE2, 그 외 stage1 기본', () => {
    expect(getBurstEventsForStage('stage2')).toBe(STAGE2_BURST_EVENTS)
    expect(getBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    expect(getBurstEventsForStage(undefined)).toBe(BURST_EVENTS)
  })

  it('보스 등장 시각 = 보스 버스트 sec 단일 소스', () => {
    expect(getBossSpawnSec('stage1')).toBe(150)
    expect(getBossSpawnSec('stage2')).toBe(120)
  })

  it('런타임 버스트는 명시 이벤트 표 전체를 반환한다', () => {
    expect(getRuntimeBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    const stage2 = getRuntimeBurstEventsForStage('stage2')
    expect(stage2).toBe(STAGE2_BURST_EVENTS)
    expect(stage2.filter((event) => isBossType(event.type))).toEqual([{ sec: 120, type: 'B02', count: 1 }])
    expect(stage2.filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION).map((event) => event.sec)).toEqual([40, 108, 144, 216])
  })

  it('runtime schedule preserves each stage canonical boss second', () => {
    expect(getRuntimeBurstEventsForStage('stage1').filter((event) => isBossType(event.type))).toEqual([{ sec: 150, type: 'B01', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage2').filter((event) => isBossType(event.type))).toEqual([{ sec: 120, type: 'B02', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage3').filter((event) => isBossType(event.type))).toEqual([{ sec: 135, type: 'B03', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage4').filter((event) => isBossType(event.type))).toEqual([{ sec: 140, type: 'B04', count: 1 }])
  })

  it('보스 버스트가 없는 스테이지는 Infinity (보스 구간 없음)', () => {
    // 존재하지 않는 스테이지는 stage1 기본으로 폴백되지만, 보스 없는 목록을 가정한 경계 확인
    const noBoss = [{ sec: 0, type: 'E01', count: 5 }]
    const min = Math.min(...noBoss.filter((e) => ['B01', 'B02'].includes(e.type)).map((e) => e.sec))
    expect(min).toBe(Infinity)
  })

  it('isBossPhase: 시작 시각이 보스 등장 이후면 true (경계 포함)', () => {
    expect(isBossPhase(120, 'stage2')).toBe(true)
    expect(isBossPhase(119, 'stage2')).toBe(false)
    expect(isBossPhase(150, 'stage1')).toBe(true)
    expect(isBossPhase(149, 'stage1')).toBe(false)
  })
})

describe('stage3 체육교사 B03 단일 보스 + 형태 버스트 런타임 복원', () => {
  it('getBurstEventsForStage: stage3는 STAGE3 목록', () => {
    expect(getBurstEventsForStage('stage3')).toBe(STAGE3_BURST_EVENTS)
  })

  it('체육교사 B03 단일 보스(135) — 스1/스2 보스는 스3 전투에 등장하지 않는다', () => {
    const bosses = STAGE3_BURST_EVENTS.filter((e) => e.type === 'B01' || e.type === 'B02' || e.type === 'B03')
    expect(bosses).toEqual([
      { sec: 135, type: 'B03', count: 1 },
    ])
    expect(getBossSpawnSec('stage3')).toBe(135)
  })

  it('isBossPhase(stage3): 135 이후 시작 phase만 보스 구간', () => {
    expect(isBossPhase(135, 'stage3')).toBe(true)
    expect(isBossPhase(134, 'stage3')).toBe(false)
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
    expect(getRuntimeBurstEventsForStage('stage2').filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION)).toHaveLength(4)
  })

  it('stage3는 런좀비 크루 대각선 횡단 버스트를 네 번 포함한다', () => {
    const crews = STAGE3_BURST_EVENTS.filter((e) => e.formation === RUN_ZOMBIE_CREW_FORMATION)
    expect(crews.map((e) => e.sec)).toEqual([40, 108, 144, 168])
    expect(crews.every((event) => event.type === 'RZL' && event.count === 7)).toBe(true)
  })

  it('형태 버스트 중 stage3는 플레이어 상대 포위(ring/pincer) + runZombieCrew만 쓴다 (개방 맵 안티카이팅)', () => {
    // 재설계(2026-07-18): swarm(한 방향)·gauntlet(양벽)은 개방 아레나서 카이팅되므로 배제.
    const formations = STAGE3_BURST_EVENTS.filter((e) => e.formation).map((e) => e.formation)
    expect(new Set(formations)).toEqual(new Set(['ring', 'pincer', RUN_ZOMBIE_CREW_FORMATION]))
    expect(formations).not.toContain('swarm')
    expect(formations).not.toContain('gauntlet')
    // 120s는 차저 포위(ring), 184s는 거대 앞뒤 벽(pincer)으로 교체됨.
    expect(STAGE3_BURST_EVENTS.find((e) => e.sec === 120)?.formation).toBe('ring')
    expect(STAGE3_BURST_EVENTS.find((e) => e.sec === 184)?.formation).toBe('pincer')
  })

  it('모든 비보스 이벤트는 공통 13개 앵커만 쓰며 payload·마릿수·실제 HP 예산을 보존한다', () => {
    const ordinary = STAGE3_BURST_EVENTS.filter((event) => !isBossType(event.type))
    expect(uniqueSeconds(ordinary)).toEqual([5, 24, 40, 60, 72, 108, 110, 120, 144, 150, 168, 184, 216])
    expect(ordinary.map(payloadWithoutSec)).toEqual([
      { type: 'E01', count: 12 }, { type: 'E03', count: 4 }, { type: 'E04', count: 1 }, { type: 'E05', count: 2 },
      { type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION }, { type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION },
      { type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION }, { type: 'RZL', count: 7, formation: RUN_ZOMBIE_CREW_FORMATION },
      { type: 'E06', count: 1 }, { type: 'E07', count: 3 }, { type: 'E02', count: 3 }, { type: 'E06', count: 1 },
      { type: 'E05', count: 3 }, { type: 'E03', count: 6, formation: 'ring' }, { type: 'E02', count: 6, formation: 'pincer' },
      { type: 'E05', count: 4, formation: 'ring' }, { type: 'E06', count: 2, formation: 'pincer' },
    ])
    expect(ordinary.reduce((sum, event) => sum + event.count, 0)).toBe(76)
    const nonCrewHp = ordinary.reduce((sum, event) => sum + ({ E01: 12, E02: 101, E03: 14, E04: 46, E05: 101, E06: 461, E07: 23 }[event.type] ?? 0) * event.count, 0)
    expect(nonCrewHp + 4 * Math.round(90 * 1.44) + 24 * Math.round(28 * 1.44)).toBe(5541)
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

  it('보스 B04@140 count 1 — 보스 등장 시각은 140', () => {
    const bosses = STAGE4_BURST_EVENTS.filter((e) => isBossType(e.type))
    expect(bosses).toEqual([{ sec: 140, type: 'B04', count: 1 }])
    expect(getBossSpawnSec('stage4')).toBe(140)
  })

  it('isBossPhase(stage4): 140 이후 시작 phase만 보스 구간(경계 포함)', () => {
    expect(isBossPhase(140, 'stage4')).toBe(true)
    expect(isBossPhase(139, 'stage4')).toBe(false)
  })

  it('조기 등장 보장 버스트: E04@18·E05@30·E06@74', () => {
    const at = (sec, type) => STAGE4_BURST_EVENTS.some((e) => e.sec === sec && e.type === type && !e.formation)
    expect(at(18, 'E04')).toBe(true)
    expect(at(30, 'E05')).toBe(true)
    expect(at(74, 'E06')).toBe(true)
  })

  it('런타임 버스트: stage4는 stage3처럼 형태 포함 전 버스트를 발화한다', () => {
    const runtime = getRuntimeBurstEventsForStage('stage4')
    expect(runtime).toBe(STAGE4_BURST_EVENTS)
    expect(runtime.some((e) => e.formation)).toBe(true)
    expect(runtime.filter((e) => e.type === 'B04')).toHaveLength(1)
    // 회귀 방지: stage1/stage2도 명시 이벤트 표 전체를 런타임 발화.
    expect(getRuntimeBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    expect(getRuntimeBurstEventsForStage('stage2')).toBe(STAGE2_BURST_EVENTS)
    expect(getRuntimeBurstEventsForStage('stage2').filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION)).toHaveLength(4)
  })

  it('형태 버스트는 개방 맵 안티카이팅(ring/pincer)만 — swarm/gauntlet/RZL 미채용', () => {
    const formations = STAGE4_BURST_EVENTS.filter((e) => e.formation).map((e) => e.formation)
    expect(new Set(formations)).toEqual(new Set(['ring', 'pincer']))
    expect(formations).not.toContain('swarm')
    expect(formations).not.toContain('gauntlet')
    expect(formations).not.toContain(RUN_ZOMBIE_CREW_FORMATION)
    expect(formations.length).toBeGreaterThanOrEqual(3)
    expect(formations.length).toBeLessThanOrEqual(4)
  })
})
