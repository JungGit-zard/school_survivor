// RDZ road zombie (Sltera racer zombie port, 2026-11-22): registration, E01-copied stats, cheap instanced render
// path (E01's STANDARD slots + look accessories) and "not placed in any wave".
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { ZOMBIE_PALETTE } from '../components/ZombieMesh.jsx'
import { resolvePooledZombieVisual } from '../components/ZombieInstanceLayer.jsx'
import { isPooledEnemyType } from '../components/Enemies.jsx'
import { ENEMY_TYPE_CODES, ENEMY_TYPE_NAMES, LOOK_COUNT_BY_CODE, createEnemyEntityPool, enemyTypeFromCode } from './enemyEntityPool.js'
import {
  ENEMY_RUNTIME_CONTACT_DIST, ENEMY_RUNTIME_DAMAGE, ENEMY_RUNTIME_HP, ENEMY_RUNTIME_SCALE, ENEMY_RUNTIME_SPEED, ENEMY_RUNTIME_XP,
  ENEMY_EVENT_ERROR, ENEMY_SIZE_MULTIPLIER, createEnemySimulationRuntime,
} from './enemySimulation.js'
import { ROAD_ZOMBIE_COLORS, ROAD_ZOMBIE_PALETTE, ROAD_ZOMBIE_STATS, ROAD_ZOMBIE_TYPE, ROAD_ZOMBIE_TYPE_CODE } from './roadZombieRoster.js'
import { ZOMBIE_BASE_LOOKS, ZOMBIE_LOOKS, accessoryBoxes, zombieLookCount } from './zombieLooks.js'
import { isKnownZombieType } from './zombieEncyclopedia.js'

const E01 = ENEMY_TYPE_CODES.E01

describe('RDZ road zombie registration', () => {
  it('sits at typeCode 112, the end of the type table, and round-trips', () => {
    expect(ROAD_ZOMBIE_TYPE).toBe('RDZ')
    expect(ENEMY_TYPE_CODES.RDZ).toBe(112)
    expect(ROAD_ZOMBIE_TYPE_CODE).toBe(112)
    expect(ENEMY_TYPE_NAMES[112]).toBe('RDZ')
    expect(ENEMY_TYPE_NAMES.length).toBe(113)
    expect(enemyTypeFromCode(112)).toBe('RDZ')
    // the novel2 set before it is untouched
    expect(ENEMY_TYPE_NAMES[111]).toBe('E106')
  })

  it('copies the E01 fodder stats into ENEMY_STATS and every simulation runtime table', () => {
    const e01 = ENEMY_STATS.E01
    expect(ENEMY_STATS.RDZ).toEqual(ROAD_ZOMBIE_STATS)
    for (const key of ['hp', 'speed', 'damage', 'scale', 'xp', 'contactDist']) expect(ROAD_ZOMBIE_STATS[key]).toBe(e01[key])
    for (const table of [ENEMY_RUNTIME_HP, ENEMY_RUNTIME_SPEED, ENEMY_RUNTIME_DAMAGE, ENEMY_RUNTIME_SCALE, ENEMY_RUNTIME_XP, ENEMY_RUNTIME_CONTACT_DIST]) {
      expect(table.length).toBeGreaterThan(112)
      expect(table[112]).toBeCloseTo(table[E01], 6)
    }
  })

  it('spawns through the enemy pool and chases like E01 (not isolated as an unknown type)', () => {
    expect(isPooledEnemyType('RDZ')).toBe(true)
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const handle = { index: -1, generation: 0 }
    const stats = ENEMY_STATS.RDZ
    expect(pool.spawnInto(handle, { type: 'RDZ', x: 4, y: 0.42 * stats.scale * ENEMY_SIZE_MULTIPLIER, z: 0, hp: stats.hp, maxHp: stats.hp, visualScale: stats.scale * ENEMY_SIZE_MULTIPLIER, yaw: 0 })).toBe(true)
    const index = handle.index
    expect(pool.type[index]).toBe(112)
    const context = { delta: 1 / 60, playerX: 0, playerZ: 0, halfX: 12, halfZ: 12, elapsedSec: 100 }
    let errors = 0
    for (let frame = 0; frame < 240; frame += 1) {
      runtime.step(pool, context)
      const event = {}
      while (runtime.events.drainInto(event)) if (event.type === ENEMY_EVENT_ERROR) errors += 1
    }
    expect(errors).toBe(0)
    expect(pool.active[index]).toBe(1)
    expect(pool.posX[index]).toBeLessThan(4) // walked toward the player
  })

  it('is not placed in any stage wave, burst or roster (Terry decides placement)', () => {
    const root = join(__dirname, '..')
    const allowed = new Set([
      'lib/roadZombieRoster.js', 'lib/enemyEntityPool.js', 'lib/enemySimulation.js', 'lib/zombieLooks.js',
      'components/Enemy.jsx', 'components/Enemies.jsx', 'components/ZombieMesh.jsx', 'components/ZombieInstanceLayer.jsx',
    ])
    const hits = []
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) { walk(path); continue }
        if (!/\.(js|jsx)$/.test(name) || /\.test\./.test(name)) continue
        const rel = path.slice(root.length + 1).replace(/\\/g, '/')
        if (allowed.has(rel)) continue
        if (/['"]RDZ['"]/.test(readFileSync(path, 'utf8'))) hits.push(rel)
      }
    }
    walk(root)
    expect(hits).toEqual([])
  })

  it('stays out of the encounter / encyclopedia set (save allowlist + DB rules do not list RDZ yet)', () => {
    expect(isKnownZombieType('RDZ')).toBe(false)
  })
})

describe('RDZ road zombie look (cheap instanced path)', () => {
  it('renders through E01\'s STANDARD part slots — same InstancedMeshes, no extra draw calls', () => {
    const rdz = resolvePooledZombieVisual(112)
    const e01 = resolvePooledZombieVisual(E01)
    expect(rdz.name).toBe('RDZ')
    expect(rdz.slotBase).toBe(e01.slotBase)
    expect(rdz.partCount).toBe(e01.partCount)
    expect(rdz.partRoles).toEqual(e01.partRoles)
    expect(rdz.blocky || rdz.mini || rdz.posedIndex > 0 || rdz.projectileIndex > 0).toBe(false)
    expect(rdz.paletteIsE01Fallback).toBe(false)
    expect(rdz.palette).toBe(ROAD_ZOMBIE_PALETTE)
  })

  it('uses the racer colours: green skin, red eyes, school uniform, dark trousers', () => {
    expect(ZOMBIE_PALETTE.RDZ).toEqual({ body: 0x2c3a66, skin: 0x7fae5a, eye: 0xd8353a, bottom: 0x2a2a36 })
  })

  it('has a base look plus five uniform/skin variants, all wearing hair cap, mouth, collar + tie (≤ 8 boxes)', () => {
    expect(zombieLookCount('RDZ')).toBe(6)
    expect(LOOK_COUNT_BY_CODE[112]).toBe(6)
    expect(ZOMBIE_LOOKS.RDZ[0]).toEqual({})
    const looks = [ZOMBIE_BASE_LOOKS.RDZ, ...ZOMBIE_LOOKS.RDZ.slice(1)]
    const uniforms = new Set(looks.map((look) => look.shirt))
    expect([...uniforms].sort()).toEqual([...ROAD_ZOMBIE_COLORS.uniforms].sort())
    const frames = { head: { hx: 0.26, hy: 0.24, hz: 0.23 }, body: { bx: 0.28, by: 0.29, bz: 0.2 } }
    for (const look of looks) {
      expect(look.acc.map((item) => item.kind)).toEqual(['roadHair', 'roadMouth', 'roadCollar'])
      expect(ROAD_ZOMBIE_COLORS.skins).toContain(look.skin)
      expect(look.pants).toBe(ROAD_ZOMBIE_COLORS.pants)
      const boxes = look.acc.flatMap((item) => accessoryBoxes(item.kind, frames))
      expect(boxes.length).toBeLessThanOrEqual(8)
      // mouth sits under the eyes on the face front; collar/tie on the torso front
      expect(boxes.some((box) => box.frame === 'head' && box.pos[1] < 0 && box.pos[2] > 0.23)).toBe(true)
      expect(boxes.filter((box) => box.frame === 'body' && box.pos[2] > 0.2).length).toBe(2)
    }
  })
})
