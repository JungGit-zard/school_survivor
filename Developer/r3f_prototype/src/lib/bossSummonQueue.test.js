import { beforeEach, describe, expect, it } from 'vitest'
import { BOSS_SUMMON_QUEUE_CAPACITY, drainBossSummonInto, getBossSummonQueueCount, pushBossSummon, resetBossSummonQueue } from './bossSummonQueue.js'

describe('bossSummonQueue', () => {
  beforeEach(() => resetBossSummonQueue())

  it('FIFO로 gameKey·좌표를 돌려주고, 길이 8에서 넘치는 요청은 거절한다', () => {
    expect(BOSS_SUMMON_QUEUE_CAPACITY).toBe(8)
    for (let i = 0; i < 8; i += 1) expect(pushBossSummon(5, i, -i)).toBe(true)
    expect(pushBossSummon(5, 99, 99)).toBe(false)
    expect(getBossSummonQueueCount()).toBe(8)
    const out = {}
    for (let i = 0; i < 8; i += 1) {
      expect(drainBossSummonInto(out)).toBe(true)
      expect(out).toEqual({ gameKey: 5, x: i, z: -i, bossTypeCode: 0 })
    }
    expect(drainBossSummonInto(out)).toBe(false)
  })

  it('비유한 좌표는 넣지 않고, reset은 남은 요청을 버린다', () => {
    expect(pushBossSummon(1, Number.NaN, 0)).toBe(false)
    pushBossSummon(1, 1, 1)
    resetBossSummonQueue()
    expect(getBossSummonQueueCount()).toBe(0)
    expect(drainBossSummonInto({})).toBe(false)
  })

  it('어느 보스의 소환인지 typeCode로 실어 보낸다(B10 75, B05 32)', () => {
    pushBossSummon(1, 0, -17, 32)
    pushBossSummon(1, 2, 3, 75)
    pushBossSummon(1, 2, 3, -4)
    const out = {}
    drainBossSummonInto(out); expect(out.bossTypeCode).toBe(32)
    drainBossSummonInto(out); expect(out.bossTypeCode).toBe(75)
    drainBossSummonInto(out); expect(out.bossTypeCode).toBe(0)
  })
})
