import { getFirebaseConfig } from './firebaseAuth.js'
import { isE2EAuthBypass } from './e2eAuth.js'

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

export async function submitRankingEntry(user, entry, seasonId) {
  if (!user?.uid || !isFirebaseRankingConfigured()) return
  // E2E 우회 유저 점수는 실랭킹에 오염되지 않게 차단
  if (isE2EAuthBypass()) return
  const { db, mod } = await getClient()
  const entryRef = mod.ref(db, `rankings/${seasonId}/entries/${user.uid}`)
  const nextScore = readScore(entry.score)
  const existing = await mod.get(entryRef)
  if (existing.exists() && readScore(existing.val()?.score) >= nextScore) return
  await mod.set(entryRef, {
    ...entry,
    uid: user.uid,
    displayName: entry.displayName || entry.nickname || user.displayName || '익명',
  })
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
  snap.forEach((child) => {
    const value = child.val() ?? {}
    entries.push({ entryId: child.key, uid: value.uid ?? child.key, ...value })
  })
  return entries.reverse() // limitToLast 오름차순 → 뒤집어 내림차순
}

function readScore(value) {
  const score = Number(value)
  return Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
}
