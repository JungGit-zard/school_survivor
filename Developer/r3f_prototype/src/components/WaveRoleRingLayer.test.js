import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { EnemyEntityPool } from '../lib/enemyEntityPool.js'
import { WAVE_ROLE_COLORS } from '../lib/waveRoleMarker.js'
import { SPAWN_REVEAL_MS } from './PooledEnemyVisuals.js'
import { SHOT_KIND, SHOT_MOTION } from '../lib/projectileZombieShotPool.js'
import { DECAL_VISUAL, getDecalVisuals } from '../lib/projectileZombieShotGeometry.js'
import { WAVE_ROLE_RING_INNER, collectWaveRoleRingSlots, createWaveRoleRingMeshes, writeWaveRoleRings } from './WaveRoleRingLayer.jsx'

const BOUNDS = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }
const tiers = () => new Uint8Array(200)
const slots = () => new Int16Array(200)
function add(pool, type, x, waveRole, spawnTimer = SPAWN_REVEAL_MS) {
  return pool.spawn({ type, x, z: 0, hp: 10, maxHp: 10, visualScale: 1.6, spawnTimer, waveRole })
}

describe('wave role ground rings', () => {
  it('only zombies with a role get a ring — fodder and roleless types get none', () => {
    const pool = new EnemyEntityPool()
    add(pool, 'E01', 0)
    const tank = add(pool, 'E02', 1, '탱크')
    add(pool, 'E07', 2)
    const ranged = add(pool, 'E46', 3, '원거리')
    const out = slots()
    const count = collectWaveRoleRingSlots(pool, tiers(), BOUNDS, 0, 0, out, () => false)
    expect(Array.from(out.slice(0, count))).toEqual([tank.index, ranged.index])
  })

  it('no ring before the spawn reveal, while hidden, or off screen', () => {
    const pool = new EnemyEntityPool()
    add(pool, 'E02', 0, '탱크', SPAWN_REVEAL_MS - 1)
    const hiddenOne = add(pool, 'E60', 1, '기습')
    add(pool, 'E05', 40, '돌진')
    const shown = add(pool, 'E05', 2, '돌진')
    const out = slots()
    const count = collectWaveRoleRingSlots(pool, tiers(), BOUNDS, 0, 0, out, (p, i) => i === hiddenOne.index)
    expect(Array.from(out.slice(0, count))).toEqual([shown.index])
  })

  it('writes one instance per ring into one shared mesh (1 draw call), coloured by role', () => {
    const pool = new EnemyEntityPool()
    const a = add(pool, 'E02', 0, '탱크'); const b = add(pool, 'E56', 1, '지원')
    const meshes = createWaveRoleRingMeshes()
    const out = Int16Array.from([a.index, b.index])
    writeWaveRoleRings(meshes, pool, out, 2)
    expect(meshes.ring.count).toBe(2)
    const got = new THREE.Color(); const want = new THREE.Color()
    meshes.ring.getColorAt(0, got); want.setHex(WAVE_ROLE_COLORS[1])
    expect(got.getHex()).toBe(want.getHex()) // tank red
    meshes.ring.getColorAt(1, got); want.setHex(WAVE_ROLE_COLORS[6])
    expect(got.getHex()).toBe(want.getHex()) // support green
    writeWaveRoleRings(meshes, pool, out, 0)
    expect(meshes.ring.visible).toBe(false)
  })
})

// 2026-11-22 Terry "모든 좀비 발밑의 원형 시각표시 효과에 대하여 외곽선을 빼라".
describe('zombie foot circles have no outline', () => {
  it('role ring is the coloured band only — no dark backing/outline mesh', () => {
    const meshes = createWaveRoleRingMeshes()
    expect(Object.keys(meshes)).toEqual(['ring'])
    for (const mesh of Object.values(meshes)) expect(mesh.name).not.toMatch(/back|outline|edge|rim/i)
    // single band from the inner edge to the outer radius; nothing reaches past it
    const { innerRadius, outerRadius } = meshes.ring.geometry.parameters
    expect(innerRadius).toBe(WAVE_ROLE_RING_INNER); expect(outerRadius).toBe(1)
    // colour comes from the role per instance; the material itself is not a dark outline tint
    expect(meshes.ring.material.color.getHex()).toBe(0xffffff)
    expect(meshes.ring.material.side).not.toBe(THREE.BackSide)
  })

  it('ground warning circles under shooters use the fill only, never the border ring', () => {
    for (const kind of Object.values(SHOT_KIND)) {
      for (const motion of Object.values(SHOT_MOTION)) {
        expect(getDecalVisuals(kind, motion, 0)).not.toContain(DECAL_VISUAL.RING)
      }
    }
  })
})
