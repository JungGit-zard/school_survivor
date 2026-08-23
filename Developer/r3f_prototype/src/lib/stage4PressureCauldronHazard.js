export const PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS = 15_000
export const PRESSURE_CAULDRON_BOIL_LEAD_MS = 3_000
export const PRESSURE_CAULDRON_BURST_DURATION_MS = 250
export const PRESSURE_CAULDRON_DAMAGE_RATIO = 0.20
export const PRESSURE_CAULDRON_DAMAGE_RADIUS = 3.2

function isActiveStage4Play(stageId, phase) {
  return stageId === 'stage4' && phase === 'playing'
}

export function getPressureCauldronExplosionTimes(previousElapsedMs, elapsedMs, stageId, phase) {
  if (!isActiveStage4Play(stageId, phase)) return []
  if (!Number.isFinite(previousElapsedMs) || !Number.isFinite(elapsedMs) || elapsedMs <= previousElapsedMs) return []

  const firstEvent = Math.floor(previousElapsedMs / PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS) + 1
  const lastEvent = Math.floor(elapsedMs / PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS)
  const events = []
  for (let event = firstEvent; event <= lastEvent; event += 1) {
    events.push(event * PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS)
  }
  return events
}

export function getPressureCauldronHazardVisual(elapsedMs, stageId, phase) {
  if (!isActiveStage4Play(stageId, phase) || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return { boiling: false, bursting: false }
  }
  const cycleElapsed = elapsedMs % PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS
  const boiling = cycleElapsed >= PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS - PRESSURE_CAULDRON_BOIL_LEAD_MS
  const bursting = cycleElapsed < PRESSURE_CAULDRON_BURST_DURATION_MS && elapsedMs >= PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS
  return { boiling: boiling && !bursting, bursting }
}

export function isInsidePressureCauldronBlastRadius(playerX, playerZ) {
  return Math.hypot(playerX, playerZ) <= PRESSURE_CAULDRON_DAMAGE_RADIUS
}
