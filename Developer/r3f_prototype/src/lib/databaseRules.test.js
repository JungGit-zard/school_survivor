import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STAGE_BONUS, CLEAR_BONUS, getRankingScore } from './rankingScorePolicy.js'

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

  it('keeps global daily/weekly rows publicly readable and owner-writable per uid', () => {
    const entries = rules.rankingService.v1.public.$seasonId.global.$window.$periodKey.entries
    expect(entries['.read']).toContain("$window === 'daily' || $window === 'weekly'")
    expect(entries['.write']).toBeUndefined() // 버킷 레벨 광역 쓰기 없음 — $uid 노드가 소유권을 강제
    expect(entries.$uid['.write']).toContain('$uid === auth.uid')
    expect(entries['.indexOn']).toContain('score')
  })

  it('keeps daily/weekly stage rows publicly readable through stage4 and owner-writable per uid', () => {
    const entries = rules.rankingService.v1.public.$seasonId.stage.$stageId.$window.$periodKey.entries
    expect(entries['.read']).toContain("$window === 'daily' || $window === 'weekly'")
    expect(entries['.read']).toContain("$stageId === 'stage1'")
    expect(entries['.read']).toContain("$stageId === 'stage4'")
    expect(entries['.write']).toBeUndefined()
    expect(entries.$uid['.write']).toContain('$uid === auth.uid')
    expect(entries.$uid['.write']).toContain("newData.child('stageId').val() === $stageId")
    expect(entries['.indexOn']).toContain('score')
  })

  it('pins Firebase deployments to the production project', () => {
    const config = JSON.parse(readFileSync(FIREBASE_RC_PATH, 'utf-8'))
    expect(config.projects.default).toBe('escape-zombie-school')
  })
})

// 실제 규칙 문자열을 RTDB RuleDataSnapshot API를 흉내낸 목으로 평가한다(에뮬레이터/rules-unit-testing
// 미설치 환경의 fallback). 규칙 문자열은 RuleData API를 제외하면 유효한 JS라 new Function으로 실행 가능.
function ruleData(value) {
  return {
    exists: () => value !== undefined && value !== null,
    child: (key) => ruleData(value == null ? undefined : value[key]),
    val: () => value,
    isNumber: () => typeof value === 'number',
    isBoolean: () => typeof value === 'boolean',
    isString: () => typeof value === 'string',
    hasChildren: (keys) => keys.every((key) => value != null && value[key] !== undefined),
  }
}

function evalRule(expr, { newData, data, auth = null, $uid, $window, $stageId }) {
  // eslint-disable-next-line no-new-func
  const fn = new Function('newData', 'data', 'auth', '$uid', '$window', '$stageId', `return (${expr})`)
  return fn(newData, data, auth, $uid, $window, $stageId)
}

// 엔트리 전체가 accept되려면 .write + 엔트리 .validate + 모든 자식 .validate가 전부 true여야 한다.
function fullyAccepts(entryRule, { entry, existing, auth, $uid, $window, $stageId }) {
  const newData = ruleData(entry)
  const data = ruleData(existing)
  const ctx = { newData, data, auth, $uid, $window, $stageId }
  if (!evalRule(entryRule['.write'], ctx)) return false
  if (!evalRule(entryRule['.validate'], ctx)) return false
  for (const [child, rule] of Object.entries(entryRule)) {
    if (child.startsWith('.') || child === '$other') continue
    if (rule?.['.validate'] == null) continue
    if (!evalRule(rule['.validate'], { newData: ruleData(entry[child]), data, auth, $uid, $window, $stageId })) return false
  }
  return true
}

function honestEntry({ uid = 'me', stageId = 'stage2', timeMs = 50000, cleared = true, displayName = 'Neo' } = {}) {
  const survivalSeconds = Math.floor(timeMs / 1000)
  const base = survivalSeconds + STAGE_BONUS[stageId] + (cleared ? CLEAR_BONUS : 0)
  const bossBonus = cleared ? Math.floor(base * 0.2) : 0
  const score = getRankingScore({ stageId, survivalSeconds, cleared, bossBonus })
  return { uid, displayName, score, timeMs, cleared, stageId, submittedAt: Date.now() }
}

describe('ranking entry write rules (evaluated against the real rule strings)', () => {
  const stageRule = rules.rankingService.v1.public.$seasonId.stage.$stageId.$window.$periodKey.entries.$uid
  const globalRule = rules.rankingService.v1.public.$seasonId.global.$window.$periodKey.entries.$uid

  const base = { auth: { uid: 'me' }, $uid: 'me', $window: 'daily', $stageId: 'stage2' }

  it('accepts an honest run for every stage in both stage and global buckets', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      for (const cleared of [true, false]) {
        const entry = honestEntry({ stageId, cleared })
        const ctx = { entry, auth: { uid: 'me' }, $uid: 'me', $window: 'weekly', $stageId: stageId }
        expect(fullyAccepts(stageRule, ctx)).toBe(true)
        expect(fullyAccepts(globalRule, { ...ctx, $stageId: undefined })).toBe(true)
      }
    }
  })

  it('rejects an unauthenticated write', () => {
    expect(fullyAccepts(stageRule, { ...base, auth: null, entry: honestEntry() })).toBe(false)
  })

  it("rejects writing to another user's uid node", () => {
    expect(fullyAccepts(stageRule, { ...base, auth: { uid: 'intruder' }, entry: honestEntry() })).toBe(false)
  })

  it('rejects a score above the anti-cheat cap (timeMs 60s but score 50000)', () => {
    const tampered = { ...honestEntry({ stageId: 'stage4', timeMs: 60000 }), score: 50000 }
    expect(fullyAccepts(stageRule, { ...base, $stageId: 'stage4', entry: tampered })).toBe(false)
  })

  it('rejects an honest score inflated by even one point (cap is exact for honest runs)', () => {
    const honest = honestEntry({ stageId: 'stage2', timeMs: 50000, cleared: true })
    expect(fullyAccepts(stageRule, { ...base, entry: honest })).toBe(true)
    expect(fullyAccepts(stageRule, { ...base, entry: { ...honest, score: honest.score + 1 } })).toBe(false)
  })

  it('rejects a new score lower than the existing entry (best-only)', () => {
    const entry = honestEntry({ stageId: 'stage1', timeMs: 60000, cleared: false }) // score 60
    const existing = { score: 500 }
    expect(fullyAccepts(stageRule, { ...base, $stageId: 'stage1', entry, existing })).toBe(false)
    // 동일하거나 더 높은 점수는 허용
    expect(fullyAccepts(stageRule, { ...base, $stageId: 'stage1', entry, existing: { score: 10 } })).toBe(true)
  })

  it('rejects malformed entries: missing field, wrong type, and over-long displayName', () => {
    const { cleared: _drop, ...missingCleared } = honestEntry()
    expect(fullyAccepts(stageRule, { ...base, entry: missingCleared })).toBe(false)

    expect(fullyAccepts(stageRule, { ...base, entry: { ...honestEntry(), score: '100' } })).toBe(false)
    expect(fullyAccepts(stageRule, { ...base, entry: { ...honestEntry(), cleared: 'yes' } })).toBe(false)
    expect(fullyAccepts(stageRule, { ...base, entry: { ...honestEntry(), stageId: 'stage9' } })).toBe(false)
    expect(fullyAccepts(stageRule, { ...base, entry: { ...honestEntry(), displayName: 'x'.repeat(41) } })).toBe(false)
    expect(fullyAccepts(stageRule, { ...base, entry: { ...honestEntry(), uid: 'someone-else' } })).toBe(false)
  })

  it('caps timeMs so an inflated survival time cannot raise the score ceiling', () => {
    // timeMs 상한(3,600,000ms)이 없으면 timeMs를 부풀려 score 상한을 무한정 끌어올릴 수 있다.
    const inflated = { ...honestEntry({ stageId: 'stage1', cleared: false }), timeMs: 100000000, score: 90000 }
    expect(fullyAccepts(stageRule, { ...base, $stageId: 'stage1', entry: inflated })).toBe(false)
  })

  it('rejects a stage-bucket write whose stageId does not match the bucket path', () => {
    const entry = honestEntry({ stageId: 'stage1', timeMs: 60000, cleared: false })
    expect(fullyAccepts(stageRule, { ...base, $stageId: 'stage4', entry })).toBe(false)
  })

  it('rejects unknown extra children via $other', () => {
    expect(stageRule.$other['.validate']).toBe(false)
    expect(globalRule.$other['.validate']).toBe(false)
  })
})
