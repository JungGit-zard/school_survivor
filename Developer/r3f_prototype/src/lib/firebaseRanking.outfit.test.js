// A-9 (Rosari outfit system): the client ranking write carries an optional outfitId, and every
// bucket payload the client actually emits is accepted by the real database.rules.json strings.
// Public entries are $other:false, so one bad field would reject the whole six-bucket batch —
// including 0-point runs, which must always register (no minimum-score filter, ever).
// The rule strings are evaluated against an in-memory snapshot mock, not a Firebase emulator.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PLAYER_OUTFIT_IDS } from './playerOutfitIds.js'

const gates = vi.hoisted(() => ({ seasonConfig: {} }))
vi.mock('./adminConfig.js', () => ({ getAdminRankingSeasonConfig: () => gates.seasonConfig }))
vi.mock('./guestRankingIdentity.js', () => ({ getGuestRankingClient: vi.fn(), getGuestRankingNicknameForUid: () => '' }))

import { submitRun, _setFirebaseRankingClientForTests } from './firebaseRanking.js'

const rules = JSON.parse(readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')).rules
const publicRules = rules.rankingService.v1.public.$seasonId
const STAGE_RULE = publicRules.stage.$stageId.$window.$periodKey.entries.$uid
const GLOBAL_RULE = publicRules.global.$window.$periodKey.entries.$uid

function snap(value) {
  return {
    exists: () => value !== undefined && value !== null,
    child: (key) => snap(value == null ? undefined : value[key]),
    val: () => value,
    isNumber: () => typeof value === 'number',
    isBoolean: () => typeof value === 'boolean',
    isString: () => typeof value === 'string',
    hasChildren: (keys) => keys.every((key) => value != null && value[key] !== undefined),
  }
}
const run = (expr, vars) => new Function(...Object.keys(vars), `return (${expr})`)(...Object.values(vars))

// Map a written path to its rule + wildcard bindings, then apply .write, .validate, children and $other.
function rulesAccept(path, entry, existing = null) {
  const parts = path.split('/')
  const at = parts.indexOf('public')
  const [seasonId, family] = [parts[at + 1], parts[at + 2]]
  const vars = family === 'stage'
    ? { $seasonId: seasonId, $stageId: parts[at + 3], $window: parts[at + 4], $periodKey: parts[at + 5], $uid: parts[at + 7] }
    : { $seasonId: seasonId, $stageId: undefined, $window: parts[at + 3], $periodKey: parts[at + 4], $uid: parts[at + 6] }
  const rule = family === 'stage' ? STAGE_RULE : GLOBAL_RULE
  const ctx = { newData: snap(entry), data: snap(existing), auth: { uid: vars.$uid }, ...vars }
  if (!run(rule['.write'], ctx)) return false
  if (!run(rule['.validate'], ctx)) return false
  for (const [key, value] of Object.entries(entry)) {
    const child = rule[key] ?? rule.$other
    if (child['.validate'] === false) return false
    if (!run(child['.validate'], { ...ctx, newData: snap(value), data: snap(existing?.[key]) })) return false
  }
  return true
}

function makeFakeClient() {
  const writes = {}
  const mod = {
    ref: (_db, path) => ({ path: path ?? '' }),
    get: vi.fn(async (ref) => ({ exists: () => !!writes[ref.path], val: () => structuredClone(writes[ref.path] ?? null), child: (key) => ({ val: () => writes[ref.path]?.[key] }) })),
    set: vi.fn(async (ref, value) => { writes[ref.path] = value }),
    update: vi.fn(async (ref, patch) => {
      // The flush is atomic like RTDB: any path the rules reject rejects the whole batch.
      for (const [path, value] of Object.entries(patch)) {
        if (!rulesAccept(path, value, writes[path])) throw Object.assign(new Error('PERMISSION_DENIED'), { code: 'PERMISSION_DENIED' })
      }
      for (const [path, value] of Object.entries(patch)) await mod.set({ path }, value)
    }),
  }
  return { client: { db: {}, mod }, writes }
}

describe('ranking outfitId (A-9)', () => {
  beforeEach(() => {
    gates.seasonConfig = {}
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://x-default-rtdb.firebaseio.com')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    _setFirebaseRankingClientForTests(null)
    vi.restoreAllMocks()
  })

  it.each([...PLAYER_OUTFIT_IDS])('registers a 0-point run with outfitId %s in every bucket, accepted by the rules', async (outfitId) => {
    const { client, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)
    const outcome = await submitRun({ uid: 'me', displayName: 'Neo' }, { stageId: 'stage1', score: 0, timeMs: 0, cleared: false, outfitId })
    expect(outcome.failed).toEqual([])
    const entries = Object.entries(writes)
    expect(entries.length).toBeGreaterThanOrEqual(2) // permanent stage + global even outside a season
    for (const [path, entry] of entries) {
      expect(entry, path).toMatchObject({ score: 0, outfitId })
      expect(rulesAccept(path, entry), path).toBe(true)
    }
  })

  it('an old-client run without outfitId still registers and stores no outfitId', async () => {
    const { client, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)
    const outcome = await submitRun({ uid: 'me', displayName: 'Neo' }, { stageId: 'stage2', score: 30, timeMs: 30000, cleared: false })
    expect(outcome.failed).toEqual([])
    for (const [path, entry] of Object.entries(writes)) {
      expect(entry, path).not.toHaveProperty('outfitId')
      expect(rulesAccept(path, entry), path).toBe(true)
    }
  })

  it('drops an unknown outfitId on the client instead of letting the rules reject the whole batch', async () => {
    const { client, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)
    for (const bad of ['summer', '', 7, null]) {
      const outcome = await submitRun({ uid: 'me', displayName: 'Neo' }, { stageId: 'stage1', score: 0, timeMs: 0, cleared: false, outfitId: bad })
      expect(outcome.failed, String(bad)).toEqual([])
    }
    for (const entry of Object.values(writes)) expect(entry).not.toHaveProperty('outfitId')
  })

  it('keeps the outfit of the best-score run when a later lower run wears another outfit', async () => {
    const { client, writes } = makeFakeClient()
    _setFirebaseRankingClientForTests(client)
    await submitRun({ uid: 'me', displayName: 'Neo' }, { stageId: 'stage1', score: 120, timeMs: 120000, cleared: false, outfitId: 'gym' })
    await submitRun({ uid: 'me', displayName: 'Neo' }, { stageId: 'stage1', score: 10, timeMs: 10000, cleared: false, outfitId: 'winter' })
    for (const [path, entry] of Object.entries(writes)) {
      expect(entry, path).toMatchObject({ score: 120, outfitId: 'gym' })
    }
  })

  it('reads an old entry without outfitId alongside a new one (rules require neither)', () => {
    expect(STAGE_RULE['.validate']).not.toContain("'outfitId'")
    expect(GLOBAL_RULE['.validate']).not.toContain("'outfitId'")
    const old = { uid: 'me', displayName: 'Neo', score: 5, timeMs: 5000, cleared: false, stageId: 'stage1', submittedAt: 1 }
    const path = 'rankingService/v1/public/all-time/stage/stage1/allTime/all-time/entries/me'
    expect(rulesAccept(path, old)).toBe(true)
    expect(rulesAccept(path, { ...old, outfitId: 'grad' }, old)).toBe(true)
  })
})
