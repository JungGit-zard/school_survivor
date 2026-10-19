import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { RECORD_KEYS } from './playerRecords.js'

// Deterministic unit expressions, not a deployed Rules/emulator claim.
const bytes = readFileSync(new URL('../../database.rules.json', import.meta.url))
const rules = JSON.parse(bytes).rules
const recordsRules = rules.users.$uid.progress.records
const snapshot = value => ({
  val: () => value,
  exists: () => value !== undefined && value !== null,
  isNumber: () => typeof value === 'number' && Number.isFinite(value),
  child: key => snapshot(value?.[key]),
  hasChildren: keys => keys.every(key => value?.[key] !== undefined && value?.[key] !== null),
})
const evaluate = (expression, next, old) => new Function('newData','data',`return (${expression})`)(snapshot(next),snapshot(old))

describe('existing ledger wire contract and baseline Firebase Rules', () => {
  it('restores exact a9 Rules bytes: no rollout or Rules deployment required', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('d7aa0a2d335ecff33e9527f9bf6d684421faa8b8a71802bd1a07b513e1b2a581')
  })
  it.each([1,2,3,4,5,6,7,8,9,10])('stage %i virtual key uses existing numeric run-row validator, not progress schema additions', n => {
    const key=`stage${n}BossDefeats`
    expect(RECORD_KEYS).toContain(key) // player-facing virtual API retained
    expect(recordsRules).not.toHaveProperty(key)
    const expression=rules.users.$uid.runLedger.$run.records.$key['.validate']
    expect(evaluate(expression,1,0)).toBe(true)
    expect(evaluate(expression,0,undefined)).toBe(true) // explicit not-final, never legacy fallback
    for(const bad of [-1,'1',null]) expect(evaluate(expression,bad,0)).toBe(false)
    // Safe-integer/final-event semantics live in projection; no new security-policy claim.
  })
  it('retains existing record no-erase, monotonic fallback, ledger presence and owner/admin boundary', () => {
    expect(recordsRules.$recordKey['.validate']).toBe('newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000000 && (!data.exists() || newData.val() >= data.val())')
    expect(evaluate(recordsRules.$recordKey['.validate'],0,1)).toBe(false)
    expect(evaluate(recordsRules['.validate'],{}, {totalRuns:1})).toBe(false)
    expect(rules.users.$uid['.validate']).toContain("!data.child('runLedger').exists() || newData.child('runLedger').exists()")
    expect(rules.users.$uid['.write']).toContain('auth != null')
    expect(rules.users.$uid['.write']).toContain('auth.uid === $uid')
  })
})
