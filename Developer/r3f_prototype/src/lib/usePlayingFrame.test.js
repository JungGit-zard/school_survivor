import { describe, expect, it } from 'vitest'
import { shouldRunGameFrame } from './usePlayingFrame.js'

describe('shouldRunGameFrame', () => {
  it('runs only while the game is playing', () => {
    expect(shouldRunGameFrame('playing')).toBe(true)
  })

  it('skips on every non-playing phase (paused/levelup/gameover) — projectiles must not advance or deal damage', () => {
    expect(shouldRunGameFrame('paused')).toBe(false)
    expect(shouldRunGameFrame('levelup')).toBe(false)
    expect(shouldRunGameFrame('gameover')).toBe(false)
    expect(shouldRunGameFrame('title')).toBe(false)
    expect(shouldRunGameFrame(undefined)).toBe(false)
  })
})
