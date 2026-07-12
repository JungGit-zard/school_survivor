import { describe, expect, it } from 'vitest'
import { resolvePlayerHitKnockback } from './Player.jsx'

describe('player hit knockback', () => {
  it('pushes the player backward from the last facing direction at a stable speed', () => {
    expect(resolvePlayerHitKnockback({ x: 3, z: 4 })).toEqual({ x: -2.4, y: 0, z: -3.2 })
    expect(resolvePlayerHitKnockback({ x: 0, z: 0 })).toEqual({ x: 0, y: 0, z: -4 })
  })
})
