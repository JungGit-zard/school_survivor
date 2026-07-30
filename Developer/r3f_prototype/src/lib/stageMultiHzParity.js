// Deterministic, browser-free Stage 1~4 parity harness.
//
// This intentionally exercises the production pure pools/simulation/configuration
// at the same 1/60 fixed step used by R3F/Rapier. It is not a Canvas, Rapier-body,
// WebGL, or Android substitute; those concerns retain their separate runtime gates.
import { createEnemyEntityPool, enemyTypeToCode } from './enemyEntityPool.js'
import { createEnemyProjectilePool } from './enemyProjectilePool.js'
import {
  createEnemySimulationRuntime,
  ENEMY_EVENT_CONTACT,
  ENEMY_EVENT_DEATH,
  ENEMY_EVENT_DESPAWN,
  ENEMY_EVENT_ERROR,
  ENEMY_EVENT_RANGED_FIRE,
  ENEMY_RUNTIME_HP,
} from './enemySimulation.js'
import { getStageBounds, getStageDurationSec } from './stageConfig.js'
import { getDefaultWavePhases } from './waveTimelines.js'
import { getBurstEventsForStage, isBossType } from './burstEvents.js'
import { getE04IntroSec } from './stage2ProjectileRules.js'
import {
  GAMEPLAY_FIXED_STEP,
  MAX_GAMEPLAY_FRAME_DELTA,
  clampGameplayFrameDelta,
  createGameplayFixedStepClock,
  consumeGameplayFixedSteps,
} from './gameplayFrameTime.js'
import { clampPlayerPosition } from './playerMovementBounds.js'

export const MULTI_HZ_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4'])
export const MULTI_HZ_RENDER_RATES = Object.freeze([30, 60, 120])
export const MULTI_HZ_CHECKPOINT_SECONDS = Object.freeze([30, 60, 120, 180, 240])
export const MULTI_HZ_SEED = 0x5a17e

const PLAYER_SPEED = 2.45
const PLAYER_MAX_HP = 9999
const FIRE_EVERY_STEPS = 12
const INPUT_INTERVAL_STEPS = 30
const SNAPSHOT_EPSILON = 1e-6

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function phaseAtTime(phases, elapsedSec) {
  let selected = phases[0]
  for (let index = 1; index < phases.length; index += 1) {
    if (elapsedSec < phases[index].start) break
    selected = phases[index]
  }
  return selected
}

function pickWeightedType(weights, random) {
  const roll = random()
  let total = 0
  for (const value of Object.values(weights)) total += value
  let cursor = roll * total
  for (const [type, weight] of Object.entries(weights)) {
    cursor -= weight
    if (cursor <= 0) return type
  }
  return Object.keys(weights)[0] ?? 'E01'
}

function randomSpawnPosition(bounds, random, slot) {
  const angle = random() * Math.PI * 2
  const radius = Math.max(bounds.halfX, bounds.halfZ) + 1.5 + (slot % 3) * 0.35
  return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
}

function createInputLog(seed, durationSec) {
  const random = mulberry32(seed)
  const entries = []
  const count = Math.ceil((durationSec / GAMEPLAY_FIXED_STEP) / INPUT_INTERVAL_STEPS)
  for (let index = 0; index < count; index += 1) {
    const horizontal = random() < 0.5 ? -1 : 1
    const vertical = random() < 0.5 ? -1 : 1
    entries.push({
      step: index * INPUT_INTERVAL_STEPS,
      x: random() < 0.3 ? 0 : horizontal,
      z: random() < 0.3 ? 0 : vertical,
    })
  }
  return entries
}

export function createDeterministicStageInputLog(stageId, seed = MULTI_HZ_SEED) {
  return createInputLog((seed ^ hashStage(stageId)) >>> 0, getStageDurationSec(stageId))
}

function hashStage(stageId) {
  let hash = 2166136261
  for (let index = 0; index < stageId.length; index += 1) hash = Math.imul(hash ^ stageId.charCodeAt(index), 16777619)
  return hash >>> 0
}

function spawn(pool, type, position, runDirection = null) {
  const typeCode = enemyTypeToCode(type)
  if (typeCode < 1 || typeCode > ENEMY_RUNTIME_HP.length - 1) return false
  const hp = ENEMY_RUNTIME_HP[typeCode]
  return pool.spawnInto({}, {
    type,
    x: position.x,
    y: 0,
    z: position.z,
    hp,
    maxHp: hp,
    visualScale: 1,
    runDirX: runDirection?.x ?? 1,
    runDirZ: runDirection?.z ?? 0,
  })
}

function spawnWave(pool, phase, size, bounds, random, stats) {
  for (let slot = 0; slot < size; slot += 1) {
    const type = pickWeightedType(phase.weights, random)
    if (spawn(pool, type, randomSpawnPosition(bounds, random, slot))) stats.spawns += 1
    else stats.spawnFailures += 1
  }
}

function spawnBurst(pool, event, bounds, random, stats) {
  // Bosses are React/Rapier-owned actors outside EnemySimulationRuntime's type
  // contract (which supports type codes 1..8). Keep the actual timeline trigger
  // visible, then use a small eligible escort proxy for this pure harness.
  if (isBossType(event.type)) {
    stats.bossTimelineTriggers += 1
    const type = event.type === 'B04' ? 'E04' : 'E05'
    for (let slot = 0; slot < 2; slot += 1) {
      if (spawn(pool, type, randomSpawnPosition(bounds, random, slot))) stats.spawns += 1
      else stats.spawnFailures += 1
    }
    return
  }
  const count = event.count ?? 1
  const runCrew = event.type === 'RZL' || event.type === 'RZC'
  for (let slot = 0; slot < count; slot += 1) {
    const position = randomSpawnPosition(bounds, random, slot)
    const runDirection = runCrew ? { x: -Math.sign(position.x || 1), z: -Math.sign(position.z || 1) } : null
    if (spawn(pool, event.type, position, runDirection)) stats.spawns += 1
    else stats.spawnFailures += 1
  }
}

function fireNearest(pool, simulation, player, stats) {
  let closest = -1
  let closestDistance = Infinity
  for (let index = 0; index <= pool.highestActive; index += 1) {
    if (!pool.active[index] || pool.type[index] === 4 || pool.spawnTimer[index] < 300) continue // let reveal/E04 exercise their live paths.
    const dx = pool.posX[index] - player.x
    const dz = pool.posZ[index] - player.z
    const distance = dx * dx + dz * dz
    if (distance < closestDistance) {
      closest = index
      closestDistance = distance
    }
  }
  if (closest < 0) return
  simulation.applyHitIndex(pool, closest, pool.generation[closest], 9999, 0.7, -0.3, 80)
  stats.weaponFires += 1
}

function drainEvents(simulation, stats) {
  const event = {}
  while (simulation.events.drainInto(event)) {
    if (event.type === ENEMY_EVENT_CONTACT) stats.contacts += 1
    else if (event.type === ENEMY_EVENT_RANGED_FIRE) stats.rangedFires += 1
    else if (event.type === ENEMY_EVENT_DESPAWN) stats.despawns += 1
    else if (event.type === ENEMY_EVENT_DEATH) stats.deaths += 1
    else if (event.type === ENEMY_EVENT_ERROR) stats.errorEvents += 1
  }
}

function countNaN(pool, projectiles) {
  let count = 0
  for (let index = 0; index <= pool.highestActive; index += 1) {
    if (pool.active[index] && (!Number.isFinite(pool.posX[index]) || !Number.isFinite(pool.posZ[index]) || !Number.isFinite(pool.hp[index]))) count += 1
  }
  for (let index = 0; index < projectiles.active.length; index += 1) {
    if (projectiles.active[index] && (!Number.isFinite(projectiles.posX[index]) || !Number.isFinite(projectiles.posZ[index]))) count += 1
  }
  return count
}

function snapshot(step, player, hp, pool, projectiles, simulation, stats) {
  return {
    step,
    elapsedSec: Number((step * GAMEPLAY_FIXED_STEP).toFixed(6)),
    playerX: Number(player.x.toFixed(6)),
    playerZ: Number(player.z.toFixed(6)),
    playerHp: Number(hp.toFixed(6)),
    contacts: stats.contacts,
    activeEnemies: pool.activeCount,
    liveProxies: pool.liveProxyCount,
    activeProjectiles: projectiles.activeCount,
    eventDropped: simulation.events.dropped,
    nanCount: countNaN(pool, projectiles),
    invariantOk: pool.validateInvariants(),
  }
}

function cleanup(pool, projectiles, simulation) {
  for (let index = pool.highestActive; index >= 0; index -= 1) {
    if (pool.active[index]) pool.despawnIndex(index, pool.generation[index])
  }
  projectiles.reset()
  simulation.reset()
}

function almostEqual(a, b) {
  return typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= SNAPSHOT_EPSILON : a === b
}

export function compareParitySnapshots(expected, actual) {
  const mismatches = []
  if (expected.length !== actual.length) return [{ field: 'length', expected: expected.length, actual: actual.length }]
  for (let index = 0; index < expected.length; index += 1) {
    for (const key of Object.keys(expected[index])) {
      if (!almostEqual(expected[index][key], actual[index][key])) {
        mismatches.push({ checkpoint: index, field: key, expected: expected[index][key], actual: actual[index][key] })
      }
    }
  }
  return mismatches
}

/**
 * Runs one stage at a supplied render cadence. The render cadence only feeds the
 * shared GameplayFrameTime accumulator; simulation work remains a 1/60 fixed step.
 */
export function runStageAtRenderHz({ stageId, renderHz, seed = MULTI_HZ_SEED } = {}) {
  if (!MULTI_HZ_STAGE_IDS.includes(stageId)) throw new Error(`unknown parity stage: ${stageId}`)
  if (!MULTI_HZ_RENDER_RATES.includes(renderHz)) throw new Error(`unsupported render rate: ${renderHz}`)
  const durationSec = getStageDurationSec(stageId)
  const totalSteps = Math.round(durationSec / GAMEPLAY_FIXED_STEP)
  const bounds = getStageBounds(stageId)
  const pool = createEnemyEntityPool()
  const simulation = createEnemySimulationRuntime()
  const projectiles = createEnemyProjectilePool()
  const phases = getDefaultWavePhases(stageId)
  const bursts = getBurstEventsForStage(stageId)
  const random = mulberry32((seed ^ hashStage(stageId)) >>> 0)
  const inputLog = createDeterministicStageInputLog(stageId, seed)
  const clock = createGameplayFixedStepClock()
  const player = { x: 0, z: 0 }
  const stats = {
    spawns: 0, spawnFailures: 0, bossTimelineTriggers: 0, weaponFires: 0,
    contacts: 0, rangedFires: 0, despawns: 0, deaths: 0, errorEvents: 0,
    projectileSpawns: 0, projectileHits: 0, maxActiveEnemies: 0, maxProjectiles: 0,
  }
  const checkpoints = []
  let playerHp = PLAYER_MAX_HP
  let fixedStep = 0
  let inputIndex = 0
  let nextWaveSec = 0
  let burstIndex = 0
  let nextCheckpoint = 0
  let running = true

  const fixedStepSimulation = () => {
    if (!running || fixedStep >= totalSteps) return
    const elapsedSec = fixedStep * GAMEPLAY_FIXED_STEP
    while (inputIndex + 1 < inputLog.length && inputLog[inputIndex + 1].step <= fixedStep) inputIndex += 1
    const input = inputLog[inputIndex]
    const length = Math.hypot(input.x, input.z) || 1
    const moved = clampPlayerPosition(stageId, {
      x: player.x + (input.x / length) * PLAYER_SPEED * GAMEPLAY_FIXED_STEP,
      z: player.z + (input.z / length) * PLAYER_SPEED * GAMEPLAY_FIXED_STEP,
    })
    player.x = moved.x
    player.z = moved.z

    while (elapsedSec + SNAPSHOT_EPSILON >= nextWaveSec && nextWaveSec < durationSec) {
      const phase = phaseAtTime(phases, nextWaveSec)
      const size = Math.max(1, Math.round(phase.target * 0.35))
      spawnWave(pool, phase, size, bounds, random, stats)
      nextWaveSec += 18 + random() * 12
    }
    while (burstIndex < bursts.length && elapsedSec + SNAPSHOT_EPSILON >= bursts[burstIndex].sec) {
      spawnBurst(pool, bursts[burstIndex], bounds, random, stats)
      burstIndex += 1
    }
    // A real short-range contact probe ensures contact/cooldown code is covered
    // before the normal weapon cadence starts removing nearby enemies.
    if (fixedStep === 60) {
      // Spawn at the input-log-predicted position reached after the 300ms reveal.
      // This exercises the real contact + per-enemy cooldown path without creating
      // a frame-cadence-only special case.
      const revealLead = 0.34
      const position = {
        x: player.x + (input.x / length) * PLAYER_SPEED * revealLead,
        z: player.z + (input.z / length) * PLAYER_SPEED * revealLead,
      }
      if (spawn(pool, 'E01', position)) stats.spawns += 1
    }

    simulation.step(pool, {
      delta: GAMEPLAY_FIXED_STEP,
      playerX: player.x,
      playerZ: player.z,
      halfX: bounds.halfX,
      halfZ: bounds.halfZ,
      elapsedSec,
      activeProjectileCount: projectiles.activeCount,
      stageId,
      e04IntroSec: getE04IntroSec(stageId),
      bossPressure: false,
      onContact: (_index, _generation, _x, _y, _z, damage) => { playerHp = Math.max(0, playerHp - damage) },
      onRangedFire: (_index, _generation, x, y, z, dirX, dirZ) => {
        if (projectiles.spawnInto({}, x, y, z, dirX, dirZ)) stats.projectileSpawns += 1
      },
    })
    drainEvents(simulation, stats)
    projectiles.step(GAMEPLAY_FIXED_STEP, player.x, player.z, () => { stats.projectileHits += 1 })
    if (fixedStep % FIRE_EVERY_STEPS === FIRE_EVERY_STEPS - 1) fireNearest(pool, simulation, player, stats)
    drainEvents(simulation, stats)
    stats.maxActiveEnemies = Math.max(stats.maxActiveEnemies, pool.activeCount)
    stats.maxProjectiles = Math.max(stats.maxProjectiles, projectiles.activeCount)
    fixedStep += 1
    if (nextCheckpoint < MULTI_HZ_CHECKPOINT_SECONDS.length
      && fixedStep === Math.round(MULTI_HZ_CHECKPOINT_SECONDS[nextCheckpoint] / GAMEPLAY_FIXED_STEP)) {
      checkpoints.push(snapshot(fixedStep, player, playerHp, pool, projectiles, simulation, stats))
      nextCheckpoint += 1
    }
    if (simulation.events.dropped !== 0 || countNaN(pool, projectiles) !== 0 || !pool.validateInvariants()) running = false
  }

  const frames = Math.round(renderHz * durationSec)
  for (let frame = 0; frame < frames && running; frame += 1) {
    const steps = consumeGameplayFixedSteps(clock, 1 / renderHz)
    for (let step = 0; step < steps; step += 1) fixedStepSimulation()
  }
  const finalBeforeCleanup = snapshot(fixedStep, player, playerHp, pool, projectiles, simulation, stats)
  cleanup(pool, projectiles, simulation)
  const cleanupSnapshot = {
    activeEnemies: pool.activeCount,
    liveProxies: pool.liveProxyCount,
    activeProjectiles: projectiles.activeCount,
    eventDropped: simulation.events.dropped,
    nanCount: countNaN(pool, projectiles),
    invariantOk: pool.validateInvariants(),
  }
  return {
    stageId, renderHz, seed, fixedSteps: fixedStep, expectedFixedSteps: totalSteps,
    inputLogLength: inputLog.length, checkpoints, final: finalBeforeCleanup, cleanup: cleanupSnapshot,
    stats, ok: running && fixedStep === totalSteps,
  }
}

export function runStageMultiHzParity({ seed = MULTI_HZ_SEED, stages = MULTI_HZ_STAGE_IDS } = {}) {
  const results = {}
  const failures = []
  for (const stageId of stages) {
    const byRate = {}
    for (const renderHz of MULTI_HZ_RENDER_RATES) byRate[renderHz] = runStageAtRenderHz({ stageId, renderHz, seed })
    const baseline = byRate[60]
    for (const renderHz of [30, 120]) {
      const candidate = byRate[renderHz]
      const checkpointMismatches = compareParitySnapshots(baseline.checkpoints, candidate.checkpoints)
      const finalMismatches = compareParitySnapshots([baseline.final], [candidate.final])
      if (checkpointMismatches.length || finalMismatches.length || !candidate.ok || !baseline.ok) {
        failures.push({ stageId, renderHz, checkpointMismatches, finalMismatches, baselineOk: baseline.ok, candidateOk: candidate.ok })
      }
    }
    results[stageId] = byRate
  }
  return { ok: failures.length === 0, seed, results, failures }
}

// Separate proof of the 0.5s hidden/resume cap and residual preservation. This
// probes the production GameplayFrameTime helper directly rather than re-creating it.
export function runFrameDeltaClampProbe() {
  const clock = createGameplayFixedStepClock()
  const cappedSteps = consumeGameplayFixedSteps(clock, 3)
  const residualAfterCap = clock.accumulator
  const first120 = consumeGameplayFixedSteps(clock, 1 / 120)
  const second120 = consumeGameplayFixedSteps(clock, 1 / 120)
  return {
    rawDelta: 3,
    clampedDelta: clampGameplayFrameDelta(3),
    maxDelta: MAX_GAMEPLAY_FRAME_DELTA,
    cappedSteps,
    residualAfterCap,
    first120,
    second120,
    ok: cappedSteps === 30 && residualAfterCap === 0 && first120 === 0 && second120 === 1,
  }
}
