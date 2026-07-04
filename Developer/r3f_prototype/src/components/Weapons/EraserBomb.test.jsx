import { describe, expect, it } from 'vitest'
import {
  ERASER_MODEL_VISUAL_SCALE,
  getEraserExplosionVisualScale,
} from './EraserBomb.jsx'

describe('EraserBomb visuals', () => {
  it('renders the eraser bomb model 1.5 times larger than the reduced visual scale', () => {
    expect(ERASER_MODEL_VISUAL_SCALE).toBeCloseTo(0.6)
  })

  it('keeps the explosion style formula but halves its visual size', () => {
    expect(getEraserExplosionVisualScale(1.35, 0)).toBeCloseTo(0.15)
    expect(getEraserExplosionVisualScale(1.35, 1)).toBeCloseTo(1.5)
  })
})
