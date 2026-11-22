// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { BURST_KINDS, BURST_PIECE_LAYERS, SHARK_EXPLOSION_VISUAL_SCALE, createBurstVfxSystem } from './BurstVfxLayer.jsx'
import { VFX_BURST, VFX_BURST_KIND_COUNT, clearVfxBursts, spawnVfxBurst } from '../lib/vfxBursts.js'
import { playerPos } from '../lib/refs.js'

const counts = (system) => Object.fromEntries(system.layers.map((l) => [l.key, l.mesh.count]))

describe('BurstVfxLayer pooled system', () => {
  let system
  afterEach(() => { system?.dispose(); clearVfxBursts() })

  it('defines every burst kind and builds one InstancedMesh per piece type', () => {
    for (let kind = 1; kind < VFX_BURST_KIND_COUNT; kind += 1) expect(BURST_KINDS[kind], `kind ${kind}`).toBeTruthy()
    system = createBurstVfxSystem()
    expect(system.layers).toHaveLength(BURST_PIECE_LAYERS.length)
    for (const layer of system.layers) {
      expect(layer.mesh).toBeInstanceOf(THREE.InstancedMesh)
      expect(layer.mesh.count).toBe(0)
      expect(layer.mesh.visible).toBe(true) // stays visible so compileAsync prewarms it
      expect(layer.material.toneMapped).toBe(false)
      expect(layer.material.blending).toBe(THREE.NormalBlending) // no additive wash-out on the beige floor
      expect(layer.material.depthWrite).toBe(false)
    }
  })

  it('draws each burst for its life then frees it, with no per-burst objects', () => {
    system = createBurstVfxSystem()
    spawnVfxBurst(VFX_BURST.KILL_PUFF, 1, 0, 1, 1)
    spawnVfxBurst(VFX_BURST.HIT_PENCIL, 0, 0.42, 0)
    spawnVfxBurst(VFX_BURST.STARLINK_IMPACT, 2, 0, 2, 1.2)
    system.step(0.016)
    const live = counts(system)
    expect(live.killPuff).toBe(5) // REEBOO puff x5 flung out
    expect(live.pencilDot).toBe(1)
    expect(live.pencilStar).toBe(1)
    expect(live.fireBlob).toBe(1)
    expect(live.fireRing).toBe(1)
    expect(live.fireRays).toBe(1)
    for (let i = 0; i < 12; i += 1) system.step(0.1)
    expect(Object.values(counts(system)).every((n) => n === 0)).toBe(true)
  })

  it('keeps heal and level-up on the player and shows two level-up rings', () => {
    system = createBurstVfxSystem()
    playerPos.set(3, 0, -2)
    spawnVfxBurst(VFX_BURST.LEVEL_UP, 0, 0, 0)
    spawnVfxBurst(VFX_BURST.HEAL, 0, 0, 0)
    system.step(0.05)
    for (let i = 0; i < 3; i += 1) system.step(0.05)
    const live = counts(system)
    expect(live.levelPillar).toBe(1)
    expect(live.levelRing).toBe(2)
    expect(live.healMagic).toBe(1)
    expect(live.healStar).toBe(4)
    const ring = system.layers.find((l) => l.key === 'levelRing')
    expect(ring.matrix[12]).toBeCloseTo(3)
    expect(ring.matrix[14]).toBeCloseTo(-2)
    playerPos.set(0, 0, 0)
  })

  it('caps simultaneous bursts per kind instead of growing', () => {
    system = createBurstVfxSystem()
    for (let i = 0; i < 400; i += 1) spawnVfxBurst(VFX_BURST.HIT_PIXEL, i * 0.01, 0.4, 0)
    system.step(0.016)
    expect(system.activeCount(VFX_BURST.HIT_PIXEL)).toBe(BURST_KINDS[VFX_BURST.HIT_PIXEL].cap)
    expect(counts(system).pixelSpark).toBeLessThanOrEqual(BURST_PIECE_LAYERS.find((l) => l.key === 'pixelSpark').cap)
  })

  it('draws the shark missile explosion at 0.7x its previous size; the damage radius and damage stay untouched (Terry 11-22)', () => {
    expect(SHARK_EXPLOSION_VISUAL_SCALE).toBe(0.7)
    system = createBurstVfxSystem()
    const radius = 1.6 // world damage radius handed to the burst (k = 1)
    spawnVfxBurst(VFX_BURST.SHARK_EXPLOSION, 3, 0, -1, radius)
    system.step(0.016)
    const layer = system.layers.find((l) => l.key === 'sharkExplosion')
    expect(layer.mesh.count).toBe(1)
    // camera-facing sprite: matrix diagonal = sprite size. Before: 2.8 x 2.8 at height 0.8 for a 1.6 radius.
    expect(layer.matrix[0]).toBeCloseTo(2.8 * 0.7, 5)
    expect(layer.matrix[5]).toBeCloseTo(2.8 * 0.7, 5)
    expect(layer.matrix[13]).toBeCloseTo(0.8 * 0.7, 5)
    expect(layer.matrix[12]).toBeCloseTo(3, 5)
    expect(layer.matrix[14]).toBeCloseTo(-1, 5)
    // Gameplay is not touched: the blast still hits with the missile's own radius and damage.
    const shark = readFileSync(new NodeURL('./Weapons/SharkMissile.jsx', import.meta.url), 'utf8')
    expect(shark).toContain('radius: blast.radius,')
    expect(shark).toContain('damage: blast.damage,')
    expect(shark).toContain('spawnVfxBurst(VFX_BURST.SHARK_EXPLOSION, blast.x, 0, blast.z, blast.radius)')
  })
})
