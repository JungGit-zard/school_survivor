import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PENCIL_MODEL_SCALE } from './Pencil.jsx'

describe('PencilModel', () => {
  it('renders the base pencil weapon model at 1.5x the previous size', () => {
    expect(PENCIL_MODEL_SCALE).toBeCloseTo(0.29 * 1.5)
  })

  it('assigns upgraded projectiles to distinct nearby enemies', () => {
    const source = readFileSync(new URL('./Pencil.jsx', import.meta.url), 'utf8')

    expect(source).toContain('findClosestEnemies(w.range ?? 22, count)')
    expect(source).toContain('targets.map((target) =>')
    expect(source).not.toContain('const target = findClosestEnemy')
  })
})
