// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import * as THREE from 'three'
import { createSchoolyardGround, disposeSchoolyardGround, getSchoolyardTrackLayout } from './schoolyardGround.js'
import { EXPANSION_STAGES } from '../../lib/expansionContent.js'
import { getStageBounds } from '../../lib/stageConfig.js'

beforeAll(() => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect() {} }))

const goalsAt = (z) => [{ id: 'n', xUnits: 0, zUnits: -z, halfXUnits: 1.6, halfZUnits: 0.45 }, { id: 's', xUnits: 0, zUnits: z, halfXUnits: 1.6, halfZUnits: 0.45 }]
const CASES = [
  ['original 24 × 40', { halfX: 12, halfZ: 20, goals: goalsAt(11), trackX: null }],
  ['shrunk 17 × 28', { halfX: 8.5, halfZ: 14, goals: goalsAt(7.7), trackX: 5.5 }],
  ['current stage data', (() => {
    const { halfX, halfZ } = getStageBounds('stage6'), layout = EXPANSION_STAGES.stage6.layout
    const pts = layout.trackLanePointsUnits ?? []
    return { halfX, halfZ, goals: layout.obstacles, trackX: pts.length ? Math.max(...pts.map((p) => Math.abs(p[0]))) : null, pts }
  })()],
]

describe('stage6 textured ground', () => {
  it('ships small CC0 detail maps with provenance', () => {
    const dir = resolve(process.cwd(), 'src/assets/textures/schoolyard')
    const files = readdirSync(dir)
    for (const f of ['track.jpg', 'turf.jpg', 'outfield.jpg', 'sand.jpg', 'dirt.jpg', 'paving.jpg', 'kerb.jpg', 'PROVENANCE.json', 'License.txt']) expect(files, f).toContain(f)
    const bytes = files.filter((f) => f.endsWith('.jpg')).reduce((t, f) => t + statSync(resolve(dir, f)).size, 0)
    expect(bytes).toBeLessThanOrEqual(120 * 1024)
  })

  for (const [label, opts] of CASES) it(`${label}: flat, textured everywhere, track under the relay lane, pitch on the goals`, () => {
    const ground = createSchoolyardGround(opts)
    const L = ground.userData.layout
    const surfaces = ground.children.filter((m) => m.isMesh)
    // Every ground surface except the white paint / lane numbers carries a detail map; no flat single colour.
    for (const m of surfaces) {
      const paint = /markings|lane-numbers/.test(m.name)
      if (!paint) expect(m.material.map, m.name).toBeTruthy()
      if (!paint) expect(m.geometry.attributes.uv, m.name).toBeTruthy()
      // Flat: one height per mesh, all below the telegraph decals (y 0.035).
      const pos = m.geometry.attributes.position, ys = new Set()
      for (let i = 0; i < pos.count; i++) ys.add(pos.getY(i).toFixed(5))
      expect(ys.size, m.name).toBe(1)
      expect(Number([...ys][0]), m.name).toBeLessThan(0.01)
      // Faces up.
      const n = m.geometry.attributes.normal
      expect(n.getY(0), m.name).toBe(1)
      m.geometry.computeBoundingBox()
    }
    const box = (name) => surfaces.find((m) => m.name === name).geometry.boundingBox
    // Dirt covers the whole playable rectangle; outfield runs far past anything the camera can frame.
    const dirt = box('schoolyard-ground-dirt')
    expect(dirt.min.x).toBeCloseTo(-opts.halfX, 4); expect(dirt.max.z).toBeCloseTo(opts.halfZ, 4)
    expect(box('schoolyard-ground-outfield').max.z).toBeGreaterThan(opts.halfZ + 20)
    // Track stays inside the arena and its straights pass under the relay lane x.
    expect(L.Ro).toBeLessThan(opts.halfX)
    expect(L.zc + L.Ro).toBeLessThan(opts.halfZ)
    if (opts.trackX) { expect(L.Ri).toBeLessThanOrEqual(opts.trackX); expect(L.Ro).toBeGreaterThanOrEqual(opts.trackX) }
    for (const [x, z] of opts.pts ?? []) { expect(Math.abs(x)).toBeGreaterThanOrEqual(L.Ri); expect(Math.abs(x)).toBeLessThanOrEqual(L.Ro); expect(Math.abs(z)).toBeLessThanOrEqual(L.zc) }
    // Pitch goal lines sit on the goal mouths from the goal data.
    expect(L.goalLineZ).toBeCloseTo(Math.min(...opts.goals.map((g) => Math.abs(g.zUnits) - g.halfZUnits)), 6)
    expect(getSchoolyardTrackLayout(opts, opts.goals).R).toBeCloseTo(L.R, 9)
    const listeners = surfaces.map((m) => { const l = vi.fn(); m.geometry.addEventListener('dispose', l); return l })
    disposeSchoolyardGround(ground)
    for (const l of listeners) expect(l).toHaveBeenCalledTimes(1)
    void THREE
  })
})
