import { resolveFirebaseAppForRoute } from './firebaseAuth.js'
import { getAuthProviderIds, isProjectMaster } from './projectAdmin.js'
import { getRankingUser, getGuestRankingClient } from './guestRankingIdentity.js'

export const ADMIN_VISITORS_PATH = 'adminVisitors'
let testClient = null
let clientPromise = null
const deletingUids = new Set()
const inflightVisits = new Map()
// Per-uid tail of the visit queue. Concurrent RTDB transactions on one path are
// applied locally in sequence, so a second one sees the first's unresolved
// serverTimestamp placeholder for firstVisitedAt, re-stamps it, and the rules
// (firstVisitedAt is immutable once written) reject it with permission_denied.
const visitChains = new Map()
export function resumeAdminVisitorRecording(user) { if (user?.uid) deletingUids.delete(user.uid) }
let recordedGuestClient = null

export function _setFirebaseAdminVisitorsClientForTests(client) {
  deletingUids.clear()
  inflightVisits.clear()
  visitChains.clear()
  testClient = client
  clientPromise = null
  recordedGuestClient = null
}

async function getClient(user) {
  if (testClient) return testClient
  if (user?.isAnonymous) return getGuestRankingClient()
  if (!clientPromise) clientPromise = (async () => {
    const [apps, mod] = await Promise.all([import('firebase/app'), import('firebase/database')])
    const env = import.meta.env ?? {}
    const app = resolveFirebaseAppForRoute(apps, env)
    return { db: mod.getDatabase(app, env.VITE_FIREBASE_DATABASE_URL), mod }
  })().catch((error) => { clientPromise = null; throw error })
  return clientPromise
}

// Called only for an actual visit/auth-state event. No login metadata or job
// execution time is interpreted as historical gameplay or a historical visit.
export async function recordAdminVisitor(user = null, options = {}) {
  if (deletingUids.has(user?.uid)) return { uid: user.uid, recorded: false, deleting: true }
  const identity = await getRankingUser(user)
  if (deletingUids.has(identity?.uid)) return { uid: identity.uid, recorded: false, deleting: true }
  const uid = identity?.uid
  const operation = (visitChains.get(uid) ?? Promise.resolve()).catch(() => {}).then(() => (
    deletingUids.has(uid) ? { uid, recorded: false, deleting: true } : recordIdentityVisit(identity, options)
  ))
  visitChains.set(uid, operation)
  void operation.catch(() => {}).finally(() => { if (visitChains.get(uid) === operation) visitChains.delete(uid) })
  const pending = inflightVisits.get(identity?.uid) ?? new Set()
  pending.add(operation)
  inflightVisits.set(identity?.uid, pending)
  try { return await operation }
  finally { pending.delete(operation); if (!pending.size) inflightVisits.delete(identity?.uid) }
}

async function recordIdentityVisit(identity, { nickname } = {}) {
  if (!identity?.uid || !/^[A-Za-z0-9_-]+$/.test(identity.uid)) throw new Error('방문자 인증을 확인할 수 없습니다.')
  const authType = identity.isAnonymous ? 'anonymous' : getAuthProviderIds(identity).includes('google.com') ? 'google.com' : 'unknown'
  const email = authType === 'google.com' && typeof identity.email === 'string' ? identity.email : null
  if (authType === 'google.com' && (!email || identity.emailVerified !== true)) throw new Error('인증된 Google 이메일이 필요합니다.')
  const name = typeof nickname === 'string' && nickname.trim() ? nickname.trim() : identity.displayName?.trim() || '생존자'
  const { db, mod } = await getClient(identity)
  if (deletingUids.has(identity.uid)) return { uid: identity.uid, recorded: false, deleting: true }
  if (identity.isAnonymous) recordedGuestClient = { uid: identity.uid, db, mod }
  const result = await mod.runTransaction(mod.ref(db, `${ADMIN_VISITORS_PATH}/${identity.uid}`), (current) => ({
    ...(current?.provenance ? { provenance: current.provenance } : {}),
    ...(typeof current?.importedAt === 'number' ? { importedAt: current.importedAt } : {}),
    ...(typeof current?.historicalLastPlayedAt === 'number' ? { historicalLastPlayedAt: current.historicalLastPlayedAt } : {}),
    ...(typeof current?.linkedGoogleEmail === 'string' ? { linkedGoogleEmail: current.linkedGoogleEmail } : {}),
    uid: identity.uid,
    nickname: name.slice(0, 40),
    authType,
    ...(email ? { email } : {}),
    firstVisitedAt: typeof current?.firstVisitedAt === 'number' && current.firstVisitedAt > 0 ? current.firstVisitedAt : mod.serverTimestamp(),
    lastVisitedAt: mod.serverTimestamp(),
  }), { applyLocally: false })
  if (!result.committed) throw new Error('접속 기록이 서버에 저장되지 않았습니다.')
  return { uid: identity.uid, recorded: true }
}

export async function fetchAdminVisitors(user) {
  if (!isProjectMaster(user)) throw new Error('최고관리자만 접속자 명부를 조회할 수 있습니다.')
  const { db, mod } = await getClient(user)
  const snapshot = await mod.get(mod.ref(db, ADMIN_VISITORS_PATH))
  if (!snapshot.exists()) return []
  return Object.entries(snapshot.val()).map(([uid, value]) => ({ ...value, uid }))
    .sort((a, b) => (Number(b.lastVisitedAt) || 0) - (Number(a.lastVisitedAt) || 0))
}

export async function deleteAdminVisitor(user) {
  if (!user?.uid || !/^[A-Za-z0-9_-]+$/.test(user.uid)) throw new Error('삭제할 본인 인증 계정이 필요합니다.')
  deletingUids.add(user.uid)
  try {
    await Promise.allSettled([...(inflightVisits.get(user.uid) ?? [])])
    // Reuse an existing identity; deletion never creates an anonymous account.
    const client = testClient ?? (user.isAnonymous
      ? recordedGuestClient?.uid === user.uid ? recordedGuestClient : null
      : await getClient(user))
    if (!client) throw new Error('현재 게스트 인증을 확인할 수 없습니다.')
    await client.mod.remove(client.mod.ref(client.db, `${ADMIN_VISITORS_PATH}/${user.uid}`))
  } catch (error) { resumeAdminVisitorRecording(user); throw error }
}
