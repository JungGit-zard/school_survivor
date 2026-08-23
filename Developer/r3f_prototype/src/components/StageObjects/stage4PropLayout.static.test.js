import { describe, expect, it } from 'vitest'
import { getStageObjectFootprint } from './stageObjectColliders.js'
import { computeDefaultStageObjectPlacements } from './stageObjectPlacements.js'
import { getStageBounds } from '../../lib/stageConfig.js'

const STAGE4_EDGE_SAFETY = 0.8
const PLAYER_HALF_EXTENT = 0.136
// Measured from KitchenClutter JSX local geometry: PropCylinder radii,
// PropBlob radii, and PropBox half-scales. KitchenClutter has no outline mesh.
const KITCHEN_CLUTTER_VISUAL_LOCAL_BOUNDS = Object.freeze({
  pots: Object.freeze({ minX: -0.5, maxX: 0.47, minZ: -0.41, maxZ: 0.2 }),
  bags: Object.freeze({ minX: -0.55, maxX: 0.545, minZ: -0.25, maxZ: 0.25 }),
  trays: Object.freeze({ minX: -0.86, maxX: 0.8, minZ: -0.36, maxZ: 0.36 }),
})

function getKitchenClutterVisualBounds(placement) {
  const local = KITCHEN_CLUTTER_VISUAL_LOCAL_BOUNDS[placement.props?.variant]
  if (!local) return null
  const [x, , z] = placement.position
  const yaw = placement.rotation?.[1] ?? 0
  const scale = Array.isArray(placement.scale)
    ? placement.scale
    : [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1]
  const corners = [
    [local.minX, local.minZ], [local.minX, local.maxZ],
    [local.maxX, local.minZ], [local.maxX, local.maxZ],
  ].map(([localX, localZ]) => ({
    x: x + Math.cos(yaw) * localX * scale[0] + Math.sin(yaw) * localZ * scale[2],
    z: z - Math.sin(yaw) * localX * scale[0] + Math.cos(yaw) * localZ * scale[2],
  }))
  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minZ: Math.min(...corners.map((corner) => corner.z)),
    maxZ: Math.max(...corners.map((corner) => corner.z)),
  }
}

// This audit deliberately uses no random layout or Firebase data, so it
// protects only the authored Stage 4 canonical placements.
function describeStage4Layout() {
  const { halfX, halfZ } = getStageBounds('stage4')
  return computeDefaultStageObjectPlacements('stage4').map((placement) => {
    const [x, , z] = placement.position
    const footprint = getStageObjectFootprint(placement)
    const visualBounds = placement.type === 'kitchenClutter'
      ? getKitchenClutterVisualBounds(placement)
      : null
    const footprintBounds = footprint && {
      minX: footprint.x - footprint.halfX,
      maxX: footprint.x + footprint.halfX,
      minZ: footprint.z - footprint.halfZ,
      maxZ: footprint.z + footprint.halfZ,
    }
    const edgeGap = footprintBounds && Math.min(
      footprintBounds.minX + halfX,
      halfX - footprintBounds.maxX,
      footprintBounds.minZ + halfZ,
      halfZ - footprintBounds.maxZ,
    )
    return { id: placement.id, type: placement.type, x, z, footprint, footprintBounds, visualBounds, edgeGap }
  })
}

describe('Stage 4 prop layout static safety', () => {
  it('keeps every authored Stage 4 prop position inside the canonical map', () => {
    const { halfX, halfZ } = getStageBounds('stage4')
    const failures = describeStage4Layout()
      .filter(({ x, z }) => Math.abs(x) > halfX || Math.abs(z) > halfZ)
      .map(({ id, x, z }) => `${id}: (${x}, ${z}) outside (+/-${halfX}, +/-${halfZ})`)

    expect(failures).toEqual([])
  })

  it('keeps every solid footprint one Stage 4 tile inside each wall', () => {
    const failures = describeStage4Layout()
      .filter(({ footprint }) => footprint)
      .filter(({ edgeGap }) => edgeGap < STAGE4_EDGE_SAFETY - 1e-6)
      .map(({ id, edgeGap }) => `${id}: edgeGap=${edgeGap.toFixed(3)} < ${STAGE4_EDGE_SAFETY.toFixed(3)}`)

    expect(failures).toEqual([])
  })

  it('keeps every non-solid kitchen clutter visual bound one Stage 4 tile inside each wall', () => {
    const { halfX, halfZ } = getStageBounds('stage4')
    const failures = describeStage4Layout()
      .filter(({ type }) => type === 'kitchenClutter')
      .filter(({ visualBounds }) => (
        visualBounds.minX < -halfX + STAGE4_EDGE_SAFETY - 1e-6
        || visualBounds.maxX > halfX - STAGE4_EDGE_SAFETY + 1e-6
        || visualBounds.minZ < -halfZ + STAGE4_EDGE_SAFETY - 1e-6
        || visualBounds.maxZ > halfZ - STAGE4_EDGE_SAFETY + 1e-6
      ))
      .map(({ id, visualBounds }) => `${id}: ${JSON.stringify(visualBounds)}`)

    expect(failures).toEqual([])
  })

  it('keeps solid Stage 4 root footprints separated', () => {
    const solids = describeStage4Layout().filter(({ footprintBounds }) => footprintBounds)
    const overlaps = []
    for (let first = 0; first < solids.length; first += 1) {
      for (let second = first + 1; second < solids.length; second += 1) {
        const a = solids[first]
        const b = solids[second]
        if (
          a.footprintBounds.minX < b.footprintBounds.maxX
          && a.footprintBounds.maxX > b.footprintBounds.minX
          && a.footprintBounds.minZ < b.footprintBounds.maxZ
          && a.footprintBounds.maxZ > b.footprintBounds.minZ
        ) overlaps.push(`${a.id} / ${b.id}`)
      }
    }

    expect(overlaps).toEqual([])
  })

  it('keeps the Stage 4 player start [0, 0, 7] out of every solid footprint', () => {
    const start = { x: 0, z: 7 }
    const collisions = describeStage4Layout()
      .filter(({ footprintBounds }) => footprintBounds)
      .filter(({ footprintBounds }) => (
        start.x + PLAYER_HALF_EXTENT > footprintBounds.minX
        && start.x - PLAYER_HALF_EXTENT < footprintBounds.maxX
        && start.z + PLAYER_HALF_EXTENT > footprintBounds.minZ
        && start.z - PLAYER_HALF_EXTENT < footprintBounds.maxZ
      ))
      .map(({ id }) => id)

    expect(collisions).toEqual([])
  })
})
