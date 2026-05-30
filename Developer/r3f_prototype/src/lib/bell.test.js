import { describe, expect, it } from 'vitest'
import { getBellSonicRingConfigs } from './bell.js'

describe('bell sonic wave visual config', () => {
  it('uses only concentric circular rings for the attack effect', () => {
    const rings = getBellSonicRingConfigs()

    expect(rings).toHaveLength(4)
    expect(rings.every((ring) => ring.shape === 'ring')).toBe(true)
    expect(rings.every((ring) => ring.geometry === 'torus')).toBe(true)
  })

  it('staggers ring scale and opacity so circles read as a spreading sound wave', () => {
    const rings = getBellSonicRingConfigs()

    expect(rings.map((ring) => ring.scaleOffset)).toEqual([0, 0.16, 0.32, 0.48])
    expect(rings.map((ring) => ring.opacityMult)).toEqual([1, 0.78, 0.56, 0.34])
  })
})
