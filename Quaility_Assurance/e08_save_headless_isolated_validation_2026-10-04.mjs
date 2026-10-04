import { performance } from 'node:perf_hooks'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  _resetFirebaseProgressForTests,
  _setFirebaseProgressClientForTests,
  applyCloudProgressSnapshot,
  consumeFirebaseProgressSaveWarning,
  getFirebaseProgressRuntimeSnapshot,
  requestCloudProgressSave,
  setCloudProgressUser,
  updateFirebasePlayerProgress,
} from '../Developer/r3f_prototype/src/lib/firebaseProgress.js'

const RULES_PATH = new URL('../Developer/r3f_prototype/database.rules.json', import.meta.url)
const TARGET_RUNS = Number(process.env.E08_SAVE_HEADLESS_RUNS || 20000)

process.env.VITE_FIREBASE_API_KEY ||= 'qa-api-key'
process.env.VITE_FIREBASE_AUTH_DOMAIN ||= 'qa-auth-domain.firebaseapp.com'
process.env.VITE_FIREBASE_DATABASE_URL ||= 'https://qa-isolated-fixture.invalid'
process.env.VITE_FIREBASE_PROJECT_ID ||= 'qa-project'
process.env.VITE_FIREBASE_APP_ID ||= '1:qa:web:fixture'

const OWNER_UIDS = ['uid-a', 'uid-b', 'uid-c', 'uid-d']
const ENCOUNTER_TYPES = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'RZL', 'RZC', 'RZT', 'RZG', 'B01', 'B02', 'B03', 'B04']
const INVALID_TYPES = ['E09', 'BAD', '', 'E08x', 'stage1']
const ADMIN_EMAIL = 'zard5388@gmail.com'

function parseAllowedEncounterTypesFromRules() {
  const rules = JSON.parse(readFileSync(RULES_PATH, 'utf8'))
  const expr = rules.rules.users.$uid.progress.encounteredZombieTypes.$zombieType['.validate']
  const matches = [...expr.matchAll(/\$zombieType === '([^']+)'/g)].map((m) => m[1])
  return { expr, types: new Set(matches), ordered: matches }
}

const parsedRules = parseAllowedEncounterTypesFromRules()
const encounterValidator = new Function('$zombieType', 'newData', `return (${parsedRules.expr})`)
const legacyEncounterValidator = new Function('$zombieType', 'newData', `return (${parsedRules.expr.replace(" || $zombieType === 'E08'", '')})`)
if (legacyEncounterValidator('E08', { val: () => 1 }) || !encounterValidator('E08', { val: () => 1 })) throw new Error('E08 regression comparison failed')
const userWriteRule = JSON.parse(readFileSync(RULES_PATH, 'utf8')).rules.users.$uid['.write']
const writeValidator = new Function('auth', '$uid', `return (${userWriteRule})`)
const fixtureDatabase = { revision: 17, users: {}, timestamp: new Date().toISOString() }
const initialFixture = structuredClone(fixtureDatabase)
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const initialHash = hash(initialFixture)
_resetFirebaseProgressForTests()
const initialRuntime = getFirebaseProgressRuntimeSnapshot()
const initialRuntimeHash = hash(initialRuntime)
let storageTouches = 0
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { storageTouches += 1; throw new Error('Forbidden localStorage access') } })

function authFor(kind, uid) {
  if (kind === 'owner') return { uid, token: { email: `${uid}@example.test`, email_verified: true, firebase: { sign_in_provider: 'password' } } }
  if (kind === 'admin') return { uid: 'admin-uid', token: { email: ADMIN_EMAIL, email_verified: true, firebase: { sign_in_provider: 'google.com' } } }
  if (kind === 'admin-unverified') return { uid: 'admin-uid', token: { email: ADMIN_EMAIL, email_verified: false, firebase: { sign_in_provider: 'google.com' } } }
  if (kind === 'admin-password') return { uid: 'admin-uid', token: { email: ADMIN_EMAIL, email_verified: true, firebase: { sign_in_provider: 'password' } } }
  if (kind === 'other') return { uid: `${uid}-other`, token: { email: 'other@example.test', email_verified: true, firebase: { sign_in_provider: 'password' } } }
  return null
}

function canUserWrite(auth, uid) {
  return writeValidator(auth, uid)
}

function baseRecords(seed = 0) {
  return {
    totalRuns: seed % 31,
    totalKills: seed % 997,
    totalGold: seed % 499,
    totalSurvivalSeconds: seed % 12000,
    bestSurvivalSeconds: seed % 900,
    stage1Clears: seed % 7,
    stage1Survival180Runs: seed % 11,
    stage2Clears: seed % 5,
    stage2BestSurvivalSec: seed % 800,
    stage3Clears: seed % 3,
    stage3BestSurvivalSec: seed % 700,
    stage4Clears: seed % 2,
    stage4BestSurvivalSec: seed % 600,
    bossKills: seed % 23,
    totalLevelUps: seed % 61,
    totalPickups: seed % 401,
    weaponMasterCount: seed % 13,
  }
}

function baseSnapshot(uid, seed = 0) {
  return {
    schemaVersion: 1,
    updatedAt: '2026-10-04T00:00:00.000Z',
    profile: { uid, displayName: `Tester ${uid}`, nickname: `QA${seed % 1000}` },
    progress: {
      goldTotal: seed % 100000,
      records: baseRecords(seed),
      weaponUnlockSchemaVersion: 2,
      weaponUnlocks: { guidedMissile: 1 },
      weaponPermanentUpgrades: { pencilThrow: seed % 10 },
      passiveUpgrades: { magnet: seed % 4 },
      bossPassiveUnlocks: seed % 2 === 0 ? { b01SetSquare: true } : {},
      encounteredZombieTypes: {},
      missions: { schemaVersion: 1, catalogVersion: 'missions_2026_08_15_v1', updatedAt: '', counters: {}, active: {}, completed: {}, claimed: {}, pinnedMissionIds: {}, claimLedger: {} },
      titleSettings: { language: 'ko', vibration: true, reducedEffects: false, hitCameraShake: true, scientificNotation: false, unlockAllWeaponsCheat: false, unlockAllStagesCheat: false },
    },
  }
}

function validatePayload(uid, auth, payload) {
  if (!canUserWrite(auth, uid)) return { ok: false, code: 'permission_denied' }
  if (!payload || typeof payload !== 'object') return { ok: false, code: 'invalid_payload' }
  if (payload.schemaVersion !== 1) return { ok: false, code: 'invalid_schemaVersion' }
  if (!payload.profile || payload.profile.uid !== uid) return { ok: false, code: 'invalid_profile_uid' }
  if (!payload.progress || typeof payload.progress !== 'object') return { ok: false, code: 'invalid_progress' }
  const encountered = payload.progress.encounteredZombieTypes || {}
  for (const [type, value] of Object.entries(encountered)) {
    if (!encounterValidator(type, { val: () => value })) return { ok: false, code: 'invalid_encounter', type, value }
  }
  return { ok: true, code: 'ok' }
}

function makeRuleClient({ uid, auth, failFirst = false, delayFirst = false, saveLog }) {
  let failed = false
  let release
  let markStarted
  const started = new Promise((resolve) => { markStarted = resolve })
  return {
    started,
    releaseFirst: () => release?.(),
    save: async (path, payload) => {
      if (path !== `users/${uid}`) throw Object.assign(new Error(`wrong path ${path}`), { code: 'wrong_path' })
      if (failFirst && !failed) {
        failed = true
        throw Object.assign(new Error('injected transient failure'), { code: 'injected_transient_failure' })
      }
      if (delayFirst && !release) {
        markStarted()
        await new Promise((resolve) => { release = resolve })
      }
      const result = validatePayload(uid, auth, payload)
      saveLog.push({ uid, path, result, encountered: { ...(payload.progress?.encounteredZombieTypes || {}) } })
      if (!result.ok) throw Object.assign(new Error(result.code), { code: result.code, detail: result })
      fixtureDatabase.users[uid] = structuredClone(payload)
      fixtureDatabase.revision += 1
      return true
    },
    load: async () => baseSnapshot(uid),
    remove: async () => true,
    transaction: async () => ({ committed: false, snapshot: null }),
  }
}

function assertCondition(condition, label, details = {}) {
  if (!condition) {
    const error = new Error(`ASSERT_FAIL:${label}`)
    error.details = details
    throw error
  }
}

async function runCase(index) {
  const uid = OWNER_UIDS[index % OWNER_UIDS.length]
  const typePool = index % 7 === 0 ? INVALID_TYPES : ENCOUNTER_TYPES
  const type = typePool[(index * 13) % typePool.length]
  const value = index % 17 === 0 ? 2 : 1
  const authKinds = ['owner', 'admin', 'other', 'none', 'admin-unverified', 'admin-password']
  const authKind = authKinds[index % authKinds.length]
  const auth = authFor(authKind, uid)
  // The production normalizer drops unknown keys and converts supported truthy
  // encounter values to 1 before transport. Test raw rules separately below.
  const shouldPassRules = canUserWrite(auth, uid)
  assertCondition(encounterValidator(type, { val: () => value }) === (parsedRules.types.has(type) && value === 1), 'raw_encounter_rule', { index, type, value })
  const saveLog = []

  _resetFirebaseProgressForTests()
  const client = makeRuleClient({ uid, auth, saveLog })
  _setFirebaseProgressClientForTests(client)
  applyCloudProgressSnapshot(baseSnapshot(uid, index), { uid, displayName: `Tester ${index}` })
  updateFirebasePlayerProgress((progress) => {
    progress.encounteredZombieTypes[type] = value
    return progress
  })
  const saved = await requestCloudProgressSave({ uid, displayName: `Tester ${index}` })
  const warning = consumeFirebaseProgressSaveWarning()
  assertCondition(saved === shouldPassRules, 'rules_save_result', { index, uid, type, value, authKind, saved, shouldPassRules, saveLog })
  assertCondition((warning === 'save-failed') === !shouldPassRules, 'warning_result', { index, warning, shouldPassRules })
  return shouldPassRules ? 'successful-save' : 'rules-rejection'
}

async function runRetryCase(index) {
  const uid = OWNER_UIDS[index % OWNER_UIDS.length]
  const auth = authFor('owner', uid)
  const saveLog = []
  _resetFirebaseProgressForTests()
  const client = makeRuleClient({ uid, auth, failFirst: true, saveLog })
  _setFirebaseProgressClientForTests(client)
  applyCloudProgressSnapshot(baseSnapshot(uid, index), { uid })
  updateFirebasePlayerProgress((progress) => {
    progress.encounteredZombieTypes.E08 = 1
    return progress
  })
  const first = await requestCloudProgressSave({ uid })
  const firstWarning = consumeFirebaseProgressSaveWarning()
  const second = await requestCloudProgressSave({ uid })
  const secondWarning = consumeFirebaseProgressSaveWarning()
  assertCondition(first === false && firstWarning === 'save-failed', 'retry_first_failure', { index, first, firstWarning })
  assertCondition(second === true && secondWarning === null, 'retry_second_success', { index, second, secondWarning, saveLog })
  return 'retry'
}

async function runAccountSwitchCase(index) {
  const uidA = OWNER_UIDS[index % OWNER_UIDS.length]
  const uidB = `${uidA}-next`
  const auth = authFor('owner', uidA)
  const saveLog = []
  _resetFirebaseProgressForTests()
  const client = makeRuleClient({ uid: uidA, auth, delayFirst: true, saveLog })
  _setFirebaseProgressClientForTests(client)
  applyCloudProgressSnapshot(baseSnapshot(uidA, index), { uid: uidA })
  updateFirebasePlayerProgress((progress) => {
    progress.encounteredZombieTypes.E08 = 1
    return progress
  })
  const pending = requestCloudProgressSave({ uid: uidA })
  await client.started
  setCloudProgressUser({ uid: uidB })
  client.releaseFirst()
  const saved = await pending
  const warning = consumeFirebaseProgressSaveWarning()
  assertCondition(saved === true, 'account_switch_inflight_save_transport_success', { index, saved, saveLog })
  assertCondition(warning === null, 'account_switch_no_stale_warning', { index, warning })
  assertCondition(getFirebaseProgressRuntimeSnapshot().uid === uidB, 'account_switch_runtime_uid', { runtime: getFirebaseProgressRuntimeSnapshot() })
  return 'account-switch'
}

const started = performance.now()
const counts = {
  total: 0,
  successfulSave: 0,
  rulesRejection: 0,
  retry: 0,
  accountSwitch: 0,
  authOwner: 0,
  authAdmin: 0,
  authRejected: 0,
  e08Cases: 0,
  e08SuccessfulSaves: 0,
}

try {
for (let i = 0; i < TARGET_RUNS; i += 1) {
  let category
  if (i % 50 === 25) category = await runRetryCase(i)
  else if (i % 50 === 40) category = await runAccountSwitchCase(i)
  else category = await runCase(i)

  counts.total += 1
  if (category === 'successful-save') counts.successfulSave += 1
  if (category === 'rules-rejection') counts.rulesRejection += 1
  if (category === 'retry') counts.retry += 1
  if (category === 'account-switch') counts.accountSwitch += 1

  if (i % 50 !== 25 && i % 50 !== 40) {
    const authKind = ['owner', 'admin', 'other', 'none', 'admin-unverified', 'admin-password'][i % 6]
    if (authKind === 'owner') counts.authOwner += 1
    else if (authKind === 'admin') counts.authAdmin += 1
    else counts.authRejected += 1
    const typePool = i % 7 === 0 ? INVALID_TYPES : ENCOUNTER_TYPES
    const type = typePool[(i * 13) % typePool.length]
    const value = i % 17 === 0 ? 2 : 1
    if (type === 'E08') {
      counts.e08Cases += 1
      if ((authKind === 'owner' || authKind === 'admin') && value === 1) counts.e08SuccessfulSaves += 1
    }
  } else if (category === 'retry' || category === 'account-switch') {
    counts.e08Cases += 1
    counts.e08SuccessfulSaves += 1
  }
}
} finally {
  for (const key of Object.keys(fixtureDatabase)) delete fixtureDatabase[key]
  Object.assign(fixtureDatabase, structuredClone(initialFixture))
  _resetFirebaseProgressForTests()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
}
assertCondition(hash(fixtureDatabase) === initialHash, 'fixture_exact_restoration')
assertCondition(hash(getFirebaseProgressRuntimeSnapshot()) === initialRuntimeHash, 'runtime_exact_restoration')
assertCondition(storageTouches === 0, 'no_localStorage_access')

const elapsedMs = performance.now() - started
const result = {
  status: 'PASS',
  fixture: 'isolated Realtime Database rule/state fixture; no production data touched',
  rulesPath: RULES_PATH.pathname,
  allowedEncounterTypes: parsedRules.ordered,
  e08AllowedByRules: parsedRules.types.has('E08'),
  e08BeforeFixRejected: !legacyEncounterValidator('E08', { val: () => 1 }),
  targetRuns: TARGET_RUNS,
  elapsedMs: Number(elapsedMs.toFixed(2)),
  target20000RunsPerFiveMinutesMet: counts.total >= 20000 && elapsedMs < 300000,
  counts,
  restoration: { capturedAt: initialFixture.timestamp, initialHash, finalHash: hash(fixtureDatabase), initialRuntimeHash, finalRuntimeHash: hash(getFirebaseProgressRuntimeSnapshot()), revision: fixtureDatabase.revision, storageTouches },
  limitation: 'Evaluates encounter and user-write expressions directly; not full RTDB emulator or authenticated live save.',
}

assertCondition(parsedRules.types.has('E08'), 'rules_include_E08', { allowed: parsedRules.ordered })
assertCondition(counts.total >= 10000, 'minimum_10000_cases', counts)
assertCondition(counts.e08SuccessfulSaves > 0, 'e08_success_covered', counts)
assertCondition(counts.retry > 0 && counts.accountSwitch > 0 && counts.rulesRejection > 0, 'required_categories_covered', counts)
assertCondition(counts.total >= 20000 && elapsedMs < 300000, 'performance_target', result)
console.log(JSON.stringify(result, null, 2))
