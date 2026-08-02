export const MATILDA_DIALOGUE_MS = 5000
const MATILDA_ENTRY_EPSILON_MS = 1e-6

// This is advanced only by usePlayingFrame. A wall-clock timer would keep
// running during pause or level-up and spawn Matilda immediately on resume.
export function createMatildaEntryGrace({
  stageId,
  gameKey,
  delayMs = MATILDA_DIALOGUE_MS,
} = {}) {
  return {
    stageId,
    gameKey,
    remainingMs: Math.max(0, Number(delayMs) || 0),
    pending: true,
  }
}

export function cancelMatildaEntryGrace(entry) {
  if (entry) entry.pending = false
}

export function canSpawnMatildaEntry(entry, state) {
  return Boolean(
    state?.matildaSpawned
    && state.currentStageId === entry?.stageId
    && state.gameKey === entry?.gameKey
    && state.phase !== 'gameover'
    && state.phase !== 'cleared'
  )
}

// Returns true exactly once when gameplay fixed steps exhaust the grace.
export function advanceMatildaEntryGrace(entry, deltaSeconds) {
  if (!entry?.pending) return false
  const deltaMs = Number.isFinite(deltaSeconds) && deltaSeconds > 0
    ? deltaSeconds * 1000
    : 0
  entry.remainingMs = Math.max(0, entry.remainingMs - deltaMs)
  if (entry.remainingMs > MATILDA_ENTRY_EPSILON_MS) return false
  entry.remainingMs = 0
  entry.pending = false
  return true
}
