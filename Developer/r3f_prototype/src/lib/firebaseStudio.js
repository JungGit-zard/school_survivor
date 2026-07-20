import { getFirebaseConfig } from './firebaseAuth.js'
import { isFirebaseProgressConfigured } from './firebaseProgress.js'
import { isProjectMaster } from './projectAdmin.js'
import {
  GRAPHICS_STUDIO_TUNING_EVENT,
  STAGE_BOSS_PREVIEW_EVENT,
  TEXTURE_DECALS_EVENT,
  loadStageBossPreview,
  loadStudioTunings,
  loadTextureDecals,
} from './graphicsStudioConfig.js'
import {
  loadSfxTunings,
} from './sfxRegistry.js'
import {
  STAGE_PROP_PLACEMENTS_EVENT,
  loadStagePropPlacements,
} from './stagePropPlacements.js'
import {
  acknowledgeFirebaseStudioRuntimeRevision,
  blockFirebaseStudioRuntime,
  commitFirebaseStudioRuntime,
  getFirebaseStudioRuntimeState,
  isFirebaseStudioRuntimeReady,
} from './studioRuntimeState.js'

export const FIREBASE_STUDIO_SCHEMA_VERSION = 1
export const FIREBASE_STUDIO_REVISION_EVENT = 'escape-zombie-school.firebaseStudioRevision.changed'
export const FIREBASE_STUDIO_DATASET_KEYS = Object.freeze([
  'tunings',
  'sfxTunings',
  'stageBossPreview',
  'decals',
  'propPlacements',
])

const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const SAVE_DEBOUNCE_MS = 500

let studioUser = null
let studioUserGeneration = 0
let localMutationGeneration = 0
let studioClientPromise = null
let studioClientFactory = createFirebaseStudioClient
let pendingSaveOptions = null
let saveTimer = null
let flushWorkerPromise = null
let flushWorkerActive = false
let studioOwnerUid = ''
let studioDirtyUid = ''
const deferredRemoteSnapshots = new Map()

export function getUserStudioPath(user = studioUser) {
  const uid = typeof user?.uid === 'string' ? user.uid.trim() : ''
  return uid ? `studioWorkspaces/v1/users/${uid}/current` : ''
}

export function loadStudioRuntimeDatasets() {
  return {
    tunings: loadStudioTunings(),
    sfxTunings: loadSfxTunings(),
    stageBossPreview: loadStageBossPreview(),
    decals: loadTextureDecals(),
    propPlacements: loadStagePropPlacements(),
  }
}

export function markFirebaseStudioLocalChange(user = studioUser) {
  const uid = readUid(user)
  if (!uid || !isFirebaseStudioRuntimeReady()) return false
  studioOwnerUid = uid
  studioDirtyUid = uid
  localMutationGeneration += 1
  return true
}

export function buildFirebaseStudioSnapshot(
  datasets,
  { revision = 0, now = Date.now() } = {},
) {
  return {
    schemaVersion: FIREBASE_STUDIO_SCHEMA_VERSION,
    revision: normalizeRevision(revision),
    updatedAt: new Date(now).toISOString(),
    datasets: pickStudioDatasets(datasets),
  }
}

export function normalizeFirebaseStudioSnapshot(snapshot) {
  if (!isObject(snapshot) || snapshot.schemaVersion !== FIREBASE_STUDIO_SCHEMA_VERSION) return null
  if (!Number.isInteger(snapshot.revision) || snapshot.revision < 0) return null
  if (typeof snapshot.updatedAt !== 'string' || Number.isNaN(Date.parse(snapshot.updatedAt))) return null
  if (snapshot.datasets !== undefined && !isObject(snapshot.datasets)) return null

  const datasets = snapshot.datasets ?? {}
  if (FIREBASE_STUDIO_DATASET_KEYS.some((key) => (
    datasets[key] !== undefined && !isObject(datasets[key])
  ))) return null

  return {
    ...snapshot,
    schemaVersion: FIREBASE_STUDIO_SCHEMA_VERSION,
    revision: snapshot.revision,
    updatedAt: snapshot.updatedAt,
    datasets: {
      tunings: datasets.tunings ?? {},
      sfxTunings: datasets.sfxTunings ?? {},
      stageBossPreview: datasets.stageBossPreview ?? {},
      decals: datasets.decals ?? {},
      propPlacements: datasets.propPlacements ?? {},
    },
  }
}

export function encodeFirebaseStudioSnapshotForStorage(snapshot) {
  if (!isObject(snapshot) || !isObject(snapshot.datasets)) return snapshot
  return {
    ...snapshot,
    datasets: Object.fromEntries(FIREBASE_STUDIO_DATASET_KEYS.map((key) => [
      key,
      JSON.stringify(snapshot.datasets[key] ?? {}),
    ])),
  }
}

export function decodeFirebaseStudioSnapshotFromStorage(snapshot) {
  if (!isObject(snapshot) || !isObject(snapshot.datasets)) return snapshot
  const datasets = {}
  for (const key of FIREBASE_STUDIO_DATASET_KEYS) {
    const value = snapshot.datasets[key]
    if (value === undefined) continue
    if (typeof value !== 'string') {
      datasets[key] = value
      continue
    }
    try {
      datasets[key] = JSON.parse(value)
    } catch {
      return {
        ...snapshot,
        datasets: {
          ...snapshot.datasets,
          [key]: null,
        },
      }
    }
  }
  return {
    ...snapshot,
    datasets,
  }
}

export function applyFirebaseStudioSnapshot(snapshot) {
  const normalized = normalizeFirebaseStudioSnapshot(snapshot)
  if (!normalized) return false
  return applyFirebaseStudioDatasets(normalized.datasets, { revision: normalized.revision })
}

export function applyFirebaseStudioDatasets(datasets, { revision = null } = {}) {
  if (!isObject(datasets) || FIREBASE_STUDIO_DATASET_KEYS.some((key) => (
    datasets[key] !== undefined && !isObject(datasets[key])
  ))) return false

  commitFirebaseStudioRuntime(pickStudioDatasets(datasets), { revision })
  emitStudioRuntimeDatasets()
  return true
}

export async function hydrateFirebaseStudio({
  user = studioUser,
  client,
  env = getDefaultEnv(),
  now = Date.now(),
} = {}) {
  const path = getUserStudioPath(user)
  if (!path) return { status: 'unauthenticated' }
  const uid = readUid(user)
  const activeUidAtStart = readUid(studioUser)
  const userGenerationAtStart = studioUserGeneration
  const mutationGenerationAtStart = localMutationGeneration
  const ownerUid = studioOwnerUid
  const dirtyUid = studioDirtyUid
  if (ownerUid && ownerUid !== uid && dirtyUid && dirtyUid !== uid) {
    return { status: 'account-conflict', ownerUid }
  }

  const resolved = await resolveStudioClient(client, env)
  if (resolved.status) return resolved

  if (dirtyUid === uid) {
    const saved = await saveFirebaseStudio({
      user,
      client: resolved.client,
      datasets: loadStudioRuntimeDatasets(),
      now,
    })
    if (saved.status !== 'saved') return saved
  }

  let remote
  try {
    remote = await resolved.client.load(path)
  } catch (error) {
    return { status: 'read-failed', error }
  }

  if (!isHydrateUserCurrent(uid, activeUidAtStart, userGenerationAtStart)) {
    return { status: 'stale-user' }
  }
  if (localMutationGeneration !== mutationGenerationAtStart) {
    return { status: 'local-changed' }
  }

  if (remote === null || remote === undefined) {
    return { status: 'missing-remote' }
  }

  if (isFutureSchema(remote)) {
    return { status: 'future-version', schemaVersion: remote.schemaVersion }
  }
  const normalized = normalizeFirebaseStudioSnapshot(remote)
  if (!normalized) return { status: 'invalid-remote' }

  if (!applyFirebaseStudioSnapshot(normalized)) return { status: 'apply-failed' }
  claimLocalWorkspace(uid)
  return { status: 'remote-applied', revision: normalized.revision }
}

// ── 완전한 예외(사용자 확정 2026-07-19): 주인공 캐릭터 튜닝만 공개 정본 노드로 분리 ──
// 로그인 전(uid 없음)에도 절대 대전제(세팅값 미적용 오브젝트 렌더 금지)를 지키며 타이틀 주인공을
// 튜닝 적용 상태로 보이기 위한 유일 경로. Firebase-only 유지(로컬 시드/localStorage 아님) —
// "현재 사용자 스냅샷만 소비" 규칙에 대한 의도적 예외. 읽기 공개 / 쓰기 마스터 전용
// (database.rules.json studioWorkspaces/v1/canonicalTitlePlayer).
export const CANONICAL_TITLE_PLAYER_PATH = 'studioWorkspaces/v1/canonicalTitlePlayer/current'

function pickPlayerTunings(tunings) {
  const source = isObject(tunings) ? tunings : {}
  const out = {}
  for (const key of Object.keys(source)) {
    if (key === 'player' || key.startsWith('player::')) out[key] = source[key]
  }
  return out
}

// 마스터의 현재 주인공 튜닝을 공개 정본 노드에 게시(마스터 전용). tunings는 player 키만 담는다.
export async function publishCanonicalTitlePlayer({
  user = studioUser,
  client,
  env = getDefaultEnv(),
  now = Date.now(),
} = {}) {
  if (!isProjectMaster(user)) return { status: 'forbidden' }
  const playerTunings = pickPlayerTunings(loadStudioTunings())
  const resolved = await resolveStudioClient(client, env)
  if (resolved.status) return resolved
  let nextRevision = null
  try {
    const result = await resolved.client.transaction(CANONICAL_TITLE_PLAYER_PATH, (current) => {
      if (isFutureSchema(current)) return undefined
      const revision = current?.schemaVersion === FIREBASE_STUDIO_SCHEMA_VERSION
        ? normalizeRevision(current.revision) + 1
        : 1
      nextRevision = revision
      return buildFirebaseStudioSnapshot({ tunings: playerTunings }, { revision, now })
    })
    if (result?.committed === false) return { status: 'write-aborted' }
    return { status: 'published', revision: nextRevision }
  } catch (error) {
    return { status: 'write-failed', error }
  }
}

// 공개 정본 노드에서 주인공 튜닝을 읽어 런타임에 적용(로그인 전 전용 — 인증 불필요).
// 로그인 사용자 세션에서는 호출하지 않는다(본인 전체 스냅샷을 덮어쓰지 않기 위함).
export async function hydrateCanonicalTitlePlayer({
  client,
  env = getDefaultEnv(),
} = {}) {
  const resolved = await resolveStudioClient(client, env)
  if (resolved.status) return resolved
  let remote
  try {
    remote = await resolved.client.load(CANONICAL_TITLE_PLAYER_PATH)
  } catch (error) {
    return { status: 'read-failed', error }
  }
  if (remote === null || remote === undefined) return { status: 'missing-remote' }
  if (isFutureSchema(remote)) return { status: 'future-version', schemaVersion: remote.schemaVersion }
  const normalized = normalizeFirebaseStudioSnapshot(remote)
  if (!normalized) return { status: 'invalid-remote' }
  if (!applyFirebaseStudioSnapshot(normalized)) return { status: 'apply-failed' }
  return { status: 'remote-applied', revision: normalized.revision }
}

export async function subscribeFirebaseStudio({
  user = studioUser,
  client,
  env = getDefaultEnv(),
  onResult = () => {},
} = {}) {
  const path = getUserStudioPath(user)
  if (!path) return { status: 'unauthenticated', unsubscribe: () => {} }
  const uid = readUid(user)
  const resolved = await resolveStudioClient(client, env)
  if (resolved.status) return { ...resolved, unsubscribe: () => {} }
  if (typeof resolved.client.subscribe !== 'function') {
    return { status: 'subscription-unavailable', unsubscribe: () => {} }
  }

  let active = true
  const unsubscribe = resolved.client.subscribe(
    path,
    (remote) => {
      if (!active) return
      const result = applySubscribedFirebaseStudioSnapshot(remote, { uid })
      onResult(result)
    },
    (error) => {
      if (!active) return
      blockFirebaseStudioRuntime()
      onResult({ status: 'subscription-error', error })
    },
  )

  return {
    status: 'subscribed',
    unsubscribe: () => {
      active = false
      unsubscribe?.()
    },
  }
}

export function applySubscribedFirebaseStudioSnapshot(remote, { uid = readUid(studioUser) } = {}) {
  if (!uid || readUid(studioUser) !== uid) return { status: 'stale-user' }
  if (remote === null || remote === undefined) {
    blockFirebaseStudioRuntime()
    return { status: 'missing-remote' }
  }
  if (isFutureSchema(remote)) {
    blockFirebaseStudioRuntime()
    return { status: 'future-version', schemaVersion: remote.schemaVersion }
  }

  const normalized = normalizeFirebaseStudioSnapshot(remote)
  if (!normalized) {
    blockFirebaseStudioRuntime()
    return { status: 'invalid-remote' }
  }

  const currentRevision = getFirebaseStudioRuntimeState().revision
  if (Number.isInteger(currentRevision) && normalized.revision <= currentRevision) {
    return { status: 'current-revision', revision: currentRevision }
  }
  if (studioDirtyUid === uid) {
    const deferred = deferredRemoteSnapshots.get(uid)
    if (!deferred || normalized.revision > deferred.revision) {
      deferredRemoteSnapshots.set(uid, normalized)
    }
    return { status: 'deferred-local-dirty', revision: normalized.revision }
  }
  if (!applyFirebaseStudioSnapshot(normalized)) {
    blockFirebaseStudioRuntime()
    return { status: 'apply-failed' }
  }
  claimLocalWorkspace(uid)
  return { status: 'remote-applied', revision: normalized.revision }
}

export async function saveFirebaseStudio({
  user = studioUser,
  client,
  env = getDefaultEnv(),
  datasets,
  now = Date.now(),
} = {}) {
  const path = getUserStudioPath(user)
  if (!path) return { status: 'unauthenticated' }
  const uid = readUid(user)
  const mutationGenerationAtStart = localMutationGeneration
  const resolvedDatasets = datasets ?? loadStudioRuntimeDatasets()

  const resolved = await resolveStudioClient(client, env)
  if (resolved.status) return resolved

  let futureSchemaVersion = null
  let nextRevision = null
  try {
    const result = await resolved.client.transaction(path, (current) => {
      if (isFutureSchema(current)) {
        futureSchemaVersion = current.schemaVersion
        return undefined
      }
      const revision = current?.schemaVersion === FIREBASE_STUDIO_SCHEMA_VERSION
        ? normalizeRevision(current.revision) + 1
        : 1
      nextRevision = revision
      return {
        ...(isObject(current) ? current : {}),
        ...buildFirebaseStudioSnapshot(resolvedDatasets, { revision, now }),
      }
    })

    if (futureSchemaVersion !== null) {
      return { status: 'future-version', schemaVersion: futureSchemaVersion }
    }
    if (result?.committed === false) return { status: 'write-aborted' }
    if (localMutationGeneration === mutationGenerationAtStart) {
      acknowledgeFirebaseStudioRuntimeRevision(nextRevision)
    }
    claimLocalWorkspace(uid, mutationGenerationAtStart)
    applyDeferredFirebaseStudioSnapshot(uid)
    return { status: 'saved', revision: nextRevision }
  } catch (error) {
    return { status: 'write-failed', error }
  }
}

export function setFirebaseStudioUser(user) {
  const previousUid = readUid(studioUser)
  const nextUid = readUid(user)
  if (previousUid !== nextUid) {
    studioUserGeneration += 1
    if (saveTimer !== null) clearTimeout(saveTimer)
    saveTimer = null
    pendingSaveOptions = null
    blockFirebaseStudioRuntime()
    studioOwnerUid = ''
    studioDirtyUid = ''
    deferredRemoteSnapshots.clear()
  }
  studioUser = user ?? null
}

export function requestFirebaseStudioSave(options = {}) {
  markFirebaseStudioLocalChange(options.user ?? studioUser)
  pendingSaveOptions = { ...(pendingSaveOptions ?? {}), ...options }
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void flushFirebaseStudioSave()
  }, SAVE_DEBOUNCE_MS)
}

export function flushFirebaseStudioSave(options = {}) {
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = null
  if (pendingSaveOptions !== null) {
    pendingSaveOptions = { ...pendingSaveOptions, ...options }
  }
  if (flushWorkerPromise && flushWorkerActive) return flushWorkerPromise
  flushWorkerPromise = null
  if (pendingSaveOptions === null) return Promise.resolve({ status: 'no-pending' })
  flushWorkerActive = true
  const worker = drainPendingStudioSaves()
  flushWorkerPromise = worker
  const clearWorker = () => {
    if (flushWorkerPromise === worker) flushWorkerPromise = null
  }
  void worker.then(clearWorker, clearWorker)
  return worker
}

async function drainPendingStudioSaves() {
  let lastResult = { status: 'no-pending' }
  try {
    while (pendingSaveOptions !== null) {
      const nextOptions = pendingSaveOptions
      pendingSaveOptions = null
      const generation = studioUserGeneration
      const result = await saveFirebaseStudio(nextOptions)
      lastResult = result
      if (generation !== studioUserGeneration) continue
      nextOptions.onResult?.(result)
      if (isTransientSaveFailure(result?.status) && pendingSaveOptions === null) {
        pendingSaveOptions = nextOptions
        break
      }
    }
    return lastResult
  } finally {
    flushWorkerActive = false
  }
}

async function resolveStudioClient(client, env) {
  if (client) return { client }
  if (!isFirebaseProgressConfigured(env)) return { status: 'unconfigured' }
  try {
    return { client: await getStudioClient(env) }
  } catch (error) {
    return { status: 'client-unavailable', error }
  }
}

async function getStudioClient(env) {
  if (!studioClientPromise) studioClientPromise = studioClientFactory(env)
  try {
    return await studioClientPromise
  } catch (error) {
    studioClientPromise = null
    throw error
  }
}

export function _setFirebaseStudioClientFactoryForTests(factory = createFirebaseStudioClient) {
  studioClientFactory = factory
  studioClientPromise = null
}

async function createFirebaseStudioClient(env) {
  const [{ initializeApp, getApp, getApps }, databaseModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/database'),
  ])
  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig(env))
  const database = databaseModule.getDatabase(app, readEnv(env, DATABASE_URL_KEY))

  return {
    load: async (path) => {
      const snapshot = await databaseModule.get(databaseModule.ref(database, path))
      return snapshot.exists()
        ? decodeFirebaseStudioSnapshotFromStorage(snapshot.val())
        : null
    },
    transaction: async (path, update) => {
      const result = await databaseModule.runTransaction(
        databaseModule.ref(database, path),
        (storedValue) => {
          const nextValue = update(decodeFirebaseStudioSnapshotFromStorage(storedValue))
          return nextValue === undefined
            ? undefined
            : encodeFirebaseStudioSnapshotForStorage(nextValue)
        },
      )
      return {
        committed: result.committed,
      }
    },
    subscribe: (path, onValue, onError) => databaseModule.onValue(
      databaseModule.ref(database, path),
      (snapshot) => {
        onValue(snapshot.exists()
          ? decodeFirebaseStudioSnapshotFromStorage(snapshot.val())
          : null)
      },
      onError,
    ),
  }
}

function pickStudioDatasets(datasets) {
  const source = isObject(datasets) ? datasets : {}
  return Object.fromEntries(FIREBASE_STUDIO_DATASET_KEYS.map((key) => [
    key,
    source[key] ?? {},
  ]))
}

function claimLocalWorkspace(uid, savedMutationGeneration) {
  if (!uid) return
  studioOwnerUid = uid
  const canClearDirty = savedMutationGeneration === undefined
    || savedMutationGeneration === localMutationGeneration
  if (canClearDirty && studioDirtyUid === uid) {
    studioDirtyUid = ''
  }
}

function applyDeferredFirebaseStudioSnapshot(uid) {
  if (!uid || studioDirtyUid === uid) return false
  const deferred = deferredRemoteSnapshots.get(uid)
  if (!deferred) return false
  deferredRemoteSnapshots.delete(uid)
  const currentRevision = getFirebaseStudioRuntimeState().revision
  if (Number.isInteger(currentRevision) && deferred.revision <= currentRevision) return false
  return applyFirebaseStudioSnapshot(deferred)
}

function isHydrateUserCurrent(uid, activeUidAtStart, generationAtStart) {
  if (!activeUidAtStart) return true
  return readUid(studioUser) === uid && studioUserGeneration === generationAtStart
}

function emitStudioRuntimeDatasets() {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return
  const restored = loadStudioRuntimeDatasets()
  const events = [
    [GRAPHICS_STUDIO_TUNING_EVENT, restored.tunings],
    ['escape-zombie-school.sfxTunings.changed', restored.sfxTunings],
    [STAGE_BOSS_PREVIEW_EVENT, restored.stageBossPreview],
    [TEXTURE_DECALS_EVENT, restored.decals],
    [STAGE_PROP_PLACEMENTS_EVENT, restored.propPlacements],
    [FIREBASE_STUDIO_REVISION_EVENT, getFirebaseStudioRuntimeState().revision],
  ]
  for (const [type, detail] of events) {
    try {
      window.dispatchEvent(new CustomEvent(type, { detail }))
    } catch {
      // Rollback notification is best effort.
    }
  }
}

function isFutureSchema(value) {
  return Number.isInteger(value?.schemaVersion)
    && value.schemaVersion > FIREBASE_STUDIO_SCHEMA_VERSION
}

function normalizeRevision(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0
}

function isTransientSaveFailure(status) {
  return [
    'write-failed',
    'write-aborted',
    'client-unavailable',
    'unconfigured',
  ].includes(status)
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readEnv(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readUid(user) {
  return typeof user?.uid === 'string' ? user.uid.trim() : ''
}

function getDefaultEnv() {
  return import.meta.env ?? {}
}
