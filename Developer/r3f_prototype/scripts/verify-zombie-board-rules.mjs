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
assert.ok(PROJECT_ID.startsWith('demo-'), 'Emulator verification requires a demo project')
assert.ok(['localhost', '127.0.0.1', '::1'].includes(HOST), 'Emulator must be loopback-only')
assert.ok(Number.isInteger(PORT) && PORT > 0 && PORT <= 65535, 'Invalid emulator port')
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

const wrongProviderDb = makeDb('wrong-provider', {
  sub: 'board-admin-password', email: 'zard5388@gmail.com', email_verified: true,
  firebase: { sign_in_provider: 'password' },
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

  // Private content lives in sibling roots, never in the publicly queryable posts tree.
  const secretId = `${RUN_ID}-secret`
  const ordinarySecretId = `${RUN_ID}-ordinary-secret`
  await expectAllowed('guest private create', () => set(ref(guestDb, `${ROOT}/privatePosts/${secretId}`), postData({ title: 'SYNTHETIC_SECRET_TITLE', body: 'SYNTHETIC_SECRET_BODY', nickname: 'SYNTHETIC_SECRET_NAME' })))
  await expectAllowed('ordinary private create', () => set(ref(ordinaryDb, `${ROOT}/privatePosts/${ordinarySecretId}`), postData()))
  for (const [name, db] of [['guest', guestDb], ['ordinary', ordinaryDb], ['unverified', unverifiedMasterDb], ['wrongprovider', wrongProviderDb]]) {
    for (const path of ['/', '/zombieBoard', `/${ROOT}`, `/${ROOT}/privatePosts`, `/${ROOT}/privatePosts/${secretId}`, `/${ROOT}/privatePosts/${secretId}/title`, `/${ROOT}/privatePosts/${secretId}/body`, `/${ROOT}/privatePosts/${secretId}/nickname`, `/${ROOT}/privateComments`, `/${ROOT}/privateComments/${secretId}`]) {
      await expectDenied(`${name} private/parent read ${path || '/'}`, () => get(ref(db, path)))
    }
    await expectDenied(`${name} private list query`, () => get(query(ref(db, `${ROOT}/privatePosts`), orderByChild('createdAt'), limitToLast(50))))
    await expectDenied(`${name} private create-only collision`, () => set(ref(db, `${ROOT}/privatePosts/${secretId}`), postData()))
    await expectDenied(`${name} private update`, () => update(ref(db, `${ROOT}/privatePosts/${secretId}`), { body: 'overwrite' }))
    await expectDenied(`${name} private delete`, () => remove(ref(db, `${ROOT}/privatePosts/${secretId}`)))
    await expectDenied(`${name} private reply create`, () => set(ref(db, `${ROOT}/privateComments/${secretId}/${name}`), commentData()))
    await expectDenied(`${name} private comments parent write`, () => set(ref(db, `${ROOT}/privateComments/${secretId}`), { injected: commentData() }))
    await expectDenied(`${name} public comment cannot target private-only post`, () => set(ref(db, `${ROOT}/comments/${secretId}/${name}`), commentData()))
  }
  await expectDenied('master cannot overwrite private post', () => set(ref(masterDb, `${ROOT}/privatePosts/${secretId}`), postData()))
  for (const path of ['/', '/zombieBoard', `/${ROOT}`, `/${ROOT}/privateComments`]) {
    await expectDenied(`master ancestor read ${path || '/'}`, () => get(ref(masterDb, path)))
  }
  await expectAllowed('master private item read', () => get(ref(masterDb, `${ROOT}/privatePosts/${secretId}`)))
  await expectAllowed('master bounded private feed', () => get(query(ref(masterDb, `${ROOT}/privatePosts`), orderByChild('createdAt'), limitToLast(50))))
  await expectAllowed('master private cursor feed', () => get(query(ref(masterDb, `${ROOT}/privatePosts`), orderByChild('createdAt'), endBefore(Date.now(), secretId), limitToLast(50))))
  await expectDenied('master unbounded private feed', () => get(ref(masterDb, `${ROOT}/privatePosts`)))
  await expectDenied('master oversized private feed', () => get(query(ref(masterDb, `${ROOT}/privatePosts`), orderByChild('createdAt'), limitToLast(51))))
  await expectDenied('ordinary cannot read its own private post', () => get(ref(ordinaryDb, `${ROOT}/privatePosts/${ordinarySecretId}`)))
  await expectAllowed('master private reply', () => set(ref(masterDb, `${ROOT}/privateComments/${secretId}/reply`), commentData()))
  for (const [name, db] of [['guest', guestDb], ['ordinary', ordinaryDb], ['unverified', unverifiedMasterDb], ['wrongprovider', wrongProviderDb]]) {
    await expectDenied(`${name} existing private reply read`, () => get(ref(db, `${ROOT}/privateComments/${secretId}/reply`)))
    await expectDenied(`${name} private comments query`, () => get(query(ref(db, `${ROOT}/privateComments/${secretId}`), orderByChild('createdAt'), limitToLast(100))))
    await expectDenied(`${name} existing private reply update`, () => update(ref(db, `${ROOT}/privateComments/${secretId}/reply`), { body: 'overwrite' }))
    await expectDenied(`${name} existing private reply delete`, () => remove(ref(db, `${ROOT}/privateComments/${secretId}/reply`)))
    await expectDenied(`${name} private comments subtree delete`, () => remove(ref(db, `${ROOT}/privateComments/${secretId}`)))
    await expectDenied(`${name} private atomic moderation`, () => update(ref(db, ROOT), { [`privatePosts/${secretId}`]: null, [`privateComments/${secretId}`]: null }))
  }
  await expectDenied('master cannot edit private reply', () => update(ref(masterDb, `${ROOT}/privateComments/${secretId}/reply`), { body: 'overwrite' }))
  await expectDenied('master oversized private comments read', () => get(query(ref(masterDb, `${ROOT}/privateComments/${secretId}`), orderByChild('createdAt'), limitToLast(101))))
  await expectDenied('private reply body limit', () => set(ref(masterDb, `${ROOT}/privateComments/${secretId}/long`), commentData({ body: 'x'.repeat(1001) })))
  await expectDenied('private reply private flag', () => set(ref(masterDb, `${ROOT}/privateComments/${secretId}/flag`), commentData({ isPrivate: true })))
  await expectAllowed('master private comments bounded read', () => get(query(ref(masterDb, `${ROOT}/privateComments/${secretId}`), orderByChild('createdAt'), limitToLast(100))))
  await expectDenied('master orphan private reply', () => set(ref(masterDb, `${ROOT}/privateComments/${RUN_ID}-missing/reply`), commentData()))
  for (const [label, overrides] of [ ['blank', { title: '   ' }], ['long title', { title: 'x'.repeat(121) }], ['long body', { body: 'x'.repeat(4001) }], ['long nickname', { nickname: 'x'.repeat(25) }], ['old time', { createdAt: Date.now() - 600000 }], ['future time', { createdAt: Date.now() + 600000 }], ['unknown', { isPrivate: true }], ['nested', { comments: { c: commentData() } }] ]) {
    await expectDenied(`private schema ${label}`, () => set(ref(guestDb, `${ROOT}/privatePosts/${RUN_ID}-${label.replaceAll(' ', '-')}`), postData(overrides)))
  }
  await expectDenied('public private flag denied', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-private-flag`), postData({ isPrivate: true })))
  await expectDenied('public private payload denied', () => set(ref(guestDb, `${ROOT}/posts/${RUN_ID}-private-content`), postData({ privateContent: { title: 'secret' } })))
  await expectAllowed('public feed has no private identifiers or content', async () => {
    const snapshot = await get(query(ref(guestDb, `${ROOT}/posts`), orderByChild('createdAt'), limitToLast(50)))
    assert.ok(!snapshot.hasChild(secretId) && !snapshot.hasChild(ordinarySecretId))
    assert.ok(!JSON.stringify(snapshot.val()).includes('SYNTHETIC_SECRET'))
  })
  await expectAllowed('master private reply delete', () => remove(ref(masterDb, `${ROOT}/privateComments/${secretId}/reply`)))
  await expectAllowed('master second private reply for subtree moderation', () => set(ref(masterDb, `${ROOT}/privateComments/${secretId}/remaining`), commentData()))
  await expectAllowed('master private atomic moderation', () => update(ref(masterDb, ROOT), {
    [`privatePosts/${secretId}`]: null, [`privateComments/${secretId}`]: null,
    [`privatePosts/${ordinarySecretId}`]: null, [`privateComments/${ordinarySecretId}`]: null,
  }))
  await expectDenied('private reply after parent removal', () => set(ref(masterDb, `${ROOT}/privateComments/${secretId}/late`), commentData()))

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
