import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('PooledEnemyProjectileLayer GPU compaction', () => {
  it('retains native-cluster safety while drawing only contiguous visible projectile slots', () => {
    const source = readFileSync(new URL('./PooledEnemyProjectileLayer.jsx', import.meta.url), 'utf8')
    expect(source).toContain('result.frustumCulled = false')
    expect(source).toContain('let count = 0')
    expect(source).toContain('body.setMatrixAt(count, matrix)')
    expect(source).toContain('outline.setMatrixAt(count, matrix)')
    expect(source).toContain('body.count = count')
    expect(source).toContain('outline.count = count')
    expect(source).toContain('body.count = 0')
    expect(source).toContain('outline.count = 0')
  })
})
