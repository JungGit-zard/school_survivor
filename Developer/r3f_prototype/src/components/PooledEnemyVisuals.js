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
export const ENEMY_RENDER_CULLED = 0
export const ENEMY_RENDER_FAR = 1
export const ENEMY_RENDER_MID = 2
export const ENEMY_RENDER_NEAR = 3

// `screenBounds` is deliberately a conservative gameplay-camera rectangle,
// rather than Three's per-InstancedMesh frustum.  The latter only knows the
// stale whole-pool bounding sphere and can hide every moving zombie at once.
const RENDER_ENTER_MARGIN = 1.15
const RENDER_KEEP_MARGIN = 1.8
const RENDER_NEAR_DISTANCE_SQ = 6 * 6
const RENDER_MID_DISTANCE_SQ = 11 * 11

export function getPooledEnemyRenderTier(bounds, x, z, playerX, playerZ, previousTier = ENEMY_RENDER_CULLED) {
  const margin = previousTier === ENEMY_RENDER_CULLED ? RENDER_ENTER_MARGIN : RENDER_KEEP_MARGIN
  if (!bounds || x < bounds.minX - margin || x > bounds.maxX + margin || z < bounds.minZ - margin || z > bounds.maxZ + margin) return ENEMY_RENDER_CULLED
  const dx = x - playerX; const dz = z - playerZ; const distanceSq = dx * dx + dz * dz
  if (distanceSq <= RENDER_NEAR_DISTANCE_SQ) return ENEMY_RENDER_NEAR
  if (distanceSq <= RENDER_MID_DISTANCE_SQ) return ENEMY_RENDER_MID
  return ENEMY_RENDER_FAR
}

// Position is still written every frame.  Only the sinusoid phase is
// quantized away from the player, preserving readable motion without 200
// independent high-frequency animation calculations.
export function getPooledEnemyAnimationTime(timerMs, tier) {
  if (tier === ENEMY_RENDER_MID) return Math.floor(timerMs / 50) * .05
  if (tier === ENEMY_RENDER_FAR) return Math.floor(timerMs / 100) * .1
  return timerMs * .001
}

export function shouldRenderPooledEnemyPart(type, partIndex, tier) {
  if (tier >= ENEMY_RENDER_NEAR) return true
  // Every visible tier keeps a 3D head/body/limbs silhouette and its matching
  // outline.  Far tiers omit only small readable-detail boxes.
  if (type === 7 || type === 8) {
    if (tier === ENEMY_RENDER_MID) return partIndex !== 14 && partIndex !== 17 && partIndex !== 19 && partIndex !== 20 && partIndex !== 21 && partIndex !== 23 && partIndex !== 25 && partIndex !== 28 && partIndex !== 31 && partIndex !== 32
    return partIndex === 12 || partIndex === 18 || partIndex === 22 || partIndex === 24 || partIndex === 26 || partIndex === 27 || partIndex === 28 || partIndex === 29 || partIndex === 30 || partIndex === 31
  }
  if (tier === ENEMY_RENDER_MID) return partIndex !== 1 && partIndex !== 2 && partIndex !== 5 && partIndex !== 7 && partIndex !== 9 && partIndex !== 11
  return partIndex === 0 || partIndex === 3 || partIndex === 4 || partIndex === 6 || partIndex === 8 || partIndex === 10
}

export function shouldRefreshEnemySight(tier, slot, frame, seenGeneration, generation) {
  if (seenGeneration !== generation) return true
  const cadence = tier === ENEMY_RENDER_NEAR ? 2 : tier === ENEMY_RENDER_MID ? 4 : tier === ENEMY_RENDER_FAR ? 8 : 12
  return (frame + slot) % cadence === 0
}

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

// Renderer variant: apply the screen visibility filter while selecting the
// bounded cue pool.  Filtering after the first sixteen lowest indices would
// otherwise hide every on-screen warning when those earlier zombies are off
// camera.
export function fillVisibleChargeCueSlots(pool, tiers, out, capacity = CHARGE_CUE_CAPACITY) {
  let used = 0; let overflow = 0
  const highest = Math.min(POOLED_ENEMY_CAPACITY - 1, Number.isInteger(pool?.highestActive) ? pool.highestActive : POOLED_ENEMY_CAPACITY - 1)
  for (let index = 0; index <= highest; index += 1) {
    if (tiers[index] === ENEMY_RENDER_CULLED || pool.active[index] !== 1 || pool.type[index] !== 5 || pool.state[index] !== 2 || pool.spawnTimer[index] < SPAWN_REVEAL_MS) continue
    if (used < capacity) out[used++] = index
    else overflow += 1
  }
  while (used < capacity) out[used++] = -1
  return overflow
}

export function setSlotOpacity(alpha, index, value) {
  const target = alpha?.array ?? alpha
  target[index] = clamp01(value)
  return target[index]
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

// E01-E06 share the E01 hierarchy.  The running pair has a richer hierarchy,
// but it is still resolved into the same canonical Studio transform cache;
// only this structural path-to-slot mapping differs.
export function pooledZombiePartSlotsForNumericPath(type, path, out) {
  if (type >= 1 && type <= 6) return e01PartSlotsForNumericPath(path, out)
  if (type !== 7 && type !== 8) return 0

  const parts = String(path).split('.').map(Number)
  let start = -1
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (parts[index] === 0 && Number.isInteger(parts[index + 1]) && parts[index + 1] <= 5) {
      start = index
      break
    }
  }
  if (start < 0) return 0

  const pivot = parts[start + 1]
  const leaf = parts[start + 2]
  const setRange = (first, count) => {
    for (let index = 0; index < count; index += 1) out[index] = first + index
    return count
  }

  if (!Number.isInteger(leaf)) {
    if (pivot === 0) return setRange(12, 6)
    if (pivot === 1) {
      const count = setRange(18, 4)
      if (type === 7) out[count] = 32
      return type === 7 ? count + 1 : count
    }
    if (pivot === 2) return setRange(22, 2)
    if (pivot === 3) return setRange(24, 2)
    if (pivot === 4) return setRange(26, 3)
    if (pivot === 5) return setRange(29, 3)
    return 0
  }

  if (pivot === 0) {
    if (leaf >= 0 && leaf <= 5) { out[0] = 12 + leaf; return 1 }
    // The tooth has no separate pooled mesh and follows the mouth proxy.
    if (leaf === 6) { out[0] = 17; return 1 }
    return 0
  }
  if (pivot === 1) {
    if (leaf === 0 || leaf === 1) { out[0] = 18 + leaf; return 1 }
    if (leaf === 2) {
      const nested = parts[start + 3]
      if (!Number.isInteger(nested)) return setRange(20, 2)
      if (nested === 0) { out[0] = 20; return 1 }
      out[0] = 21; return 1
    }
    if (type === 7 && leaf >= 3 && leaf <= 5) { out[0] = 32; return 1 }
    return 0
  }
  if (pivot === 2) {
    if (leaf === 0) { out[0] = 22; return 1 }
    if (leaf === 1) { out[0] = 23; return 1 }
    if (leaf === 2) { out[0] = 22; return 1 }
    return 0
  }
  if (pivot === 3) {
    if (leaf === 0) { out[0] = 24; return 1 }
    if (leaf === 1) { out[0] = 25; return 1 }
    if (leaf === 2) { out[0] = 24; return 1 }
    return 0
  }
  if (pivot === 4 && leaf >= 0 && leaf <= 2) { out[0] = 26 + leaf; return 1 }
  if (pivot === 5 && leaf >= 0 && leaf <= 2) { out[0] = 29 + leaf; return 1 }
  return 0
}

// Pooled rendering is only a path-to-slot adapter. Its numeric composition is
// injected from StudioTunedGroup's canonical pure kernel.
export function applyCachedPartTransform(cache, base, slots, slotCount, transform, composeStudioTransformCache) {
  for (let n=0;n<slotCount;n+=1) {
    const offset = base + slots[n] * 9
    composeStudioTransformCache(cache, offset, transform)
  }
}

// All pooled zombies use the same Studio composition rule as StudioTunedGroup:
// base pose + saved Studio transform + runtime animation.  This helper only
// selects the matching canonical item keys and maps their numeric paths to the
// pooled mesh slots; it does not introduce a model-specific transform rule.
export function applyPooledZombieStudioPartTunings(cache, type, partCount, itemId, tunings, getTransform, composeStudioTransformCache, slots) {
  const marker = `${itemId}::`
  const partPrefix = `${marker}part::`
  const groupPrefix = `${marker}group::`
  const base = type * partCount * 9

  Object.keys(tunings ?? {}).sort().forEach((savedKey) => {
    const prefix = savedKey.startsWith(groupPrefix) ? groupPrefix : savedKey.startsWith(partPrefix) ? partPrefix : null
    if (!prefix) return
    const transform = getTransform(tunings[savedKey])
    savedKey.slice(prefix.length).split('+').forEach((path) => {
      const count = pooledZombiePartSlotsForNumericPath(type, path, slots)
      applyCachedPartTransform(cache, base, slots, count, transform, composeStudioTransformCache)
    })
  })
}
