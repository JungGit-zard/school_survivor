// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  commitFirebaseStageResult,
  flushCloudProgressBeforeSignOut,
  hydrateCloudProgress,
  readFirebasePlayerProgress,
  recordFirebaseProgressPurchase,
  requestCloudProgressSave,
  updateFirebasePlayerProgress,
  writeFirebasePlayerConsent,
  recordPlayActivity,
} from './firebaseProgress.js'
import { _resetStageSlotForTests, openStageSlot, readStoredStageSlot, setStageSlotTotals, addStageSlotMissionChanges, flushStageSlot, STAGE_SLOT_MAX_BYTES } from './stageSlot.js'
import { createFakeProgressDatabase } from '../../test/fakeProgressDatabase.js'

const ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://example-rtdb.firebaseio.com',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}
const UID = 'owner'
const user = { uid: UID, displayName: 'Owner' }

function bigHistoryNode() {
  const records = { totalRuns: 108, totalKills: 5000, totalGold: 900, totalSurvivalSeconds: 9000, bestSurvivalSeconds: 300, stage1Clears: 3 }
  const checkpointLedger = {}
  for (let i = 0; i < 61; i++) checkpointLedger[`session-${i}`] = { gold: i, sequence: i + 1, records: { totalKills: i }, missionCounters: { 'kills%2Etotal': i } }
  const runLedger = {}
  for (let i = 0; i < 108; i++) runLedger[`run-${i}`] = { stageId: 'stage1', records: { totalRuns: 1, bossKills: i === 7 ? 1 : 0, stage1BossDefeats: i === 7 ? 1 : 0 }, best: { bestSurvivalSeconds: 10 }, gold: 1, at: 1000 + i }
  return {
    schemaVersion: 1,
    updatedAt: '2026-11-18T00:00:00.000Z',
    profile: { uid: UID, displayName: 'Owner', nickname: 'Terry' },
    progress: {
      checkpointRevision: 5,
      goldTotal: 500,
      records,
      titleSettings: { vibration: true, reducedEffects: false, unlockAllWeaponsCheat: false, unlockAllStagesCheat: false },
      missions: { schemaVersion: 1, catalogVersion: 'missions_2026_08_15_v1', updatedAt: '', counters: { 'kills%2Etotal': 40 } },
      passiveUpgrades: { might: 1 },
    },
    checkpointLedger,
    runLedger,
    ledgerSummary: { compactedBefore: 0, runs: 0, bossDefeats: { stage2BossDefeats: 1 } },
  }
}

let db
beforeEach(async () => {
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value)
  _resetFirebaseProgressForTests()
  _resetStageSlotForTests()
  localStorage.clear()
  db = createFakeProgressDatabase({ users: { [UID]: bigHistoryNode() } })
  _setFirebaseProgressClientForTests(db)
})
afterEach(() => vi.unstubAllEnvs())

const historyPaths = (paths) => paths.filter(path => /checkpointLedger|runLedger\/run-|ledgerSummary/.test(path))

describe('saves never touch history', () => {
  it('hydrates without downloading checkpointLedger or the whole user node', async () => {
    await hydrateCloudProgress(user)
    expect(db.reads).not.toContain(`users/${UID}`)
    expect(db.reads.some(path => path.includes('checkpointLedger'))).toBe(false)
    // Boss proof from runLedger rows and ledgerSummary still unlocks stages.
    const records = readFirebasePlayerProgress().records
    expect(records.stage1BossDefeats).toBe(1)
    expect(records.stage2BossDefeats).toBe(1)
  })

  it('a save with a large history writes only users/{uid}/progress and small top-level leaves, valid under the rules', async () => {
    await hydrateCloudProgress(user)
    const before = db.get(`users/${UID}`)
    db.reads.length = 0
    db.writes.length = 0
    updateFirebasePlayerProgress(progress => { progress.titleSettings.vibration = false })
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(db.reads).toEqual([`users/${UID}/progress`])
    for (const write of db.writes) {
      expect(write.path === `users/${UID}/progress` || write.kind === 'update').toBe(true)
      expect(JSON.stringify(write).includes('checkpointLedger')).toBe(false)
      expect(JSON.stringify(write).includes('runLedger')).toBe(false)
    }
    const after = db.get(`users/${UID}`)
    expect(after.checkpointLedger).toEqual(before.checkpointLedger)
    expect(after.runLedger).toEqual(before.runLedger)
    expect(after.progress.checkpointRevision).toBeGreaterThan(before.progress.checkpointRevision)
    expect(after.progress.titleSettings.vibration).toBe(false)
  })

  it('a stage result is written once (one row + increments) and never re-sent', async () => {
    await hydrateCloudProgress(user)
    db.writes.length = 0
    const stage = { runKey: 'run-new', stageId: 'stage1', at: 5000, records: { totalRuns: 1, totalKills: 30, totalGold: 12, stage1Clears: 1, stage1BossDefeats: 1, bossKills: 1 }, best: { bestSurvivalSeconds: 200 }, gold: 12, goldSpent: 2, missionCounters: { 'kills.total': 30 } }
    expect(await commitFirebaseStageResult(stage, user)).toBe(true)
    expect(await commitFirebaseStageResult(stage, user)).toBe(false)
    await requestCloudProgressSave(user)
    const rowWrites = db.writes.filter(write => JSON.stringify(write).includes('runLedger/run-new'))
    expect(rowWrites).toHaveLength(1)
    expect(historyPaths(db.writes.flatMap(write => Object.keys(write.values ?? {}))).filter(path => path !== 'runLedger/run-new')).toEqual([])
    const node = db.get(`users/${UID}`)
    expect(node.progress.goldTotal).toBe(510)
    expect(node.progress.records.totalKills).toBe(5030)
    expect(node.progress.records.totalRuns).toBe(109)
    expect(node.progress.records.bestSurvivalSeconds).toBe(300)
    expect(node.progress.missions.counters['kills%2Etotal']).toBe(70)
    expect(Object.keys(node.runLedger)).toHaveLength(109)
    expect(readFirebasePlayerProgress().goldTotal).toBe(510)
    expect(await flushCloudProgressBeforeSignOut(user)).toBe(true)
    expect(db.get(`users/${UID}`).progress.goldTotal).toBe(510)
  })

  it('a purchase saves through the progress transaction only', async () => {
    await hydrateCloudProgress(user)
    db.writes.length = 0
    updateFirebasePlayerProgress(progress => { progress.goldTotal -= 100; progress.passiveUpgrades.might = 2 })
    recordFirebaseProgressPurchase({ category: 'passiveUpgrades', id: 'might', price: 100, nextLevel: 2 })
    expect(await requestCloudProgressSave(user)).toBe(true)
    const node = db.get(`users/${UID}`)
    expect(node.progress.goldTotal).toBe(400)
    expect(node.progress.passiveUpgrades.might).toBe(2)
    expect(db.writes.every(write => !JSON.stringify(write).includes('Ledger'))).toBe(true)
  })
})

describe('top-level leaves', () => {
  it('consent and activity save as small users/{uid} children, valid under the rules', async () => {
    await hydrateCloudProgress(user)
    db.writes.length = 0
    writeFirebasePlayerConsent({ terms: { version: 1, acceptedAt: '2026-11-19T00:00:00.000Z' }, privacy: { version: 1, acceptedAt: '2026-11-19T00:00:00.000Z' } })
    recordPlayActivity('stage1')
    expect(await requestCloudProgressSave(user)).toBe(true)
    const node = db.get(`users/${UID}`)
    expect(node.consent.terms.version).toBe(1)
    expect(node.activity.lastStageId).toBe('stage1')
    expect(db.writes.every(write => write.kind === 'update' && !Object.keys(write.values).some(key => /Ledger|progress/.test(key)))).toBe(true)
  })
})

describe('one-stage device record', () => {
  it('a leftover stage from a closed tab is applied exactly once at sign-in, then deleted', async () => {
    openStageSlot({ uid: UID, runId: 'run-left', stageId: 'stage1', at: 7000 })
    setStageSlotTotals({ records: { totalRuns: 1, totalKills: 9, totalGold: 4 }, best: { bestSurvivalSeconds: 50 }, gold: 4 })
    addStageSlotMissionChanges([{ key: 'kills.total', value: 9, mode: 'add' }])
    flushStageSlot() // pagehide
    _resetStageSlotForTests() // the tab closed: memory is gone, the device copy stays
    expect(readStoredStageSlot(UID)?.runKey).toBe('run-left')
    await hydrateCloudProgress(user)
    await requestCloudProgressSave(user)
    expect(readStoredStageSlot(UID)).toBeNull()
    expect(db.get(`users/${UID}`).progress.goldTotal).toBe(504)
    expect(db.get(`users/${UID}/runLedger/run-left`)).toBeTruthy()

    // Same record found again (e.g. restored storage) is ignored: the server row is the receipt.
    localStorage.setItem(`school_survivor:stageSlot:${UID}`, JSON.stringify({ v: 1, uid: UID, runKey: 'run-left', stageId: 'stage1', at: 7000, records: { totalGold: 4 }, best: {}, gold: 4, goldSpent: 0, missionCounters: {} }))
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    expect(db.get(`users/${UID}`).progress.goldTotal).toBe(504)
    expect(readStoredStageSlot(UID)).toBeNull()
  })

  it('holds one slot per account and stays small', () => {
    openStageSlot({ uid: UID, runId: 'a', stageId: 'stage1' })
    openStageSlot({ uid: UID, runId: 'b', stageId: 'stage2' })
    const keys = Object.keys(localStorage).filter(key => key.startsWith('school_survivor:stageSlot:'))
    expect(keys).toEqual([`school_survivor:stageSlot:${UID}`])
    expect(readStoredStageSlot(UID).runKey).toBe('b')
    addStageSlotMissionChanges(Array.from({ length: 500 }, (_, i) => ({ key: `k${i}`, value: 1, mode: 'add' })))
    _resetStageSlotForTests()
    expect(localStorage.getItem(`school_survivor:stageSlot:${UID}`).length).toBeLessThanOrEqual(STAGE_SLOT_MAX_BYTES)
  })

  it('keeps playing when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => {
      openStageSlot({ uid: UID, runId: 'c', stageId: 'stage1' })
      setStageSlotTotals({ records: { totalRuns: 1 }, best: {}, gold: 1 })
    }).not.toThrow()
    spy.mockRestore()
  })
})
