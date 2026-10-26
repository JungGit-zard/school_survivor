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
  it('allows only the three player appearance values', () => {
    const rule = rules.rules.users.$uid.progress.titleSettings.playerAppearance['.validate']
    const validate = new Function('newData', `return (${rule})`)
    for (const value of ['v9', 'legacy', 'rosari', 'old', '', 1, true, null]) {
      expect(validate({ val: () => value, isString: () => typeof value === 'string' }))
        .toBe(value === 'v9' || value === 'legacy' || value === 'rosari')
    }
  })
  it('allows only the two wardrobe outfit values for playerOutfit', () => {
    const rule = rules.rules.users.$uid.progress.titleSettings.playerOutfit['.validate']
    const validate = new Function('newData', `return (${rule})`)
    for (const value of ['default', 'winter', 'summer', 'v9', '', 1, true, null]) {
      expect(validate({ val: () => value, isString: () => typeof value === 'string' }))
        .toBe(value === 'default' || value === 'winter')
    }
  })
  // 2026-10-26: a full-file `firebase deploy --only database` from a stale tree
  // dropped these branches and broke the homepage board, admin visitors and every
  // checkpoint save. Any rules file that lacks them must not be deployable.
  it('keeps the board, admin visitor and checkpoint ledger branches', () => {
    const r = rules.rules
    for (const key of ['posts', 'comments', 'privatePosts', 'privateComments']) {
      expect(r.zombieBoard?.v1?.[key], `zombieBoard/v1/${key}`).toBeTruthy()
    }
    expect(r.zombieBoard.v1.posts['.read']).toContain("query.orderByChild === 'createdAt'")
    expect(r.adminVisitors?.$uid?.['.write']).toBeTruthy()
    expect(r.users.$uid.runLedger).toBeTruthy()
    expect(r.users.$uid.checkpointLedger).toBeTruthy()
    expect(r.users.$uid.progress.checkpointRevision).toBeTruthy()
    expect(r.rankingService.v1.guestProfiles).toBeTruthy()
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
