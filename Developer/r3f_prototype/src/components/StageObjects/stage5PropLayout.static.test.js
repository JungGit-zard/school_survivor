import { beforeEach, describe, expect, it } from 'vitest'
import { getStageObjectColliders, getStageObjectFootprint, getStageObjectSightObstacles, BLOCKING_STAGE_OBJECT_TYPES } from './stageObjectColliders.js'
import { computeDefaultStageObjectPlacements, getStageObjectPlacements } from './stageObjectPlacements.js'
import { getStageBounds } from '../../lib/stageConfig.js'
import { getPlayerMovementBounds } from '../../lib/playerMovementBounds.js'
import { getPlayerStartPosition } from '../../lib/playerStartPosition.js'
import { commitFirebaseStudioRuntime } from '../../lib/studioRuntimeState.js'

// Stage 5 「교무실 최종 돌파」 authored layout audit (spec Part B §3-4).
// Offline geometry only: actual collider footprints, no Firebase overrides, no Rapier/browser claim.

const EDGE_SAFETY = 0.8
const LANE_MIN_WIDTH = 2.0
const CROSS_AISLE_MIN_WIDTH = 2.2
const ORIGIN_CLEAR_RADIUS = 2.0
const PLAYER_HALF = 0.136
const EPS = 1e-6
const SOLID_TYPES = ['staffroomDeskIsland', 'staffroomViceDesk', 'staffroomCopier', 'corridorLockerBank']
const PASS_THROUGH_TYPES = ['staffroomClutter', 'staffroomSpeaker', 'staffroomEntranceDoor']

function footprintBounds(placement) {
  const f = getStageObjectFootprint(placement)
  return { id: placement.id, type: placement.type, minX: f.x - f.halfX, maxX: f.x + f.halfX, minZ: f.z - f.halfZ, maxZ: f.z + f.halfZ }
}

function stage5Solids() {
  return computeDefaultStageObjectPlacements('stage5')
    .filter(({ type }) => BLOCKING_STAGE_OBJECT_TYPES.has(type))
    .map(footprintBounds)
}

function islandColumns() {
  const islands = stage5Solids().filter(({ type }) => type === 'staffroomDeskIsland')
  const columns = new Map()
  for (const island of islands) {
    const key = ((island.minX + island.maxX) / 2).toFixed(2)
    columns.set(key, [...(columns.get(key) ?? []), island].sort((a, b) => a.minZ - b.minZ))
  }
  return [...columns.entries()].sort(([a], [b]) => Number(a) - Number(b)).map(([, list]) => list)
}

// Widest contiguous free X span inside [minX, maxX] at depth z after removing solid footprints.
function widestFreeSpan(minX, maxX, z, solids) {
  const blocked = solids
    .filter((box) => z > box.minZ + EPS && z < box.maxZ - EPS && box.maxX > minX && box.minX < maxX)
    .map((box) => [Math.max(minX, box.minX), Math.min(maxX, box.maxX)])
    .sort((a, b) => a[0] - b[0])
  let cursor = minX
  let widest = 0
  for (const [lo, hi] of blocked) {
    widest = Math.max(widest, lo - cursor)
    cursor = Math.max(cursor, hi)
  }
  return Math.max(widest, maxX - cursor)
}

beforeEach(() => commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 }))

describe('Stage 5 staff room authored layout (spec §3-4)', () => {
  it('authors 34 placements: 20 solid (12 islands + vice desk + 2 copiers + 5 lockers) and 14 pass-through visuals', () => {
    const placements = computeDefaultStageObjectPlacements('stage5')
    const count = (type) => placements.filter((placement) => placement.type === type).length
    expect(placements).toHaveLength(34)
    expect(new Set(placements.map(({ id }) => id)).size).toBe(34)
    expect(count('staffroomDeskIsland')).toBe(12)
    expect(count('staffroomViceDesk')).toBe(1)
    expect(count('staffroomCopier')).toBe(2)
    expect(count('corridorLockerBank')).toBe(5)
    expect(count('staffroomEntranceDoor')).toBe(1)
    expect(count('staffroomSpeaker')).toBe(8)
    expect(count('staffroomClutter')).toBe(3)
    expect(count('unconsciousStudent')).toBe(2)
    expect(stage5Solids()).toHaveLength(20)
    expect(getStageObjectColliders('stage5')).toHaveLength(20)
    expect(stage5Solids().every(({ type }) => SOLID_TYPES.includes(type))).toBe(true)
  })

  it('places the island grid exactly on the spec coordinates (X −4.2 / 0 / +4.2, rows R1–R4)', () => {
    const islands = computeDefaultStageObjectPlacements('stage5').filter(({ type }) => type === 'staffroomDeskIsland')
    const key = ({ position: [x, , z], props }) => `${x}:${z}:${props.variant}`
    expect(islands.map(key).sort()).toEqual([
      ...[-4.2, 0, 4.2].map((x) => `${x}:-8.1:long`),
      ...[-4.2, 0, 4.2].map((x) => `${x}:-3.1:short`),
      ...[-4.2, 0, 4.2].map((x) => `${x}:3.7:long`),
      ...[-4.2, 0, 4.2].map((x) => `${x}:9.5:long`),
    ].sort())
    const lockerXs = computeDefaultStageObjectPlacements('stage5').filter(({ type }) => type === 'corridorLockerBank').map(({ position: [x] }) => x)
    expect(lockerXs.every((x) => Math.abs(x) === 8.25)).toBe(true)
  })

  it('keeps every vertical lane at least 2.0u wide for its whole length (island gaps 2.2u, wall lanes ≥ 2.0u even beside lockers)', () => {
    const { halfX } = getStageBounds('stage5')
    const { minZ, maxZ } = getPlayerMovementBounds('stage5')
    const solids = stage5Solids()
    const lanes = [[-halfX, -5.2], [-3.2, -1.0], [1.0, 3.2], [5.2, halfX]]
    for (const [laneMin, laneMax] of lanes) {
      for (let z = minZ; z <= maxZ; z += 0.1) {
        expect(widestFreeSpan(laneMin, laneMax, z, solids), `lane ${laneMin}..${laneMax} at z ${z.toFixed(1)}`).toBeGreaterThanOrEqual(LANE_MIN_WIDTH - EPS)
      }
    }
    // Neighbouring island columns leave exactly the 2.2u lane between them.
    const columns = islandColumns()
    expect(columns).toHaveLength(3)
    for (let i = 0; i + 1 < columns.length; i += 1) {
      for (let row = 0; row < columns[i].length; row += 1) {
        expect(columns[i + 1][row].minX - columns[i][row].maxX).toBeCloseTo(2.2, 6)
      }
    }
  })

  it('keeps every cross aisle at least 2.2u deep, including the front aisle under the north wall band', () => {
    const solids = stage5Solids()
    for (const column of islandColumns()) {
      for (let row = 0; row + 1 < column.length; row += 1) {
        expect(column[row + 1].minZ - column[row].maxZ, `${column[row].id} → ${column[row + 1].id}`).toBeGreaterThanOrEqual(CROSS_AISLE_MIN_WIDTH - EPS)
      }
      const r1 = column[0]
      const northBand = solids.filter((box) => box.maxZ <= r1.minZ && box.maxX > r1.minX - LANE_MIN_WIDTH && box.minX < r1.maxX + LANE_MIN_WIDTH)
      for (const box of northBand) expect(r1.minZ - box.maxZ, `${box.id} → ${r1.id}`).toBeGreaterThanOrEqual(CROSS_AISLE_MIN_WIDTH - EPS)
    }
  })

  it('keeps every solid at least 2.0u from the origin (start, Doge, coin monster plaza)', () => {
    for (const box of stage5Solids()) {
      const dx = Math.max(box.minX, 0, -box.maxX)
      const dz = Math.max(box.minZ, 0, -box.maxZ)
      expect(Math.hypot(dx, dz), box.id).toBeGreaterThanOrEqual(ORIGIN_CLEAR_RADIUS - EPS)
    }
  })

  it('keeps every solid footprint at least 0.8u inside the map boundary', () => {
    const { halfX, halfZ } = getStageBounds('stage5')
    for (const box of stage5Solids()) {
      const edgeGap = Math.min(box.minX + halfX, halfX - box.maxX, box.minZ + halfZ, halfZ - box.maxZ)
      expect(edgeGap, box.id).toBeGreaterThanOrEqual(EDGE_SAFETY - EPS)
    }
  })

  it('never lets floor papers, PA speakers or the entrance door block ranged sight or movement', () => {
    for (const type of PASS_THROUGH_TYPES) expect(BLOCKING_STAGE_OBJECT_TYPES.has(type), type).toBe(false)
    const sightTypes = new Set(getStageObjectSightObstacles('stage5').map(({ type }) => type))
    for (const type of PASS_THROUGH_TYPES) expect(sightTypes.has(type), type).toBe(false)
    expect([...sightTypes].sort()).toEqual([...SOLID_TYPES].sort())
    const colliderIds = new Set(getStageObjectColliders('stage5').map(({ id }) => id.replace(/-collider$/, '')))
    for (const placement of getStageObjectPlacements('stage5')) {
      if (PASS_THROUGH_TYPES.includes(placement.type)) expect(colliderIds.has(placement.id), placement.id).toBe(false)
    }
  })

  it('connects the player start to all four lane ends and the fixed exit anchor (offline grid walk)', () => {
    const bounds = getPlayerMovementBounds('stage5')
    const solids = stage5Solids()
    const step = 0.1
    const margin = PLAYER_HALF + step / 2
    const free = (x, z) => x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ
      && solids.every((b) => x < b.minX - margin || x > b.maxX + margin || z < b.minZ - margin || z > b.maxZ + margin)
    const [sx, , sz] = getPlayerStartPosition('stage5')
    expect(free(sx, sz)).toBe(true)
    const seen = new Set(['0:0'])
    const queue = [[0, 0]]
    for (let head = 0; head < queue.length; head += 1) {
      const [ix, iz] = queue[head]
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const key = `${ix + dx}:${iz + dz}`
        if (seen.has(key) || !free(sx + (ix + dx) * step, sz + (iz + dz) * step)) continue
        seen.add(key)
        queue.push([ix + dx, iz + dz])
      }
    }
    const reached = (x, z) => seen.has(`${Math.round((x - sx) / step)}:${Math.round((z - sz) / step)}`)
    for (const laneX of [-7.0, -2.1, 2.1, 7.0]) {
      expect(reached(laneX, -11.4), `lane ${laneX} north end`).toBe(true)
      expect(reached(laneX, 14.5), `lane ${laneX} south end`).toBe(true)
    }
    expect(reached(0, -11.4), 'exit anchor (0, −11.4)').toBe(true)
  })
})
