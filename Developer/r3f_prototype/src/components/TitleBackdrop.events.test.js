import { describe, expect, it } from 'vitest'
import { pickNextTitleEvent, TITLE_EVENT_TYPES, TITLE_PEEK_WINDOWS } from './TitleBackdrop.jsx'

function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

describe('pickNextTitleEvent', () => {
  it('picks a delay between 6000 and 10000 ms, a known event and a valid window', () => {
    for (const r of [() => 0, () => 0.5, () => 0.999999, seeded(7)]) {
      for (let i = 0; i < 50; i += 1) {
        const next = pickNextTitleEvent({ random: r })
        expect(next.delay).toBeGreaterThanOrEqual(6000)
        expect(next.delay).toBeLessThanOrEqual(10000)
        expect(TITLE_EVENT_TYPES).toContain(next.type)
        expect(TITLE_PEEK_WINDOWS[next.windowIndex]).toBeTruthy()
      }
    }
  })

  it('never repeats the previous event', () => {
    const random = seeded(42)
    let previous = null
    for (let i = 0; i < 300; i += 1) {
      const next = pickNextTitleEvent({ previous, random })
      expect(next.type).not.toBe(previous)
      previous = next.type
    }
  })

  it('returns no event when reduced motion is preferred', () => {
    expect(pickNextTitleEvent({ reducedMotion: true })).toBeNull()
    expect(pickNextTitleEvent({ previous: 'paperPlane', reducedMotion: true })).toBeNull()
  })
})
