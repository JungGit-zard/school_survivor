// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RUN_LEDGER_COMPACTION_ENABLED, RUN_LEDGER_FOLD_MAX, RUN_LEDGER_KEEP_NEWEST, RUN_LEDGER_RETENTION_MS,
  _resetFirebaseProgressForTests, _setFirebaseProgressClientForTests, _setRunLedgerCompactionForTests,
  applyCloudProgressSnapshot, buildCloudProgressSnapshot, compactRunLedgerNode, getFirebaseRunCheckpointState,
  hydrateCloudProgress, readFirebasePlayerProgress, recordFirebaseRunCheckpoint, requestCloudProgressSave,
  setCloudProgressUser,
} from './firebaseProgress.js'
import { isStageUnlocked } from './stageConfig.js'

const user = { uid: 'synthetic-compaction-owner' }
const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 9, 29)
const BOSS_KEYS = Array.from({ length: 10 }, (_, i) => `stage${i + 1}BossDefeats`)
const STAGES = Array.from({ length: 10 }, (_, i) => `stage${i + 2}`)

const row = (stageId, boss, at) => ({
  stageId, records: { totalRuns: 1, totalGold: 3, bossKills: boss ? 1 : 0, [`${stageId}BossDefeats`]: boss ? 1 : 0 },
  gold: 3, best: {}, missionCounters: {}, ...(at === undefined ? {} : { at }),
})
// Deterministic mixed ledger: legacy rows (no `at`), old rows, recent rows, boss and non-boss.
function mixedLedger(count) {
  const ledger = {}
  for (let i = 0; i < count; i++) {
    const stageId = `stage${(i % 4) + 1}`
    const at = i % 3 === 0 ? undefined : NOW - (count - i) * DAY / 4
    ledger[`run-${String(i).padStart(4, '0')}`] = row(stageId, i % 5 === 0, at)
  }
  return ledger
}
const projection = () => Object.fromEntries(BOSS_KEYS.map(key => [key, readFirebasePlayerProgress().records[key]]))
const unlocks = () => STAGES.map(id => isStageUnlocked(id, readFirebasePlayerProgress().records))
// What a build that predates ledgerSummary derives: rows only.
const rowsOnlyCount = (ledger, key) => Object.values(ledger).filter(r => r.stageId === key.replace('BossDefeats', '') && r.records[key] >= 1).length
const seed = node => applyCloudProgressSnapshot({ progress: { records: {} }, ...node }, user)

function installRemote(initial) {
  let remote = structuredClone(initial)
  _setFirebaseProgressClientForTests({
    load: async () => structuredClone(remote),
    transaction: async (_path, mutate) => {
      const next = mutate(structuredClone(remote))
      if (next === undefined) return { committed: false }
      remote = structuredClone(next)
      return { committed: true, snapshot: { val: () => structuredClone(remote) } }
    },
  })
  return { get: () => remote, set: value => { remote = structuredClone(value) } }
}

beforeEach(() => { _resetFirebaseProgressForTests(); vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.invalid') })
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('layer 2 switch', () => {
  it('ships off', () => expect(RUN_LEDGER_COMPACTION_ENABLED).toBe(false))
  it('a save with the switch off never folds rows or writes a summary', async () => {
    const ledger = mixedLedger(80)
    seed({ runLedger: ledger })
    const remote = installRemote({ ...buildCloudProgressSnapshot(), runLedger: ledger })
    recordFirebaseRunCheckpoint('new', { stageId: 'stage1', records: { totalRuns: 1 }, best: {} })
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(Object.keys(remote.get().runLedger)).toHaveLength(81)
    expect(remote.get()).not.toHaveProperty('ledgerSummary')
  })
})

describe('layer 1: summary merge equals full rows', () => {
  it.each([0, 1, 25, 120, 450])('ledger of %i rows: projection and unlocks match after folding', count => {
    const ledger = mixedLedger(count)
    seed({ runLedger: ledger })
    const before = projection(), beforeUnlocks = unlocks()
    let node = { runLedger: ledger }
    for (let i = 0; i < 5; i++) node = compactRunLedgerNode(node, { now: NOW + 30 * DAY })
    seed(node)
    expect(projection()).toEqual(before)
    expect(unlocks()).toEqual(beforeUnlocks)
    if (count) expect(Object.keys(node.runLedger).length).toBeGreaterThan(0)
  })
  it('counts summary and pending rows without overlap, and a summary alone still unlocks', () => {
    seed({ runLedger: { r: row('stage2', true, NOW) }, ledgerSummary: { compactedBefore: NOW - DAY, runs: 4, bossDefeats: { stage1BossDefeats: 3, stage2BossDefeats: 1 } } })
    expect(projection()).toMatchObject({ stage1BossDefeats: 3, stage2BossDefeats: 2 })
    recordFirebaseRunCheckpoint('p', { stageId: 'stage1', records: { stage1BossDefeats: 1 }, best: {} })
    expect(projection().stage1BossDefeats).toBe(4)
    seed({ runLedger: {}, ledgerSummary: { compactedBefore: 1, runs: 1, bossDefeats: { stage3BossDefeats: 1 } } })
    expect(isStageUnlocked('stage4', readFirebasePlayerProgress().records)).toBe(true)
  })
  it('ignores malformed summary values instead of trusting them', () => {
    seed({ runLedger: {}, ledgerSummary: { compactedBefore: 'x', runs: -1, bossDefeats: { stage1BossDefeats: 0.5, stage2BossDefeats: '9', stage11BossDefeats: 9, junk: 4 } } })
    expect(Object.values(projection()).every(v => v === 0)).toBe(true)
  })
})

describe('layer 1: rows without `at`', () => {
  it('legacy rows keep counting, are re-sent unchanged, and new rows get `at`', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
    const legacy = { old: row('stage1', true) }
    seed({ runLedger: legacy })
    const remote = installRemote({ ...buildCloudProgressSnapshot(), runLedger: legacy })
    expect(projection().stage1BossDefeats).toBe(1)
    expect(recordFirebaseRunCheckpoint('old', { stageId: 'stage1', records: legacy.old.records, best: {} })).toBe(false)
    recordFirebaseRunCheckpoint('new', { stageId: 'stage2', records: { totalRuns: 1, stage2BossDefeats: 1 }, best: {} })
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(remote.get().runLedger.old).toEqual(legacy.old)
    expect(remote.get().runLedger.new.at).toBe(NOW)
    expect(projection()).toMatchObject({ stage1BossDefeats: 1, stage2BossDefeats: 1 })
  })
  it('keeps the first `at` on later checkpoints of the same run', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
    seed({})
    const remote = installRemote(buildCloudProgressSnapshot())
    recordFirebaseRunCheckpoint('r', { stageId: 'stage1', records: { totalKills: 1 }, best: {} })
    vi.setSystemTime(NOW + 60000)
    recordFirebaseRunCheckpoint('r', { stageId: 'stage1', records: { totalKills: 2 }, best: {} })
    await requestCloudProgressSave(user)
    vi.setSystemTime(NOW + 120000)
    recordFirebaseRunCheckpoint('r', { stageId: 'stage1', records: { totalKills: 3 }, best: {} })
    await requestCloudProgressSave(user)
    expect(remote.get().runLedger.r.at).toBe(NOW)
  })
  it('a slow clock never stamps a fresh run at or below the known watermark', () => {
    vi.useFakeTimers({ now: NOW - 30 * DAY, toFake: ['Date'] })
    seed({ runLedger: {}, ledgerSummary: { compactedBefore: NOW, runs: 1 } })
    recordFirebaseRunCheckpoint('fresh', { stageId: 'stage1', records: { totalRuns: 1 }, best: {} })
    expect(getFirebaseRunCheckpointState('fresh')).toBe('recorded')
  })
})

describe('layer 2: compaction', () => {
  it('is idempotent and never folds kept rows', () => {
    const ledger = mixedLedger(150)
    const once = compactRunLedgerNode({ runLedger: ledger }, { now: NOW + 30 * DAY, keepRunIds: ['run-0001'] })
    expect(compactRunLedgerNode(once, { now: NOW + 30 * DAY, keepRunIds: ['run-0001'] })).toBe(once)
    expect(once.runLedger).toHaveProperty('run-0001')
    expect(Object.keys(once.runLedger).length).toBeGreaterThanOrEqual(RUN_LEDGER_KEEP_NEWEST)
    expect(once.ledgerSummary.runs + Object.keys(once.runLedger).length).toBe(150)
  })
  it('keeps every row started inside the retention window', () => {
    const ledger = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`r${i}`, row('stage1', false, NOW - i * DAY / 10)]))
    const node = compactRunLedgerNode({ runLedger: ledger }, { now: NOW })
    expect(node).toEqual({ runLedger: ledger })
    const later = compactRunLedgerNode({ runLedger: ledger }, { now: NOW + 7 * DAY })
    expect(Object.keys(later.runLedger)).toHaveLength(RUN_LEDGER_KEEP_NEWEST)
    expect(later.ledgerSummary.compactedBefore).toBe(NOW - 2 * DAY)
  })
  it('folds at most RUN_LEDGER_FOLD_MAX rows per pass and legacy rows use now - retention', () => {
    const ledger = Object.fromEntries(Array.from({ length: 450 }, (_, i) => [`l${i}`, row('stage1', false)]))
    const node = compactRunLedgerNode({ runLedger: ledger }, { now: NOW })
    expect(node.ledgerSummary).toEqual({ compactedBefore: NOW - RUN_LEDGER_RETENTION_MS, runs: RUN_LEDGER_FOLD_MAX })
  })
  it('pins the newest boss row of every stage so rows-only builds keep each unlock', () => {
    const ledger = mixedLedger(450)
    let node = { runLedger: ledger }
    for (let i = 0; i < 5; i++) node = compactRunLedgerNode(node, { now: NOW + 30 * DAY })
    for (const key of BOSS_KEYS) {
      if (rowsOnlyCount(ledger, key)) expect(rowsOnlyCount(node.runLedger, key), key).toBeGreaterThanOrEqual(1)
    }
  })
  it('two tabs folding the same node in sequence never double count', () => {
    const ledger = mixedLedger(300)
    const total = BOSS_KEYS.map(key => rowsOnlyCount(ledger, key))
    const tabA = compactRunLedgerNode({ runLedger: ledger }, { now: NOW + 30 * DAY, keepRunIds: ['run-0010'] })
    // RTDB retries tab B's transaction against tab A's committed node.
    const tabB = compactRunLedgerNode(tabA, { now: NOW + 31 * DAY, keepRunIds: ['run-0020'] })
    const merged = BOSS_KEYS.map(key => (tabB.ledgerSummary.bossDefeats?.[key] ?? 0) + rowsOnlyCount(tabB.runLedger, key))
    expect(merged).toEqual(total)
    expect(tabB.ledgerSummary.runs + Object.keys(tabB.runLedger).length).toBe(300)
  })
  it('an enabled save folds in the same atomic write and the session does not double count', async () => {
    vi.useFakeTimers({ now: NOW + 30 * DAY, toFake: ['Date'] })
    const ledger = mixedLedger(120)
    seed({ runLedger: ledger })
    const before = projection()
    const remote = installRemote({ ...buildCloudProgressSnapshot(), runLedger: ledger })
    _setRunLedgerCompactionForTests(true)
    recordFirebaseRunCheckpoint('new', { stageId: 'stage1', records: { totalRuns: 1 }, best: {} })
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(remote.get().ledgerSummary.runs).toBeGreaterThan(0)
    expect(remote.get().runLedger).toHaveProperty('new')
    expect(projection()).toEqual(before)
    setCloudProgressUser(null); await hydrateCloudProgress(user)
    expect(projection()).toEqual(before)
  })
})

describe('re-sent folded runs', () => {
  async function savedThenFolded() {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
    seed({ progress: { goldTotal: 0, records: {} } })
    const remote = installRemote(buildCloudProgressSnapshot())
    recordFirebaseRunCheckpoint('r', { stageId: 'stage1', records: { totalRuns: 1, totalGold: 7, stage1BossDefeats: 1 }, best: {} })
    expect(await requestCloudProgressSave(user)).toBe(true)
    // Another tab folds the row: totals stay in progress, the row moves into the summary.
    const node = remote.get()
    const { r, ...rest } = node.runLedger
    remote.set({ ...node, runLedger: { ...rest, keep: row('stage5', false, NOW + DAY) }, ledgerSummary: { compactedBefore: r.at, runs: 1, bossDefeats: { stage1BossDefeats: 1 } } })
    return remote
  }
  it('a replay after re-hydration adds nothing and reports acknowledged', async () => {
    const remote = await savedThenFolded()
    setCloudProgressUser(null); await hydrateCloudProgress(user)
    expect(getFirebaseRunCheckpointState('r')).toBe('acknowledged')
    expect(recordFirebaseRunCheckpoint('r', { stageId: 'stage1', records: { totalRuns: 1, totalGold: 7, stage1BossDefeats: 1 }, best: {} })).toBe(false)
    await requestCloudProgressSave(user)
    expect(remote.get().progress).toMatchObject({ goldTotal: 7, records: { totalRuns: 1 } })
    expect(remote.get().runLedger).not.toHaveProperty('r')
    expect(projection().stage1BossDefeats).toBe(1)
  })
  it('a run folded mid-session is skipped by the transaction and the local copy matches the server', async () => {
    const remote = await savedThenFolded()
    recordFirebaseRunCheckpoint('r', { stageId: 'stage1', records: { totalRuns: 1, totalGold: 9, stage1BossDefeats: 1 }, best: {} })
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(remote.get().progress).toMatchObject({ goldTotal: 7, records: { totalRuns: 1 } })
    expect(remote.get().runLedger).not.toHaveProperty('r')
    expect(readFirebasePlayerProgress().goldTotal).toBe(7)
    expect(projection().stage1BossDefeats).toBe(1)
    expect(getFirebaseRunCheckpointState('r')).toBe('acknowledged')
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(remote.get().progress.goldTotal).toBe(7)
  })
})

// String-expression evaluation of the real rule text, not a Firebase emulator (none in this repo).
describe('ledgerSummary rules', () => {
  const rules = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../database.rules.json'), 'utf8')).rules.users.$uid
  const snap = value => ({
    val: () => value,
    exists: () => value !== undefined && value !== null,
    isNumber: () => typeof value === 'number' && Number.isFinite(value),
    child: key => snap(value?.[key]),
    hasChildren: keys => keys.every(key => value?.[key] !== undefined && value?.[key] !== null),
  })
  const run = (expr, next, old, key) => new Function('newData', 'data', '$key', `return (${expr})`)(snap(next), snap(old), { matches: re => re.test(key) })
  const base = { schemaVersion: 1, updatedAt: 'x', profile: {}, progress: {} }
  const summary = { compactedBefore: 5, runs: 2, bossDefeats: { stage1BossDefeats: 1 } }

  it('lets rows fold away only when a summary exists, and never drops the summary', () => {
    const v = rules['.validate']
    expect(run(v, { ...base, runLedger: { a: 1 } }, { ...base, runLedger: { a: 1 } })).toBe(true)
    expect(run(v, base, { ...base, runLedger: { a: 1 } })).toBe(false)
    expect(run(v, { ...base, ledgerSummary: summary }, { ...base, runLedger: { a: 1 } })).toBe(true)
    expect(run(v, { ...base, runLedger: { a: 1 } }, { ...base, runLedger: { a: 1 }, ledgerSummary: summary })).toBe(false)
    // An old build rewrites the node it read, summary included: still valid.
    expect(run(v, { ...base, runLedger: { a: 1, b: 1 }, ledgerSummary: summary }, { ...base, runLedger: { a: 1 }, ledgerSummary: summary })).toBe(true)
  })
  it('accepts `at` as an optional positive number on run rows', () => {
    const run$ = rules.runLedger.$run
    expect(run$['.validate']).toBe("newData.hasChildren(['stageId','records','gold','best'])")
    for (const [value, ok] of [[NOW, true], [NOW + 365 * DAY, true], [1, true], [0, false], [-1, false], ['1', false], [null, false]]) {
      expect(run(run$.at['.validate'], value), String(value)).toBe(ok)
    }
  })
  it('keeps every summary field monotonic and every boss key present', () => {
    const s = rules.ledgerSummary
    expect(run(s['.validate'], summary, undefined)).toBe(true)
    expect(run(s['.validate'], { runs: 1 }, undefined)).toBe(false)
    expect(run(s['.validate'], { ...summary, bossDefeats: {} }, summary)).toBe(false)
    expect(run(s.compactedBefore['.validate'], 4, 5)).toBe(false)
    expect(run(s.compactedBefore['.validate'], 6, 5)).toBe(true)
    expect(run(s.runs['.validate'], 1, 2)).toBe(false)
    expect(run(s.runs['.validate'], 2.5, 2)).toBe(false)
    const boss = s.bossDefeats.$key['.validate']
    expect(run(boss, 2, 1, 'stage10BossDefeats')).toBe(true)
    expect(run(boss, 0, 1, 'stage1BossDefeats')).toBe(false)
    expect(run(boss, 1, undefined, 'stage11BossDefeats')).toBe(false)
    expect(run(boss, 1, undefined, 'bossKills')).toBe(false)
    expect(s.$other['.validate']).toBe(false)
  })
})
