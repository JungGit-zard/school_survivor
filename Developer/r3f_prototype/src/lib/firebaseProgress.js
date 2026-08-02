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
  'stage4Clears',
  'stage4BestSurvivalSec',
  'bossKills',
  'totalLevelUps',
  'totalPickups',
  'weaponMasterCount',
]

const DEFAULT_TITLE_SETTINGS = Object.freeze({
  vibration: true,
  reducedEffects: false,
  unlockAllWeaponsCheat: false,
  unlockAllStagesCheat: false,
})

let cloudUser = null
let progressClientPromise = null
let testProgressClient = null
let writeQueue = Promise.resolve()
let storageGuardInstalled = false

const VITEST_PROGRESS_CLIENT = Object.freeze({
  loadOrCreate: async () => null,
  save: async () => true,
  remove: async () => true,
})

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
  const requestedUid = readUserId(user)
  const path = getUserProgressPath(user)
  if (!path) throw new FirebaseProgressError('Firebase progress hydrate requires an authenticated uid.', 'unauthenticated')
  if (!isFirebaseProgressConfigured()) throw new FirebaseProgressError('Firebase progress is not configured.', 'unconfigured')

  try {
    const client = await getProgressClient()
    const snapshot = await client.loadOrCreate(path, createInitialRemotePayload(user))
    if (readUserId(cloudUser) !== requestedUid) return false
    if (!snapshot) {
      runtime = createEmptyRuntime(requestedUid)
      throw new FirebaseProgressError(`Remote Firebase user snapshot is missing at ${path}.`, 'missing-remote')
    }
    if (!applyCloudProgressSnapshot(snapshot, user)) {
      runtime = createEmptyRuntime(requestedUid)
      throw new FirebaseProgressError(`Remote Firebase user snapshot is invalid at ${path}.`, 'invalid-remote')
    }
    return true
  } catch (error) {
    if (readUserId(cloudUser) !== requestedUid) return false
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

// E2E의 메모리 전용 진행도를 hydrated 상태로 만들되, 가짜 uid를 Firebase 쓰기 대상으로
// 등록하지 않는다. 기본값은 일반 Firebase 로그인 경로의 기존 동작을 그대로 보존한다.
export function applyCloudProgressSnapshot(snapshot, user = cloudUser, { keepCloudUserNull = false } = {}) {
  const uid = readUserId(user)
  if (!uid) return false
  const normalized = normalizeRemoteSnapshot(snapshot, uid, user)
  if (!normalized) return false
  cloudUser = keepCloudUserNull ? null : (user ?? cloudUser)
  runtime = {
    uid,
    hydrated: true,
    profile: normalized.profile,
    progress: normalized.progress,
    activity: normalized.activity,
    consent: normalized.consent,
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

// 약관/개인정보 동의 기록은 users/{uid}.consent — profile·progress 안이 아니라 activity와
// 같은 최상위 형제 노드다. normalizeProfile/normalizeProgress가 화이트리스트 밖 키를 버리기
// 때문에 그 안에는 애초에 실을 수 없고, 보안 규칙도 노드별로 검증하므로 정체성 성격의
// 동의 기록을 독립 노드로 두는 편이 규칙 단위와 1:1로 맞는다.
export function readFirebasePlayerConsent() {
  ensureHydrated()
  return cloneConsent(runtime.consent)
}

// null을 넘기면 기록을 비운다(저장 실패 롤백 경로에서 사용).
export function writeFirebasePlayerConsent(consent) {
  ensureHydrated()
  runtime = { ...runtime, consent: normalizeConsent(consent) }
  return cloneConsent(runtime.consent)
}

// 계정 삭제 경로 전용. users/{uid} 문서 전체를 제거한다.
// Realtime Database의 remove는 노드가 이미 없어도 성공하므로 재시도가 멱등적이다.
export async function deleteFirebaseProgressDocument(user = cloudUser) {
  const path = getUserProgressPath(user)
  if (!path) throw new FirebaseProgressError('Firebase progress delete requires an authenticated uid.', 'unauthenticated')
  const client = await getProgressClient()
  // 런타임을 먼저 비워 대기 중인 저장 큐가 삭제 직후 문서를 되살리지 못하게 한다.
  // 이미 실행 중인 저장은 큐를 흘려보낸 뒤 삭제한다.
  runtime = createEmptyRuntime()
  cloudUser = null
  await writeQueue.catch(() => {})
  await client.remove(path)
  return true
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

// writeQueue는 쓰기 순서를 직렬화하는 용도일 뿐이며, 절대 rejected 상태로 남으면 안 된다.
// rejected promise에 .then(handler)를 걸면 handler가 아예 실행되지 않으므로, 저장이 한 번
// 실패한 순간부터 그 세션의 모든 코인·업그레이드 저장이 조용히 건너뛰어진다(오프라인 한 번에
// 이후 진행도 전부 유실). 실패는 큐에서 흡수하고 호출자에게는 false로 알린다.
export async function requestCloudProgressSave(user = cloudUser) {
  if (!isFirebaseProgressHydrated(user)) return false
  if (!isFirebaseProgressConfigured()) return false
  const uidAtRequest = readUserId(user)
  const path = getUserProgressPath(user)
  const payload = buildRemotePayload()
  const attempt = writeQueue.then(async () => {
    if (!isFirebaseProgressHydrated({ uid: uidAtRequest })) return false
    const client = await getProgressClient()
    await client.save(path, payload)
    return true
  }).catch(() => false)
  writeQueue = attempt
  return attempt
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

export function _selectInitialProgressValueForTransaction(currentValue, initialValue) {
  return currentValue === null ? initialValue : undefined
}

export function _resetFirebaseProgressForTests() {
  cloudUser = null
  progressClientPromise = null
  // Vitest must never fall through to the real Firebase SDK after a reset.
  // Tests that need transport behavior replace this with their explicit fake.
  testProgressClient = VITEST_PROGRESS_CLIENT
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
    remove: (path) => databaseModule.remove(databaseModule.ref(database, path)),
    loadOrCreate: async (path, initialValue) => {
      const result = await databaseModule.runTransaction(
        databaseModule.ref(database, path),
        (currentValue) => _selectInitialProgressValueForTransaction(currentValue, initialValue),
        { applyLocally: false },
      )
      return result.snapshot.exists() ? result.snapshot.val() : null
    },
  }
}

function createInitialRemotePayload(user, now = Date.now()) {
  const uid = readUserId(user)
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date(now).toISOString(),
    profile: {
      uid,
      displayName: readString(user?.displayName).slice(0, 100),
      nickname: '',
    },
    progress: createEmptyProgress(),
  }
}

function buildRemotePayload(now = Date.now()) {
  ensureHydrated()
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date(now).toISOString(),
    profile: { ...runtime.profile },
    ...(runtime.activity ? { activity: { ...runtime.activity } } : {}),
    ...(runtime.consent ? { consent: cloneConsent(runtime.consent) } : {}),
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
    consent: normalizeConsent(snapshot.consent),
  }
}

function createEmptyRuntime(uid = '') {
  return {
    uid,
    hydrated: false,
    profile: normalizeProfile({ uid }, uid),
    progress: createEmptyProgress(),
    activity: null,
    consent: null,
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
    unlockAllStagesCheat: typeof value.unlockAllStagesCheat === 'boolean'
      ? value.unlockAllStagesCheat
      : DEFAULT_TITLE_SETTINGS.unlockAllStagesCheat,
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

function normalizeConsent(consent) {
  if (!consent || typeof consent !== 'object' || Array.isArray(consent)) return null
  const terms = normalizeConsentItem(consent.terms)
  const privacy = normalizeConsentItem(consent.privacy)
  if (!terms && !privacy) return null
  return {
    ...(terms ? { terms } : {}),
    ...(privacy ? { privacy } : {}),
  }
}

function normalizeConsentItem(item) {
  if (!item || typeof item !== 'object') return null
  const version = Number(item.version)
  if (!Number.isFinite(version) || version < 1) return null
  const acceptedAt = readString(item.acceptedAt)
  if (!acceptedAt || Number.isNaN(Date.parse(acceptedAt))) return null
  return { version: Math.floor(version), acceptedAt }
}

function cloneConsent(consent) {
  if (!consent) return null
  return {
    ...(consent.terms ? { terms: { ...consent.terms } } : {}),
    ...(consent.privacy ? { privacy: { ...consent.privacy } } : {}),
  }
}

function cloneRuntime(value) {
  return {
    uid: value.uid,
    hydrated: value.hydrated,
    profile: { ...value.profile },
    progress: cloneProgress(value.progress),
    activity: value.activity ? { ...value.activity } : null,
    consent: cloneConsent(value.consent),
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
