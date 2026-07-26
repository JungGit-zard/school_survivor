import { beforeEach, describe, expect, it } from 'vitest'
import {
  PUBLISH_INTERVAL_MS,
  advanceRuntimeTime,
  getRuntimeElapsedMs,
  isRuntimeTimePublishDue,
  markRuntimeTimePublished,
  resetRuntimeTime,
  setRuntimeElapsedMs,
} from './gameRuntimeTime.js'

describe('game runtime time', () => {
  beforeEach(() => resetRuntimeTime())

  it('keeps sixty 60fps advances exact without allocating a UI snapshot', () => {
    for (let frame = 0; frame < 60; frame += 1) advanceRuntimeTime(1000 / 60)

    expect(getRuntimeElapsedMs()).toBeCloseTo(1000, 8)
  })

  it('ignores invalid or negative advances and resets exactly', () => {
    advanceRuntimeTime(42)
    advanceRuntimeTime(-1)
    advanceRuntimeTime(Number.NaN)
    advanceRuntimeTime(Infinity)
    expect(getRuntimeElapsedMs()).toBe(42)

    resetRuntimeTime()
    expect(getRuntimeElapsedMs()).toBe(0)
  })

  it('only marks a UI publish due at the 10Hz cadence', () => {
    advanceRuntimeTime(PUBLISH_INTERVAL_MS - 1)
    expect(isRuntimeTimePublishDue()).toBe(false)

    advanceRuntimeTime(1)
    expect(isRuntimeTimePublishDue()).toBe(true)
    markRuntimeTimePublished()
    expect(isRuntimeTimePublishDue()).toBe(false)

    advanceRuntimeTime(PUBLISH_INTERVAL_MS - 1)
    expect(isRuntimeTimePublishDue()).toBe(false)
    advanceRuntimeTime(1)
    expect(isRuntimeTimePublishDue()).toBe(true)
  })

  it('uses an explicit Zustand test snapshot when it is newer than runtime time', () => {
    setRuntimeElapsedMs(12)
    expect(getRuntimeElapsedMs(60_000)).toBe(60_000)
  })
})
