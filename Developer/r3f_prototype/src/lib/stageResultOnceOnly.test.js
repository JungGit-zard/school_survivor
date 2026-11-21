// @vitest-environment jsdom
// Cloud-save fix 2026-11-21 (Terry: "중복은 어떤 경우라도 막는다", no data loss, nothing uploaded during play).
// All writes go through the rules-faithful fake (test/fakeProgressDatabase.js), which checks every write
// against database.rules.json. Rules cases run twice: once skipping unchanged children and once validating
// them too, because the server's handling of unchanged children inside a bigger write is not documented.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  commitFirebaseStageResult,
  hydrateCloudProgress,
  readFirebasePlayerProgress,
  requestCloudProgressSave,
  updateFirebasePlayerProgress,
} from './firebaseProgress.js'
import {
  _resetStageSlotForTests,
  closeLiveStageSlot,
  flushStageSlot,
  listPendingStageResults,
  openStageSlot,
  readStoredStageSlot,
  setStageSlotTotals,
} from './stageSlot.js'
import { createFakeProgressDatabase } from '../../test/fakeProgressDatabase.js'
import { createControllableProgressDatabase, TEST_FIREBASE_ENV } from '../../test/controllableProgressDatabase.js'
import { isStageUnlocked } from './stageConfig.js'

const UID = 'once-only-owner'
const user = { uid: UID, displayName: 'Owner' }

function userNode(extra = {}) {
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
    // A migrated account (complete summary): stage results bump bossDefeats in their one write.
    ledgerSummary: { compactedBefore: 1, runs: 5, bossDefeats: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`stage${i + 1}BossDefeats`, 0])) },
    ...extra,
  }
}

const row = (gold = 25, extra = {}) => ({ stageId: 'stage1', records: { totalRuns: 1, totalGold: gold, bossKills: 1, stage1BossDefeats: 1 }, best: { bestSurvivalSeconds: 60 }, gold, at: 1_700_000_000_000, ...extra })
// The new client's stage-end write shape.
const stageWrite = (db, runKey, gold = 25) => ({
  [`runLedger/${runKey}`]: row(gold),
  'progress/checkpointRevision': db.increment(1),
  'progress/resultWrites': db.increment(1),
  'progress/lastResultKey': runKey,
  'progress/goldTotal': db.increment(gold),
  'progress/records/totalRuns': db.increment(1),
  'ledgerSummary/bossDefeats/stage1BossDefeats': db.increment(1),
  updatedAt: '2026-11-21T01:00:00.000Z',
})

beforeEach(() => {
  for (const [key, value] of Object.entries(TEST_FIREBASE_ENV)) vi.stubEnv(key, value)
  _resetFirebaseProgressForTests()
  _resetStageSlotForTests()
  localStorage.clear()
})
afterEach(() => vi.unstubAllEnvs())

describe.each([
  ['unchanged children skipped', false],
  ['unchanged children validated', true],
])('rules: a run row is written once (%s)', (_label, validateUnchanged) => {
  const fresh = () => createFakeProgressDatabase({ users: { [UID]: userNode() } }, { validateUnchanged })

  it('accepts a new row with its increments, then rejects an identical resend as a whole', async () => {
    const db = fresh()
    await db.update(`users/${UID}`, stageWrite(db, 'run-a'))
    const after = db.get(`users/${UID}`)
    expect(after.progress.goldTotal).toBe(125)
    expect(after.progress.resultWrites).toBe(1)
    // SDK resend after a lost ACK: byte-identical update.
    await expect(db.update(`users/${UID}`, stageWrite(db, 'run-a'))).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    expect(db.get(`users/${UID}`)).toEqual(after)
  })

  it('rejects a second tab sending the same run with other numbers (the 25 -> 35 gold, totalRuns 2 report)', async () => {
    const db = fresh()
    await db.update(`users/${UID}`, stageWrite(db, 'run-a', 10)) // tab B: partial copy
    const after = db.get(`users/${UID}`)
    await expect(db.update(`users/${UID}`, stageWrite(db, 'run-a', 25))).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    expect(db.get(`users/${UID}`)).toEqual(after)
    expect(after.progress.goldTotal).toBe(110)
    expect(after.progress.records.totalRuns).toBe(6)
    expect(after.ledgerSummary.bossDefeats.stage1BossDefeats).toBe(1)
  })

  it('rejects a changed row even without the resultWrites field, and a resultWrites bump that names an existing row', async () => {
    const db = fresh()
    await db.update(`users/${UID}`, stageWrite(db, 'run-a'))
    await expect(db.update(`users/${UID}`, { 'runLedger/run-a/gold': 99, updatedAt: 'x' })).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    await expect(db.update(`users/${UID}`, { 'runLedger/run-a/records/totalKills': 5, updatedAt: 'x' })).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    await expect(db.update(`users/${UID}`, {
      'progress/checkpointRevision': db.increment(1),
      'progress/resultWrites': db.increment(1),
      'progress/lastResultKey': 'run-a',
      'progress/goldTotal': db.increment(25),
      updatedAt: 'x',
    })).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
    expect(db.get(`users/${UID}/progress/goldTotal`)).toBe(125)
  })

  it('keeps old live clients working: the 3984b1b4/aebd62f0 stage write shape still lands for a new row', async () => {
    const db = fresh()
    await db.update(`users/${UID}`, {
      'runLedger/old-run': row(7),
      'progress/checkpointRevision': db.increment(1),
      'progress/goldTotal': db.increment(7),
      'progress/records/totalRuns': db.increment(1),
      updatedAt: 'x',
    })
    expect(db.get(`users/${UID}/progress/goldTotal`)).toBe(107)
  })

  it('keeps old live clients working: a whole-node transaction that rewrites existing rows unchanged is accepted', async () => {
    const db = fresh()
    await db.update(`users/${UID}`, stageWrite(db, 'run-a'))
    // Pre-3984b1b4 client: transaction on users/{uid}, copies every row as is, changes its own progress.
    await db.transaction(`users/${UID}`, current => ({
      ...current,
      progress: { ...current.progress, checkpointRevision: current.progress.checkpointRevision + 1, goldTotal: current.progress.goldTotal - 5, passiveUpgrades: { might: 1 } },
      runLedger: { ...current.runLedger, 'old-new-run': row(3) },
      checkpointLedger: { 'session-x': { gold: -5, records: { totalKills: 0 }, sequence: 1 } },
      updatedAt: 'y',
    }))
    const after = db.get(`users/${UID}`)
    expect(after.runLedger['run-a']).toEqual(row(25))
    expect(after.progress.goldTotal).toBe(120)
    expect(after.progress.resultWrites).toBe(1)
    // ...but not one that changes an existing row.
    await expect(db.transaction(`users/${UID}`, current => ({
      ...current,
      progress: { ...current.progress, checkpointRevision: current.progress.checkpointRevision + 1 },
      runLedger: { ...current.runLedger, 'run-a': row(30) },
      updatedAt: 'z',
    }))).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
  })
})

describe('client: duplicates are never counted, results are never lost', () => {
  it('two tabs: B signing in never takes over A\'s live stage; A\'s final result is counted once (25 gold, one run)', async () => {
    const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    // Tab A is playing: 10 gold so far, mirrored to the device.
    openStageSlot({ uid: UID, runId: 'run-a', stageId: 'stage1', at: 1_700_000_000_000 })
    setStageSlotTotals({ records: { totalRuns: 1, totalGold: 10 }, best: { bestSurvivalSeconds: 30 }, gold: 10 })
    flushStageSlot()

    // Tab B: a second instance of the progress code on the same device (same storage, same Web Locks).
    vi.resetModules()
    const tabB = await import('./firebaseProgress.js')
    tabB._resetFirebaseProgressForTests()
    tabB._setFirebaseProgressClientForTests(db)
    await tabB.hydrateCloudProgress(user)
    await tabB.requestCloudProgressSave(user)
    expect(db.get(`users/${UID}/runLedger/run-a`)).toBeUndefined()

    // Tab A ends the stage with 25 gold.
    setStageSlotTotals({ records: { totalRuns: 1, totalGold: 25 }, best: { bestSurvivalSeconds: 60 }, gold: 25 })
    expect(await commitFirebaseStageResult(closeLiveStageSlot('run-a'), user)).toBe(true)
    await tabB.requestCloudProgressSave(user)
    const node = db.get(`users/${UID}`)
    expect(node.progress.goldTotal).toBe(125)
    expect(node.progress.records.totalRuns).toBe(6)
    expect(Object.keys(node.runLedger)).toEqual(['run-a'])
    expect(localStorage.length).toBe(0)
  })

  it('two tabs without Web Locks: even when B takes a stale slot, A\'s second copy is rejected by the server (no double reward)', async () => {
    const locks = Object.getOwnPropertyDescriptor(navigator, 'locks')
    delete navigator.locks
    try {
      const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
      _setFirebaseProgressClientForTests(db)
      await hydrateCloudProgress(user)
      openStageSlot({ uid: UID, runId: 'run-a', stageId: 'stage1', at: 1_700_000_000_000 })
      setStageSlotTotals({ records: { totalRuns: 1, totalGold: 10 }, best: { bestSurvivalSeconds: 30 }, gold: 10 })
      flushStageSlot()
      // A sat in the background for a minute (no heartbeat), so B treats the slot as left behind.
      const stale = { ...readStoredStageSlot(UID), savedAt: Date.now() - 60_000 }
      localStorage.setItem(`school_survivor:stageSlot:${UID}`, JSON.stringify(stale))
      vi.resetModules()
      const tabB = await import('./firebaseProgress.js')
      tabB._resetFirebaseProgressForTests()
      tabB._setFirebaseProgressClientForTests(db)
      await tabB.hydrateCloudProgress(user)
      await tabB.requestCloudProgressSave(user)
      expect(db.get(`users/${UID}/runLedger/run-a/gold`)).toBe(10)

      setStageSlotTotals({ records: { totalRuns: 1, totalGold: 25 }, best: { bestSurvivalSeconds: 60 }, gold: 25 })
      await commitFirebaseStageResult(closeLiveStageSlot('run-a'), user)
      await requestCloudProgressSave(user)
      const node = db.get(`users/${UID}`)
      expect(node.progress.goldTotal).toBe(110)
      expect(node.progress.records.totalRuns).toBe(6)
      expect(node.progress.resultWrites).toBe(1)
      expect(listPendingStageResults(UID)).toEqual([])
    } finally {
      Object.defineProperty(navigator, 'locks', locks)
    }
  })

  it('an SDK resend after a lost ACK is rejected by the server; the client then confirms its row once', async () => {
    const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
    const update = db.update
    let lostAck = true
    db.update = async (path, values) => {
      await update(path, values)
      if (lostAck && values['progress/resultWrites']) {
        lostAck = false
        // The SDK re-sends the same write after reconnecting, then the client sees the first failure.
        await expect(update(path, values)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' })
        throw Object.assign(new Error('disconnected'), { code: 'disconnected' })
      }
    }
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    expect(await commitFirebaseStageResult({ runKey: 'run-a', stageId: 'stage1', at: 1_700_000_000_000, records: { totalRuns: 1, totalGold: 25 }, best: {}, gold: 25 }, user)).toBe(true)
    expect(db.get(`users/${UID}/progress/goldTotal`)).toBe(125)
    expect(db.get(`users/${UID}/progress/records/totalRuns`)).toBe(6)
    expect(readFirebasePlayerProgress().goldTotal).toBe(125)
    expect(listPendingStageResults(UID)).toEqual([])
  })

  it('a result refused by the server (a lower best record than another tab\'s) is resent alone and keeps the boss unlock after reload', async () => {
    const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    // Another tab already saved a better best record than this tab knows about.
    db.root.users[UID].progress.records.bestSurvivalSeconds = 500
    expect(await commitFirebaseStageResult({ runKey: 'boss-run', stageId: 'stage1', at: 1_700_000_000_000, records: { totalRuns: 1, bossKills: 1, stage1BossDefeats: 1, totalGold: 5 }, best: { bestSurvivalSeconds: 90 }, gold: 5 }, user)).toBe(true)
    const node = db.get(`users/${UID}`)
    expect(node.runLedger['boss-run'].records.stage1BossDefeats).toBe(1)
    expect(node.ledgerSummary.bossDefeats.stage1BossDefeats).toBe(1)
    expect(node.progress.records.bestSurvivalSeconds).toBe(500)
    expect(node.progress.goldTotal).toBe(105)
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(true)
  })

  it('offline stages in a row lose nothing: a finished but unconfirmed stage survives the next stage start and a closed tab', async () => {
    const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    db.control.offline = true
    // Stage 1 ends offline (boss beaten, 12 gold).
    openStageSlot({ uid: UID, runId: 'stage-one', stageId: 'stage1', at: 1_700_000_000_000 })
    setStageSlotTotals({ records: { totalRuns: 1, totalGold: 12, bossKills: 1, stage1BossDefeats: 1 }, best: { bestSurvivalSeconds: 100 }, gold: 12 })
    expect(await commitFirebaseStageResult(closeLiveStageSlot('stage-one'), user)).toBe(false)
    // Stage 2 starts (still offline) and is played: 8 gold so far. Only one stage is in play.
    openStageSlot({ uid: UID, runId: 'stage-two', stageId: 'stage2', at: 1_700_000_100_000 })
    setStageSlotTotals({ records: { totalRuns: 1, totalGold: 8 }, best: { bestSurvivalSeconds: 40 }, gold: 8 })
    flushStageSlot()
    expect(readStoredStageSlot(UID).runKey).toBe('stage-two')
    expect(listPendingStageResults(UID).map(entry => entry.runKey)).toEqual(['stage-one'])
    expect(db.writes).toEqual([])
    // The tab closes; later the network is back and the player signs in again.
    _resetStageSlotForTests()
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    db.control.offline = false
    await hydrateCloudProgress(user)
    await requestCloudProgressSave(user)
    const node = db.get(`users/${UID}`)
    expect(Object.keys(node.runLedger).sort()).toEqual(['stage-one', 'stage-two'])
    expect(node.progress.goldTotal).toBe(120)
    expect(node.progress.records.totalRuns).toBe(7)
    expect(node.ledgerSummary.bossDefeats.stage1BossDefeats).toBe(1)
    expect(isStageUnlocked('stage2', readFirebasePlayerProgress().records)).toBe(true)
    expect(localStorage.length).toBe(0)
    // Signing in once more sends nothing again.
    db.writes.length = 0
    _resetFirebaseProgressForTests()
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    await requestCloudProgressSave(user)
    expect(db.writes).toEqual([])
  })

  it('an account with no run rows and no summary needs no migration: sign-in writes nothing', async () => {
    const node = userNode()
    delete node.ledgerSummary
    const db = createControllableProgressDatabase({ users: { [UID]: node } })
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    await requestCloudProgressSave(user)
    expect(db.writes).toEqual([])
  })

  it('sign-in returns before a left-over result is written', async () => {
    const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
    _setFirebaseProgressClientForTests(db)
    openStageSlot({ uid: UID, runId: 'left', stageId: 'stage1', at: 1_700_000_000_000 })
    setStageSlotTotals({ records: { totalRuns: 1, totalGold: 4 }, best: {}, gold: 4 })
    flushStageSlot()
    _resetStageSlotForTests() // the tab closed
    db.control.holdWrites = true
    expect(await hydrateCloudProgress(user)).toBe(true)
    // Signed in and playable while the left-over write is still waiting.
    await vi.waitFor(() => expect(db.control.heldWrites.length).toBe(1))
    expect(db.get(`users/${UID}/runLedger/left`)).toBeUndefined()
    db.control.holdWrites = false
    while (db.releaseWrite()) await Promise.resolve()
    await requestCloudProgressSave(user)
    expect(db.get(`users/${UID}/runLedger/left/gold`)).toBe(4)
  })

  it('a stage end is one cloud write carrying the result, the run-end leaves and profile/activity', async () => {
    const db = createControllableProgressDatabase({ users: { [UID]: userNode() } })
    _setFirebaseProgressClientForTests(db)
    await hydrateCloudProgress(user)
    openStageSlot({ uid: UID, runId: 'one-write', stageId: 'stage1', at: 1_700_000_000_000 })
    setStageSlotTotals({ records: { totalRuns: 1, totalGold: 3 }, best: { bestSurvivalSeconds: 77 }, gold: 3 })
    const closed = closeLiveStageSlot('one-write')
    const committing = commitFirebaseStageResult(closed, user)
    updateFirebasePlayerProgress(progress => { progress.weaponUnlocks = { ...progress.weaponUnlocks, sharkMissile: 1 } }) // run-end unlock
    expect(await committing).toBe(true)
    await requestCloudProgressSave(user)
    expect(db.writes).toHaveLength(1)
    const values = db.writes[0].values
    expect(values['runLedger/one-write'].gold).toBe(3)
    expect(values['progress/records/bestSurvivalSeconds']).toBe(77)
    expect(values['progress/weaponUnlocks/sharkMissile']).toBe(1)
    expect(values.activity.lastStageId).toBe('stage1')
    expect(values.profile.uid).toBe(UID)
  })
})
