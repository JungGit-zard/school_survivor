import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getCachedChamferedBoxGeo, getCachedCylinderGeo } from '../lib/toon.js'
import { getStudioItemById } from '../lib/graphicsStudioConfig.js'
import { getPreviewFrame } from './GraphicsStudioPreview.jsx'
import { SLTERA_CAR_PARTS, SLTERA_COLORS, SLTERA_LABEL, SLTERA_MAKER_LABEL, SLTERA_TELEGRAPH_MS, slteraTelegraphGlow } from './SlteraCar.jsx'

const part = (key) => SLTERA_CAR_PARTS.find((p) => p[0] === key)

describe('Sltera parody car visual', () => {
  it('is a silver low open-top two-seater with big wheels and a black cockpit', () => {
    expect(part('lowerBody')[5]).toBe('silver')
    expect(SLTERA_COLORS.silver).toBe(0xb7bec8)
    expect(part('cockpit')[5]).toBe('cockpit')
    expect(SLTERA_CAR_PARTS.filter((p) => p[0].startsWith('seat'))).toHaveLength(2)
    expect(SLTERA_CAR_PARTS.filter((p) => p[1] === 'wheel')).toHaveLength(4)
    // long and low: length about 2x width, body roof under the zombie waist
    const body = part('lowerBody')[2]
    expect(body[2] / body[0]).toBeGreaterThan(1.9)
  })

  it('has one continuous rear light bar spanning the full tail width', () => {
    const bars = SLTERA_CAR_PARTS.filter((p) => p[6] === 'tail')
    expect(bars).toHaveLength(1)
    expect(bars[0][2][0]).toBeGreaterThanOrEqual(part('rearDeck')[2][0] * 0.98)
    expect(SLTERA_COLORS.tailBar >> 16).toBeGreaterThan(0xe0)
  })

  it('pulses the light bar and headlights harder as the 1,400 ms telegraph progresses', () => {
    expect(SLTERA_TELEGRAPH_MS).toBe(1400)
    const idle = { ...slteraTelegraphGlow(-1, 0, {}) }
    const peak = (p) => Math.max(...Array.from({ length: 200 }, (_, i) => slteraTelegraphGlow(p, i / 200, {}).tail))
    expect(peak(0.2)).toBeLessThan(peak(1))
    expect(peak(1)).toBeGreaterThan(idle.tail * 3)
    expect(slteraTelegraphGlow(1, 0.03, {}).head).toBeGreaterThan(idle.head)
  })

  it('stays within a low polygon budget (< 2,500 triangles)', () => {
    let triangles = 0
    for (const [, shape, size] of SLTERA_CAR_PARTS) {
      const g = shape === 'box' ? getCachedChamferedBoxGeo(size[0], size[1], size[2], 1) : getCachedCylinderGeo(size[0] / 2, size[0] / 2, size[1], 12)
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3
    }
    expect(triangles).toBeLessThan(2500)
  })

  it('shows only the Sltera / 멜론마스크 names and no real brand marks', () => {
    expect(SLTERA_LABEL).toBe('Sltera')
    expect(SLTERA_MAKER_LABEL).toBe('멜론마스크')
    const source = readFileSync(new URL('./SlteraCar.jsx', import.meta.url), 'utf8')
    expect(source).not.toMatch(/tesla|musk|elon|roadster/i)
    const drawnText = [...source.matchAll(/fillText\('([^']*)'/g)].map((m) => m[1])
    expect(drawnText).toEqual(['SLTERA'])
  })

  it('is listed on the graphics viewer as "Sltera (멜론마스크)" and renders with a looping telegraph', () => {
    const item = getStudioItemById('actor-sltera')
    expect(item).toMatchObject({ category: 'actor', label: 'Sltera (멜론마스크)', previewKind: 'slteraCar', source: 'components/SlteraCar.jsx' })
    expect(getPreviewFrame(item).target).toEqual([0, 0.5, 0])
    const preview = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')
    expect(preview).toContain("item.previewKind === 'slteraCar'")
    expect(preview).toContain('<SlteraCar telegraphRef={telegraphRef} />')
    expect(preview).toContain('function SlteraCarPreview()')
  })
})
