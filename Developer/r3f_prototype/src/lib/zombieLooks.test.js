import { describe, expect, it } from 'vitest'
import { EnemyEntityPool, ENEMY_TYPE_CODES, LOOK_COUNT_BY_CODE } from './enemyEntityPool.js'
import { EXPANSION_STAGES } from './expansionContent.js'
import { FACE_FRONT_ACCESSORIES, LOOK_ALIVE_LIMIT, MAX_ZOMBIE_LOOKS, NO_FACE_FRONT_ACCESSORY_TYPES, ZOMBIE_ACCESSORY_KINDS, ZOMBIE_LOOKS, ZOMBIE_LOOK_EXCLUDED, ZOMBIE_MEASURED_WORST_ALIVE, accessoryBoxes, zombieLookCount } from './zombieLooks.js'
import { LOOK_ACC_PER_ZOMBIE } from '../components/zombieLookAccessories.js'
import { ZOMBIE_PALETTE } from '../components/ZombieMesh.jsx'

// Terry 2026-11-19: "똑같이 생긴 좀비 10마리 이상 못나오게 막아" — never more than 10 alive zombies of one
// type wearing one look. Spawns are never capped; looks spread them out.

function spawn(pool, type) {
  const handle = pool.spawn({ type, x: 0, z: 0, hp: 10, maxHp: 10 })
  expect(handle, `${type} spawn`).not.toBeNull()
  return handle
}
function maxPerLook(pool, type) {
  let max = 0
  for (let look = 0; look < zombieLookCount(type); look += 1) max = Math.max(max, pool.aliveWithLook(type, look))
  return max
}
function aliveOf(pool, type) {
  const code = ENEMY_TYPE_CODES[type]; let n = 0
  for (let i = 0; i < pool.type.length; i += 1) if (pool.active[i] === 1 && pool.type[i] === code) n += 1
  return n
}
// Deterministic LCG for the churn test only — the pool itself never draws randomness for looks.
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) }

describe('look table covers the measured worst case of every stage 1-6 type', () => {
  for (const [type, worst] of Object.entries(ZOMBIE_MEASURED_WORST_ALIVE)) {
    if (worst <= LOOK_ALIVE_LIMIT || ZOMBIE_LOOK_EXCLUDED.includes(type)) continue
    it(`${type}: worst ${worst} alive needs ≥ ${Math.ceil(worst / LOOK_ALIVE_LIMIT) + 1} looks`, () => {
      const looks = zombieLookCount(type)
      expect(looks).toBeGreaterThanOrEqual(Math.ceil(worst / LOOK_ALIVE_LIMIT) + 1)
      expect(LOOK_COUNT_BY_CODE[ENEMY_TYPE_CODES[type]]).toBe(looks)
    })
  }

  it('every look after look 0 changes at least two of clothes / skin / headgear / build / accessory', () => {
    for (const [type, list] of Object.entries(ZOMBIE_LOOKS)) {
      expect(list[0], `${type} look 0 is the original look`).toEqual({})
      list.slice(1).forEach((look, n) => {
        const changes = [look.shirt != null || look.pants != null, look.skin != null, look.acc.length > 0 || look.cap != null || look.band != null, look.scale != null]
        expect(changes.filter(Boolean).length, `${type} look ${n + 1}`).toBeGreaterThanOrEqual(2)
        if (look.scale) look.scale.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0.88); expect(v).toBeLessThanOrEqual(1.12) })
      })
    }
  })

  it('stage 7-10 zombies, bosses, Matilda, E08 and the RZL leader keep a single look', () => {
    for (const type of ['E08', 'RZL', 'B01', 'B02', 'B03', 'B04', 'B05', 'B10', ...Array.from({ length: 12 }, (_, i) => `E${22 + i}`), 'B06', 'B07', 'B08', 'B09']) {
      expect(zombieLookCount(type), type).toBe(1)
    }
  })
})

describe('look allocation keeps ≤ 10 alive per type+look', () => {
  it('Stage 6 assembly rows: 64 s E19 ×12 ×2, 96 s E19 ×12 ×2, 216 s E19 ×13 (rows from stage data)', () => {
    const events = EXPANSION_STAGES.stage6.events.filter((e) => e.type === 'E19' && [64, 96, 216].includes(e.sec))
    expect(events.map((e) => [e.sec, e.count])).toEqual([[64, 12], [64, 12], [96, 12], [96, 12], [216, 13]])
    const pool = new EnemyEntityPool()
    for (const row of events) {
      for (let k = 0; k < row.count; k += 1) spawn(pool, 'E19')
      expect(maxPerLook(pool, 'E19'), `after ${row.sec} s`).toBeLessThanOrEqual(LOOK_ALIVE_LIMIT)
    }
    expect(aliveOf(pool, 'E19')).toBe(61)
  })

  it('an 83-alive E19 crowd with deaths and respawns never puts 11 on one look', () => {
    const pool = new EnemyEntityPool(); const random = lcg(19); const alive = []
    let worst = 0
    for (let step = 0; step < 6000; step += 1) {
      if (alive.length < 83 && (alive.length < 60 || random() < 0.55)) alive.push(spawn(pool, 'E19'))
      else alive.splice(Math.floor(random() * alive.length), 1).forEach((h) => pool.despawn(h))
      worst = Math.max(worst, maxPerLook(pool, 'E19'))
    }
    while (alive.length < 83) alive.push(spawn(pool, 'E19'))
    expect(aliveOf(pool, 'E19')).toBe(83)
    expect(Math.max(worst, maxPerLook(pool, 'E19'))).toBeLessThanOrEqual(LOOK_ALIVE_LIMIT)
  })

  it('Stage 3 72 s run crew (RZL leader + 12 RZC), twice over, and every crowded type at its worst', () => {
    const pool = new EnemyEntityPool()
    for (let crew = 0; crew < 2; crew += 1) { spawn(pool, 'RZL'); for (let k = 0; k < 12; k += 1) spawn(pool, 'RZC') }
    expect(maxPerLook(pool, 'RZC')).toBeLessThanOrEqual(LOOK_ALIVE_LIMIT)
    pool.reset()
    for (const [type, worst] of Object.entries(ZOMBIE_MEASURED_WORST_ALIVE)) {
      if (ZOMBIE_LOOK_EXCLUDED.includes(type) || worst <= LOOK_ALIVE_LIMIT) continue
      for (let k = 0; k < worst; k += 1) spawn(pool, type)
      expect(maxPerLook(pool, type), type).toBeLessThanOrEqual(LOOK_ALIVE_LIMIT)
      pool.reset()
    }
  })

  it('beyond the designed worst case a spawn is never refused — it goes to the least-used look', () => {
    const pool = new EnemyEntityPool()
    for (let k = 0; k < 140; k += 1) spawn(pool, 'E19')
    const counts = Array.from({ length: zombieLookCount('E19') }, (_, look) => pool.aliveWithLook('E19', look))
    expect(counts.reduce((a, b) => a + b, 0)).toBe(140)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('despawn and reset release looks; ties go to the lowest look index', () => {
    const pool = new EnemyEntityPool()
    const a = spawn(pool, 'E01'); const b = spawn(pool, 'E01')
    expect([pool.look[a.index], pool.look[b.index]]).toEqual([0, 1])
    pool.despawn(a)
    expect(pool.aliveWithLook('E01', 0)).toBe(0)
    expect(pool.look[spawn(pool, 'E01').index]).toBe(0)
    pool.reset()
    expect(pool.aliveWithLook('E01', 0) + pool.aliveWithLook('E01', 1)).toBe(0)
    // single-look types stay on look 0
    expect(pool.look[spawn(pool, 'E08').index]).toBe(0)
    expect(pool.look[spawn(pool, 'E08').index]).toBe(0)
  })
})

// 2026-11-22 wave standard: one fodder species is ~70 % of every wave, so the fodder bodies need many looks.
describe('wave standard looks (2026-11-22)', () => {
  const FRAMES = { head: { hx: 0.26, hy: 0.24, hz: 0.23 }, body: { bx: 0.28, by: 0.29, bz: 0.2 } }
  const hue = (hex) => {
    const r = ((hex >> 16) & 255) / 255; const g = ((hex >> 8) & 255) / 255; const b = (hex & 255) / 255
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min
    if (!d) return 0
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    return (h * 60 + 360) % 360
  }
  const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }

  it('look count per species: fodder E01/E03/E07/E19 have 12, specials E40/E56/E66/E74 have 3, all within the pool cap', () => {
    for (const type of ['E01', 'E03', 'E07', 'E19']) expect(zombieLookCount(type), type).toBe(12)
    for (const type of ['E40', 'E56', 'E66', 'E74']) expect(zombieLookCount(type), type).toBe(3)
    for (const [type, list] of Object.entries(ZOMBIE_LOOKS)) {
      expect(list.length, type).toBeLessThanOrEqual(MAX_ZOMBIE_LOOKS)
      expect(LOOK_COUNT_BY_CODE[ENEMY_TYPE_CODES[type]], type).toBe(list.length)
    }
  })

  it('a 120-strong crowd of one fodder species never puts more than 10 on one look', () => {
    for (const type of ['E01', 'E03', 'E07', 'E19']) {
      const pool = new EnemyEntityPool()
      for (let k = 0; k < 120; k += 1) spawn(pool, type)
      expect(maxPerLook(pool, type), type).toBeLessThanOrEqual(LOOK_ALIVE_LIMIT)
    }
  })

  it('every accessory is a known kind and a look stays within the per-zombie box budget', () => {
    for (const [type, list] of Object.entries(ZOMBIE_LOOKS)) {
      list.slice(1).forEach((look, n) => {
        let boxes = 0
        for (const item of look.acc) {
          expect(ZOMBIE_ACCESSORY_KINDS, `${type} look ${n + 1}`).toContain(item.kind)
          boxes += accessoryBoxes(item.kind, FRAMES).length
        }
        expect(boxes, `${type} look ${n + 1} boxes`).toBeLessThanOrEqual(LOOK_ACC_PER_ZOMBIE)
      })
    }
  })

  it('nothing covers a shader / quad / atlas face (glasses and masks only on plain box heads)', () => {
    for (const type of NO_FACE_FRONT_ACCESSORY_TYPES) {
      for (const look of ZOMBIE_LOOKS[type] ?? []) {
        for (const item of look.acc ?? []) expect(FACE_FRONT_ACCESSORIES, `${type} ${item.kind}`).not.toContain(item.kind)
      }
    }
  })

  it('fodder looks stay the same species: shirt hue within 25° of the species colour', () => {
    for (const type of ['E01', 'E03', 'E07']) {
      const base = hue(ZOMBIE_PALETTE[type].body)
      ZOMBIE_LOOKS[type].slice(1).forEach((look, n) => {
        expect(hueGap(hue(look.shirt), base), `${type} look ${n + 1}`).toBeLessThanOrEqual(25)
      })
    }
  })

  it('specials keep their body hue (E40 purple, E56 pink, E66 mint)', () => {
    const special = { E40: ZOMBIE_PALETTE.E40.body, E56: 0xf2a7c0, E66: 0x7fd6c2 }
    for (const [type, body] of Object.entries(special)) {
      ZOMBIE_LOOKS[type].slice(1).forEach((look, n) => expect(hueGap(hue(look.shirt), hue(body)), `${type} look ${n + 1}`).toBeLessThanOrEqual(25))
    }
  })

  it('no two looks of one species share the same head-top (what the camera sees first)', () => {
    const headSig = (look) => {
      const head = (look.acc ?? []).filter((item) => accessoryBoxes(item.kind, FRAMES).some((box) => box.frame === 'head'))
      return JSON.stringify([head.map((item) => [item.kind, item.color, item.color2]), look.cap ?? null, look.band ?? null, look.tint ?? null])
    }
    for (const type of ['E01', 'E03', 'E07', 'E19', 'E40', 'E56', 'E66', 'E74']) {
      const sigs = ZOMBIE_LOOKS[type].slice(1).map(headSig)
      // E19 identity is its cap colour; others by headgear. A look may share headgear only if its body accessory differs.
      const full = ZOMBIE_LOOKS[type].slice(1).map((look) => JSON.stringify([look.shirt, look.pants, look.skin, look.acc, look.cap ?? null, look.tint ?? null]))
      expect(new Set(full).size, `${type} full looks distinct`).toBe(full.length)
      if (type !== 'E19' && type !== 'E56' && type !== 'E66') expect(new Set(sigs).size, `${type} head-tops distinct`).toBe(sigs.length)
    }
  })
})
