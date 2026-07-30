import { describe, expect, it } from 'vitest'
import {
  PORTAL_SUCTION_DURATION,
  advancePortalSuctionClock,
  createPortalSuctionClock,
  resetPortalSuctionClock,
} from './portalSuctionClock.js'

describe('portal suction clock', () => {
  it('caps a hidden-tab resume at 0.5 seconds, so one 1-second delta cannot clear it', () => {
    const clock = createPortalSuctionClock()

    expect(advancePortalSuctionClock(clock, 1)).toMatchObject({ elapsed: expect.closeTo(0.5, 8), completedNow: false })
    expect(clock.elapsed).toBeLessThan(PORTAL_SUCTION_DURATION)
  })

  it('exposes the completion edge exactly once, so clear has one eligible frame', () => {
    const clock = createPortalSuctionClock()

    expect(advancePortalSuctionClock(clock, 0.5)).toMatchObject({ elapsed: expect.closeTo(0.5, 8), completedNow: false })
    expect(advancePortalSuctionClock(clock, 0.5)).toEqual({ elapsed: PORTAL_SUCTION_DURATION, completedNow: true })
    expect(advancePortalSuctionClock(clock, 0.5)).toEqual({ elapsed: PORTAL_SUCTION_DURATION, completedNow: false })
  })

  it('starts at zero and leaves the first delta for the following playing frame', () => {
    const clock = createPortalSuctionClock()
    advancePortalSuctionClock(clock, 0.5)

    resetPortalSuctionClock(clock)

    expect(clock.elapsed).toBe(0)
    expect(advancePortalSuctionClock(clock, 0.5)).toMatchObject({ elapsed: expect.closeTo(0.5, 8), completedNow: false })
  })

  it('keeps the 120 Hz residual: two renders make one 60 Hz suction step', () => {
    const clock = createPortalSuctionClock()

    expect(advancePortalSuctionClock(clock, 1 / 120)).toMatchObject({ elapsed: 0, completedNow: false })
    expect(advancePortalSuctionClock(clock, 1 / 120)).toMatchObject({ elapsed: expect.closeTo(1 / 60, 8), completedNow: false })
  })
})
