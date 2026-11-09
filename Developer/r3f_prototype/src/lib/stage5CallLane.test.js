// Stage 5 전교 호출 방송(스펙 Part B §7). 시계 = 스폰 시계 ms.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  STAGE5_CALL_LANES,
  STAGE5_CALL_SFX,
  STAGE5_CALL_SPAWN_Z,
  addStage5CallLanePulse,
  clearStage5CallLanePulseBuffer,
  createStage5CallLaneCyclePulses,
  createStage5CallLanePulseBuffer,
  createStage5CallLanePulses,
  getStage5CallLaneFeedback,
  getStage5CallLaneVisual,
  laneIndexForX,
  stage5CallLanePulseOffset,
} from './stage5CallLane.js'
import { getStage5CallLaneState, publishStage5CallLaneState, resetStage5CallLaneState } from './stage5CallLaneRuntime.js'
import { STAGE5_BURST_EVENTS, STAGE5_CALL_LANE_FORMATION, repeatingBurstSecAtTick, repeatingBurstTickCount } from './burstEvents.js'

const v = (ms, stageId = 'stage5', phase = 'playing') => {
  const { chiming, calling, cycle } = getStage5CallLaneVisual(ms, stageId, phase)
  return { chiming, calling, cycle }
}
const callEvents = STAGE5_BURST_EVENTS.filter((e) => e.formation === STAGE5_CALL_LANE_FORMATION)

describe('getStage5CallLaneVisual', () => {
  it('차임 70~73s, 호출 73~83s, 3회(73·133·193)만', () => {
    expect(v(69_999)).toEqual({ chiming: false, calling: false, cycle: -1 })
    expect(v(70_000)).toEqual({ chiming: true, calling: false, cycle: 0 })
    expect(v(72_999)).toMatchObject({ chiming: true, calling: false })
    expect(v(73_000)).toEqual({ chiming: false, calling: true, cycle: 0 })
    expect(v(82_999)).toMatchObject({ calling: true, cycle: 0 })
    expect(v(83_000)).toEqual({ chiming: false, calling: false, cycle: -1 })
    expect(v(130_000)).toMatchObject({ chiming: true, cycle: 1 })
    expect(v(193_000)).toEqual({ chiming: false, calling: true, cycle: 2 })
    expect(v(203_000)).toMatchObject({ chiming: false, calling: false })
    // 4회차(253s)는 없다 — 240초 전 3회 한정, 포탈(210) 이후 회차 없음.
    expect(v(250_000)).toMatchObject({ chiming: false, calling: false })
    expect(v(253_000)).toMatchObject({ chiming: false, calling: false })
  })

  it('stage5가 아니거나 playing이 아니면 꺼진다', () => {
    expect(v(73_000, 'stage4')).toMatchObject({ calling: false, cycle: -1 })
    expect(v(73_000, 'stage5', 'paused')).toMatchObject({ calling: false, cycle: -1 })
  })

  it('시각이 버스트 표의 호출 descriptor tick과 같다(정본 1곳)', () => {
    for (const evt of callEvents) {
      const secs = Array.from({ length: repeatingBurstTickCount(evt) }, (_, tick) => repeatingBurstSecAtTick(evt, tick))
      secs.forEach((sec, cycle) => {
        expect(v(sec * 1000)).toEqual({ chiming: false, calling: true, cycle })
        expect(v(sec * 1000 - 3000)).toMatchObject({ chiming: true, cycle })
      })
    }
  })
})

describe('getStage5CallLaneFeedback', () => {
  it('경계 1회: 차임은 70s, 시작은 73s, stage4면 항상 null', () => {
    expect(getStage5CallLaneFeedback(69_990, 70_010, 'stage5', 'playing')).toBe(STAGE5_CALL_SFX.chime)
    expect(STAGE5_CALL_SFX.chime).toBe('stage5CallChime')
    expect(getStage5CallLaneFeedback(70_010, 70_030, 'stage5', 'playing')).toBeNull()
    expect(getStage5CallLaneFeedback(72_990, 73_010, 'stage5', 'playing')).toBe('stage5CallStart')
    expect(getStage5CallLaneFeedback(73_010, 73_030, 'stage5', 'playing')).toBeNull()
    expect(getStage5CallLaneFeedback(69_990, 70_010, 'stage4', 'playing')).toBeNull()
    expect(getStage5CallLaneFeedback(72_990, 73_010, 'stage4', 'playing')).toBeNull()
    // 역행·같은 시각·잘못된 값은 판정하지 않는다.
    expect(getStage5CallLaneFeedback(73_010, 72_990, 'stage5', 'playing')).toBeNull()
    expect(getStage5CallLaneFeedback(Number.NaN, 73_010, 'stage5', 'playing')).toBeNull()
  })
})

describe('lanes and pulses', () => {
  it('laneIndexForX: 섬 중심선(−4.2 / 0 / +4.2)으로 4레인을 나눈다', () => {
    expect(laneIndexForX(-7)).toBe(0)
    expect(laneIndexForX(-2)).toBe(1)
    expect(laneIndexForX(0)).toBe(2)
    expect(laneIndexForX(6)).toBe(3)
    expect(laneIndexForX(-4.2)).toBe(1)
    expect(laneIndexForX(4.2)).toBe(3)
    for (const lane of STAGE5_CALL_LANES) expect(lane.spawnX).toBeGreaterThanOrEqual(lane.minX)
  })

  it('한 회차 = 5펄스 × 2끝 = 10기, 2초 간격, 마지막 펄스는 E07, 좌표는 레인 x · z ±14.5', () => {
    const pulses = createStage5CallLaneCyclePulses(callEvents, 2, 73)
    expect(pulses).toHaveLength(5)
    expect(pulses.map((p) => p.atMs)).toEqual([73_000, 75_000, 77_000, 79_000, 81_000])
    expect(pulses.map((p) => p.type)).toEqual(['E03', 'E03', 'E03', 'E03', 'E07'])
    expect(pulses.reduce((sum, p) => sum + p.spawns.length, 0)).toBe(10)
    for (const pulse of pulses) {
      expect(pulse.spawns).toEqual([{ x: 2.1, z: -STAGE5_CALL_SPAWN_Z }, { x: 2.1, z: STAGE5_CALL_SPAWN_Z }])
    }
    expect(STAGE5_CALL_SPAWN_Z).toBe(14.5)
    // 스트림 10초 안에서 끝난다.
    expect(pulses.at(-1).atMs).toBeLessThan(73_000 + 10_000)
  })

  it('런타임은 descriptor마다 펼친다: E07 descriptor의 첫 펄스 번호는 E03의 펄스 수(4)', () => {
    const e07Index = STAGE5_BURST_EVENTS.findIndex((e) => e.formation === STAGE5_CALL_LANE_FORMATION && e.type === 'E07')
    const e03Index = STAGE5_BURST_EVENTS.findIndex((e) => e.formation === STAGE5_CALL_LANE_FORMATION && e.type === 'E03')
    expect(stage5CallLanePulseOffset(STAGE5_BURST_EVENTS, e03Index, STAGE5_CALL_LANE_FORMATION)).toBe(0)
    expect(stage5CallLanePulseOffset(STAGE5_BURST_EVENTS, e07Index, STAGE5_CALL_LANE_FORMATION)).toBe(4)
    const e07 = createStage5CallLanePulses(STAGE5_BURST_EVENTS[e07Index], 0, 133, 4)
    expect(e07).toEqual([{ atMs: 141_000, type: 'E07', laneIndex: 0, spawns: [{ x: -7, z: -14.5 }, { x: -7, z: 14.5 }] }])
    // 홀수면 마지막 펄스는 북쪽 끝 1기만.
    expect(createStage5CallLanePulses({ type: 'E03', count: 3 }, 1, 73).map((p) => p.spawns.length)).toEqual([2, 1])
  })

  it('펄스 버퍼는 고정 크기이고 비우면 다시 쓸 수 있다', () => {
    const buffer = createStage5CallLanePulseBuffer(2)
    const pulse = { atMs: 1, type: 'E03', laneIndex: 0, spawns: [] }
    expect(addStage5CallLanePulse(buffer, pulse, 7)).toBe(0)
    expect(addStage5CallLanePulse(buffer, pulse, 7)).toBe(1)
    expect(addStage5CallLanePulse(buffer, pulse, 7)).toBe(-1)
    expect(buffer.gameKey[1]).toBe(7)
    clearStage5CallLanePulseBuffer(buffer)
    expect(addStage5CallLanePulse(buffer, pulse, 8)).toBe(0)
  })
})

describe('stage5CallLaneRuntime', () => {
  beforeEach(() => resetStage5CallLaneState())

  it('발행·조회·초기화(같은 값 재발행은 버전을 올리지 않는다)', () => {
    expect(getStage5CallLaneState()).toMatchObject({ gameKey: -1, cycle: -1, laneIndex: -1, phase: 'idle' })
    const v1 = publishStage5CallLaneState(3, 0, 2, 'chiming').version
    expect(publishStage5CallLaneState(3, 0, 2, 'chiming').version).toBe(v1)
    expect(publishStage5CallLaneState(3, 0, 2, 'calling')).toMatchObject({ gameKey: 3, cycle: 0, laneIndex: 2, phase: 'calling' })
    resetStage5CallLaneState()
    expect(getStage5CallLaneState()).toMatchObject({ gameKey: -1, laneIndex: -1, phase: 'idle' })
  })
})
