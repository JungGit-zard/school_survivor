import { describe, expect, it } from 'vitest'
import { REDUCED_EFFECT_VISUAL_SCALE, scaleEffectVisual } from './effectVisualScale.js'

describe('effect visual scale', () => {
  it('uses a half-size multiplier for oversized attack graphics', () => {
    expect(REDUCED_EFFECT_VISUAL_SCALE).toBeCloseTo(1 / 2)
    expect(scaleEffectVisual(0.48)).toBeCloseTo(0.24)
    expect(scaleEffectVisual(1.5)).toBeCloseTo(0.75)
  })
})
