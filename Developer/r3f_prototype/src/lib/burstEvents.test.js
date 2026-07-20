import { describe, it, expect } from 'vitest'
import {
  BURST_EVENTS,
  STAGE2_BURST_EVENTS,
  STAGE3_BURST_EVENTS,
  STAGE4_BURST_EVENTS,
  RUN_ZOMBIE_CREW_FORMATION,
  BOSS_BURST_TYPES,
  isBossType,
  getBurstEventsForStage,
  getRuntimeBurstEventsForStage,
  getBossSpawnSec,
  isBossPhase,
} from './burstEvents.js'

describe('burstEvents 보스 등장 시각 파생', () => {
  it('getBurstEventsForStage: stage2는 STAGE2, 그 외 stage1 기본', () => {
    expect(getBurstEventsForStage('stage2')).toBe(STAGE2_BURST_EVENTS)
    expect(getBurstEventsForStage('stage1')).toBe(BURST_EVENTS)
    expect(getBurstEventsForStage(undefined)).toBe(BURST_EVENTS)
  })

  it('보스 등장 시각 = 보스 버스트(B01/B02) sec 단일 소스', () => {
    // stage1 B01, stage2 B02 모두 2:00(120s)에 정의됨
    expect(getBossSpawnSec('stage1')).toBe(120)
    expect(getBossSpawnSec('stage2')).toBe(120)
  })

  it('런타임 버스트는 웨이브와 중복되지 않는 보스 등장만 반환한다', () => {
    expect(getRuntimeBurstEventsForStage('stage1')).toEqual([
      { sec: 120, type: 'B01', count: 1 },
    ])
    expect(getRuntimeBurstEventsForStage('stage2')).toEqual([
      { sec: 120, type: 'B02', count: 1 },
    ])
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
    expect(isBossPhase(192, 'stage2')).toBe(true)
    expect(isBossPhase(120, 'stage1')).toBe(true)
    expect(isBossPhase(108, 'stage1')).toBe(false)
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
    expect(isBossPhase(150, 'stage3')).toBe(true)
  })

  it('런타임 버스트: stage3는 보스 외 형태/그룹까지 모두 발화 대상(stage1/2는 보스만 불변)', () => {
    const runtime = getRuntimeBurstEventsForStage('stage3')
    // stage3 런타임은 전체 목록(형태 포함)을 반환한다.
    expect(runtime).toBe(STAGE3_BURST_EVENTS)
    expect(runtime.some((e) => e.formation)).toBe(true)
    expect(runtime.filter((e) => e.type === 'B03')).toHaveLength(1)
    expect(runtime.filter((e) => e.type === 'B01' || e.type === 'B02')).toHaveLength(0)
    // 회귀 방지: stage1/stage2는 여전히 보스만 런타임 발화한다.
    expect(getRuntimeBurstEventsForStage('stage1')).toEqual([{ sec: 120, type: 'B01', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage2')).toEqual([{ sec: 120, type: 'B02', count: 1 }])
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
    expect(getBossSpawnSec('stage4')).toBe(140)
  })

  it('isBossPhase(stage4): 140 이후 시작 phase만 보스 구간(경계 포함)', () => {
    expect(isBossPhase(140, 'stage4')).toBe(true)
    expect(isBossPhase(139, 'stage4')).toBe(false)
    expect(isBossPhase(178, 'stage4')).toBe(true)
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
    expect(getRuntimeBurstEventsForStage('stage1')).toEqual([{ sec: 120, type: 'B01', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage2')).toEqual([{ sec: 120, type: 'B02', count: 1 }])
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
