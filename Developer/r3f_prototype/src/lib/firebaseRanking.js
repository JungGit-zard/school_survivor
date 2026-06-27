import { getFirebaseConfig } from './firebaseAuth.js'

const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'

function getEnv() { return import.meta.env ?? {} }
function readEnv(key) {
  const v = getEnv()[key]
  return typeof v === 'string' ? v.trim() : ''
}

export function isFirebaseRankingConfigured() {
  return readEnv(DATABASE_URL_KEY).length > 0
}

// ponytail: singleton promise — same pattern as firebaseProgress.js
let _clientPromise = null
async function getClient() {
  if (!_clientPromise) _clientPromise = createClient()
  return _clientPromise
}

async function createClient() {
  const [{ initializeApp, getApp, getApps }, db] = await Promise.all([
    import('firebase/app'),
    import('firebase/database'),
  ])
  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig(getEnv()))
  const database = db.getDatabase(app, readEnv(DATABASE_URL_KEY))
  return { db: database, mod: db }
}

// uid당 베스트 스코어만 유지: 기존 서버 값보다 높을 때만 덮어씀.
export async function submitRankingEntry(user, entry, seasonId) {
  if (!user?.uid || !isFirebaseRankingConfigured()) return
  const { db, mod } = await getClient()
  const path = `rankings/${seasonId}/entries/${user.uid}`
  const existing = await mod.get(mod.ref(db, path))
  if (existing.exists() && existing.val().score >= entry.score) return
  await mod.update(mod.ref(db, path), entry)
}

// top N을 score 내림차순으로 반환.
export async function fetchTopRanking(seasonId, limit = 100) {
  if (!isFirebaseRankingConfigured()) return []
  const { db, mod } = await getClient()
  const q = mod.query(
    mod.ref(db, `rankings/${seasonId}/entries`),
    mod.orderByChild('score'),
    mod.limitToLast(limit),
  )
  const snap = await mod.get(q)
  if (!snap.exists()) return []
  const entries = []
  snap.forEach((child) => entries.push({ uid: child.key, ...child.val() }))
  return entries.reverse() // limitToLast 오름차순 → 뒤집어 내림차순
}
