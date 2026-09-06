import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createEnemyEntityPool, MAX_ENEMIES } from '../../Developer/r3f_prototype/src/lib/enemyEntityPool.js'
import * as current from '../../Developer/r3f_prototype/src/lib/enemySimulation.js'

const repoRoot = new URL('../../', import.meta.url)
const simulationPath = new URL('Developer/r3f_prototype/src/lib/enemySimulation.js', repoRoot)
const oldSource = execFileSync('git', ['show', '7f1d615a:Developer/r3f_prototype/src/lib/enemySimulation.js'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).replace(/from '(\.\/[^']+)'/g, (_match, specifier) => `from '${new URL(specifier, simulationPath).href}'`)
const baseline = await import(`data:text/javascript;base64,${Buffer.from(oldSource).toString('base64')}`)

const blockedObstacle = [{ x: 0, z: 0, halfX: 10, halfZ: 10 }]
const baselineBlocked = { x: 0, z: 0, blocked: 0 }
const currentBlocked = { x: 0, z: 0, blocked: 0 }
const blockedArgs = [0, 0, 1, 0, 1 / 60, 0.2, blockedObstacle, 1, 20, 20]
if (baseline.moveEnemyWithObstacleSlideInto(baselineBlocked, ...blockedArgs) !== current.moveEnemyWithObstacleSlideInto(currentBlocked, ...blockedArgs)
  || JSON.stringify(baselineBlocked) !== JSON.stringify(currentBlocked)) throw new Error('blocked move mismatch')

const ARRAY_KEYS = [
  'active', 'generation', 'type', 'posX', 'posY', 'posZ', 'velX', 'velZ', 'hp', 'maxHp', 'yaw', 'visualScale',
  'phase', 'state', 'spawnTimer', 'stateTimer', 'attackCooldown', 'hitCooldown', 'lifetime', 'knockbackX',
  'knockbackY', 'knockbackZ', 'knockbackTimer', 'hitFlashTimer', 'runDirX', 'runDirZ', 'lastContactX',
  'lastContactY', 'lastContactZ', 'lastContactTime', 'stuckMs', 'detourMs', 'detourSign', 'lastSafeX', 'lastSafeZ',
]

function fingerprint(pool, grid) {
  const hash = createHash('sha256')
  for (const key of ARRAY_KEYS) hash.update(Buffer.from(pool[key].buffer, pool[key].byteOffset, pool[key].byteLength))
  for (const key of ['head', 'next', 'overflowNext', 'cellX', 'cellZ', 'overflow']) hash.update(Buffer.from(grid[key].buffer, grid[key].byteOffset, grid[key].byteLength))
  hash.update(JSON.stringify([pool.activeCount, pool.highestActive, pool.spatialRevision, grid.cellsX, grid.cellsZ, grid.halfX, grid.halfZ, grid.activeCount, grid.highestActive, grid.poolSpatialRevision, grid.comparisonCount, grid.targetComparisonCount, grid.targetOrderingComparisonCount]))
  return hash.digest('hex')
}

function countedObstacles() {
  const reads = { x: 0 }
  const raw = [
    { x: -2, z: 0, halfX: 0.5, halfZ: 4 },
    { x: 1.5, z: -2, halfX: 2.5, halfZ: 0.5 },
    { x: 3, z: 3, halfX: 0.75, halfZ: 0.75 },
  ]
  const obstacles = raw.map((item) => {
    const obstacle = { ...item }
    Object.defineProperty(obstacle, 'x', { enumerable: true, get: () => { reads.x += 1; return item.x } })
    return obstacle
  })
  return { obstacles, reads }
}

function drain(runtime) {
  const event = {}
  const events = []
  while (runtime.events.drainInto(event)) events.push({ ...event })
  return events
}

function setup(simulation) {
  const pool = createEnemyEntityPool()
  const runtime = simulation.createEnemySimulationRuntime()
  const rebuild = runtime.grid.rebuild.bind(runtime.grid)
  let rebuilds = 0
  runtime.grid.rebuild = (...args) => { rebuilds += 1; return rebuild(...args) }
  const types = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', 'RZT', 'RZG', 'E07']
  for (let index = 0; index < 150; index += 1) {
    const type = types[index % types.length]
    const x = -10 + (index % 25) * 0.8
    const z = -6 + Math.floor(index / 25) * 2
    if (!pool.spawn({ type, x, y: 0, z, hp: 100, maxHp: 100, visualScale: 1, spawnTimer: type === 'E04' ? 900 : 300, runDirX: 1, runDirZ: index & 1 ? 0.5 : -0.5 })) throw new Error(`spawn failed at ${index}`)
  }
  return { pool, runtime, rebuilds: () => rebuilds }
}

const oldRun = setup(baseline)
const newRun = setup(current)
const oldObstacleData = countedObstacles()
const newObstacleData = countedObstacles()
const frames = 10_800
for (let frame = 0; frame < frames; frame += 1) {
  const context = {
    delta: 1 / 60,
    playerX: Math.sin(frame / 180) * 4,
    playerZ: Math.cos(frame / 210) * 4,
    halfX: 12,
    halfZ: 12,
    elapsedSec: 100 + frame / 60,
    activeProjectileCount: frame % 90 < 30 ? 2 : 0,
    stageId: 'stage2',
    e04IntroSec: 72,
    bossPressure: false,
  }
  if (!oldRun.runtime.step(oldRun.pool, { ...context, obstacles: oldObstacleData.obstacles, obstacleCount: oldObstacleData.obstacles.length })) throw new Error(`baseline step failed at ${frame}`)
  if (!newRun.runtime.step(newRun.pool, { ...context, obstacles: newObstacleData.obstacles, obstacleCount: newObstacleData.obstacles.length })) throw new Error(`current step failed at ${frame}`)
  const oldEvents = drain(oldRun.runtime)
  const newEvents = drain(newRun.runtime)
  if (JSON.stringify(oldEvents) !== JSON.stringify(newEvents)) throw new Error(`event mismatch at ${frame}`)
  if (fingerprint(oldRun.pool, oldRun.runtime.grid) !== fingerprint(newRun.pool, newRun.runtime.grid)) throw new Error(`pool/grid mismatch at ${frame}`)
}
const result = {
  frames,
  active: newRun.pool.activeCount,
  maxEnemies: MAX_ENEMIES,
  baselineRebuilds: oldRun.rebuilds(),
  currentRebuilds: newRun.rebuilds(),
  baselineObstacleXReads: oldObstacleData.reads.x,
  currentObstacleXReads: newObstacleData.reads.x,
}
if (result.baselineRebuilds !== frames * 2 || result.currentRebuilds !== frames + 1) throw new Error(`unexpected rebuild work ${JSON.stringify(result)}`)
if (!(result.currentObstacleXReads < result.baselineObstacleXReads)) throw new Error(`obstacle work did not decrease ${JSON.stringify(result)}`)
console.log(JSON.stringify(result))
