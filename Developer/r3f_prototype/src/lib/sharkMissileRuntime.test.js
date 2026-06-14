import { describe, expect, it } from 'vitest'
import { canFireSharkMissile, createSharkMissileLaunch } from './sharkMissileRuntime.js'

describe('shark missile runtime firing rules', () => {
  const activeWeapon = {
    active: true,
    cooldown: 14000,
    damage: 30,
    radius: 1.8,
    range: 28,
    speed: 8.5,
    retargetIntervalMs: 300,
  }

  it('can fire immediately when the weapon is active and no missile has been launched yet', () => {
    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 250,
      lastFireMs: null,
      activeMissileCount: 0,
    })).toBe(true)
  })

  it('waits for cooldown after the first launch', () => {
    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 10_000,
      lastFireMs: 0,
      activeMissileCount: 0,
    })).toBe(false)

    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 14_000,
      lastFireMs: 0,
      activeMissileCount: 0,
    })).toBe(true)
  })

  it('does not fire outside playing phase or while another shark missile is active', () => {
    expect(canFireSharkMissile({
      phase: 'title',
      weapon: activeWeapon,
      nowMs: 30_000,
      lastFireMs: null,
      activeMissileCount: 0,
    })).toBe(false)

    expect(canFireSharkMissile({
      phase: 'playing',
      weapon: activeWeapon,
      nowMs: 30_000,
      lastFireMs: null,
      activeMissileCount: 1,
    })).toBe(false)
  })

  it('builds the in-game launch payload from the player and cluster target', () => {
    expect(createSharkMissileLaunch({
      id: 7,
      playerPosition: { x: 1, y: 0.2, z: -3 },
      target: { x: 5, z: -8 },
      weapon: activeWeapon,
    })).toEqual({
      id: 7,
      start: [1, 0.66, -3],
      initialTarget: { x: 5, z: -8 },
      damage: 30,
      radius: 1.8,
      range: 28,
      speed: 8.5,
      retargetIntervalMs: 300,
    })
  })
})
