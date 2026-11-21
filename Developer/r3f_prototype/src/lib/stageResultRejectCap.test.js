// @vitest-environment jsdom
// Terry 2026-11-21: a stage result the server refuses is retried, but at most 3 attempts per run id.
// After the 3rd refusal the run is given up (device copy removed, warning stops, sign-out allowed).
// Offline waits never count, and the count survives a reload inside the result's own device record.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  commitFirebaseStageResult,
  consumeFirebaseProgressSaveWarning,
  flushCloudProgressBeforeSignOut,
  hydrateCloudProgress,
  readFirebasePlayerProgress,
  requestCloudProgressSave,
} from './firebaseProgress.js'
import {
  _resetStageSlotForTests,
  closeLiveStageSlot,
  listPendingStageResults,
  openStageSlot,
  readPendingStageResult,
  readStoredStageSlot,
  setStageSlotTotals,
} from './stageSlot.js'
import { createControllableProgressDatabase, TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'

const UID = 'reject-cap-owner'
const user = { uid: UID, displayName: 'Owner' }

function userNode() {
  return {
    schemaVersion: 1,
    updatedAt: '2026-11-21T00:00:00.000Z',
    profile: { uid: UID, displayName: 'Owner', nickname: 'Terry' },
    progress: {
      checkpointRevision: 3,
      goldTotal: 100,
      weaponUnlockSchemaVersion: 2,
      records: { totalRuns: 5, totalKills: 50, totalGold: 100, bossKills: 0 },
      titleSettings: { vibration: true, reducedEffects: false, unlockAllWeaponsCheat: false, unlockAllStagesCheat: false },
    },
    ledgerSummary: { compactedBefore: 1, runs: 5, bossDefeats: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`stage${i + 1}BossDefeats`, 0])) },
  }
}

// The server refuses the stage-result write `refusals` times (Infinity = always), like a rule that
// will never accept this row. Every stage-result attempt is counted.
function refusingDatabase(refusals) {
  const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
  const update = db.update
  db.stageAttempts = 0
  db.update = async (path, values) => {
    if (values['progress/resultWrites']) {
      db.stageAttempts += 1
      if (!db.control.offline && db.stageAttempts - db.offlineAttempts <= refusals) {
        throw Object.assign(new Error('PERMISSION_DENIED: Permission denied'), { code: 'PERMISSION_DENIED' })
      }
    }
    return update(path, values)
  }
  db.offlineAttempts = 0
  const offlineAware = db.update
  db.update = async (path, values) => {
    if (db.control.offline && values['progress/resultWrites']) db.offlineAttempts += 1
    return offlineAware(path, values)
  }
  return db
}

function endStage(runId = 'run-x', gold = 25) {
  openStageSlot({ uid: UID, runId, stageId: 'stage1', at: 1_700_000_000_000 })
  setStageSlotTotals({ records: { totalRuns: 1, totalGold: gold }, best: { bestSurvivalSeconds: 60 }, gold })
  return closeLiveStageSlot(runId)
}

beforeEach(() => {
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  _resetFirebaseProgressForTests()
  _resetStageSlotForTests()
  localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('stage result: at most 3 server refusals per run', () => {
  it('refused 3 times: the run is given up, its device copy goes, the warning stops and sign-out is allowed', async () => {
    const db = refusingDatabase(Infinity)
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    expect(await commitFirebaseStageResult(endStage(), user)).toBe(false)
    expect(db.stageAttempts).toBe(2) // the stage end and its follow-up save
    expect(readPendingStageResult(UID, 'run-x').rejects).toBe(2)
    expect(await requestCloudProgressSave(user)).toBe(true) // 3rd refusal: given up
    expect(db.stageAttempts).toBe(3)
    expect(listPendingStageResults(UID)).toEqual([])
    expect(readStoredStageSlot(UID)).toBeNull()
    expect(localStorage.length).toBe(0)
    expect(consumeFirebaseProgressSaveWarning()).toBeNull()
    expect(await flushCloudProgressBeforeSignOut(user)).toBe(true)
    // Never tried again, never sent through another write.
    await requestCloudProgressSave(user)
    expect(db.stageAttempts).toBe(3)
    const node = db.get(`users/${UID}`)
    expect(node.runLedger).toBeUndefined()
    expect(node.progress.goldTotal).toBe(100)
    expect(node.progress.records.totalRuns).toBe(5)
    expect(readFirebasePlayerProgress().goldTotal).toBe(100)
  })

  it('refused twice, then accepted: written exactly once', async () => {
    const db = refusingDatabase(2)
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    expect(await commitFirebaseStageResult(endStage(), user)).toBe(false)
    expect(readPendingStageResult(UID, 'run-x').rejects).toBe(2)
    expect(await requestCloudProgressSave(user)).toBe(true)
    await requestCloudProgressSave(user)
    expect(db.stageAttempts).toBe(3)
    const node = db.get(`users/${UID}`)
    expect(Object.keys(node.runLedger)).toEqual(['run-x'])
    expect(node.progress.goldTotal).toBe(125)
    expect(node.progress.records.totalRuns).toBe(6)
    expect(node.progress.resultWrites).toBe(1)
    expect(listPendingStageResults(UID)).toEqual([])
    expect(localStorage.length).toBe(0)
  })

  it('offline attempts do not count: after many offline tries the result still lands once', async () => {
    const db = refusingDatabase(0)
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    db.control.offline = true
    expect(await commitFirebaseStageResult(endStage(), user)).toBe(false)
    for (let i = 0; i < 4; i++) expect(await requestCloudProgressSave(user)).toBe(false)
    expect(db.offlineAttempts).toBeGreaterThanOrEqual(3)
    expect(readPendingStageResult(UID, 'run-x').rejects).toBeUndefined()
    db.control.offline = false
    expect(await requestCloudProgressSave(user)).toBe(true)
    const node = db.get(`users/${UID}`)
    expect(Object.keys(node.runLedger)).toEqual(['run-x'])
    expect(node.progress.goldTotal).toBe(125)
    expect(node.progress.resultWrites).toBe(1)
    expect(localStorage.length).toBe(0)
  })

  it('a write still waiting in the SDK (offline, not refused) does not count either', async () => {
    const db = refusingDatabase(0)
    db.control.holdWrites = true
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    const committing = commitFirebaseStageResult(endStage(), user)
    await vi.waitFor(() => expect(db.control.heldWrites.length).toBe(1))
    expect(readPendingStageResult(UID, 'run-x').rejects).toBeUndefined()
    db.control.holdWrites = false
    while (db.releaseWrite()) await Promise.resolve()
    expect(await committing).toBe(true)
    expect(db.get(`users/${UID}/progress/resultWrites`)).toBe(1)
  })

  it('the count survives a reload: 2 refusals before, 1 after reload gives the run up', async () => {
    const db = refusingDatabase(Infinity)
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    await commitFirebaseStageResult(endStage(), user)
    expect(db.stageAttempts).toBe(2)
    const stored = readPendingStageResult(UID, 'run-x')
    expect(stored.rejects).toBe(2)
    // Still one stage's worth: one record holds the result and its count.
    expect(listPendingStageResults(UID)).toHaveLength(1)
    expect(JSON.stringify(stored).length).toBeLessThanOrEqual(4096)

    // The tab reloads; the next sign-in sends the left-over result once more.
    _resetStageSlotForTests()
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    expect(await requestCloudProgressSave(user)).toBe(true)
    expect(db.stageAttempts).toBe(3)
    expect(localStorage.length).toBe(0)
    expect(consumeFirebaseProgressSaveWarning()).toBeNull()
    expect(await flushCloudProgressBeforeSignOut(user)).toBe(true)
    expect(db.get(`users/${UID}/runLedger`)).toBeUndefined()

    // A further reload finds nothing to send.
    _resetStageSlotForTests()
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    await requestCloudProgressSave(user)
    expect(db.stageAttempts).toBe(3)
  })
})
