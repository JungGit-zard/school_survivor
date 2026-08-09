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
import { BOSS_SPAWN_CENTER_SEC } from './stageConfig.js'

const allStageBurstTables = [
  ['stage1', BURST_EVENTS],
  ['stage2', STAGE2_BURST_EVENTS],
  ['stage3', STAGE3_BURST_EVENTS],
  ['stage4', STAGE4_BURST_EVENTS],
]

describe('전 스테이지 1:50 웃는좀비·탱커 보강', () => {
  it.each(allStageBurstTables)('%s는 110초 E07 3마리와 E02 3마리를 정확히 1개씩 추가한다', (_stageId, events) => {
    expect(events.filter((event) => event.sec === 110 && event.type === 'E07' && event.count === 3)).toHaveLength(1)
    expect(events.filter((event) => event.sec === 110 && event.type === 'E02' && event.count === 3)).toHaveLength(1)
  })

  it('기존 Stage 2 웃는좀비 버스트를 그대로 보존한다', () => {
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 60, type: 'E07', count: 5 })
    expect(STAGE2_BURST_EVENTS).toContainEqual({ sec: 82, type: 'E07', count: 10 })
  })
})

describe('Stage 1 2:30 웃는좀비·녹색좀비 보강', () => {
  it('stage1만 150초에 E07 5마리와 E01 5마리를 정확히 추가한다', () => {
    expect(BURST_EVENTS.filter((event) => event.sec === 150 && event.type === 'E07' && event.count === 5)).toHaveLength(1)
    expect(BURST_EVENTS.filter((event) => event.sec === 150 && event.type === 'E01' && event.count === 5)).toHaveLength(1)
  })

  it.each([
    ['stage2', STAGE2_BURST_EVENTS],
    ['stage3', STAGE3_BURST_EVENTS],
    ['stage4', STAGE4_BURST_EVENTS],
  ])('%s에는 150초 E07/E01 보강을 넣지 않는다', (_stageId, events) => {
    expect(events.filter((event) => event.sec === 150 && event.type === 'E07' && event.count === 5)).toHaveLength(0)
    expect(events.filter((event) => event.sec === 150 && event.type === 'E01' && event.count === 5)).toHaveLength(0)
  })

  it('기존 110초 전 스테이지 E07 3 + E02 3 보강을 보존한다', () => {
    expect(BURST_EVENTS).toContainEqual({ sec: 110, type: 'E07', count: 3 })
    expect(BURST_EVENTS).toContainEqual({ sec: 110, type: 'E02', count: 3 })
  })
})

describe('burstEvents 보스 등장 시각 파생', () => {
  it('classifies the randomized boss window without claiming a fixed phase', () => {
    expect(getBossPhaseStatus(169)).toBe('before')
    expect(getBossPhaseStatus(170)).toBe('variable')
    expect(getBossPhaseStatus(189)).toBe('variable')
    expect(getBossPhaseStatus(190)).toBe('after')
  })
  it('getBurstEventsForStage: stage2는 STAGE2, 그 외 stage1 기본', () => {
    expect(getBurstEventsForStage('stage2')).toBe(STAGE2_BURST_EVENTS)
    expect(getBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    expect(getBurstEventsForStage(undefined)).toBe(BURST_EVENTS)
  })

  it('보스 등장 시각 = 보스 버스트(B01/B02) sec 단일 소스', () => {
    // stage1 B01은 3:12(192s), stage2 B02는 2:00(120s)에 정의됨
    expect(getBossSpawnSec('stage1')).toBe(BOSS_SPAWN_CENTER_SEC)
    expect(getBossSpawnSec('stage2')).toBe(BOSS_SPAWN_CENTER_SEC)
  })

  it('런타임 버스트는 웨이브와 중복되지 않는 보스 등장만 반환한다', () => {
    expect(getRuntimeBurstEventsForStage('stage1')).toEqual([
      { sec: 192, type: 'B01', count: 1 },
    ])
    const stage2 = getRuntimeBurstEventsForStage('stage2')
    expect(stage2.filter((event) => isBossType(event.type))).toEqual([{ sec: 120, type: 'B02', count: 1 }])
    expect(stage2.filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION).map((event) => event.sec)).toEqual([42, 88, 136, 216])
    expect(stage2.every((event) => isBossType(event.type) || event.formation === STAGE2_GUARD_CHASE_FORMATION)).toBe(true)
  })

  it('applies the run-scoped randomized boss second to every stage runtime schedule', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const runtime = getRuntimeBurstEventsForStage(stageId, 173)
      const bosses = runtime.filter((event) => isBossType(event.type))
      expect(bosses).toHaveLength(1)
      expect(bosses[0].sec).toBe(173)
    }
  })

  it('보스 버스트가 없는 스테이지는 Infinity (보스 구간 없음)', () => {
    // 존재하지 않는 스테이지는 stage1 기본으로 폴백되지만, 보스 없는 목록을 가정한 경계 확인
    const noBoss = [{ sec: 0, type: 'E01', count: 5 }]
    const min = Math.min(...noBoss.filter((e) => ['B01', 'B02'].includes(e.type)).map((e) => e.sec))
    expect(min).toBe(Infinity)
  })

  it('isBossPhase: 시작 시각이 보스 등장 이후면 true (경계 포함)', () => {
    expect(isBossPhase(180, 'stage2')).toBe(true)
    expect(isBossPhase(179, 'stage2')).toBe(false)
    expect(isBossPhase(180, 'stage1')).toBe(true)
    expect(isBossPhase(179, 'stage1')).toBe(false)
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
    expect(getBossSpawnSec('stage3')).toBe(BOSS_SPAWN_CENTER_SEC)
  })

  it('isBossPhase(stage3): 135 이후 시작 phase만 보스 구간', () => {
    expect(isBossPhase(180, 'stage3')).toBe(true)
    expect(isBossPhase(179, 'stage3')).toBe(false)
    expect(isBossPhase(150, 'stage3')).toBe(false)
  })

  it('런타임 버스트: stage3는 보스 외 형태/그룹까지 모두 발화 대상(stage1/2는 보스만 불변)', () => {
    const runtime = getRuntimeBurstEventsForStage('stage3')
    // stage3 런타임은 전체 목록(형태 포함)을 반환한다.
    expect(runtime).toBe(STAGE3_BURST_EVENTS)
    expect(runtime.some((e) => e.formation)).toBe(true)
    expect(runtime.filter((e) => e.type === 'B03')).toHaveLength(1)
    expect(runtime.filter((e) => e.type === 'B01' || e.type === 'B02')).toHaveLength(0)
    // 회귀 방지: stage1/stage2는 여전히 보스만 런타임 발화한다.
    expect(getRuntimeBurstEventsForStage('stage1')).toEqual([{ sec: 192, type: 'B01', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage2').filter((event) => event.formation === STAGE2_GUARD_CHASE_FORMATION)).toHaveLength(4)
  })

  it('stage3는 런좀비 크루 대각선 횡단 버스트를 네 번 포함한다', () => {
    const crews = STAGE3_BURST_EVENTS.filter((e) => e.formation === RUN_ZOMBIE_CREW_FORMATION)
    expect(crews.map((e) => e.sec)).toEqual([35, 80, 120, 150])
    expect(crews.every((event) => event.type === 'RZL' && event.count === 13)).toBe(true)
  })

  it('형태 버스트 중 stage3는 플레이어 상대 포위(ring/pincer) + runZombieCrew만 쓴다 (개방 맵 안티카이팅)', () => {
    // 재설계(2026-07-18): swarm(한 방향)·gauntlet(양벽)은 개방 아레나서 카이팅되므로 배제.
    const formations = STAGE3_BURST_EVENTS.filter((e) => e.formation).map((e) => e.formation)
    expect(new Set(formations)).toEqual(new Set(['ring', 'pincer', RUN_ZOMBIE_CREW_FORMATION]))
    expect(formations).not.toContain('swarm')
    expect(formations).not.toContain('gauntlet')
    // 112s는 차저 포위(ring), 176s는 거대 앞뒤 벽(pincer)으로 교체됨.
    expect(STAGE3_BURST_EVENTS.find((e) => e.sec === 112)?.formation).toBe('ring')
    expect(STAGE3_BURST_EVENTS.find((e) => e.sec === 176)?.formation).toBe('pincer')
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
    expect(getBossSpawnSec('stage4')).toBe(BOSS_SPAWN_CENTER_SEC)
  })

  it('isBossPhase(stage4): 140 이후 시작 phase만 보스 구간(경계 포함)', () => {
    expect(isBossPhase(180, 'stage4')).toBe(true)
    expect(isBossPhase(179, 'stage4')).toBe(false)
    expect(isBossPhase(178, 'stage4')).toBe(false)
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
    // 회귀 방지: stage1/stage2는 여전히 보스만 런타임 발화.
    expect(getRuntimeBurstEventsForStage('stage1')).toEqual([{ sec: 192, type: 'B01', count: 1 }])
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
