// 2026-11-22 Terry "모든 공격궤도 표시자는 채도를 낮추고 끝에 블러를 넣어 세련되게 표시할 것".
// Visual only: one shared desaturated palette, and a soft feather OUTSIDE the fill so the opaque core is still the hit area.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  TELEGRAPH_FEATHER, TELEGRAPH_OPACITY, TELEGRAPH_PALETTE, TELEGRAPH_SOURCE_COLORS,
  buildTelegraphFeatherGeometry, circleLoop, createSoftFillGeometry, createSoftRectGeometry, muteTelegraphColor, rectLoop,
  rgbToHsl, syncTelegraphFeather, telegraphBoundaryEdges, telegraphHex, telegraphOpacity,
} from './telegraphStyle.js'
import { B10_STAMP_DECAL, EXPANSION_TELEGRAPH_FILL, NOVEL2_DAMAGE_TELEGRAPH_FILL, createExpansionTelegraphVisual, disposeExpansionTelegraphVisual } from '../components/expansion/expansionTelegraphs.js'
import { B02_CORRIDOR_BLOCKADE_VISUALS, B03_SHUTTLE_RUN_VISUALS, B04_SOUP_BLAST_VISUALS } from '../components/Enemy.jsx'
import { STAGE4_CAULDRON_GROUND_FILL } from '../components/StageObjects/Stage4CauldronGroundWarning.jsx'
import { SHOT_KIND, SHOT_KIND_INFO } from './projectileZombieShotPool.js'
import { DECAL_SOFT_EDGE } from './projectileZombieShotGeometry.js'

const hsl = (hex) => rgbToHsl(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255))
const src = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('shared desaturated telegraph palette', () => {
  it('derives every role from its old neon colour with one rule: same hue, clearly lower saturation', () => {
    for (const [role, source] of Object.entries(TELEGRAPH_SOURCE_COLORS)) {
      const muted = TELEGRAPH_PALETTE[role]
      expect(muted, role).toBe(muteTelegraphColor(source))
      expect(muted, role).toMatch(/^#[0-9a-f]{6}$/)
      const [h0, s0] = hsl(source); const [h1, s1] = hsl(muted)
      expect(s1, role).toBeLessThan(s0 * 0.85)
      const dh = Math.min(Math.abs(h1 - h0), 1 - Math.abs(h1 - h0))
      expect(dh, `${role} hue drift`).toBeLessThan(0.02) // red stays red, yellow stays yellow
    }
    expect(telegraphHex('aimLine')).toBe(parseInt(TELEGRAPH_PALETTE.aimLine.slice(1), 16))
  })

  it('every attack telegraph site reads its colours from the palette (no neon literals left)', () => {
    expect(EXPANSION_TELEGRAPH_FILL.color).toBe(TELEGRAPH_PALETTE.caution)
    expect(EXPANSION_TELEGRAPH_FILL.activeColor).toBe(TELEGRAPH_PALETTE.strike)
    expect(NOVEL2_DAMAGE_TELEGRAPH_FILL).toMatchObject({ color: TELEGRAPH_PALETTE.danger, activeColor: TELEGRAPH_PALETTE.dangerStrike })
    expect(B10_STAMP_DECAL.floorColor).toBe(TELEGRAPH_PALETTE.stamp)
    expect(Object.values(B02_CORRIDOR_BLOCKADE_VISUALS).map((v) => v.surface)).toEqual([TELEGRAPH_PALETTE.blockade, TELEGRAPH_PALETTE.blockadeActive, TELEGRAPH_PALETTE.blockadeDone])
    expect(Object.values(B03_SHUTTLE_RUN_VISUALS).map((v) => v.surface)).toEqual([TELEGRAPH_PALETTE.shuttle, TELEGRAPH_PALETTE.shuttleOutbound, TELEGRAPH_PALETTE.shuttleReturn, TELEGRAPH_PALETTE.shuttleStun])
    expect(Object.values(B04_SOUP_BLAST_VISUALS).map((v) => v.surface)).toEqual([TELEGRAPH_PALETTE.soup, TELEGRAPH_PALETTE.soupBlast])
    expect([STAGE4_CAULDRON_GROUND_FILL.warningColor, STAGE4_CAULDRON_GROUND_FILL.fireColor]).toEqual([TELEGRAPH_PALETTE.cauldron, TELEGRAPH_PALETTE.cauldronFire])
    expect(SHOT_KIND_INFO[SHOT_KIND.DECAL_MARKER].color).toBe(telegraphHex('impactMarker'))
    expect(SHOT_KIND_INFO[SHOT_KIND.DECAL_AIM_LINE].color).toBe(telegraphHex('aimLine'))
    const sites = {
      '../components/expansion/expansionTelegraphs.js': ['#f5ce69', '#f88578', '#e5333d', '#c8102e'],
      '../components/Enemy.jsx': ['#22cbd2', '#24edf0', '#0d6570', '#f5b83d', '#ffd34e', '#e6a81f', '#c99a43', '#f4ad32', '#ff6b1f'],
      '../components/StageObjects/Stage4CauldronGroundWarning.jsx': ['#ffe576', '#ff6b24'],
      './projectileZombieShotPool.js': ['0xff8a2a', '0xff3b3b'],
    }
    for (const [path, literals] of Object.entries(sites)) for (const literal of literals) expect(src(path), `${path} ${literal}`).not.toContain(literal)
    expect(src('../components/VFXLayer.jsx')).toContain('mutedTelegraphHex(event.color ?? VFX_COLORS.chargeOrange)')
  })

  it('raises opacity by the documented gain to keep floor contrast, capped below 1', () => {
    expect(telegraphOpacity(0.4)).toBeCloseTo(0.4 * TELEGRAPH_OPACITY.gain, 6)
    expect(telegraphOpacity(0.9)).toBe(TELEGRAPH_OPACITY.max)
    expect(TELEGRAPH_OPACITY.max).toBeLessThan(1)
    expect(EXPANSION_TELEGRAPH_FILL.windupOpacity).toBe(telegraphOpacity(0.4))
    expect(EXPANSION_TELEGRAPH_FILL.windupOpacity + EXPANSION_TELEGRAPH_FILL.windupOpacityGain).toBeCloseTo(telegraphOpacity(0.58), 6)
    expect(EXPANSION_TELEGRAPH_FILL.activeOpacity).toBe(telegraphOpacity(0.55))
  })
})

const alphaAt = (g, i) => g.attributes.color.getW(i)
function radii(g, plane = 'xz') {
  const p = g.attributes.position
  return Array.from({ length: p.count }, (_, i) => Math.hypot(p.getX(i), plane === 'xz' ? p.getZ(i) : p.getY(i)))
}

describe('soft edge (feather) lies outside the fill; the opaque core is exactly the hit area', () => {
  it('a disc feather starts at the radius with full alpha and fades to 0 one feather-width outside', () => {
    for (const plane of ['xz', 'xy']) {
      const g = buildTelegraphFeatherGeometry([circleLoop(1.6, { segments: 48 })], { plane })
      const r = radii(g, plane)
      expect(r.length).toBeGreaterThan(0)
      r.forEach((ri, i) => {
        const a = alphaAt(g, i)
        expect(ri, 'never inside the hit circle').toBeGreaterThanOrEqual(1.6 * Math.cos(Math.PI / 48) - 1e-6)
        if (a === 1) expect(ri).toBeCloseTo(1.6, 5)
        if (a === 0) expect(ri).toBeGreaterThan(1.6 + TELEGRAPH_FEATHER.widthUnits * 0.98)
        expect(ri).toBeLessThanOrEqual(1.6 + TELEGRAPH_FEATHER.widthUnits + 1e-5)
      })
      expect(new Set(Array.from({ length: g.attributes.position.count }, (_, i) => alphaAt(g, i)))).toEqual(new Set([1, Math.fround(TELEGRAPH_FEATHER.midAlpha), 0]))
      g.dispose()
    }
  })

  it('a lane/line feather softens both ends and both sides, never reaching inside the rectangle', () => {
    const g = buildTelegraphFeatherGeometry([rectLoop(0.6, 3)])
    const p = g.attributes.position
    let ends = 0
    for (let i = 0; i < p.count; i += 1) {
      const x = Math.abs(p.getX(i)); const z = Math.abs(p.getZ(i))
      const inside = x < 0.6 - 1e-6 && z < 3 - 1e-6
      expect(inside, 'feather vertex inside the lane').toBe(false)
      const d = Math.hypot(Math.max(0, x - 0.6), Math.max(0, z - 3))
      expect(d).toBeLessThanOrEqual(TELEGRAPH_FEATHER.widthUnits + 1e-6)
      if (alphaAt(g, i) === 1) expect(d).toBeLessThan(1e-6)
      if (z > 3 + 0.1) ends++
    }
    expect(ends, 'the lane ends are blurred too').toBeGreaterThan(0)
    g.dispose()
  })

  it('an annulus hole feathers toward the centre, and shared inner edges of clipped pieces get no feather', () => {
    const g = buildTelegraphFeatherGeometry([circleLoop(4), circleLoop(2.8)], { holes: [false, true] })
    const r = radii(g)
    expect(r.some((ri) => ri < 2.8 - 0.1)).toBe(true) // hole side fades inward
    expect(r.every((ri) => ri <= 2.8 + 1e-6 || ri >= 4 * Math.cos(Math.PI / 48) - 1e-6)).toBe(true) // never over the ring itself
    g.dispose()
    const pieces = [[[0, 0], [1, 0], [1, 1], [0, 1]], [[1, 0], [2, 0], [2, 1], [1, 1]]]
    const edges = telegraphBoundaryEdges(pieces)
    expect(edges).toEqual([[true, false, true, true], [true, true, true, false]])
    const h = buildTelegraphFeatherGeometry(pieces, { boundary: edges })
    const p = h.attributes.position
    for (let i = 0; i < p.count; i += 1) expect(p.getX(i) > 1e-6 && p.getX(i) < 2 - 1e-6 && p.getZ(i) > 1e-6 && p.getZ(i) < 1 - 1e-6).toBe(false)
    h.dispose()
  })

  it('expansion disk/line telegraphs keep their exact core and add one feather sharing the fill material', () => {
    const disk = createExpansionTelegraphVisual({ shape: 'disk', radius: 2.2, phase: 'windup', originXZ: [3, -1], windupMs: 1000, elapsedMs: 0 })
    const meshes = []; disk.traverse((n) => { if (n.isMesh) meshes.push(n) })
    const core = meshes.filter((m) => m.name !== TELEGRAPH_FEATHER.name)
    const feather = meshes.filter((m) => m.name === TELEGRAPH_FEATHER.name)
    expect(core).toHaveLength(1); expect(feather).toHaveLength(1)
    expect(core[0].geometry.parameters.radius).toBe(2.2)
    expect(feather[0].material).toBe(disk.userData.fillMat)
    expect(disk.userData.fillMat.vertexColors).toBe(true)
    const coreAlpha = core[0].geometry.attributes.color
    for (let i = 0; i < coreAlpha.count; i += 1) expect(coreAlpha.getW(i)).toBe(1) // the core stays fully at fill opacity
    disposeExpansionTelegraphVisual(disk)
  })

  it('instanced unit decals: core is the unit marker at alpha 1, the soft edge only outside it', () => {
    const disc = createSoftFillGeometry(circleLoop(1, { segments: 36 }), { width: DECAL_SOFT_EDGE.markerFill })
    const r = radii(disc)
    const coreCount = disc.userData.coreVertexCount
    for (let i = 0; i < r.length; i += 1) {
      if (i < coreCount) { expect(r[i]).toBeLessThanOrEqual(1 + 1e-6); expect(alphaAt(disc, i)).toBe(1) } else expect(r[i]).toBeGreaterThanOrEqual(Math.cos(Math.PI / 36) - 1e-6)
    }
    expect(Math.max(...r)).toBeCloseTo(1 + DECAL_SOFT_EDGE.markerFill, 2)
    const line = createSoftRectGeometry(0.5, 0.5, DECAL_SOFT_EDGE.lineSide, DECAL_SOFT_EDGE.lineEnd)
    const p = line.attributes.position
    for (let i = 0; i < p.count; i += 1) {
      const inCore = Math.abs(p.getX(i)) <= 0.5 + 1e-6 && Math.abs(p.getZ(i)) <= 0.5 + 1e-6
      if (inCore) expect(alphaAt(line, i)).toBe(1)
      else expect(alphaAt(line, i)).toBeLessThan(1)
    }
    disc.dispose(); line.dispose()
  })

  it('a JSX feather child copies its parent fill colour and opacity right before rendering (no allocation)', () => {
    const parent = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#336699', opacity: 0.37, transparent: true }))
    const child = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
    parent.add(child)
    syncTelegraphFeather.call(child, null, null, null, child.geometry, child.material)
    expect(child.material.color.getHex()).toBe(parent.material.color.getHex())
    expect(child.material.opacity).toBe(0.37)
  })
})
