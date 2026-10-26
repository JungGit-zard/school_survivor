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
  // a9 바이트(d7aa0a2d…)에서 encounteredZombieTypes 화이트리스트에 E34~E45만 더한 바이트다(25066a57).
  // 클라이언트가 E34~E45 조우를 저장하므로 이 Rules를 클라이언트보다 먼저 배포해야 한다 —
  // 아니면 해당 조우가 들어간 progress 쓰기 전체가 .validate에서 거부된다.
  // 2026-10-26: titleSettings.playerAppearance에 'rosari'만 추가(9dcadbc7…). 스테일 트리 전량 배포 복구용 상위집합.
  // 2026-10-27: 9dcadbc7에서 titleSettings.playerOutfit('default'|'winter') 한 줄만 추가(1bd0e5bd…).
  // 클라이언트가 playerOutfit을 저장하므로 이 Rules를 클라이언트보다 먼저 배포해야 한다.
  it('pins the reviewed Rules bytes: a9 plus the E34-E45 encounter whitelist, the rosari appearance and the wardrobe playerOutfit (deploy Rules before the client)', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('1bd0e5bd1abec1f6e1e3950f8a497f55e40de6d3eebc42285fec7147c0e78942')
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
