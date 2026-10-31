import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getStudioItemById } from '../lib/graphicsStudioConfig.js'
import { getPreviewFrame } from './GraphicsStudioPreview.jsx'
import {
  SLTERA_BODY_PROFILE, SLTERA_COLORS, SLTERA_DARK_PARTS, SLTERA_FENDERS, SLTERA_GLOW_PARTS, SLTERA_LABEL,
  SLTERA_MAKER_LABEL, SLTERA_TELEGRAPH_MS, SLTERA_WHEELS, getSlteraGeometries, slteraTelegraphGlow,
} from './SlteraCar.jsx'

const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3
const box = (g) => { g.computeBoundingBox(); return g.boundingBox }
const source = readFileSync(new URL('./SlteraCar.jsx', import.meta.url), 'utf8')

describe('Sltera parody car visual', () => {
  it('is a low, wide, smooth silver wedge with a long nose and short rear deck', () => {
    const { silver } = getSlteraGeometries()
    const b = box(silver)
    const length = b.max.z - b.min.z
    const width = b.max.x - b.min.x
    expect(length).toBeGreaterThan(3.5)
    expect(length / width).toBeGreaterThan(1.8)
    expect(b.max.y).toBeLessThan(1.0) // body (without seats/driver) stays under the zombie waist
    // wedge: the nose tip sits far lower than the rear deck
    const top = SLTERA_BODY_PROFILE.topLine
    const noseTopY = Math.max(...top.filter(([z]) => z > 1.4).map(([, y]) => y))
    const deckY = Math.max(...top.filter(([z]) => z < -1.0).map(([, y]) => y))
    expect(deckY - noseTopY).toBeGreaterThan(0.2)
    // long nose ahead of the windshield, short deck behind the seats
    const windshieldZ = SLTERA_DARK_PARTS.find((p) => p[0] === 'windshield')[3][2]
    const seatZ = SLTERA_DARK_PARTS.find((p) => p[0] === 'seatL')[3][2]
    expect(b.max.z - windshieldZ).toBeGreaterThan(1.3)
    expect(seatZ - b.min.z).toBeLessThan(1.3)
    expect(SLTERA_COLORS.silver).toBe(0xb7bec8)
  })

  it('is an open-top two-seater with a black cockpit and four big wheels under bulging fenders', () => {
    expect(SLTERA_DARK_PARTS.find((p) => p[0] === 'cockpit')[5]).toBe('cockpit')
    expect(SLTERA_DARK_PARTS.filter((p) => p[0].startsWith('seat'))).toHaveLength(2)
    expect(SLTERA_WHEELS).toHaveLength(4)
    expect(SLTERA_FENDERS).toHaveLength(4)
    for (const [, x, y, z, diameter, width] of SLTERA_WHEELS) {
      expect(diameter).toBeGreaterThanOrEqual(0.74)
      const fender = SLTERA_FENDERS.find(([, c]) => Math.sign(c[0]) === Math.sign(x) && Math.abs(c[2] - z) < 0.01)
      expect(fender).toBeTruthy()
      const [[cx, cy], [rx, ry]] = [fender[1], fender[2]]
      expect(cy + ry).toBeGreaterThan(y + diameter / 2) // fender arches over the tire top
      // the tire's outer top edge stays inside the fender shell (no tire poking through the bulge)
      const outer = (Math.abs(x) + width / 2 - Math.abs(cx)) / rx
      expect(cy + ry * Math.sqrt(1 - outer * outer)).toBeGreaterThan(y + diameter / 2)
      expect(Math.abs(cx) + rx).toBeGreaterThan(Math.abs(x) + width / 2) // and covers its outer face
    }
    expect(source).not.toMatch(/\['grille/) // smooth nose, no grille part
  })

  it('has one continuous rear light bar spanning the full tail width', () => {
    const bars = SLTERA_GLOW_PARTS.filter((p) => p[5] === 'tail')
    expect(bars).toHaveLength(1)
    const { silver } = getSlteraGeometries()
    const p = silver.attributes.position
    let tailHalf = 0
    for (let i = 0; i < p.count; i += 1) if (p.getZ(i) < -1.7 && p.getY(i) > 0.6) tailHalf = Math.max(tailHalf, Math.abs(p.getX(i)))
    expect(bars[0][1][0]).toBeGreaterThanOrEqual(tailHalf * 2 * 0.98)
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

  it('stays within a low polygon and draw-call budget and builds geometry only once', () => {
    const geos = getSlteraGeometries()
    expect(getSlteraGeometries()).toBe(geos)
    const model = tris(geos.silver) + tris(geos.dark) + tris(geos.head) + tris(geos.tail) + tris(geos.wordmark)
    const rendered = model + tris(geos.silverHull) + tris(geos.darkHull) + tris(geos.tailHull)
    expect(model).toBeLessThan(3000)
    expect(rendered).toBeLessThan(3000) // including the outline hulls
    // one <mesh> per shared geometry: 4 materials + 3 outline hulls + wordmark
    expect(source.match(/<mesh /g)).toHaveLength(8)
    expect(source).not.toMatch(/<(planeGeometry|boxGeometry|sphereGeometry|cylinderGeometry)/)
  })

  it('shows only the Sltera / 멜론마스크 names and no real brand marks', () => {
    expect(SLTERA_LABEL).toBe('Sltera')
    expect(SLTERA_MAKER_LABEL).toBe('멜론마스크')
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
