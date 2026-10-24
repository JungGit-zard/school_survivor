import {
  PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS,
  PRESSURE_CAULDRON_BOIL_LEAD_MS,
  getPressureCauldronHazardVisual,
} from './stage4PressureCauldronHazard.js'

// Classify only the edge into the CURRENT visible hazard window. Never return
// a list of past cycles, nor replay a missed warning when already exploding.
export function getStage4CauldronFeedback(previousElapsedMs, elapsedMs, stageId, phase) {
  if (!Number.isFinite(previousElapsedMs) || previousElapsedMs < 0
    || !Number.isFinite(elapsedMs) || elapsedMs <= previousElapsedMs) return null
  const visual = getPressureCauldronHazardVisual(elapsedMs, stageId, phase)
  const cycleStart = Math.floor(elapsedMs / PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS) * PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS
  if (visual.bursting && previousElapsedMs < cycleStart) return 'flaskHit'
  const warningStart = cycleStart + PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS - PRESSURE_CAULDRON_BOIL_LEAD_MS
  if (visual.boiling && previousElapsedMs < warningStart) return 'zombieGiantThud'
  return null
}
