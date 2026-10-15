import * as progress from '__APP__/src/lib/firebaseProgress.js'
import { useGameStore } from '__APP__/src/store/useGameStore.js'
import { useAuthStore, _resetAuthStoreForTests } from '__APP__/src/store/useAuthStore.js'
import { isStageUnlocked } from '__APP__/src/lib/stageConfig.js'

const clone = (value) => structuredClone(value)
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const equal = (a, b, message) => assert(JSON.stringify(a) === JSON.stringify(b), message)
const drain = async (count = 12) => { for (let i = 0; i < count; i++) await Promise.resolve() }
const fingerprint = async (value) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((n) => n.toString(16).padStart(2, '0')).join('')
}
const names = ['clear_logout_reload', 'edits_during_save', 'failed_save_retry', 'late_hydrate_success', 'late_hydrate_failure', 'account_switch']

window.runProgressQA = async ({ count = 1000, seed = 20261016 } = {}) => {
  let random = seed >>> 0
  const next = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random }
  const results = { seed, requested: count, passed: 0, failed: 0, scenarios: {}, restorationChecks: 0, firstFailure: null, rows: [] }
  const initialGame = useGameStore.getState()
  const initialAuth = useAuthStore.getState()
  progress._resetFirebaseProgressForTests()
  const initialRuntime = progress.getFirebaseProgressRuntimeSnapshot()
  const initialRuntimeHash = await fingerprint(initialRuntime)
  window.__qaAuth = { signOut: async () => { progress.setCloudProgressUser(null) } }
  try {
    for (let index = 0; index < count; index++) {
      const bucket = index % 20
      const scenario = bucket < 4 ? 0 : bucket < 8 ? 1 : bucket < 12 ? 2 : bucket < 15 ? 3 : bucket < 18 ? 4 : 5
      const name = names[scenario]
      const user = { uid: `qa-${index}`, displayName: 'QA memory user' }
      const other = { uid: `other-${index}`, displayName: 'Other memory user' }
      let fail = false
      let signOuts = 0
      let gate = null
      let startedSave = false
      let revision = 0
      let writes = 0
      let db = {}
      let pristineDb
      const pristineRevision = revision
      let pristineHash
      progress._resetFirebaseProgressForTests()
      _resetAuthStoreForTests()
      useGameStore.setState(initialGame, true)
      window.__qaAuth.signOut = async () => { signOuts++; progress.setCloudProgressUser(null) }
      const client = {
        load: async (path) => { await drain(next() % 4); return clone(db[path]) },
        save: async (path, payload) => {
          startedSave = true
          await drain(next() % 4)
          if (gate) await gate.promise
          if (fail) throw new Error('intentional QA memory transport failure')
          db[path] = clone(payload); revision++; writes++
        },
      }
      progress._setFirebaseProgressClientForTests(client)
      progress.applyCloudProgressSnapshot({ profile: { uid: user.uid, displayName: user.displayName, nickname: 'QA' },
        activity: { lastStageId: 'stage1', lastStartedAt: '2026-10-16T00:00:00.000Z' },
        consent: { terms: { version: 1, acceptedAt: '2026-10-16T00:00:00.000Z' } },
        progress: { goldTotal: 205 + index, records: { totalRuns: index, totalKills: 23 }, weaponUnlockSchemaVersion: 2,
          weaponUnlocks: { guidedMissile: 1 }, weaponPermanentUpgrades: { pencilThrow: 2 }, passiveUpgrades: { magnet: 2 },
          bossPassiveUnlocks: { b01SetSquare: true }, encounteredZombieTypes: { E01: 1 },
          titleSettings: { vibration: false, reducedEffects: true }, missions: { counters: { kills: 23 } } } }, user)
      const path = progress.getUserProgressPath(user)
      db[path] = progress.buildCloudProgressSnapshot()
      pristineDb = clone(db)
      pristineHash = await fingerprint({ db, revision })
      useAuthStore.setState({ user, status: 'signedIn' })
      assert(!isStageUnlocked('stage2', progress.readFirebasePlayerProgress().records), `${index}: uncleared account unlocked`)
      try {
        let lateRead
        let rejectRead
        let hydration
        if (scenario === 3 || scenario === 4) {
          progress._setFirebaseProgressClientForTests({ ...client, load: () => new Promise((resolve, reject) => { lateRead = resolve; rejectRead = reject }) })
          hydration = progress.hydrateCloudProgress(user)
          await drain()
        }
        if (scenario === 1 || scenario === 5) {
          let release
          gate = { promise: new Promise((resolve) => { release = resolve }), release: () => release() }
        }
        if (scenario === 2) fail = true
        useGameStore.setState({ currentStageId: 'stage1', phase: 'playing', elapsedMs: 240000, runKills: 3, runLevelUps: 1,
          goldSession: 0, missionSpecialEnemySpawns: [] })
        useGameStore.getState().clearStage()
        assert(isStageUnlocked('stage2', progress.readFirebasePlayerProgress().records), `${index}: clear did not unlock`)
        if (hydration) {
          const expected = progress.readFirebasePlayerProgress()
          if (scenario === 3) lateRead(clone(db[path])); else rejectRead(new Error('intentional late QA read failure'))
          await hydration
          equal(progress.readFirebasePlayerProgress(), expected, `${index}: late read lost progress`)
          progress._setFirebaseProgressClientForTests(client)
        }
        let expected = progress.buildCloudProgressSnapshot()
        const logout = useAuthStore.getState().signOutOfGoogle()
        await drain(30)
        if (scenario === 1 || scenario === 5) {
          assert(startedSave && signOuts === 0, `${index}: logout did not wait for transport`)
        }
        if (scenario === 1) {
          progress.updateFirebasePlayerProgress((state) => { state.goldTotal += 7; state.weaponPermanentUpgrades.pencilThrow++; state.titleSettings.vibration = true })
          expected = progress.buildCloudProgressSnapshot()
        }
        if (scenario === 5) {
          progress.applyCloudProgressSnapshot({ progress: { goldTotal: 17, records: {} } }, other)
          const otherState = progress.readFirebasePlayerProgress()
          useAuthStore.setState({ user: other, status: 'signedIn' })
          gate.release(); gate = null
          assert(await logout === false && signOuts === 0, `${index}: logout affected replacement account`)
          equal(progress.readFirebasePlayerProgress(), otherState, `${index}: account data mixed`)
          // Complete A's already-earned clear using only its memory snapshot.
          progress.applyCloudProgressSnapshot(expected, user)
          useAuthStore.setState({ user, status: 'signedIn' })
          await useAuthStore.getState().signOutOfGoogle()
        } else {
          if (gate) { gate.release(); gate = null }
          const outcome = await logout
          if (scenario === 2) {
            assert(outcome === false && signOuts === 0, `${index}: failed save signed out`)
            assert(useAuthStore.getState().user.uid === user.uid, `${index}: failed save removed session`)
            equal(progress.readFirebasePlayerProgress(), expected.progress, `${index}: failed save lost memory state`)
            fail = false
            await useAuthStore.getState().signOutOfGoogle()
          }
        }
        assert(signOuts === 1, `${index}: unexpected signout count`)
        await progress.hydrateCloudProgress(user)
        const restored = progress.buildCloudProgressSnapshot()
        for (const key of ['profile', 'progress', 'activity', 'consent']) equal(restored[key], expected[key], `${index}: ${key} changed after reload`)
        assert(isStageUnlocked('stage2', restored.progress.records), `${index}: reloaded stage locked`)
        assert(writes > 0, `${index}: no transport write`)
        results.passed++
        results.scenarios[name] = (results.scenarios[name] || 0) + 1
        results.rows.push({ index, scenario: name, passed: true, writes, revision, restoredProgressHash: await fingerprint(restored.progress) })
      } catch (error) {
        results.failed++
        results.firstFailure ||= { index, scenario: name, message: error.message, stack: error.stack }
        throw error
      } finally {
        if (gate) gate.release()
        await drain(30)
        progress._resetFirebaseProgressForTests()
        _resetAuthStoreForTests()
        useGameStore.setState(initialGame, true)
        db = clone(pristineDb); revision = pristineRevision
        equal({ db, revision }, { db: pristineDb, revision: pristineRevision }, `${index}: fake store restore mismatch`)
        const restoredHash = await fingerprint({ db, revision })
        assert(restoredHash === pristineHash, `${index}: fake store restore hash mismatch`)
        const row = results.rows.at(-1)
        if (row?.index === index) row.restoration = { beforeHash: pristineHash, afterHash: restoredHash, beforeRevision: pristineRevision, afterRevision: revision }
        equal(progress.getFirebaseProgressRuntimeSnapshot(), initialRuntime, `${index}: runtime restore mismatch`)
        assert(await fingerprint(progress.getFirebaseProgressRuntimeSnapshot()) === initialRuntimeHash, `${index}: runtime restore hash mismatch`)
        results.restorationChecks++
        document.getElementById('status').textContent = `${results.passed}/${count}: ${name}`
      }
    }
  } catch (error) {
    results.error = error.message
  } finally {
    progress._resetFirebaseProgressForTests()
    _resetAuthStoreForTests()
    useGameStore.setState(initialGame, true)
    useAuthStore.setState(initialAuth, true)
    delete window.__qaAuth
  }
  results.finalRuntimeHash = await fingerprint(progress.getFirebaseProgressRuntimeSnapshot())
  results.initialRuntimeHash = initialRuntimeHash
  document.getElementById('status').textContent = JSON.stringify({ passed: results.passed, failed: results.failed, restorationChecks: results.restorationChecks })
  return results
}
