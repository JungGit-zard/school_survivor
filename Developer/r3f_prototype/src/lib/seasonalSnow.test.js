import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTitleSnowActive, titleSnowEndTime } from './seasonalSnow.js'

describe('title snow date gate (local clock, through 2027-02-20 inclusive)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is on from the request day (2026-11-24) through the whole of 2027-02-20', () => {
    expect(isTitleSnowActive(new Date(2026, 10, 24, 0, 0, 0, 0))).toBe(true)
    expect(isTitleSnowActive(new Date(2026, 11, 25, 12, 0, 0, 0))).toBe(true)
    expect(isTitleSnowActive(new Date(2027, 0, 1, 0, 0, 0, 0))).toBe(true)
    expect(isTitleSnowActive(new Date(2027, 1, 20, 0, 0, 0, 0))).toBe(true)
    expect(isTitleSnowActive(new Date(2027, 1, 20, 23, 59, 59, 999))).toBe(true)
  })

  it('is off from 2027-02-21 00:00 local onwards', () => {
    expect(isTitleSnowActive(new Date(2027, 1, 21, 0, 0, 0, 0))).toBe(false)
    expect(isTitleSnowActive(new Date(2027, 1, 21, 0, 0, 0, 1))).toBe(false)
    expect(isTitleSnowActive(new Date(2027, 2, 1))).toBe(false)
    expect(isTitleSnowActive(new Date(2027, 11, 25))).toBe(false)
    expect(isTitleSnowActive(new Date(2030, 0, 1))).toBe(false)
  })

  it('uses the local-midnight boundary, not UTC', () => {
    const end = new Date(titleSnowEndTime())
    expect(end.getFullYear()).toBe(2027)
    expect(end.getMonth()).toBe(1)
    expect(end.getDate()).toBe(21)
    expect(end.getHours()).toBe(0)
    expect(end.getMinutes()).toBe(0)
  })

  it('treats invalid input as off', () => {
    expect(isTitleSnowActive(new Date(Number.NaN))).toBe(false)
    expect(isTitleSnowActive('2026-12-01')).toBe(false)
    expect(isTitleSnowActive(null)).toBe(false)
  })

  it('defaults to the current clock', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2027, 1, 20, 22, 0, 0, 0))
    expect(isTitleSnowActive()).toBe(true)
    vi.setSystemTime(new Date(2027, 1, 21, 0, 0, 0, 0))
    expect(isTitleSnowActive()).toBe(false)
  })
})
