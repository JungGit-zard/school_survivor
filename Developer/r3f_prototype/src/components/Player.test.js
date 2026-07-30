import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolvePlayerHitKnockback } from './Player.jsx'

describe('player hit knockback', () => {
  it('pushes the player backward from the last facing direction at a stable speed', () => {
    expect(resolvePlayerHitKnockback({ x: 3, z: 4 })).toEqual({ x: -2.4, y: 0, z: -3.2 })
    expect(resolvePlayerHitKnockback({ x: 0, z: 0 })).toEqual({ x: 0, y: 0, z: -4 })
  })

  it('uses the shared fixed-step clock for knockback, facing, and invulnerability timers', () => {
    const source = readFileSync(new URL('./Player.jsx', import.meta.url), 'utf8')
    expect(source).toContain("import { createGameplayFixedStepClock, runGameplayFixedSteps } from '../lib/gameplayFrameTime.js'")
    expect(source).toContain('runGameplayFixedSteps(gameplayClockRef.current, delta, (dt) =>')
    expect(source).toContain('knockbackRemainingMs.current - dt * 1000')
    expect(source).toContain('Math.min(1, dt * TURN_SPEED)')
    expect(source).toContain('invTimer.current += dt * 1000')
  })
})
