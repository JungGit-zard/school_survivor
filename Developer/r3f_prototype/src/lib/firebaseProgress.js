import { getFirebaseConfig, isFirebaseAuthConfigured } from './firebaseAuth.js'
import { load as loadPlayerRecords } from './playerRecords.js'
import { getAllLevels } from './passiveUpgrades.js'
import { getAllUnlocked } from './weaponUnlocks.js'

const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const GOLD_STORAGE_KEY = 'school_survivor:goldTotal'
const TITLE_SETTINGS_STORAGE_KEY = 'school_survivor:titleSettings'
const SCHEMA_VERSION = 1

let cloudUser = null
let progressClientPromise = null

export function isFirebaseProgressConfigured(env = getDefaultEnv()) {
  return isFirebaseAuthConfigured(env) && readEnv(env, DATABASE_URL_KEY).length > 0
}

export function getUserProgressPath(user = cloudUser) {
  if (!user || typeof user.uid !== 'string' || user.uid.trim().length === 0) return ''
  return `users/${user.uid.trim()}`
}

export function buildCloudUserProfile(user = cloudUser) {
  if (!user) return null
  return {
    uid: readString(user.uid),
    displayName: readString(user.displayName),
    email: readString(user.email),
    photoURL: readString(user.photoURL),
  }
}

export function buildCloudProgressSnapshot(now = Date.now()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date(now).toISOString(),
    progress: {
      goldTotal: readGoldTotal(),
      records: loadPlayerRecords(),
      weaponUnlocks: buildWeaponUnlockSnapshot(),
      passiveUpgrades: getAllLevels(),
      titleSettings: readJsonObject(TITLE_SETTINGS_STORAGE_KEY),
    },
  }
}

export function setCloudProgressUser(user) {
  cloudUser = user ?? null
}

export async function saveLocalProgressToCloud(user = cloudUser) {
  const path = getUserProgressPath(user)
  if (!path || !isFirebaseProgressConfigured()) return false

  const client = await getProgressClient()
  await client.save(path, {
    profile: buildCloudUserProfile(user),
    ...buildCloudProgressSnapshot(),
  })
  return true
}

export function requestCloudProgressSave() {
  if (!cloudUser || !isFirebaseProgressConfigured()) return
  void saveLocalProgressToCloud().catch((error) => {
    if (typeof console !== 'undefined') {
      console.warn('Firebase progress save failed.', error)
    }
  })
}

async function getProgressClient() {
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
  }
}

function buildWeaponUnlockSnapshot() {
  const out = {}
  for (const id of getAllUnlocked()) {
    out[id] = 1
  }
  return out
}

function readGoldTotal() {
  if (typeof localStorage === 'undefined') return 0
  const value = Number(localStorage.getItem(GOLD_STORAGE_KEY))
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

function readJsonObject(key) {
  if (typeof localStorage === 'undefined') return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function readEnv(env, key) {
  const value = env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function readString(value) {
  return typeof value === 'string' ? value : ''
}

function getDefaultEnv() {
  return import.meta.env ?? {}
}
