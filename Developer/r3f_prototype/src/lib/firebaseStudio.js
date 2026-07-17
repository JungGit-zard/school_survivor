import { getFirebaseConfig } from './firebaseAuth.js'
import { isFirebaseProgressConfigured } from './firebaseProgress.js'
import {
  GRAPHICS_STUDIO_STORAGE_KEY,
  GRAPHICS_STUDIO_TUNING_EVENT,
  STAGE_BOSS_PREVIEW_EVENT,
  STAGE_BOSS_PREVIEW_STORAGE_KEY,
  TEXTURE_DECALS_EVENT,
  TEXTURE_DECALS_STORAGE_KEY,
  loadStageBossPreview,
  loadStudioTunings,
  loadTextureDecals,
  saveStageBossPreview,
  saveStudioTunings,
  saveTextureDecals,
} from './graphicsStudioConfig.js'
import {
  SFX_TUNING_STORAGE_KEY,
  loadSfxTunings,
  saveSfxTunings,
} from './sfxRegistry.js'
import {
  STAGE_PROP_PLACEMENTS_STORAGE_KEY,
  STAGE_PROP_PLACEMENTS_EVENT,
  loadStagePropPlacements,
  resetStagePropPlacementsCache,
  saveStagePropPlacements,
} from './stagePropPlacements.js'

export const FIREBASE_STUDIO_SCHEMA_VERSION = 1
export const FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY = 'escape-zombie-school.firebaseStudioOwnerUid.v1'
export const FIREBASE_STUDIO_DIRTY_UID_STORAGE_KEY = 'escape-zombie-school.firebaseStudioDirtyUid.v1'
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

export function getUserStudioPath(user = studioUser) {
  const uid = typeof user?.uid === 'string' ? user.uid.trim() : ''
  return uid ? `studioWorkspaces/v1/users/${uid}/current` : ''
}

export function loadLocalStudioDatasets() {
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
  const storage = getLocalStorage()
  if (!uid || !storage) return false
  storage.setItem(FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY, uid)
  storage.setItem(FIREBASE_STUDIO_DIRTY_UID_STORAGE_KEY, uid)
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

export function applyFirebaseStudioSnapshot(snapshot) {
  const normalized = normalizeFirebaseStudioSnapshot(snapshot)
  if (!normalized) return false
  return applyLocalStudioDatasets(normalized.datasets)
}

export function applyLocalStudioDatasets(datasets) {
  if (!isObject(datasets) || FIREBASE_STUDIO_DATASET_KEYS.some((key) => (
    datasets[key] !== undefined && !isObject(datasets[key])
  ))) return false

  const storage = typeof localStorage !== 'undefined' ? localStorage : null
  const keys = [
    GRAPHICS_STUDIO_STORAGE_KEY,
    SFX_TUNING_STORAGE_KEY,
    STAGE_BOSS_PREVIEW_STORAGE_KEY,
    TEXTURE_DECALS_STORAGE_KEY,
    STAGE_PROP_PLACEMENTS_STORAGE_KEY,
  ]
  const previous = storage
    ? Object.fromEntries(keys.map((key) => [key, storage.getItem(key)]))
    : null

  try {
    // saveStudioTunings patches normal edits. Clear only its authored payload so
    // cloud/game hydration remains a replacement and deleted local keys stay deleted.
    storage?.removeItem(GRAPHICS_STUDIO_STORAGE_KEY)
    saveStudioTunings(datasets.tunings ?? {})
    saveSfxTunings(datasets.sfxTunings ?? {})
    saveStageBossPreview(datasets.stageBossPreview ?? {})
    saveTextureDecals(datasets.decals ?? {})
    saveStagePropPlacements(datasets.propPlacements ?? {})
    return true
  } catch {
    if (storage && previous) {
      for (const key of keys) {
        try {
          if (previous[key] === null) storage.removeItem(key)
          else storage.setItem(key, previous[key])
        } catch {
          // Best effort: the original write error remains the authoritative failure.
        }
      }
    }
    resetStagePropPlacementsCache()
    emitRestoredStudioDatasets()
    return false
  }
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
  const storage = getLocalStorage()
  const ownerUid = storage?.getItem(FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY) ?? ''
  const dirtyUid = storage?.getItem(FIREBASE_STUDIO_DIRTY_UID_STORAGE_KEY) ?? ''
  if (ownerUid && ownerUid !== uid && dirtyUid && dirtyUid !== uid) {
    return { status: 'account-conflict', ownerUid }
  }
  const switchedFromCleanOwner = !!ownerUid && ownerUid !== uid

  const resolved = await resolveStudioClient(client, env)
  if (resolved.status) return resolved

  if (dirtyUid === uid) {
    const saved = await saveFirebaseStudio({
      user,
      client: resolved.client,
      datasets: loadLocalStudioDatasets(),
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
    const datasets = switchedFromCleanOwner ? emptyStudioDatasets() : loadLocalStudioDatasets()
    const result = await saveFirebaseStudio({
      user,
      client: resolved.client,
      datasets,
      now,
    })
    if (result.status !== 'saved') return result
    if (switchedFromCleanOwner && !applyLocalStudioDatasets(datasets)) {
      return { status: 'apply-failed' }
    }
    return { status: 'local-seeded', revision: result.revision }
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

export async function saveFirebaseStudio({
  user = studioUser,
  client,
  env = getDefaultEnv(),
  datasets = loadLocalStudioDatasets(),
  now = Date.now(),
} = {}) {
  const path = getUserStudioPath(user)
  if (!path) return { status: 'unauthenticated' }
  const uid = readUid(user)
  const mutationGenerationAtStart = localMutationGeneration

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
        ...buildFirebaseStudioSnapshot(datasets, { revision, now }),
      }
    })

    if (futureSchemaVersion !== null) {
      return { status: 'future-version', schemaVersion: futureSchemaVersion }
    }
    if (result?.committed === false) return { status: 'write-aborted' }
    claimLocalWorkspace(uid, mutationGenerationAtStart)
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
      return snapshot.exists() ? snapshot.val() : null
    },
    transaction: async (path, update) => {
      const result = await databaseModule.runTransaction(
        databaseModule.ref(database, path),
        update,
      )
      return {
        committed: result.committed,
      }
    },
  }
}

function pickStudioDatasets(datasets) {
  const source = isObject(datasets) ? datasets : {}
  return Object.fromEntries(FIREBASE_STUDIO_DATASET_KEYS.map((key) => [
    key,
    source[key] ?? {},
  ]))
}

function emptyStudioDatasets() {
  return Object.fromEntries(FIREBASE_STUDIO_DATASET_KEYS.map((key) => [key, {}]))
}

function claimLocalWorkspace(uid, savedMutationGeneration) {
  const storage = getLocalStorage()
  if (!uid || !storage) return
  storage.setItem(FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY, uid)
  const canClearDirty = savedMutationGeneration === undefined
    || savedMutationGeneration === localMutationGeneration
  if (canClearDirty && storage.getItem(FIREBASE_STUDIO_DIRTY_UID_STORAGE_KEY) === uid) {
    storage.removeItem(FIREBASE_STUDIO_DIRTY_UID_STORAGE_KEY)
  }
}

function isHydrateUserCurrent(uid, activeUidAtStart, generationAtStart) {
  if (!activeUidAtStart) return true
  return readUid(studioUser) === uid && studioUserGeneration === generationAtStart
}

function emitRestoredStudioDatasets() {
  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return
  const restored = loadLocalStudioDatasets()
  const events = [
    [GRAPHICS_STUDIO_TUNING_EVENT, restored.tunings],
    ['escape-zombie-school.sfxTunings.changed', restored.sfxTunings],
    [STAGE_BOSS_PREVIEW_EVENT, restored.stageBossPreview],
    [TEXTURE_DECALS_EVENT, restored.decals],
    [STAGE_PROP_PLACEMENTS_EVENT, restored.propPlacements],
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

function getLocalStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null
}

function getDefaultEnv() {
  return import.meta.env ?? {}
}
