// Pool renderer's pure visual rules.  No React, Three, Firebase, or storage dependency.
export const POOLED_ENEMY_CAPACITY = 200
export const SPAWN_REVEAL_MS = 300
export const SPAWN_SMOKE_MS = 850
export const CHARGE_CUE_CAPACITY = 16
export const ENEMY_HEALTH_BAR_WIDTH = 0.32
export const ENEMY_HEALTH_BAR_HEIGHT = 0.045
export const ENEMY_HEALTH_BAR_Y = 0.72
export const ENEMY_VISUAL_WORLD_SCALE = 0.333
// Match Enemy.jsx's ChargeToonCue anchor so the pooled E05 warning stays above
// the scaled zombie head instead of using its old, lower .9 offset.
export const CHARGE_CUE_LOCAL_Y = 1.75

// Preserve EnemyVisual/MiniHealthBar's world-space contract while letting the
// fixed instance renderer reuse caller-owned typed scratch in its frame loop.
export function fillEnemyHealthBarLayout(out, visualScale) {
  const cs = Number.isFinite(visualScale) && visualScale > 0 ? visualScale : 1
  out[0] = ENEMY_HEALTH_BAR_WIDTH * cs
  out[1] = ENEMY_HEALTH_BAR_HEIGHT
  out[2] = ENEMY_HEALTH_BAR_Y * cs
  return out
}

export function getPooledChargeCueY(baseY, visualScale) {
  const cs = Number.isFinite(visualScale) && visualScale > 0 ? visualScale : 1
  return baseY + CHARGE_CUE_LOCAL_Y * cs * ENEMY_VISUAL_WORLD_SCALE
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

export function getSpawnSmokeOpacity(elapsedMs) {
  if (elapsedMs <= SPAWN_REVEAL_MS) return 1
  return clamp01(1 - (elapsedMs - SPAWN_REVEAL_MS) / (SPAWN_SMOKE_MS - SPAWN_REVEAL_MS))
}

export function getPooledEnemyVisibility(active, spawnTimer) {
  const alive = active === 1 && Number.isFinite(spawnTimer) && spawnTimer >= 0
  return {
    smoke: alive && spawnTimer < SPAWN_SMOKE_MS,
    body: alive && spawnTimer >= SPAWN_REVEAL_MS,
    health: alive && spawnTimer >= SPAWN_REVEAL_MS,
    cue: alive && spawnTimer >= SPAWN_REVEAL_MS,
  }
}

// Stable lowest-index selection makes overflow reproducible and generation-safe at the caller.
export function selectChargeCueSlots(pool, capacity = CHARGE_CUE_CAPACITY) {
  const selected = []
  let overflow = 0
  const highest = Math.min(POOLED_ENEMY_CAPACITY - 1, Number.isInteger(pool?.highestActive) ? pool.highestActive : POOLED_ENEMY_CAPACITY - 1)
  for (let index = 0; index <= highest; index += 1) {
    if (pool.active[index] !== 1 || pool.type[index] !== 5 || pool.state[index] !== 2 || pool.spawnTimer[index] < SPAWN_REVEAL_MS) continue
    if (selected.length < capacity) selected.push(index)
    else overflow += 1
  }
  return { selected, overflow }
}

// Frame-loop variant: caller owns the fixed typed scratch, so no array/object is
// allocated when 200 E05s warn at once. Returns only overflow count.
export function fillChargeCueSlots(pool, out, capacity = CHARGE_CUE_CAPACITY) {
  let used = 0; let overflow = 0
  const highest = Math.min(POOLED_ENEMY_CAPACITY - 1, Number.isInteger(pool?.highestActive) ? pool.highestActive : POOLED_ENEMY_CAPACITY - 1)
  for (let index = 0; index <= highest; index += 1) {
    if (pool.active[index] !== 1 || pool.type[index] !== 5 || pool.state[index] !== 2 || pool.spawnTimer[index] < SPAWN_REVEAL_MS) continue
    if (used < capacity) out[used++] = index
    else overflow += 1
  }
  while (used < capacity) out[used++] = -1
  return overflow
}

export function setSlotOpacity(alpha, index, value) {
  alpha[index] = clamp01(value)
  return alpha[index]
}

export function updateHealthVisualState(state, index, generation, ratio, delta) {
  const nextRatio = clamp01(ratio)
  if (state.generation[index] !== generation) {
    state.generation[index] = generation
    state.lastRatio[index] = nextRatio
    state.trailRatio[index] = nextRatio
    state.flash[index] = 0
  }
  if (nextRatio < state.lastRatio[index]) {
    state.trailRatio[index] = Math.max(state.trailRatio[index], state.lastRatio[index])
    state.flash[index] = 1
  } else if (nextRatio > state.lastRatio[index]) {
    state.trailRatio[index] = nextRatio
  }
  state.lastRatio[index] = nextRatio
  const damp = 1 - Math.exp(-4.2 * Math.max(0, delta))
  state.trailRatio[index] += (nextRatio - state.trailRatio[index]) * damp
  state.flash[index] = Math.max(0, state.flash[index] - Math.max(0, delta) * 2.2)
  state.ratio[index] = nextRatio
  state.visibleTrailRatio[index] = Math.max(nextRatio, state.trailRatio[index])
}

export function hasUnsupportedStudioPartTuning(tunings, itemId) {
  return Object.keys(tunings ?? {}).some((key) => key.startsWith(`${itemId}::part::`) || key.startsWith(`${itemId}::group::`))
}

// Mirrors StudioTunedGroup's root JSX transform order: position, rotation, scale.
export function copyRootTransform(out, transform) {
  out[0] = transform.position[0]; out[1] = transform.position[1]; out[2] = transform.position[2]
  out[3] = transform.rotation[0]; out[4] = transform.rotation[1]; out[5] = transform.rotation[2]
  out[6] = transform.scale[0]; out[7] = transform.scale[1]; out[8] = transform.scale[2]
  return out
}

// Numeric child paths from ZOMBIE_E01_STUDIO_TRANSFORM_CONNECTION_CODE.md.
// `0` is StudioTunedGroup's model child; 0..5 below are its pivot groups.
export function e01PartSlotsForNumericPath(path, out) {
  const parts = String(path).split('.').map(Number)
  let start = -1
  for (let index=0;index<parts.length-1;index+=1) { if (parts[index] === 0 && Number.isInteger(parts[index+1]) && parts[index+1] <= 5) { start=index; break } }
  if (start < 0) return 0
  const pivot = parts[start+1]; const leaf = parts[start+2]
  const groups = [[0, 3], [3, 1], [4, 2], [6, 2], [8, 2], [10, 2]]
  const group = groups[pivot]
  if (!group) return 0
  if (!Number.isInteger(leaf)) { for (let i=0;i<group[1];i+=1) out[i]=group[0]+i; return group[1] }
  if (pivot === 0 && leaf >= 0 && leaf <= 2) { out[0]=leaf; return 1 }
  // ZBlock index: arm/body/leg is child 0 and hand/foot is child 1. Any
  // further mesh child (outline/body) resolves back to that ZBlock.
  if (pivot > 0 && leaf >= 0 && leaf < group[1]) { out[0]=group[0]+leaf; return 1 }
  return 0
}

export function applyCachedPartTransform(cache, base, slots, slotCount, transform) {
  for (let n=0;n<slotCount;n+=1) {
    const offset = base + slots[n] * 9
    cache[offset] += transform.position[0]; cache[offset+1] += transform.position[1]; cache[offset+2] += transform.position[2]
    cache[offset+3] += transform.rotation[0]; cache[offset+4] += transform.rotation[1]; cache[offset+5] += transform.rotation[2]
    cache[offset+6] *= transform.scale[0]; cache[offset+7] *= transform.scale[1]; cache[offset+8] *= transform.scale[2]
  }
}
