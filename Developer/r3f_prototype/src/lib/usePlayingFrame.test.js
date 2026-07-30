import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { shouldRunGameFrame } from './usePlayingFrame.js'

describe('shouldRunGameFrame', () => {
  it('runs only while the game is playing', () => {
    expect(shouldRunGameFrame('playing')).toBe(true)
  })

  it('delegates playing callbacks to the shared fixed-step clock', () => {
    const source = readFileSync(new URL('./usePlayingFrame.js', import.meta.url), 'utf8')
    expect(source).toContain("import { createGameplayFixedStepClock, runGameplayFixedSteps } from './gameplayFrameTime.js'")
    expect(source).toContain('runGameplayFixedSteps(clockRef.current, delta, (fixedDelta) => callback(state, fixedDelta))')
  })

  it('skips on every non-playing phase (paused/levelup/gameover) — projectiles must not advance or deal damage', () => {
    expect(shouldRunGameFrame('paused')).toBe(false)
    expect(shouldRunGameFrame('levelup')).toBe(false)
    expect(shouldRunGameFrame('gameover')).toBe(false)
    expect(shouldRunGameFrame('title')).toBe(false)
    expect(shouldRunGameFrame(undefined)).toBe(false)
  })
})
