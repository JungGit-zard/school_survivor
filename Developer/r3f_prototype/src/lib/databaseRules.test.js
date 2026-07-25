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

  it('accepts every Firebase title setting emitted by the player progress snapshot', () => {
    const settings = rules.users.$uid.progress.titleSettings
    expect(settings['.validate']).toContain("'unlockAllStagesCheat'")
    expect(settings.unlockAllStagesCheat['.validate']).toContain('newData.isBoolean()')
    expect(settings.$other['.validate']).toBe(false)
  })

  it('allows RTDB to omit empty optional upgrade maps during first-account creation', () => {
    const progressValidation = rules.users.$uid.progress['.validate']

    expect(progressValidation).toContain("'goldTotal'")
    expect(progressValidation).toContain("'records'")
    expect(progressValidation).toContain("'titleSettings'")
    expect(progressValidation).not.toContain("'weaponUnlocks'")
    expect(progressValidation).not.toContain("'weaponPermanentUpgrades'")
    expect(progressValidation).not.toContain("'passiveUpgrades'")
  })

  it('isolates Studio data to its owner and pins its versioned envelope', () => {
    const studioUser = rules.studioWorkspaces.v1.users.$uid
    const studio = studioUser.current
    expect(studio['.read']).toContain('auth.uid === $uid')
    expect(studio['.write']).toContain('auth.uid === $uid')
    expect(studio.schemaVersion['.validate']).toContain('newData.val() === 1')
    expect(studio.revision['.validate']).toContain('newData.val() >= 0')
    expect(studio.revision['.validate']).toContain('newData.val() % 1 === 0')
    expect(studio.updatedAt['.validate']).toContain('newData.isString()')
    expect(studio.datasets.tunings['.validate']).toContain('newData.isString()')
    expect(studio.datasets.tunings['.validate']).toContain('length <= 1000000')
    expect(studio['.validate']).not.toContain("'datasets'")
    expect(studio.datasets.$other['.validate']).toBe(false)
    expect(studio.$other['.validate']).toBe(false)
    expect(studioUser.$other['.validate']).toBe(false)
  })

  it('makes only server-projected global daily/weekly rows publicly readable', () => {
    const entries = rules.rankingService.v1.public.$seasonId.global.$window.$periodKey.entries
    expect(entries['.read']).toContain("$window === 'daily' || $window === 'weekly'")
    expect(entries['.write']).toBe(false)
    expect(entries['.indexOn']).toContain('score')
  })

  it('makes only server-projected daily/weekly stage rows publicly readable through stage4', () => {
    const entries = rules.rankingService.v1.public.$seasonId.stage.$stageId.$window.$periodKey.entries
    expect(entries['.read']).toContain("$window === 'daily' || $window === 'weekly'")
    expect(entries['.read']).toContain("$stageId === 'stage1'")
    expect(entries['.read']).toContain("$stageId === 'stage4'")
    expect(entries['.write']).toBe(false)
    expect(entries['.indexOn']).toContain('score')
  })

  it('pins Firebase deployments to the production project', () => {
    const config = JSON.parse(readFileSync(FIREBASE_RC_PATH, 'utf-8'))
    expect(config.projects.default).toBe('escape-zombie-school')
  })
})
