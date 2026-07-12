import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RULES_PATH = fileURLToPath(new URL('../../database.rules.json', import.meta.url))
const FIREBASE_RC_PATH = fileURLToPath(new URL('../../.firebaserc', import.meta.url))
const rules = JSON.parse(readFileSync(RULES_PATH, 'utf-8')).rules

describe('Realtime Database rules', () => {
  it('denies access by default and keeps user progress private to its owner', () => {
    expect(rules['.read']).toBe(false)
    expect(rules['.write']).toBe(false)
    expect(rules.users.$uid['.read']).toContain('auth.uid === $uid')
    expect(rules.users.$uid['.write']).toContain('auth.uid === $uid')
  })

  it('validates activity and rejects unknown account-bound progress fields', () => {
    const user = rules.users.$uid
    expect(user.activity.lastStartedAt['.validate']).toContain('newData.isString()')
    expect(user.activity.lastStageId['.validate']).toContain('newData.isString()')
    expect(user.progress.$other['.validate']).toBe(false)
    expect(user.$other['.validate']).toBe(false)
  })

  it('makes only server-projected global daily/weekly rows publicly readable', () => {
    const entries = rules.rankingService.v1.public.$seasonId.global.$window.$periodKey.entries
    expect(entries['.read']).toContain("$window === 'daily' || $window === 'weekly'")
    expect(entries['.write']).toBe(false)
    expect(entries['.indexOn']).toContain('score')
  })

  it('makes only server-projected daily stage rows publicly readable', () => {
    const entries = rules.rankingService.v1.public.$seasonId.stage.$stageId.daily.$periodKey.entries
    expect(entries['.read']).toContain("$stageId === 'stage1'")
    expect(entries['.write']).toBe(false)
    expect(entries['.indexOn']).toContain('score')
  })

  it('pins Firebase deployments to the production project', () => {
    const config = JSON.parse(readFileSync(FIREBASE_RC_PATH, 'utf-8'))
    expect(config.projects.default).toBe('escape-zombie-school')
  })
})
