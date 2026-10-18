import { getFirebaseConfig } from './firebaseAuth.js'

export const BOARD_ROOT = 'zombieBoard/v1'
export const BOARD_LIMITS = Object.freeze({
  title: 120,
  postBody: 4000,
  commentBody: 1000,
  nickname: 24,
  posts: 50,
  comments: 100,
})
const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const DEFAULT_NICKNAME = '익명'
const POST_LIMIT = BOARD_LIMITS.posts
const COMMENT_LIMIT = BOARD_LIMITS.comments

function getEnv() { return import.meta.env ?? {} }
function readEnv(key) {
  const v = getEnv()[key]
  return typeof v === 'string' ? v.trim() : ''
}

export function isFirebaseBoardConfigured() {
  return readEnv(DATABASE_URL_KEY).length > 0
}

let _clientPromise = null
let _testClient = null

async function getClient() {
  if (_testClient) return _testClient
  if (!_clientPromise) _clientPromise = createClient()
  return _clientPromise
}

export function _setFirebaseBoardClientForTests(client) {
  _testClient = client
  _clientPromise = null
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

export function sanitizeBoardText(value, { fieldName, maxLength }) {
  if (typeof value !== 'string') throw new Error(`${fieldName} must be a string`)
  const trimmed = value.trim()
  if (trimmed.length < 1) throw new Error(`${fieldName} is required`)
  if (trimmed.length > maxLength) throw new Error(`${fieldName} is too long`)
  return trimmed
}

function readNickname(value) {
  if (value == null || String(value).trim().length === 0) return DEFAULT_NICKNAME
  return sanitizeBoardText(String(value), { fieldName: 'nickname', maxLength: BOARD_LIMITS.nickname })
}

function validateKey(id, fieldName) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new Error(`${fieldName} is invalid`)
  }
  return id
}

function postRef(mod, db, isPrivate) {
  return mod.ref(db, `${BOARD_ROOT}/${isPrivate === true ? 'privatePosts' : 'posts'}`)
}

function mapPost(id, value) {
  return {
    id,
    title: typeof value?.title === 'string' ? value.title : '',
    body: typeof value?.body === 'string' ? value.body : '',
    nickname: typeof value?.nickname === 'string' && value.nickname.trim() ? value.nickname : DEFAULT_NICKNAME,
    createdAt: typeof value?.createdAt === 'number' ? value.createdAt : 0,
  }
}

function mapComment(id, value) {
  return {
    id,
    body: typeof value?.body === 'string' ? value.body : '',
    nickname: typeof value?.nickname === 'string' && value.nickname.trim() ? value.nickname : DEFAULT_NICKNAME,
    createdAt: typeof value?.createdAt === 'number' ? value.createdAt : 0,
  }
}

function sortNewest(items) {
  return items.sort((a, b) => (b.createdAt - a.createdAt) || b.id.localeCompare(a.id))
}

function readBeforeCursor(options) {
  const before = options?.before
  if (before == null) return null
  if (typeof before.createdAt !== 'number' || !Number.isFinite(before.createdAt)) {
    throw new Error('before.createdAt is invalid')
  }
  return { createdAt: before.createdAt, id: validateKey(before.id, 'before.id') }
}

function subscribeSnapshot(path, limit, mapper, onData, onError, options) {
  let canceled = false
  let detach = null
  const before = readBeforeCursor(options)
  getClient().then(({ db, mod }) => {
    if (canceled) return
    const constraints = [mod.orderByChild('createdAt')]
    if (before) constraints.push(mod.endBefore(before.createdAt, before.id))
    constraints.push(mod.limitToLast(limit))
    const q = mod.query(
      mod.ref(db, path),
      ...constraints,
    )
    detach = mod.onValue(q, (snapshot) => {
      const raw = snapshot?.val?.() ?? {}
      const entries = Object.entries(raw ?? {}).map(([id, value]) => mapper(id, value))
      onData(sortNewest(entries))
    }, (error) => {
      if (typeof onError === 'function') onError(error)
    })
  }).catch((error) => {
    if (!canceled && typeof onError === 'function') onError(error)
  })

  return () => {
    canceled = true
    if (typeof detach === 'function') detach()
  }
}

export function subscribeBoardPosts(onData, onError, options) {
  return subscribeSnapshot(`${BOARD_ROOT}/posts`, POST_LIMIT, mapPost, onData, onError, options)
}

export function subscribePrivateBoardPosts(onData, onError, options) {
  return subscribeSnapshot(`${BOARD_ROOT}/privatePosts`, POST_LIMIT,
    (id, value) => ({ ...mapPost(id, value), isPrivate: true }), onData, onError, options)
}

export function subscribeBoardComments(postId, onData, onError, options) {
  const safePostId = validateKey(postId, 'postId')
  const collection = options?.isPrivate === true ? 'privateComments' : 'comments'
  return subscribeSnapshot(`${BOARD_ROOT}/${collection}/${safePostId}`, COMMENT_LIMIT, mapComment, onData, onError, options)
}

export async function createBoardPost({ title, body, nickname, isPrivate = false } = {}) {
  if (!isFirebaseBoardConfigured()) throw new Error('Firebase board is not configured')
  const entry = {
    title: sanitizeBoardText(title, { fieldName: 'title', maxLength: BOARD_LIMITS.title }),
    body: sanitizeBoardText(body, { fieldName: 'body', maxLength: BOARD_LIMITS.postBody }),
    nickname: readNickname(nickname),
  }
  const { db, mod } = await getClient()
  const ref = mod.push(postRef(mod, db, isPrivate))
  if (!ref?.key) throw new Error('Failed to allocate post id')
  await mod.set(ref, { ...entry, createdAt: mod.serverTimestamp() })
  return ref.key
}

export async function createBoardComment(postId, { body, nickname, isPrivate = false } = {}) {
  if (!isFirebaseBoardConfigured()) throw new Error('Firebase board is not configured')
  const safePostId = validateKey(postId, 'postId')
  const entry = {
    body: sanitizeBoardText(body, { fieldName: 'body', maxLength: BOARD_LIMITS.commentBody }),
    nickname: readNickname(nickname),
  }
  const { db, mod } = await getClient()
  const collection = isPrivate === true ? 'privateComments' : 'comments'
  const ref = mod.push(mod.ref(db, `${BOARD_ROOT}/${collection}/${safePostId}`))
  if (!ref?.key) throw new Error('Failed to allocate comment id')
  await mod.set(ref, { ...entry, createdAt: mod.serverTimestamp() })
  return ref.key
}

export async function deleteBoardPost(postId, options) {
  const safePostId = validateKey(postId, 'postId')
  const { db, mod } = await getClient()
  const posts = options?.isPrivate === true ? 'privatePosts' : 'posts'
  const comments = options?.isPrivate === true ? 'privateComments' : 'comments'
  await mod.update(mod.ref(db, BOARD_ROOT), {
    [`${posts}/${safePostId}`]: null,
    [`${comments}/${safePostId}`]: null,
  })
}

export async function deleteBoardComment(postId, commentId, options) {
  const safePostId = validateKey(postId, 'postId')
  const safeCommentId = validateKey(commentId, 'commentId')
  const { db, mod } = await getClient()
  const collection = options?.isPrivate === true ? 'privateComments' : 'comments'
  await mod.remove(mod.ref(db, `${BOARD_ROOT}/${collection}/${safePostId}/${safeCommentId}`))
}
