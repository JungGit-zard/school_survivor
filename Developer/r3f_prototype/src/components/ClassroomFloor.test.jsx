import { describe, expect, it } from 'vitest'
import { FLOOR_TEXTURE_SIZE, FLOOR_TEXTURE_STYLE } from './ClassroomFloor.jsx'

function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('ClassroomFloor texture style', () => {
  it('uses a muted abandoned-classroom wood palette rather than a bright tan prototype floor', () => {
    expect(luminance(FLOOR_TEXTURE_STYLE.base)).toBeLessThan(120)
    expect(luminance(FLOOR_TEXTURE_STYLE.highlight)).toBeLessThan(150)
  })

  it('does not draw explicit plank seam lines over the floor texture', () => {
    expect(FLOOR_TEXTURE_STYLE.seamOpacity).toBe(0)
    expect(FLOOR_TEXTURE_STYLE.verticalSeamOpacity).toBe(0)
    expect(FLOOR_TEXTURE_STYLE.seamWidthPx).toBe(1)
    expect(FLOOR_TEXTURE_STYLE.boardTintOpacity).toBeLessThanOrEqual(0.035)
    expect(FLOOR_TEXTURE_SIZE).toBeGreaterThanOrEqual(4096)
  })

  it('uses broad reference-style source planks and repeats them enough to read in the game camera', () => {
    expect(FLOOR_TEXTURE_STYLE.repeat).toBeGreaterThanOrEqual(5)
    expect(FLOOR_TEXTURE_STYLE.repeat).toBeLessThanOrEqual(7)
    expect(FLOOR_TEXTURE_STYLE.plankHeightPx).toBeGreaterThanOrEqual(320)
    expect(FLOOR_TEXTURE_STYLE.plankHeightPx).toBeLessThanOrEqual(430)
    expect(FLOOR_TEXTURE_STYLE.plankWidthPx).toBeGreaterThanOrEqual(1100)
  })
})
