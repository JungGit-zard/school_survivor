import { describe, expect, it } from 'vitest'
import { PENCIL_MODEL_SCALE } from './Pencil.jsx'

describe('PencilModel', () => {
  it('renders the base pencil weapon model at 1.5x the previous size', () => {
    expect(PENCIL_MODEL_SCALE).toBeCloseTo(0.29 * 1.5)
  })
})
