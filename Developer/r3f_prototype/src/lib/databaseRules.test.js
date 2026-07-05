import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// RTDB 보안 규칙(database.rules.json)의 핵심 방어가 삭제/완화되지 않았는지 지키는 self-check.
// 에뮬레이터 없이 규칙 파일을 raw text/JSON으로 읽어 구조를 검증한다.
const RULES_PATH = fileURLToPath(new URL('../../database.rules.json', import.meta.url))
const rawRules = readFileSync(RULES_PATH, 'utf-8')

describe('database.rules.json integrity', () => {
  it('is valid JSON with a rules root', () => {
    const parsed = JSON.parse(rawRules)
    expect(parsed).toHaveProperty('rules')
  })

  it('denies read/write globally by default', () => {
    const { rules } = JSON.parse(rawRules)
    expect(rules['.read']).toBe(false)
    expect(rules['.write']).toBe(false)
  })

  it('restricts user writes to the owning uid', () => {
    const { rules } = JSON.parse(rawRules)
    const userRule = rules.users.$uid
    expect(userRule['.write']).toContain('auth.uid === $uid')
    expect(userRule['.read']).toContain('auth.uid === $uid')
  })

  it('locks the ranking entry to its owner and enforces a monotonic score', () => {
    const { rules } = JSON.parse(rawRules)
    const entries = rules.rankings.$seasonId.stage.$stageId.$window.$periodKey.entries
    const entryWrite = entries.$uid['.write']
    expect(entryWrite).toContain('auth.uid === $uid')
    // 점수 하락(=조작된 낮은 값 덮어쓰기) 및 임의 증가 방지의 단조 증가 가드
    expect(entryWrite).toContain("newData.child('score').val() >= data.child('score').val()")
  })

  it('caps the ranking score to a sane upper bound', () => {
    const { rules } = JSON.parse(rawRules)
    const entries = rules.rankings.$seasonId.stage.$stageId.$window.$periodKey.entries
    const scoreValidate = entries.$uid.score['.validate']
    expect(scoreValidate).toContain('newData.isNumber()')
    expect(scoreValidate).toContain('<= 1000000')
  })

  it('indexes ranking entries on score for orderByChild queries', () => {
    const { rules } = JSON.parse(rawRules)
    const entries = rules.rankings.$seasonId.stage.$stageId.$window.$periodKey.entries
    expect(entries['.indexOn']).toContain('score')
  })

  it('exposes the leaderboard as public read at the entries node', () => {
    const { rules } = JSON.parse(rawRules)
    const entries = rules.rankings.$seasonId.stage.$stageId.$window.$periodKey.entries
    expect(entries['.read']).toBe(true)
  })
})
