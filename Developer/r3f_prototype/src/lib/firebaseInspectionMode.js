import { getFirebaseConfig, isFirebaseAuthConfigured, resolveFirebaseAppForRoute } from './firebaseAuth.js'
import { isProjectMaster } from './projectAdmin.js'

export const INSPECTION_MODE_PATH = 'runtimeControl/v1/inspection'
export const INSPECTION_MODE_SCHEMA_VERSION = 1
export const INSPECTION_MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000

const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const MAX_PAST_START_MS = 5 * 60 * 1000
const MAX_MESSAGE_LENGTH = 200

export const INACTIVE_INSPECTION_STATE = Object.freeze({
  schemaVersion: INSPECTION_MODE_SCHEMA_VERSION,
  enabled: false,
  startsAt: 0,
  endsAt: 1,
  message: '',
  updatedAt: 0,
  updatedByUid: '',
})

let inspectionClientFactory = createFirebaseInspectionClient
let inspectionClientPromise = null

export class FirebaseInspectionModeError extends Error {
  constructor(message, code = 'firebase-inspection-mode-error') {
    super(message)
    this.name = 'FirebaseInspectionModeError'
    this.code = code
  }
}

export function isFirebaseInspectionConfigured(env = getDefaultEnv()) {
  return isFirebaseAuthConfigured(env)
    && typeof env?.[DATABASE_URL_KEY] === 'string'
    && env[DATABASE_URL_KEY].trim().length > 0
}

// Invalid or missing remote data must never enable maintenance mode.
export function normalizeInspectionState(value) {
  if (!isValidInspectionState(value)) return { ...INACTIVE_INSPECTION_STATE }
  return {
    schemaVersion: INSPECTION_MODE_SCHEMA_VERSION,
    enabled: value.enabled,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    message: value.message,
    updatedAt: value.updatedAt,
    updatedByUid: value.updatedByUid,
  }
}

export function getInspectionPhase(state, nowMs = Date.now()) {
  const normalized = normalizeInspectionState(state)
  if (!normalized.enabled) return 'inactive'
  if (!Number.isFinite(nowMs) || nowMs < normalized.startsAt) return 'scheduled'
  if (nowMs >= normalized.endsAt) return 'inactive'
  return 'active'
}

export async function startInspection({ user, startsAt, endsAt, message = '' } = {}) {
  assertProjectMaster(user)
  const client = await getInspectionClient()
  const now = await getClientNow(client)
  assertInspectionSchedule({ startsAt, endsAt, message, now })

  const state = {
    schemaVersion: INSPECTION_MODE_SCHEMA_VERSION,
    enabled: true,
    startsAt,
    endsAt,
    message,
    updatedAt: now,
    updatedByUid: user.uid.trim(),
  }
  await client.set(INSPECTION_MODE_PATH, state)
  return state
}

export async function stopInspection({ user } = {}) {
  assertProjectMaster(user)
  const client = await getInspectionClient()
  const now = await getClientNow(client)
  const state = {
    ...INACTIVE_INSPECTION_STATE,
    startsAt: now,
    endsAt: now + 1,
    updatedAt: now,
    updatedByUid: user.uid.trim(),
  }
  await client.set(INSPECTION_MODE_PATH, state)
  return state
}

export async function subscribeInspectionMode({ onState, onError } = {}) {
  if (typeof onState !== 'function') {
    throw new FirebaseInspectionModeError('Inspection mode subscription requires onState.', 'invalid-subscription')
  }
  if (!isFirebaseInspectionConfigured()) {
    const error = new FirebaseInspectionModeError('Firebase inspection mode is not configured.', 'unconfigured')
    onState(toSubscriptionState(INACTIVE_INSPECTION_STATE, 'error', error))
    onError?.(error)
    return () => {}
  }

  try {
    const client = await getInspectionClient()
    return client.subscribe(
      INSPECTION_MODE_PATH,
      (remote) => {
        const valid = isValidInspectionState(remote)
        const state = normalizeInspectionState(remote)
        const error = valid
          ? null
          : new FirebaseInspectionModeError('Inspection mode data is missing or invalid.', 'invalid-remote')
        const status = error ? 'error' : getInspectionPhase(state)
        onState(toSubscriptionState(state, status, error))
        if (error) onError?.(error)
      },
      (error) => {
        const safeError = error instanceof Error
          ? error
          : new FirebaseInspectionModeError('Inspection mode subscription failed.', 'subscription-failed')
        onState(toSubscriptionState(INACTIVE_INSPECTION_STATE, 'error', safeError))
        onError?.(safeError)
      },
    )
  } catch (error) {
    const safeError = error instanceof Error
      ? error
      : new FirebaseInspectionModeError('Inspection mode subscription failed.', 'subscription-failed')
    onState(toSubscriptionState(INACTIVE_INSPECTION_STATE, 'error', safeError))
    onError?.(safeError)
    return () => {}
  }
}

export async function createFirebaseInspectionClient(env = getDefaultEnv()) {
  const [firebaseAppModule, databaseModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/database'),
  ])
  const app = resolveFirebaseAppForRoute(firebaseAppModule, env)
  const database = databaseModule.getDatabase(app, env[DATABASE_URL_KEY].trim())
  const reference = (path) => databaseModule.ref(database, path)

  return {
    set: (path, value) => databaseModule.set(reference(path), value),
    subscribe: (path, onValue, onError) => databaseModule.onValue(
      reference(path),
      (snapshot) => onValue(snapshot.exists() ? snapshot.val() : null),
      onError,
    ),
    getServerNow: async () => {
      try {
        const snapshot = await databaseModule.get(reference('.info/serverTimeOffset'))
        const offset = snapshot.exists() ? snapshot.val() : 0
        return Date.now() + (Number.isFinite(offset) ? offset : 0)
      } catch {
        return Date.now()
      }
    },
  }
}

export function _setFirebaseInspectionClientFactoryForTests(factory = createFirebaseInspectionClient) {
  inspectionClientFactory = factory
  inspectionClientPromise = null
}

export function _resetFirebaseInspectionModeForTests() {
  inspectionClientFactory = createFirebaseInspectionClient
  inspectionClientPromise = null
}

async function getInspectionClient() {
  if (!inspectionClientPromise) inspectionClientPromise = inspectionClientFactory()
  try {
    return await inspectionClientPromise
  } catch (error) {
    inspectionClientPromise = null
    throw error
  }
}

async function getClientNow(client) {
  const now = await client.getServerNow?.()
  return Number.isSafeInteger(now) && now >= 0 ? now : Date.now()
}

function assertProjectMaster(user) {
  if (!isProjectMaster(user) || typeof user?.uid !== 'string' || !user.uid.trim()) {
    throw new FirebaseInspectionModeError('Only the verified Google project master can change inspection mode.', 'forbidden')
  }
}

function assertInspectionSchedule({ startsAt, endsAt, message, now }) {
  if (!Number.isSafeInteger(startsAt) || !Number.isSafeInteger(endsAt)) {
    throw new FirebaseInspectionModeError('Inspection start and end must be integer milliseconds.', 'invalid-period')
  }
  if (endsAt <= startsAt || endsAt - startsAt > INSPECTION_MAX_DURATION_MS) {
    throw new FirebaseInspectionModeError('Inspection duration must be positive and no longer than seven days.', 'invalid-period')
  }
  if (startsAt < now - MAX_PAST_START_MS || startsAt > now + INSPECTION_MAX_DURATION_MS || endsAt > now + INSPECTION_MAX_DURATION_MS) {
    throw new FirebaseInspectionModeError('Inspection period is outside the allowed time window.', 'invalid-period')
  }
  if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
    throw new FirebaseInspectionModeError('Inspection message must be a string of 200 characters or fewer.', 'invalid-message')
  }
}

function isValidInspectionState(value) {
  return !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.schemaVersion === INSPECTION_MODE_SCHEMA_VERSION
    && typeof value.enabled === 'boolean'
    && Number.isSafeInteger(value.startsAt)
    && Number.isSafeInteger(value.endsAt)
    && value.endsAt > value.startsAt
    && value.endsAt - value.startsAt <= INSPECTION_MAX_DURATION_MS
    && typeof value.message === 'string'
    && value.message.length <= MAX_MESSAGE_LENGTH
    && Number.isSafeInteger(value.updatedAt)
    && value.updatedAt >= 0
    && typeof value.updatedByUid === 'string'
    && value.updatedByUid.length > 0
    && value.updatedByUid.length <= 128
}

function toSubscriptionState(state, status, error = null) {
  return {
    ...state,
    phase: getInspectionPhase(state),
    status,
    ...(error ? { error } : {}),
  }
}

function getDefaultEnv() {
  return import.meta.env ?? {}
}
