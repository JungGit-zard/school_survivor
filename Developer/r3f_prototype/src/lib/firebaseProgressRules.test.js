// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ZOMBIE_ENCYCLOPEDIA_TYPES } from './zombieEncyclopedia.js'

const rules = JSON.parse(readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8'))
const encounterRule = rules.rules.users.$uid.progress.encounteredZombieTypes.$zombieType['.validate']
// This one rule uses only JavaScript-compatible equality/boolean expressions.
// Evaluate it against an in-memory snapshot; this is not a Firebase emulator.
const validateEncounter = new Function('$zombieType', 'newData', `return (${encounterRule})`)

describe('Firebase encounter save contract', () => {
  it('allows only the two player appearance values', () => {
    const rule = rules.rules.users.$uid.progress.titleSettings.playerAppearance['.validate']
    const validate = new Function('newData', `return (${rule})`)
    for (const value of ['v9', 'legacy', 'old', '', 1, true, null]) {
      expect(validate({ val: () => value, isString: () => typeof value === 'string' }))
        .toBe(value === 'v9' || value === 'legacy')
    }
  })
  it('accepts every encyclopedia type, including the coin monster', () => {
    expect(ZOMBIE_ENCYCLOPEDIA_TYPES).toContain('E08')
    const ruleTypes = [...encounterRule.matchAll(/\$zombieType === '([^']+)'/g)].map((match) => match[1])
    expect(ruleTypes.sort()).toEqual([...ZOMBIE_ENCYCLOPEDIA_TYPES].sort())
    for (const type of ZOMBIE_ENCYCLOPEDIA_TYPES) {
      expect(validateEncounter(type, { val: () => 1 }), type).toBe(true)
    }
  })

  it('still rejects unknown types and invalid encounter values', () => {
    expect(validateEncounter('E99', { val: () => 1 })).toBe(false)
    for (const value of [0, 2, true, '1', null]) {
      expect(validateEncounter('E08', { val: () => value })).toBe(false)
    }
  })
})
