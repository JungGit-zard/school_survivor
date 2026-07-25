import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(name) {
  return readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')
}

describe('persistent visual pool reset safety', () => {
  it('clears all three retained pools synchronously when resetKey changes', () => {
    for (const name of ['DamageNumbersLayer.jsx', 'ZombieInstanceLayer.jsx', 'PooledEnemyProjectileLayer.jsx']) {
      const layer = source(name)
      expect(layer).toContain('useLayoutEffect')
      expect(layer).toMatch(/\[.*resetKey.*\]/)
    }
  })

  it('does not move a Rapier-hook component outside the keyed Physics subtree', () => {
    const canvas = source('GameCanvas.jsx')
    expect(canvas).not.toContain('<Enemies')
    const game = source('Game.jsx')
    expect(game).toContain('<Enemies />')
  })

  it('resets zombie health and alpha buffers as well as instance matrices', () => {
    const layer = source('ZombieInstanceLayer.jsx')
    expect(layer).toContain('health.current.generation.fill(0)')
    expect(layer).toContain('health.current.visibleTrailRatio.fill(0)')
    expect(layer).toContain('all.bars[0].userData.instanceAlpha.fill(1)')
    expect(layer).toContain('all.bars[1].userData.instanceAlpha.fill(1)')
    expect(layer).toContain('all.bars[2].userData.instanceAlpha.fill(0)')
    expect(layer).toContain('all.bars[3].userData.instanceAlpha.fill(1)')
    expect(layer).toContain('all.shadow.userData.instanceAlpha.fill(1)')
    expect(layer).toContain('all.smoke.userData.instanceAlpha.fill(0)')
  })
})
