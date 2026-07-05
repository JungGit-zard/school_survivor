import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('ZombieInstanceLayer floor shadows', () => {
  it('renders a depth-tested ground shadow for standard in-game zombies', () => {
    const source = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')
    const shadowMaterial = source.match(/function makeShadowIM[\s\S]*?new THREE\.MeshBasicMaterial\(\{([\s\S]*?)\}\)/)?.[1] ?? ''

    expect(source).toContain('const ZOMBIE_SHADOW_OPACITY = 0.3')
    expect(source).toContain('new THREE.CircleGeometry(1, 28)')
    expect(source).toContain('buildShadowMatrix(e, dst, studioTransform)')
    expect(source).toContain('shadowIM.setMatrixAt(slot, dst)')
    expect(source).toContain('<primitive object={shadowIM} renderOrder={1} />')
    expect(shadowMaterial).toContain('depthTest: true')
    expect(shadowMaterial).toContain('depthWrite: false')
  })
})
