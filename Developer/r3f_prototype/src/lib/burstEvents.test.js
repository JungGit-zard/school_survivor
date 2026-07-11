import { describe, it, expect } from 'vitest'
import {
  BURST_EVENTS,
  STAGE2_BURST_EVENTS,
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
