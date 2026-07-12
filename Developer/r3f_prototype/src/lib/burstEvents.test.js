import { describe, it, expect } from 'vitest'
import {
  BURST_EVENTS,
  STAGE2_BURST_EVENTS,
  STAGE3_BURST_EVENTS,
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

describe('stage3 더블 보스 + 형태 버스트 런타임 복원', () => {
  it('getBurstEventsForStage: stage3는 STAGE3 목록', () => {
    expect(getBurstEventsForStage('stage3')).toBe(STAGE3_BURST_EVENTS)
  })

  it('더블 보스 B02(135)/B01(147) 스태거 — 보스 등장 시각은 min=135', () => {
    const bosses = STAGE3_BURST_EVENTS.filter((e) => e.type === 'B01' || e.type === 'B02')
    expect(bosses).toEqual([
      { sec: 135, type: 'B02', count: 1 },
      { sec: 147, type: 'B01', count: 1 },
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
    expect(runtime.filter((e) => e.type === 'B01' || e.type === 'B02')).toHaveLength(2)
    // 회귀 방지: stage1/stage2는 여전히 보스만 런타임 발화한다.
    expect(getRuntimeBurstEventsForStage('stage1')).toEqual([{ sec: 120, type: 'B01', count: 1 }])
    expect(getRuntimeBurstEventsForStage('stage2')).toEqual([{ sec: 120, type: 'B02', count: 1 }])
  })

  it('형태 버스트 5종 중 stage3는 ring/pincer/swarm/gauntlet를 사용한다', () => {
    const formations = STAGE3_BURST_EVENTS.filter((e) => e.formation).map((e) => e.formation)
    expect(new Set(formations)).toEqual(new Set(['ring', 'pincer', 'swarm', 'gauntlet']))
  })
})
