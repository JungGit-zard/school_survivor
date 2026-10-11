import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  connectDatabaseEmulator,
  getDatabase,
  ref,
  set,
  update,
  remove,
  get,
  query,
  orderByChild,
  limitToLast,
  endBefore,
} from 'firebase/database'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-zombie-board-rules'
const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOSTNAME || '127.0.0.1'
const PORT = Number(process.env.FIREBASE_DATABASE_EMULATOR_PORT || '9000')
const ROOT = 'zombieBoard/v1'
const RUN_ID = `rules-${Date.now()}-${Math.random().toString(36).slice(2)}`

const apps = []
function makeDb(name, mockUserToken) {
  const app = initializeApp({
    projectId: PROJECT_ID,
    databaseURL: `https://${PROJECT_ID}-default-rtdb.firebaseio.com`,
  }, `${name}-${RUN_ID}`)
  apps.push(app)
  const db = getDatabase(app)
  connectDatabaseEmulator(db, HOST, PORT, mockUserToken ? { mockUserToken } : undefined)
  return db
}

const guestDb = makeDb('guest')
const ordinaryDb = makeDb('ordinary', {
  sub: 'ordinary-user',
  email: 'student@example.com',
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
})
const masterDb = makeDb('master', {
  sub: 'board-admin',
  email: 'zard5388@gmail.com',
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
})
const unverifiedMasterDb = makeDb('unverified-master', {
  sub: 'board-admin-unverified',
  email: 'zard5388@gmail.com',
  email_verified: false,
  firebase: { sign_in_provider: 'google.com' },
})

async function expectAllowed(label, operation) {
  try {
    await operation()
    console.log(`ALLOW ${label}`)
  } catch (error) {
    console.error(`EXPECTED_ALLOW_FAILED ${label}: ${error?.message || error}`)
    throw error
  }
}

async function expectDenied(label, operation) {
  try {
    await operation()
  } catch (error) {
    const code = String(error?.code || error?.message || '')
    assert.match(code, /permission[_ ]denied/i, label)
    console.log(`DENY ${label}`)
    return
  }
  throw new Error(`EXPECTED_DENY_BUT_ALLOWED ${label}`)
}

function postData(overrides = {}) {
  return {
    title: '학교 게시판',
    body: '좀비 조심',
    nickname: '익명',
    createdAt: Date.now(),
    ...overrides,
  }
}

function commentData(overrides = {}) {
  return {
    body: '댓글입니다',
    nickname: '익명',
    createdAt: Date.now(),
    ...overrides,
  }
}

try {
  const guestPostId = `${RUN_ID}-guest-post`
  const ordinaryPostId = `${RUN_ID}-ordinary-post`
  const masterDeletePostId = `${RUN_ID}-master-delete-post`
  const orphanPostId = `${RUN_ID}-orphan-post`

  await expectAllowed('guest public post create', () => set(ref(guestDb, `${ROOT}/posts/${guestPostId}`), postData()))
  await expectAllowed('ordinary signed-in public post create', () => set(ref(ordinaryDb, `${ROOT}/posts/${ordinaryPostId}`), postData()))

  await expectDenied('guest post edit denied', () => update(ref(guestDb, `${ROOT}/posts/${guestPostId}`), { body: '수정 시도' }))
  await expectDenied('guest post delete denied', () => remove(ref(guestDb, `${ROOT}/posts/${guestPostId}`)))
  await expectDenied('ordinary post delete denied', () => remove(ref(ordinaryDb, `${ROOT}/posts/${guestPostId}`)))
  await expectDenied('unverified master delete denied', () => remove(ref(unverifiedMasterDb, `${ROOT}/posts/${guestPostId}`)))

  await expectDenied('missing parent comment denied', () => set(ref(guestDb, `${ROOT}/comments/${RUN_ID}-missing/c1`), commentData()))
  await expectAllowed('guest comment create under existing parent', () => set(ref(guestDb, `${ROOT}/comments/${guestPostId}/c1`), commentData()))
  await expectDenied('guest comment edit denied', () => update(ref(guestDb, `${ROOT}/comments/${guestPostId}/c1`), { body: '수정 시도' }))
  await expectDenied('guest comment delete denied', () => remove(ref(guestDb, `${ROOT}/comments/${guestPostId}/c1`)))

  await expectDenied('space-only post title denied by server rules', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-blank`), postData({ title: '   ' })))
  await expectDenied('tab-only post title denied by server rules', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-tab`), postData({ title: '\t\t' })))
  await expectDenied('newline-only post body denied by server rules', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-newline-blank`), postData({ body: '\n\r\n' })))
  await expectAllowed('multiline textarea post body allowed', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-multiline`), postData({ body: '1층 복도\n좀비 있음' })))
  await expectDenied('unknown post field denied', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-unknown`), postData({ admin: true })))
  await expectDenied('public post cannot smuggle nested comments', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-smuggle`), postData({ comments: { c1: commentData() } })))
  await expectDenied('too-long post body denied', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-long`), postData({ body: 'x'.repeat(4001) })))
  await expectDenied('too-long comment body denied', () => set(ref(guestDb, `${ROOT}/comments/${guestPostId}/tooLong`), commentData({ body: 'x'.repeat(1001) })))

  await expectAllowed('master creates moderation target post', () => set(ref(masterDb, `${ROOT}/posts/${masterDeletePostId}`), postData()))
  await expectAllowed('master creates moderation target comment', () => set(ref(masterDb, `${ROOT}/comments/${masterDeletePostId}/c1`), commentData()))

  await expectDenied('unbounded posts read denied', () => get(ref(guestDb, `${ROOT}/posts`)))
  await expectDenied('ordered posts read without limit denied', () => get(query(ref(guestDb, `${ROOT}/posts`), orderByChild('createdAt'))))
  await expectDenied('over-limit posts read denied', () => get(query(ref(guestDb, `${ROOT}/posts`), orderByChild('createdAt'), limitToLast(51))))
  await expectAllowed('bounded posts read allowed', () => get(query(ref(guestDb, `${ROOT}/posts`), orderByChild('createdAt'), limitToLast(50))))
  await expectAllowed('bounded posts before-cursor read allowed', () => get(query(ref(guestDb, `${ROOT}/posts`), orderByChild('createdAt'), endBefore(Date.now(), masterDeletePostId), limitToLast(50))))
  await expectDenied('unbounded comments root read denied', () => get(ref(guestDb, `${ROOT}/comments`)))
  await expectDenied('over-limit comments read denied', () => get(query(ref(guestDb, `${ROOT}/comments/${guestPostId}`), orderByChild('createdAt'), limitToLast(101))))
  await expectAllowed('bounded comments read allowed', () => get(query(ref(guestDb, `${ROOT}/comments/${guestPostId}`), orderByChild('createdAt'), limitToLast(100))))
  await expectAllowed('bounded comments before-cursor read allowed', () => get(query(ref(guestDb, `${ROOT}/comments/${guestPostId}`), orderByChild('createdAt'), endBefore(Date.now(), 'c1'), limitToLast(100))))

  await expectAllowed('verified Google master atomically deletes post and comments', () => update(ref(masterDb, ROOT), {
    [`posts/${masterDeletePostId}`]: null,
    [`comments/${masterDeletePostId}`]: null,
  }))

  await expectAllowed('master creates orphan-race parent', () => set(ref(masterDb, `${ROOT}/posts/${orphanPostId}`), postData()))
  await expectAllowed('master deletes orphan-race parent', () => update(ref(masterDb, ROOT), {
    [`posts/${orphanPostId}`]: null,
    [`comments/${orphanPostId}`]: null,
  }))
  await expectDenied('comment after parent delete denied', () => set(ref(guestDb, `${ROOT}/comments/${orphanPostId}/late`), commentData()))

  await expectAllowed('master cleanup', () => update(ref(masterDb, ROOT), {
    [`posts/${guestPostId}`]: null,
    [`comments/${guestPostId}`]: null,
    [`posts/${ordinaryPostId}`]: null,
    [`comments/${ordinaryPostId}`]: null,
    [`posts/${RUN_ID}-multiline`]: null,
    [`comments/${RUN_ID}-multiline`]: null,
  }))

  console.log('ZOMBIE_BOARD_RULES_EMULATOR_OK')
} finally {
  await Promise.allSettled(apps.map((app) => deleteApp(app)))
}
