import { getFirebaseConfig, isFirebaseAuthConfigured } from './firebaseAuth.js'
import { validateNickname } from './userNickname.js'

const APP_NAME = 'guest-ranking'
let clientPromise = null
let signInPromise = null
let guestAuth = null
const nicknames = new Map()
const nicknameLoads = new Map()

async function createClient() {
  const env = import.meta.env ?? {}
  if (!isFirebaseAuthConfigured(env) || !env.VITE_FIREBASE_DATABASE_URL?.trim()) {
    throw new Error('Firebase guest ranking is not configured.')
  }
  const [apps, authModule, mod] = await Promise.all([
    import('firebase/app'), import('firebase/auth'), import('firebase/database'),
  ])
  const config = getFirebaseConfig(env)
  if (!authModule.inMemoryPersistence) throw new Error('Firebase Auth memory-only persistence is unavailable.')
  // Existing default clients assume any initialized app means the default exists.
  // Reserve its app only; never initialize or mutate Google/Studio authentication.
  if (!apps.getApps().some((app) => app.name === '[DEFAULT]')) apps.initializeApp(config)
  const app = apps.getApps().find((candidate) => candidate.name === APP_NAME)
    ?? apps.initializeApp(config, APP_NAME)
  // Explicit initialization avoids getAuth's browser-persistence defaults.
  const auth = authModule.initializeAuth(app, { persistence: authModule.inMemoryPersistence })
  guestAuth = auth
  return { auth, authModule, db: mod.getDatabase(app, config.databaseURL), mod }
}

function getClient() {
  if (!clientPromise) {
    clientPromise = createClient().catch((error) => {
      clientPromise = null
      throw error
    })
  }
  return clientPromise
}

export async function getRankingUser(googleUser) {
  if (googleUser) return googleUser
  const { auth, authModule } = await getClient()
  if (!auth.currentUser) {
    if (!signInPromise) {
      signInPromise = authModule.signInAnonymously(auth).finally(() => { signInPromise = null })
    }
    await signInPromise
  }
  const user = auth.currentUser
  if (!user?.uid || !user.isAnonymous) throw new Error('Firebase guest ranking identity is unavailable.')
  if (!nicknames.has(user.uid)) {
    if (!nicknameLoads.has(user.uid)) {
      nicknameLoads.set(user.uid, loadNickname(user.uid).finally(() => { nicknameLoads.delete(user.uid) }))
    }
    await nicknameLoads.get(user.uid)
  }
  return { uid: user.uid, isAnonymous: true, displayName: nicknames.get(user.uid) }
}

function nicknamePath(uid) {
  return `rankingService/v1/guestProfiles/${uid}/nickname`
}

async function loadNickname(uid) {
  const { db, mod } = await getClient()
  const ref = mod.ref(db, nicknamePath(uid))
  const snapshot = await mod.get(ref)
  let nickname = snapshot.val()
  if (!snapshot.exists()) {
    nickname = `생존자-${uid.slice(-6)}`
    await mod.set(ref, nickname)
  } else if (!validateNickname(nickname).ok) {
    throw new Error('Firebase guest nickname is invalid.')
  }
  nicknames.set(uid, nickname)
}

export function getGuestRankingNickname() {
  return nicknames.get(guestAuth?.currentUser?.uid) ?? ''
}

export function getGuestRankingNicknameForUid(uid) {
  return nicknames.get(uid) ?? ''
}

export async function saveGuestRankingNickname(value) {
  const result = validateNickname(value)
  if (!result.ok) return result
  try {
    const user = await getRankingUser(null)
    const { db, mod } = await getClient()
    await mod.set(mod.ref(db, nicknamePath(user.uid)), result.nickname)
    nicknames.set(user.uid, result.nickname)
    const { renameRankingEntriesForUser } = await import('./firebaseRanking.js')
    const renamed = await renameRankingEntriesForUser(user, result.nickname)
    if (renamed?.failed?.length || renamed?.reason) {
      throw new Error('닉네임은 저장됐지만 랭킹 이름을 갱신하지 못했습니다. 다시 시도해 주세요.')
    }
    return result
  } catch (error) {
    return { ok: false, nickname: getGuestRankingNickname(), error: error?.message || '닉네임을 저장하지 못했습니다.' }
  }
}

export async function getGuestRankingClient() {
  await getRankingUser(null)
  const { db, mod } = await getClient()
  return { db, mod }
}
