import { describe, expect, it } from 'vitest'
import {
  WAVE_DEBUT_ROLE_LINES,
  WAVE_DEBUT_SHOW_MS,
  WAVE_DEBUT_STALE_MS,
  advanceWaveDebut,
  announceWaveSpecialSpawn,
  createWaveDebutQueue,
  isWaveDebutIdle,
  noteWaveDebut,
  setWaveDebutListener,
  waveDebutRoleInfo,
} from './waveDebutNotice.js'
import { WAVE_ROLE_CODE_BY_NAME, WAVE_ROLE_COLORS, WAVE_ROLE_COUNT, WAVE_ROLE_KEYS } from './waveRoleMarker.js'
import { WAVE_SPECIAL_ROLE, WAVE_STANDARD } from './waveStandard.js'
import { getZombieTypeLabel } from './zombieEncyclopedia.js'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

const special = (type, stageId = 'stage1', atMs = 0) => ({ type, waveRole: WAVE_SPECIAL_ROLE[type], stageId, atMs })

describe('first appearance fires once per species', () => {
  it('queues a special the first time only', () => {
    const q = createWaveDebutQueue()
    expect(noteWaveDebut(q, special('E02'))).toBe(true)
    expect(noteWaveDebut(q, special('E02'))).toBe(false)
    expect(noteWaveDebut(q, special('E02', 'stage1', 60_000))).toBe(false)
    expect(q.queue.map((n) => n.type)).toEqual(['E02'])
    const shown = advanceWaveDebut(q, 0)
    expect(shown.type).toBe('E02')
    advanceWaveDebut(q, WAVE_DEBUT_SHOW_MS)
    expect(isWaveDebutIdle(q)).toBe(true)
    // Still seen after it was shown: no second toast in the same run.
    expect(noteWaveDebut(q, special('E02'))).toBe(false)
  })

  it('a new run (new queue) announces the species again', () => {
    const a = createWaveDebutQueue()
    noteWaveDebut(a, special('E66'))
    const b = createWaveDebutQueue()
    expect(noteWaveDebut(b, special('E66'))).toBe(true)
  })
})

describe('queueing', () => {
  it('shows several debuts one at a time, in order, each for about 2.5 s', () => {
    const q = createWaveDebutQueue()
    for (const type of ['E35', 'E66', 'E02']) expect(noteWaveDebut(q, special(type))).toBe(true)
    expect(advanceWaveDebut(q, 0).type).toBe('E35')
    expect(advanceWaveDebut(q, WAVE_DEBUT_SHOW_MS - 1).type).toBe('E35')
    expect(advanceWaveDebut(q, 1).type).toBe('E66')
    expect(q.queue.map((n) => n.type)).toEqual(['E02'])
    expect(advanceWaveDebut(q, WAVE_DEBUT_SHOW_MS).type).toBe('E02')
    expect(advanceWaveDebut(q, WAVE_DEBUT_SHOW_MS)).toBeNull()
    expect(isWaveDebutIdle(q)).toBe(true)
  })

  it('hides and freezes while blocked, then resumes the remaining time', () => {
    const q = createWaveDebutQueue()
    noteWaveDebut(q, special('E34'))
    noteWaveDebut(q, special('E35'))
    expect(advanceWaveDebut(q, 0).type).toBe('E34')
    advanceWaveDebut(q, 2000)
    expect(advanceWaveDebut(q, 10_000, { blocked: true })).toBeNull()
    expect(advanceWaveDebut(q, 400).type).toBe('E34')
    expect(advanceWaveDebut(q, 100).type).toBe('E35')
  })

  it('drops a queued notice that waited too long on the game clock', () => {
    const q = createWaveDebutQueue()
    noteWaveDebut(q, special('E05', 'stage1', 1000))
    noteWaveDebut(q, special('E56', 'stage1', 1000))
    expect(advanceWaveDebut(q, 0, { blocked: true, nowMs: 1000 + WAVE_DEBUT_STALE_MS + 1 })).toBeNull()
    expect(advanceWaveDebut(q, 0, { nowMs: 1000 + WAVE_DEBUT_STALE_MS + 1 })).toBeNull()
    expect(isWaveDebutIdle(q)).toBe(true)
  })
})

describe('no toast for fodder, bosses or stages 7-10', () => {
  it('fodder (no role) never queues', () => {
    const q = createWaveDebutQueue()
    for (const fodder of new Set(Object.values(WAVE_STANDARD).flat().map((w) => w.fodder))) {
      expect(noteWaveDebut(q, { type: fodder, waveRole: null, stageId: 'stage1' })).toBe(false)
      expect(noteWaveDebut(q, { type: fodder, waveRole: undefined, stageId: 'stage6' })).toBe(false)
    }
    expect(q.queue).toEqual([])
  })

  it('bosses, chiefs-style exempt types and crews never queue, even with a role', () => {
    const q = createWaveDebutQueue()
    for (const type of ['B01', 'B05', 'B10', 'RZL', 'RZC', 'E08']) {
      expect(noteWaveDebut(q, { type, waveRole: '탱크', stageId: 'stage1' })).toBe(false)
    }
    expect(q.queue).toEqual([])
  })

  it('stages 7-10 (and unknown stages) never queue', () => {
    const q = createWaveDebutQueue()
    for (const stageId of ['stage7', 'stage8', 'stage9', 'stage10', null, 'title']) {
      expect(noteWaveDebut(q, special('E02', stageId))).toBe(false)
    }
    for (let n = 1; n <= 6; n += 1) {
      expect(noteWaveDebut(createWaveDebutQueue(), special('E02', `stage${n}`))).toBe(true)
    }
  })
})

describe('role text and colour cover every role', () => {
  it('every ring role has a 2-5 word Korean line and the ring colour', () => {
    for (let code = 1; code < WAVE_ROLE_COUNT; code += 1) {
      const info = waveDebutRoleInfo(code)
      expect(info.key).toBe(WAVE_ROLE_KEYS[code])
      expect(info.line).toBe(WAVE_DEBUT_ROLE_LINES[info.key])
      const words = info.line.replace('·', ' ').split(/\s+/).filter(Boolean)
      expect(words.length).toBeGreaterThanOrEqual(2)
      expect(words.length).toBeLessThanOrEqual(5)
      expect(info.color).toBe(`#${WAVE_ROLE_COLORS[code].toString(16).padStart(6, '0').toUpperCase()}`)
    }
    expect(Object.keys(WAVE_DEBUT_ROLE_LINES).sort()).toEqual(WAVE_ROLE_KEYS.slice(1).sort())
    expect(waveDebutRoleInfo(null)).toBeNull()
    expect(waveDebutRoleInfo('없는역할')).toBeNull()
  })

  it('uses the approved ring palette', () => {
    expect(['tank', 'rush', 'ranged', 'zone', 'ambush', 'support', 'split', 'disrupt', 'melee', 'formation'].map((k) => waveDebutRoleInfo(k).color))
      .toEqual(['#E0453A', '#F28C28', '#9B59D0', '#F2C94C', '#2FB7B0', '#7CC85A', '#F06AA8', '#F06AA8', '#4A90E2', '#FFFFFF'])
  })

  it('every Korean role name in the wave table maps to a role with a line', () => {
    for (const name of new Set(Object.values(WAVE_SPECIAL_ROLE))) {
      expect(WAVE_ROLE_CODE_BY_NAME[name], name).toBeGreaterThan(0)
      expect(waveDebutRoleInfo(name).line, name).toBeTruthy()
    }
  })

  it('every special in stages 1-6 has an in-game Korean name and a role', () => {
    for (const waves of Object.values(WAVE_STANDARD)) {
      for (const wave of waves) {
        for (const type of wave.specials) {
          expect(WAVE_SPECIAL_ROLE[type], type).toBeTruthy()
          expect(getZombieTypeLabel(type), type).not.toBe(type)
        }
      }
    }
  })

  it('ko, en and ja carry a role line for every role', () => {
    for (const key of WAVE_ROLE_KEYS.slice(1)) {
      expect(ko[`waveDebut.role.${key}`]).toBe(WAVE_DEBUT_ROLE_LINES[key])
      expect(en[`waveDebut.role.${key}`], key).toBeTruthy()
      expect(ja[`waveDebut.role.${key}`], key).toBeTruthy()
    }
  })
})

describe('spawn bridge', () => {
  it('forwards special spawns to the single listener and ignores role-less bodies', () => {
    const calls = []
    const off = setWaveDebutListener((type, role) => calls.push([type, role]))
    announceWaveSpecialSpawn('E02', '탱크')
    announceWaveSpecialSpawn('E01', null)
    off()
    announceWaveSpecialSpawn('E06', '탱크')
    expect(calls).toEqual([['E02', '탱크']])
  })
})
