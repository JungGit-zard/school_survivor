import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { getStudioItemById } from '../lib/graphicsStudioConfig.js'
import { getPreviewFrame } from './GraphicsStudioPreview.jsx'
import {
  SLTERA_BODY_PROFILE, SLTERA_COLORS, SLTERA_DARK_PARTS, SLTERA_DRIVER_BASE_PARTS, SLTERA_DRIVER_PARTS, SLTERA_DRIVER_PIVOT,
  SLTERA_DRIVER_SCALE, SLTERA_FENDERS, SLTERA_GLOW_PARTS,
  SLTERA_LABEL, SLTERA_MAKER_LABEL, SLTERA_TELEGRAPH_MS, SLTERA_WHEELS, getSlteraGeometries, slteraTelegraphGlow,
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

  it('seats a yankee driver: forward regent, red headband with two tails, white long coat with a raised collar', () => {
    const part = (key) => SLTERA_DRIVER_PARTS.find((p) => p[0] === key)
    const colorOf = (key) => SLTERA_COLORS[part(key)[5]]
    const head = part('head')
    const [hx, hy, hz] = head[3]
    const headR = head[2][0]
    expect(colorOf('head')).toBe(SLTERA_COLORS.skin)
    // regent: black, sticks out ahead of the forehead by more than the head's diameter and rises above the head
    const regent = part('regent'); const curl = part('regentCurl')
    expect(colorOf('regent')).toBe(SLTERA_COLORS.hair); expect(colorOf('regentCurl')).toBe(SLTERA_COLORS.hair)
    const regentTipZ = Math.max(regent[3][2] + regent[2][2], curl[3][2] + curl[2][2])
    expect(regentTipZ - (hz + headR)).toBeGreaterThan(headR * 2)
    expect(curl[3][1]).toBeGreaterThan(regent[3][1]) // the tip curls upward
    expect(part('duckTail')[3][2]).toBeLessThan(hz - headR * 0.9) // a short ducktail behind the head
    // red hachimaki: a band around the forehead plus two tails streaming back from the knot
    expect(colorOf('headband')).toBe(SLTERA_COLORS.band)
    expect(SLTERA_COLORS.band >> 16).toBeGreaterThan(0xc0)
    expect(part('headband')[2][0]).toBeGreaterThan(headR)
    const tails = SLTERA_DRIVER_PARTS.filter((p) => p[0].startsWith('headbandTail'))
    expect(tails).toHaveLength(2)
    for (const t of tails) { expect(SLTERA_COLORS[t[5]]).toBe(SLTERA_COLORS.band); expect(t[3][2]).toBeLessThan(hz - headR) }
    // white long coat: body, raised collar around the neck (11-22 Terry: the two coat-tail slabs behind the headband are gone)
    for (const key of ['coatBody', 'coatCollar', 'armWheel', 'armSillUpper', 'armSillFore']) expect(colorOf(key)).toBe(SLTERA_COLORS.coat)
    expect(SLTERA_DRIVER_PARTS.some((p) => p[0].startsWith('coatTail'))).toBe(false)
    expect(SLTERA_COLORS.coat & 0xff).toBeGreaterThan(0xe8)
    expect(part('coatCollar')[3][1] + part('coatCollar')[2][2] / 2).toBeGreaterThan(hy - headR) // collar stands up past the jaw
    const seatZ = SLTERA_DARK_PARTS.find((p) => p[0] === 'seatL')[3][2]
    // one hand on the wheel, the other arm hanging over the door sill
    // (11-22: 핸들도 운전자와 같은 배율로 커졌다 — 손은 핸들 테 위에 있다)
    const wheelPart = SLTERA_DARK_PARTS.find((p) => p[0] === 'steeringWheel')
    const wheel = wheelPart[3]
    expect(Math.hypot(...part('handWheel')[3].map((v, i) => v - wheel[i]))).toBeLessThan(wheelPart[2][0] + 0.02)
    expect(part('handSill')[3][0]).toBeGreaterThan(0.55)
    expect(colorOf('handWheel')).toBe(SLTERA_COLORS.skin)
    // sunglasses (11-22): two separate dark lenses at eye level in front of the face, a thin bridge, two temple arms
    // reaching back past the face, and a small light glint on each lens
    const lensL = part('shadeLensL'); const lensR = part('shadeLensR')
    for (const lens of [lensL, lensR]) {
      expect(colorOf(lens[0])).toBe(SLTERA_COLORS.lens)
      expect(lens[3][2]).toBeGreaterThan(hz + headR * 0.85) // in front of the face
      expect(Math.abs(lens[3][1] - hy)).toBeLessThan(headR * 0.3) // eye level
    }
    const gap = Math.abs(lensL[3][0] - lensR[3][0]) - lensL[2][0] - lensR[2][0]
    expect(gap).toBeGreaterThan(0) // two distinct lenses, not one band
    const bridge = part('shadeBridge')
    expect(colorOf('shadeBridge')).toBe(SLTERA_COLORS.shades)
    expect(bridge[2][0]).toBeGreaterThan(gap) // the bridge spans the gap
    expect(bridge[2][1]).toBeLessThan(lensL[2][1]) // thin
    for (const key of ['shadeTempleL', 'shadeTempleR']) {
      expect(colorOf(key)).toBe(SLTERA_COLORS.shades)
      expect(part(key)[3][2] - part(key)[2][2] / 2).toBeLessThan(hz) // reaches back past the middle of the head
    }
    for (const key of ['shadeGlintL', 'shadeGlintR']) expect(colorOf(key)).toBe(SLTERA_COLORS.glint)
    expect(SLTERA_DRIVER_PARTS.some((p) => p[0] === 'shades')).toBe(false) // the old flat slab is gone
  })

  it('draws the driver 1.5x around the seat pivot so the back stays on the backrest (Terry 11-22)', () => {
    expect(SLTERA_DRIVER_SCALE).toBe(1.5)
    expect(SLTERA_DRIVER_PARTS).toHaveLength(SLTERA_DRIVER_BASE_PARTS.length)
    SLTERA_DRIVER_PARTS.forEach((p, i) => {
      const base = SLTERA_DRIVER_BASE_PARTS[i]
      expect(p[0]).toBe(base[0])
      for (let a = 0; a < 3; a += 1) expect(p[3][a]).toBeCloseTo(SLTERA_DRIVER_PIVOT[a] + (base[3][a] - SLTERA_DRIVER_PIVOT[a]) * 1.5, 12)
      expect(p[2][0]).toBeCloseTo(base[2][0] * 1.5, 12)
    })
    // coat back does not sink into the driver seat's backrest front face
    const seat = SLTERA_DARK_PARTS.find((p) => p[0] === 'seatL')
    const seatFront = seat[3][2] + (seat[2][2] / 2) * Math.cos(seat[4][0])
    const coat = SLTERA_DRIVER_PARTS.find((p) => p[0] === 'coatBody')
    expect(coat[3][2] - coat[2][2]).toBeGreaterThan(seatFront - 0.01)
  })

  it('keeps the driver clear of the windshield and merged into the existing cockpit mesh', () => {
    // windshield top edge (box half-height rotated about X)
    const ws = SLTERA_DARK_PARTS.find((p) => p[0] === 'windshield')
    const half = ws[2][1] / 2; const rx = ws[4][0]
    const wsTop = { y: ws[3][1] + half * Math.cos(rx), z: ws[3][2] + half * Math.sin(rx) }
    // every driver piece stays behind the windshield's top edge, or (11-22 1.5x driver) passes above it —
    // the open top has no roof, so only the glass itself must not be pierced. Capsules (arms) are checked as
    // spheres at both ends of their axis; other pieces as one bounding sphere.
    const clear = (y, z, reach) => z + reach < wsTop.z || y - reach > wsTop.y
    for (const [, shape, size, [, y, z], rotation] of SLTERA_DRIVER_PARTS) {
      if (shape === 'capsule') {
        const axis = new THREE.Vector3(0, size[1] / 2, 0).applyEuler(new THREE.Euler(...rotation))
        expect(clear(y + axis.y, z + axis.z, size[0])).toBe(true)
        expect(clear(y - axis.y, z - axis.z, size[0])).toBe(true)
      } else {
        const reach = shape === 'ball' ? size[0] : Math.max(...size.slice(0, 3))
        expect(clear(y, z, reach)).toBe(true)
      }
      expect(y).toBeGreaterThan(0.7)
    }
    // the whole driver lives in the dark vertex-color mesh: no extra draw calls
    const { dark } = getSlteraGeometries()
    const b = box(dark)
    expect(b.max.y).toBeGreaterThan(1.55) // regent crest is the new top of the car (1.5x driver, 11-22)
    expect(b.max.y).toBeLessThan(1.7)
    expect(source).not.toMatch(/driverBody|driverHead/)
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
    // 2026-11-15: the yankee driver (regent, headband, white coat) raised the total from ~2.8k to ~4.0k triangles
    expect(model).toBeLessThan(2500)
    expect(rendered).toBeLessThan(4200) // including the outline hulls
    // one <mesh> per shared geometry: 4 materials + 3 outline hulls + wordmark
    // 8 body/outline/wordmark meshes + headlight ground beam + red tail ground spill (11-22); halos are sprites
    expect(source.match(/<mesh /g)).toHaveLength(10)
    expect(source.match(/<sprite /g)).toHaveLength(2) // headlamp halos (one JSX sprite mapped over two lamps) + tail bar halo
    expect(source).not.toMatch(/<(pointLight|spotLight|rectAreaLight)/) // no real lights — cheap additive cards only
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
