import { describe, expect, it } from 'vitest'
import {
  STAGE_PROP_PALETTE,
  getPaletteEntry,
  getStagePropEditorBounds,
  getEditorViewport,
  worldToScreen,
  screenToWorld,
} from './stagePropEditorGeometry.js'
import { getStageBounds } from './stageConfig.js'

describe('palette', () => {
  it('covers all six placeable prop types with default scale', () => {
    expect(STAGE_PROP_PALETTE).toHaveLength(6)
    for (const entry of STAGE_PROP_PALETTE) {
      expect(typeof entry.type).toBe('string')
      expect(entry.defaultScale).toBeGreaterThan(0)
    }
    expect(getPaletteEntry('classroomDesk')).not.toBeNull()
    expect(getPaletteEntry('nope')).toBeNull()
  })
})

describe('getStagePropEditorBounds', () => {
  it('defaults to the stage game bounds when there are no placements', () => {
    const { halfX, halfZ } = getStageBounds('stage2')
    expect(getStagePropEditorBounds('stage2', [])).toEqual({ halfX, halfZ })
  })

  it('expands to fit placements that sit beyond the game bounds', () => {
    const bounds = getStagePropEditorBounds('stage1', [
      { position: [0, 0, 48] },
      { position: [-3, 0, -46] },
    ])
    expect(bounds.halfZ).toBeGreaterThanOrEqual(48)
  })
})

describe('viewport', () => {
  it('preserves the world aspect ratio within the pixel cap', () => {
    const bounds = { halfX: 7.5, halfZ: 19.2 }
    const viewport = getEditorViewport(bounds, { maxWidth: 520, maxHeight: 560 })
    const worldAspect = (bounds.halfX * 2) / (bounds.halfZ * 2)
    const pixelAspect = viewport.width / viewport.height
    expect(pixelAspect).toBeCloseTo(worldAspect, 1)
    expect(viewport.width).toBeLessThanOrEqual(520)
    expect(viewport.height).toBeLessThanOrEqual(560)
  })
})

describe('worldToScreen / screenToWorld round-trip', () => {
  const bounds = { halfX: 7.5, halfZ: 19.2 }
  const viewport = { width: 200, height: 512 }

  it('maps center to viewport center', () => {
    const { left, top } = worldToScreen(0, 0, bounds, viewport)
    expect(left).toBeCloseTo(100, 5)
    expect(top).toBeCloseTo(256, 5)
  })

  it('maps north-west corner to screen top-left', () => {
    const { left, top } = worldToScreen(-bounds.halfX, -bounds.halfZ, bounds, viewport)
    expect(left).toBeCloseTo(0, 5)
    expect(top).toBeCloseTo(0, 5)
  })

  it('round-trips world -> screen -> world', () => {
    for (const [x, z] of [[0, 0], [3.2, -10.5], [-5, 18], [7.5, -19.2]]) {
      const screen = worldToScreen(x, z, bounds, viewport)
      const world = screenToWorld(screen.left, screen.top, bounds, viewport)
      expect(world.x).toBeCloseTo(x, 2)
      expect(world.z).toBeCloseTo(z, 2)
    }
  })

  it('clamps out-of-range screen coordinates to the map bounds', () => {
    const world = screenToWorld(-50, 9999, bounds, viewport)
    expect(world.x).toBeCloseTo(-bounds.halfX, 5)
    expect(world.z).toBeCloseTo(bounds.halfZ, 5)
  })
})
