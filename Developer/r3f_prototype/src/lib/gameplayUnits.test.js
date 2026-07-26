import { describe, expect, it } from 'vitest'

describe('gameplayUnits', () => {
  it('defines the E01-based zombie meter and the pencil 6zm firing circle in one shared canonical module', async () => {
    const {
      ZOMBIE_METER_WORLD_UNITS,
      PENCIL_FIRE_DIAMETER_ZM,
      PENCIL_FIRE_RADIUS_ZM,
      PENCIL_FIRE_RANGE_WORLD_UNITS,
    } = await import('./gameplayUnits.js')

    expect(ZOMBIE_METER_WORLD_UNITS).toBe(0.75)
    expect(PENCIL_FIRE_DIAMETER_ZM).toBe(6)
    expect(PENCIL_FIRE_RADIUS_ZM).toBe(PENCIL_FIRE_DIAMETER_ZM / 2)
    expect(PENCIL_FIRE_RANGE_WORLD_UNITS).toBe(PENCIL_FIRE_RADIUS_ZM * ZOMBIE_METER_WORLD_UNITS)
    expect(PENCIL_FIRE_RANGE_WORLD_UNITS).toBe(2.25)
  })
})
