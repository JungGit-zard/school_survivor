export const STAGE_ENTRY_METRIC_EVENT = 'escape-zombie-school:stage-entry-metric'
export const STAGE_ENTRY_METRIC_PREFIX = 'escape-zombie-school:stage-entry'

export function stageEntryMetricNames(gameKey) {
  const suffix = Number.isInteger(gameKey) ? String(gameKey) : 'unknown'
  return Object.freeze({
    start: `${STAGE_ENTRY_METRIC_PREFIX}:${suffix}:start`,
    ready: `${STAGE_ENTRY_METRIC_PREFIX}:${suffix}:ready`,
  })
}

export function snapshotRendererInfo(info) {
  return Object.freeze({
    calls: Number(info?.render?.calls) || 0,
    triangles: Number(info?.render?.triangles) || 0,
    points: Number(info?.render?.points) || 0,
    lines: Number(info?.render?.lines) || 0,
    geometries: Number(info?.memory?.geometries) || 0,
    textures: Number(info?.memory?.textures) || 0,
  })
}

export function createStageEntryMetric({ gameKey, stageId, info, compileStatus = 'pending' }) {
  return Object.freeze({
    gameKey,
    stageId,
    compileStatus,
    renderer: snapshotRendererInfo(info),
  })
}

export function markStageEntryStart(gameKey) {
  const names = stageEntryMetricNames(gameKey)
  performance.mark?.(names.start)
  return names
}

export function publishStageEntryMetric(metric, names) {
  performance.mark?.(names.ready)
  try {
    performance.measure?.(`${names.ready}:duration`, names.start, names.ready)
  } catch {
    // Some embedded WebViews expose mark without a compatible measure API.
  }
  if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent(STAGE_ENTRY_METRIC_EVENT, { detail: metric }))
  }
  return metric
}
