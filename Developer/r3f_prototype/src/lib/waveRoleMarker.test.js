import { describe, expect, it } from 'vitest'
import { WAVE_ROLE_CODE_BY_NAME, WAVE_ROLE_COLORS, WAVE_ROLE_KEYS, waveRoleCode, waveRoleColor } from './waveRoleMarker.js'
import { WAVE_SPECIAL_ROLE, WAVE_STANDARD } from './waveStandard.js'
import { WAVE_SPECIAL_SCALE_MUL, createWaveComposer, noteWaveSpawn, pickWaveType } from './waveComposition.js'
import { EnemyEntityPool, enemyTypeFromCode } from './enemyEntityPool.js'
import { runStageRuntimeProbe } from './stageRuntimeProbe.js'
import { enemyPool as livePool } from './refs.js'
import { ENEMY_STATS, ENEMY_SIZE_MULTIPLIER } from '../components/Enemy.jsx'
import { createStageRosterRotation, noteStageRosterSpawn } from '../components/Enemies.jsx'

// Terry 2026-11-21 wave standard, step 2: specials must read as "stronger, different job" — a ground ring
// coloured by role. Fodder gets none; stages 7-10 (no wave rule) get none.

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']
function composer(stageId) {
  return createWaveComposer(stageId, {
    hpOf: (type) => ENEMY_STATS[type]?.hp ?? 0,
    statsOf: (type) => ENEMY_STATS[type] ?? null,
    aliveOf: () => 0,
  })
}
const BASE_COL_Y = 0.24 // components/Enemies.jsx spawn-ring origin height per scale unit
const FOOT_DEPTH = 0.63 * 0.333 // shared body-local foot bottom (box / blocky / mini rigs) × ENEMY_VISUAL_WORLD_SCALE

describe('role → colour', () => {
  it('the ten roles map to the approved colours', () => {
    const expected = {
      '탱크': 0xe0453a, '돌진': 0xf28c28, '원거리': 0x9b59d0, '장판·포격': 0xf2c94c, '기습': 0x2fb7b0,
      '지원': 0x7cc85a, '분열': 0xf06aa8, '방해': 0xf06aa8, '근접기술': 0x4a90e2, '편대': 0xffffff,
    }
    expect(Object.keys(WAVE_ROLE_CODE_BY_NAME).sort()).toEqual(Object.keys(expected).sort())
    for (const [name, hex] of Object.entries(expected)) expect(waveRoleColor(waveRoleCode(name)), name).toBe(hex)
    expect(WAVE_ROLE_COLORS).toHaveLength(WAVE_ROLE_KEYS.length)
  })

  it('names, keys and codes all resolve; anything else is 0 (no ring)', () => {
    expect(waveRoleCode('tank')).toBe(waveRoleCode('탱크'))
    expect(waveRoleCode(3)).toBe(3)
    for (const bad of [undefined, null, '', 'E01', 0, -1, 99, 2.5, {}]) expect(waveRoleCode(bad), String(bad)).toBe(0)
    expect(waveRoleColor(0)).toBeNull()
  })

  it('every special in the stage 1-6 tables has a role with a colour', () => {
    for (const id of STAGES) {
      WAVE_STANDARD[id].forEach((wave, w) => wave.specials.forEach((type) => {
        expect(waveRoleCode(WAVE_SPECIAL_ROLE[type]), `${id} W${w + 1} ${type}`).toBeGreaterThan(0)
      }))
    }
    for (const [type, role] of Object.entries(WAVE_SPECIAL_ROLE)) expect(waveRoleCode(role), type).toBeGreaterThan(0)
  })
})

describe('pool slot carries the role (visual only)', () => {
  it('spawnInto stores the role code; despawn and reset clear it; no role → 0', () => {
    const pool = new EnemyEntityPool()
    const a = pool.spawn({ type: 'E02', hp: 70, maxHp: 70, waveRole: '탱크' })
    const b = pool.spawn({ type: 'E01', hp: 8, maxHp: 8 })
    expect(pool.role[a.index]).toBe(1)
    expect(pool.role[b.index]).toBe(0)
    pool.despawn(a)
    expect(pool.role[a.index]).toBe(0)
    const c = pool.spawn({ type: 'E46', hp: 10, maxHp: 10, waveRole: '원거리' })
    expect(pool.role[c.index]).toBe(3)
    pool.reset()
    expect(Array.from(pool.role).every((v) => v === 0)).toBe(true)
  })
})

describe('wave rule hands out roles to specials only', () => {
  it('fodder gets no role; a special gets its role', () => {
    const state = composer('stage1')
    let fodderCount = 0
    for (let k = 0; k < 12; k += 1) {
      const y = BASE_COL_Y * ENEMY_SIZE_MULTIPLIER
      const entry = { type: pickWaveType(state, 'E01', 40), pos: [1, y, 2] }
      noteWaveSpawn(state, entry, 40)
      if (entry.type === 'E01') {
        fodderCount += 1
        expect(entry.waveRole ?? null).toBeNull()
        expect(entry.pos[1]).toBeCloseTo(y, 6)
      } else {
        expect(entry.waveRole, entry.type).toBeTruthy()
      }
    }
    expect(fodderCount).toBeGreaterThanOrEqual(6)
    const fresh = composer('stage1')
    const special = { type: pickWaveType(fresh, 'E34', 41) }
    noteWaveSpawn(fresh, special, 41)
    expect(special.type).toBe('E34')
    expect(special.waveRole).toBe('돌진')
  })

  it('stages 7-10 have no wave rule, so nothing gets a role', () => {
    for (const id of ['stage7', 'stage8', 'stage9', 'stage10']) {
      expect(createWaveComposer(id), id).toBeNull()
      const rotation = createStageRosterRotation(id)
      expect(rotation?.kind, id).not.toBe('wave')
      for (const type of ['E01', 'E22', 'E25', 'E28', 'E31']) {
        const entry = { type, pos: [0, 0.32, 0] }
        noteStageRosterSpawn(rotation, entry, 100)
        expect(entry.waveRole, `${id} ${type}`).toBeUndefined()
      }
    }
  })
})

describe('specials at visual ×1.2 keep their feet on the floor', () => {
  it('the spawn origin height scales with the visual size, so feet sit where a natively bigger zombie stands', () => {
    for (const type of ['E34', 'E02', 'E06', 'E40', 'E56', 'E66', 'E74']) {
      const scale = ENEMY_STATS[type].scale
      const y0 = BASE_COL_Y * scale * ENEMY_SIZE_MULTIPLIER
      const baseFeet = y0 - FOOT_DEPTH * scale * ENEMY_SIZE_MULTIPLIER
      const entry = { type, pos: [3, y0, 4] }
      const state = composer('stage1')
      // Make `type` a special of the current wave so noteWaveSpawn treats it as one.
      state.waves = state.waves.map((wave) => ({ ...wave, specials: [type] }))
      noteWaveSpawn(state, entry, 5)
      expect(entry.waveRole, type).toBeTruthy()
      const visual = entry.statOverride.scale * ENEMY_SIZE_MULTIPLIER
      const feet = entry.pos[1] - FOOT_DEPTH * visual
      expect(feet, `${type} feet`).toBeGreaterThanOrEqual(0)
      expect(feet, `${type} feet scale with the body`).toBeCloseTo(baseFeet * WAVE_SPECIAL_SCALE_MUL, 6)
      expect([entry.pos[0], entry.pos[2]]).toEqual([3, 4])
    }
  })
})

describe('runtime: rings only under stage 1-6 specials', () => {
  function rolesSeen(stageId, maxSec) {
    const seen = { fodderWithRole: 0, specialsWithRole: 0, roleless: 0, withRole: 0 }
    const fodderTypes = new Set((WAVE_STANDARD[stageId] ?? []).map((wave) => wave.fodder))
    runStageRuntimeProbe({
      stageId, seed: 3, bot: { kind: 'KITE', radius: 4, direction: 1, portalMode: 'refuse' }, immortal: true, maxSec,
      onFrame: ({ frame }) => {
        if (frame % 30 !== 0) return
        const pool = livePool
        for (let i = 0; i <= pool.highestActive; i += 1) {
          if (!pool.active[i]) continue
          const name = enemyTypeFromCode(pool.type[i])
          const role = pool.role[i]
          if (role) seen.withRole += 1; else seen.roleless += 1
          if (role && name && fodderTypes.has(name)) seen.fodderWithRole += 1
        }
      },
    })
    return seen
  }

  it('stage 1: specials carry roles, fodder never does', () => {
    const seen = rolesSeen('stage1', 100)
    expect(seen.withRole).toBeGreaterThan(0)
    expect(seen.fodderWithRole).toBe(0)
  })
})
