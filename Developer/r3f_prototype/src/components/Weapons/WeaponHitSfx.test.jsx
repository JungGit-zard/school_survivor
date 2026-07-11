import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sourceOf = (name) => readFileSync(new URL(`./${name}.jsx`, import.meta.url), 'utf8')

describe('direct weapon hit sound contracts', () => {
  it.each([
    ['Pencil', "id: 'pencilHit'", 'volume: 0.48 + Math.random() * 0.12', 'rate: 0.94 + Math.random() * 0.14'],
    ['SchoolBag', "id: 'rulerHit'", 'volume: 0.58', null],
    ['BoxCutter', "id: 'boxCutterHit'", 'volume: 0.52', 'rate: 1.00 + Math.random() * 0.10'],
    ['Tumbler', "id: 'tumblerHit'", 'volume: 0.35 + Math.random() * 0.10', 'rate: 0.90 + Math.random() * 0.15'],
    ['Chibiko', "id: 'chibikoHit'", 'volume: 0.42', null],
  ])('%s emits its audited sound from a successful hit path', (name, id, volume, rate) => {
    const source = sourceOf(name)
    expect(source).toContain(id)
    expect(source).toContain(volume)
    if (rate) expect(source).toContain(rate)
  })

  it('stun gun emits depth-pitched hit sounds and never ghost-fires without a target', () => {
    const source = sourceOf('StunGun')
    expect(source).toContain("id: 'stunGunHit'")
    expect(source).toContain('volume: 0.55')
    expect(source).toContain('rate: 1 + Math.min(chainDepth, 2) * 0.06')
    expect(source.indexOf('if (!nearestId) return')).toBeLessThan(source.indexOf("emitSfx({ id: 'stunGunFire' })"))
  })

  it('onigiri emits one depth-pitched sound at each successful bounce hit', () => {
    const source = sourceOf('Onigiri')
    expect(source).toContain("id: 'onigiriHit'")
    expect(source).toContain('volume: 0.50')
    expect(source).toContain('rate: 0.96 + Math.min(hitIndex, 2) * 0.06')
  })
})
