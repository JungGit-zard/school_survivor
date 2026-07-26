// Gameplay spatial units are fixed design values, not live model measurements.
// E01's 2026-07-26 ground collider footprint (~0.7467) is rounded to 1zm=0.75.
export const ZOMBIE_METER_WORLD_UNITS = 0.75
export const PENCIL_FIRE_DIAMETER_ZM = 6
export const PENCIL_FIRE_RADIUS_ZM = PENCIL_FIRE_DIAMETER_ZM / 2
export const PENCIL_FIRE_RANGE_WORLD_UNITS = PENCIL_FIRE_RADIUS_ZM * ZOMBIE_METER_WORLD_UNITS
