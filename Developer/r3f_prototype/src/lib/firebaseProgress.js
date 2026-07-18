import { getFirebaseConfig, isFirebaseAuthConfigured } from './firebaseAuth.js'

const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const SCHEMA_VERSION = 1

export const PLAYER_DURABLE_STORAGE_KEYS = Object.freeze([
  'school_survivor:goldTotal',
  'school_survivor:playerRecords',
  'school_survivor:weaponUnlocks',
  'school_survivor:weaponPermanentUpgrades',
  'school_survivor:passiveUpgrades',
  'school_survivor:userNicknames',
  'school_survivor:titleSettings',
  'school_survivor:lastPlayActivity',
  'school_survivor:progressOwnerUid',
])

const PLAYER_DURABLE_STORAGE_KEY_SET = new Set(PLAYER_DURABLE_STORAGE_KEYS)

const RECORD_KEYS = [
  'totalRuns',
  'totalKills',
  'totalGold',
  'totalSurvivalSeconds',
  'bestSurvivalSeconds',
  'stage1Clears',
  'stage1Survival180Runs',
  'stage2Clears',
  'stage2BestSurvivalSec',
  'stage3Clears',
  'stage3BestSurvivalSec',
  'bossKills',
  'totalLevelUps',
  'totalPickups',
  'weaponMasterCount',
]

const DEFAULT_TITLE_SETTINGS = Object.freeze({
  vibration: true,
  reducedEffects: false,
  unlockAllWeaponsCheat: false,
})

let cloudUser = null
let progressClientPromise = null
let testProgressClient = null
let writeQueue = Promise.resolve()
let storageGuardInstalled = false

let runtime = createEmptyRuntime()

export class FirebaseProgressError extends Error {
  constructor(message, code = 'firebase-progress-error') {
    super(message)
    this.name = 'FirebaseProgressError'
    this.code = code
  }
}

export function isFirebaseProgressConfigured(env = getDefaultEnv()) {
  return isFirebaseAuthConfigured(env) && readEnv(env, DATABASE_URL_KEY).length > 0
}

export function getUserProgressPath(user = cloudUser) {
  const uid = readUserId(user)
  return uid ? `users/${uid}` : ''
}

export function setCloudProgressUser(user) {
  const nextUid = readUserId(user)
  const currentUid = readUserId(cloudUser)
  cloudUser = user ?? null
  if (!nextUid || nextUid !== currentUid) {
    runtime = createEmptyRuntime(nextUid)
  }
}

export function isFirebaseProgressHydrated(user = cloudUser) {
  const uid = readUserId(user)
  return !!uid && runtime.uid === uid && runtime.hydrated === true
}

export function getFirebaseProgressRuntimeSnapshot() {
  return cloneRuntime(runtime)
}

export function buildCloudUserProfile(user = cloudUser) {
  const uid = readUserId(user) || runtime.uid
  if (!uid) return null
  return {
    uid,
    displayName: readString(user?.displayName ?? runtime.profile.displayName),
    nickname: readString(runtime.profile.nickname),
  }
}

export function buildCloudProgressSnapshot(now = Date.now()) {
  ensureHydrated()
  return buildRemotePayload(now)
}

export async function hydrateCloudProgress(user = cloudUser) {
  setCloudProgressUser(user)
  const path = getUserProgressPath(user)
  if (!path) throw new FirebaseProgressError('Firebase progress hydrate requires an authenticated uid.', 'unauthenticated')
  if (!isFirebaseProgressConfigured()) throw new FirebaseProgressError('Firebase progress is not configured.', 'unconfigured')

  try {
    const client = await getProgressClient()
    const snapshot = await client.load(path)
    if (!snapshot) {
      runtime = createEmptyRuntime(readUserId(user))
      throw new FirebaseProgressError(`Remote Firebase user snapshot is missing at ${path}.`, 'missing-remote')
    }
    applyCloudProgressSnapshot(snapshot, user)
    return true
  } catch (error) {
    if (!(error instanceof FirebaseProgressError)) {
      runtime = createEmptyRuntime()
    }
    throw error
  }
}

export async function loadCloudProgressFromCloud(user = cloudUser) {
  return hydrateCloudProgress(user)
}

export async function saveLocalProgressToCloud(user = cloudUser) {
  return requestCloudProgressSave(user)
}

export function applyCloudProgressSnapshot(snapshot, user = cloudUser) {
  const uid = readUserId(user)
  if (!uid) return false
  const normalized = normalizeRemoteSnapshot(snapshot, uid, user)
  if (!normalized) return false
  cloudUser = user ?? cloudUser
  runtime = {
    uid,
    hydrated: true,
    profile: normalized.profile,
    progress: normalized.progress,
    activity: normalized.activity,
  }
  return true
}

export function updateFirebasePlayerProgress(mutator) {
  ensureHydrated()
  const next = cloneProgress(runtime.progress)
  const result = mutator(next)
  runtime = {
    ...runtime,
    progress: normalizeProgress(result && typeof result === 'object' ? result : next),
  }
  return getFirebaseProgressRuntimeSnapshot().progress
}

export function updateFirebasePlayerProfile(mutator) {
  ensureHydrated()
  const next = { ...runtime.profile }
  const result = mutator(next)
  runtime = {
    ...runtime,
    profile: normalizeProfile(result && typeof result === 'object' ? result : next, runtime.uid),
  }
  return { ...runtime.profile }
}

export function readFirebasePlayerProgress() {
  ensureHydrated()
  return cloneProgress(runtime.progress)
}

export function recordPlayActivity(stageId, now = Date.now()) {
  ensureHydrated()
  if (typeof stageId !== 'string' || stageId.trim().length === 0) return false
  const startedAt = new Date(now)
  if (Number.isNaN(startedAt.getTime())) return false
  runtime = {
    ...runtime,
    activity: {
      lastStageId: stageId.trim(),
      lastStartedAt: startedAt.toISOString(),
    },
  }
  void requestCloudProgressSave()
  return true
}

export async function requestCloudProgressSave(user = cloudUser) {
  if (!isFirebaseProgressHydrated(user)) return false
  if (!isFirebaseProgressConfigured()) return false
  const uidAtRequest = readUserId(user)
  const path = getUserProgressPath(user)
  const payload = buildRemotePayload()
  writeQueue = writeQueue.then(async () => {
    if (!isFirebaseProgressHydrated({ uid: uidAtRequest })) return false
    const client = await getProgressClient()
    await client.save(path, payload)
    return true
  })
  return writeQueue
}

export function installPlayerStorageFatalGuard() {
  if (storageGuardInstalled || typeof Storage === 'undefined') return false
  storageGuardInstalled = true
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    const original = Storage.prototype[method]
    Object.defineProperty(Storage.prototype, method, {
      configurable: true,
      value: function guardedPlayerStorageAccess(key, ...args) {
        assertNotPlayerDurableStorageKey(key)
        return original.call(this, key, ...args)
      },
    })
  }
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function') {
    const originalOpen = indexedDB.open.bind(indexedDB)
    indexedDB.open = (name, ...args) => {
      assertNotPlayerDurableStorageKey(name)
      return originalOpen(name, ...args)
    }
  }
  return true
}

export function assertNotPlayerDurableStorageKey(key) {
  if (PLAYER_DURABLE_STORAGE_KEY_SET.has(String(key))) {
    throw new FirebaseProgressError(
      `Firebase-only player data cannot use browser durable storage key: ${key}`,
      'player-local-storage-forbidden',
    )
  }
}

export function _setFirebaseProgressClientForTests(client) {
  testProgressClient = client
  progressClientPromise = null
}

export function _resetFirebaseProgressForTests() {
  cloudUser = null
  progressClientPromise = null
  testProgressClient = null
  writeQueue = Promise.resolve()
  runtime = createEmptyRuntime()
}

export function _seedHydratedFirebaseProgressForTests(user = { uid: 'test-user' }, snapshot = null) {
  const uid = readUserId(user) || 'test-user'
  applyCloudProgressSnapshot(snapshot ?? {
    schemaVersion: SCHEMA_VERSION,
    profile: { uid, displayName: user.displayName ?? '', nickname: '' },
    progress: createEmptyProgress(),
  }, { ...user, uid })
}

async function getProgressClient() {
  if (testProgressClient) return testProgressClient
  if (!progressClientPromise) progressClientPromise = createFirebaseProgressClient()
  return progressClientPromise
}

async function createFirebaseProgressClient(env = getDefaultEnv()) {
  const [{ initializeApp, getApp, getApps }, databaseModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/database'),
  ])
  const config = getFirebaseConfig(env)
  const app = getApps().length > 0 ? getApp() : initializeApp(config)
  const database = databaseModule.getDatabase(app, readEnv(env, DATABASE_URL_KEY))

  return {
    save: (path, value) => databaseModule.update(databaseModule.ref(database, path), value),
    load: async (path) => {
      const snap = await databaseModule.get(databaseModule.ref(database, path))
      return snap.exists() ? snap.val() : null
    },
  }
}

function buildRemotePayload(now = Date.now()) {
  ensureHydrated()
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date(now).toISOString(),
    profile: { ...runtime.profile },
    ...(runtime.activity ? { activity: { ...runtime.activity } } : {}),
    progress: cloneProgress(runtime.progress),
  }
}

function ensureHydrated() {
  if (!runtime.hydrated || !runtime.uid) {
    throw new FirebaseProgressError('Firebase player progress is not hydrated from remote.', 'not-hydrated')
  }
}

function normalizeRemoteSnapshot(snapshot, uid, user) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null
  if (Number(snapshot.schemaVersion ?? SCHEMA_VERSION) !== SCHEMA_VERSION) return null
  if (!snapshot.progress || typeof snapshot.progress !== 'object' || Array.isArray(snapshot.progress)) return null
  return {
    profile: normalizeProfile({ uid, displayName: user?.displayName, ...snapshot.profile }, uid),
    progress: normalizeProgress(snapshot.progress),
    activity: normalizePlayActivity(snapshot.activity),
  }
}

function createEmptyRuntime(uid = '') {
  return {
    uid,
    hydrated: false,
    profile: normalizeProfile({ uid }, uid),
    progress: createEmptyProgress(),
    activity: null,
  }
}

function createEmptyProgress() {
  return {
    goldTotal: 0,
    records: Object.fromEntries(RECORD_KEYS.map((key) => [key, 0])),
    weaponUnlocks: {},
    weaponPermanentUpgrades: {},
    passiveUpgrades: {},
    titleSettings: { ...DEFAULT_TITLE_SETTINGS },
  }
}

function normalizeProgress(progress) {
  const out = createEmptyProgress()
  out.goldTotal = readNonNegativeInt(progress.goldTotal)
  out.records = normalizeNumberMap(progress.records, RECORD_KEYS)
  out.weaponUnlocks = normalizeFlagMap(progress.weaponUnlocks)
  out.weaponPermanentUpgrades = normalizeNumberMap(progress.weaponPermanentUpgrades)
  out.passiveUpgrades = normalizeNumberMap(progress.passiveUpgrades)
  out.titleSettings = normalizeTitleSettings(progress.titleSettings)
  return out
}

function normalizeProfile(profile, uid) {
  return {
    uid,
    displayName: readString(profile?.displayName),
    nickname: readString(profile?.nickname),
  }
}

function normalizeNumberMap(value, requiredKeys = null) {
  const out = requiredKeys ? Object.fromEntries(requiredKeys.map((key) => [key, 0])) : {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [key, raw] of Object.entries(value)) {
    const number = readNonNegativeInt(raw)
    if (!requiredKeys || requiredKeys.includes(key)) out[key] = number
  }
  return out
}

function normalizeFlagMap(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [key, raw] of Object.entries(value)) {
    if (raw === 1 || raw === true) out[key] = 1
  }
  return out
}

function normalizeTitleSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_TITLE_SETTINGS }
  return {
    vibration: typeof value.vibration === 'boolean' ? value.vibration : DEFAULT_TITLE_SETTINGS.vibration,
    reducedEffects: typeof value.reducedEffects === 'boolean' ? value.reducedEffects : DEFAULT_TITLE_SETTINGS.reducedEffects,
    unlockAllWeaponsCheat: typeof value.unlockAllWeaponsCheat === 'boolean'
      ? value.unlockAllWeaponsCheat
      : DEFAULT_TITLE_SETTINGS.unlockAllWeaponsCheat,
  }
}

function normalizePlayActivity(activity) {
  if (!activity || typeof activity !== 'object') return null
  if (typeof activity.lastStageId !== 'string' || activity.lastStageId.trim().length === 0) return null
  if (typeof activity.lastStartedAt !== 'string' || Number.isNaN(Date.parse(activity.lastStartedAt))) return null
  return {
    lastStageId: activity.lastStageId.trim(),
    lastStartedAt: activity.lastStartedAt,
  }
}

function cloneRuntime(value) {
  return {
    uid: value.uid,
    hydrated: value.hydrated,
    profile: { ...value.profile },
    progress: cloneProgress(value.progress),
    activity: value.activity ? { ...value.activity } : null,
  }
}

function cloneProgress(progress) {
  return {
    goldTotal: progress.goldTotal,
    records: { ...progress.records },
    weaponUnlocks: { ...progress.weaponUnlocks },
    weaponPermanentUpgrades: { ...progress.weaponPermanentUpgrades },
    passiveUpgrades: { ...progress.passiveUpgrades },
    titleSettings: { ...progress.titleSettings },
  }
}

function readNonNegativeInt(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0
}

function readEnv(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readString(value) {
  return typeof value === 'string' ? value : ''
}

function readUserId(user) {
  return typeof user?.uid === 'string' ? user.uid.trim() : ''
}

function getDefaultEnv() {
  if (typeof import.meta !== 'undefined' && import.meta.env) return import.meta.env
  if (typeof process !== 'undefined') return process.env
  return {}
}
