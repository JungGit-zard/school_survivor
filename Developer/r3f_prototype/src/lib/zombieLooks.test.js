import { describe, expect, it } from 'vitest'
import { EnemyEntityPool, ENEMY_TYPE_CODES, LOOK_COUNT_BY_CODE } from './enemyEntityPool.js'
import { EXPANSION_STAGES } from './expansionContent.js'
import { LOOK_ALIVE_LIMIT, ZOMBIE_LOOKS, ZOMBIE_LOOK_EXCLUDED, ZOMBIE_MEASURED_WORST_ALIVE, zombieLookCount } from './zombieLooks.js'

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
