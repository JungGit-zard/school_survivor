import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

describe('Matilda environment collider passthrough contract', () => {
  it('makes only Matilda use a non-blocking Rapier sensor collider while preserving the shared collider extents', () => {
    const colliderStart = enemySource.indexOf('<CuboidCollider')
    const colliderEnd = enemySource.indexOf('/>', colliderStart)
    const colliderMarkup = enemySource.slice(colliderStart, colliderEnd)

    expect(colliderMarkup).toContain('args={colArgs}')
    expect(colliderMarkup).toContain('sensor={isMatilda}')
  })
})
