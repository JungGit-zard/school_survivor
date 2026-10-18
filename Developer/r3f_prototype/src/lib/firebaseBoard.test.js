import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BOARD_ROOT,
  _setFirebaseBoardClientForTests,
  createBoardComment,
  createBoardPost,
  deleteBoardComment,
  deleteBoardPost,
  sanitizeBoardText,
  subscribeBoardComments,
  subscribeBoardPosts,
  subscribePrivateBoardPosts,
} from './firebaseBoard.js'

function makeFakeClient() {
  const writes = []
  const removes = []
  const listeners = []
  let pushCount = 0
  const mod = {
    ref: (_db, path) => ({ path: path ?? '' }),
    child: (ref, childPath) => ({ path: `${ref.path}/${childPath}` }),
    push: vi.fn((ref) => ({ path: `${ref.path}/generated-${++pushCount}`, key: `generated-${pushCount}` })),
    set: vi.fn(async (ref, value) => { writes.push({ path: ref.path, value }) }),
    update: vi.fn(async (ref, value) => { writes.push({ path: ref.path, value, update: true }) }),
    remove: vi.fn(async (ref) => { removes.push(ref.path) }),
    query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
    orderByChild: vi.fn((key) => ({ type: 'orderByChild', key })),
    limitToLast: vi.fn((limit) => ({ type: 'limitToLast', limit })),
    endBefore: vi.fn((value, key) => ({ type: 'endBefore', value, key })),
    onValue: vi.fn((query, onData, onError) => {
      const listener = { query, onData, onError, off: vi.fn() }
      listeners.push(listener)
      return listener.off
    }),
    serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  }
  return { client: { db: {}, mod }, mod, writes, removes, listeners }
}

function snapFromObject(value) {
  return {
    val: () => value,
    exists: () => value != null,
  }
}

describe('firebaseBoard public anonymous board client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://x-default-rtdb.firebaseio.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    _setFirebaseBoardClientForTests(null)
    vi.restoreAllMocks()
  })

  it('creates an anonymous post only after RTDB set succeeds and resolves the generated post id', async () => {
    const { client, mod, writes } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)

    await expect(createBoardPost({ title: '  급식실 도움!  ', body: '좀비가 있어요', nickname: '  학생  '})).resolves.toBe('generated-1')

    expect(mod.push).toHaveBeenCalledWith({ path: `${BOARD_ROOT}/posts` })
    expect(mod.set).toHaveBeenCalledTimes(1)
    expect(writes[0]).toEqual({
      path: `${BOARD_ROOT}/posts/generated-1`,
      value: {
        title: '급식실 도움!',
        body: '좀비가 있어요',
        nickname: '학생',
        createdAt: { '.sv': 'timestamp' },
      },
    })
  })

  it('uses 익명 fallback and rejects whitespace-only post/comment bodies before writing', async () => {
    const { client, mod, writes } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)

    await expect(createBoardPost({ title: '제목', body: '내용', nickname: '   ' })).resolves.toBe('generated-1')
    expect(writes[0].value.nickname).toBe('익명')
    await expect(createBoardPost({ title: '   ', body: '내용' })).rejects.toThrow(/title/i)
    await expect(createBoardPost({ title: '제목', body: '    ' })).rejects.toThrow(/body/i)
    await expect(createBoardComment('postA', { body: '    ' })).rejects.toThrow(/body/i)
    expect(mod.set).toHaveBeenCalledTimes(1)
  })

  it('creates comments under a flat post-keyed collection and deletes post plus comments atomically', async () => {
    const { client, writes, removes } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)

    await expect(createBoardComment('postA', { body: '조심하세요', nickname: '' })).resolves.toBe('generated-1')
    await deleteBoardPost('postA')
    await deleteBoardComment('postA', 'commentA')

    expect(writes[0].path).toBe(`${BOARD_ROOT}/comments/postA/generated-1`)
    expect(writes[0].value).toEqual({ body: '조심하세요', nickname: '익명', createdAt: { '.sv': 'timestamp' } })
    expect(writes[1]).toEqual({
      path: BOARD_ROOT,
      value: { 'posts/postA': null, 'comments/postA': null },
      update: true,
    })
    expect(removes).toEqual([
      `${BOARD_ROOT}/comments/postA/commentA`,
    ])
  })

  it('subscribes to bounded newest posts and returns unsubscribe synchronously while mapping entries without eager all-comments', async () => {
    const { client, mod, listeners } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)
    const onData = vi.fn()

    const unsubscribe = subscribeBoardPosts(onData, vi.fn())

    expect(typeof unsubscribe).toBe('function')
    await Promise.resolve()
    expect(mod.query).toHaveBeenCalledWith(
      { path: `${BOARD_ROOT}/posts` },
      { type: 'orderByChild', key: 'createdAt' },
      { type: 'limitToLast', limit: 50 },
    )
    listeners[0].onData(snapFromObject({
      older: { title: 'a', body: 'b', nickname: 'n', createdAt: 1, comments: { hidden: true } },
      newer: { title: 'c', body: 'd', nickname: '익명', createdAt: 2 },
    }))
    expect(onData).toHaveBeenCalledWith([
      { id: 'newer', title: 'c', body: 'd', nickname: '익명', createdAt: 2 },
      { id: 'older', title: 'a', body: 'b', nickname: 'n', createdAt: 1 },
    ])
    expect(onData.mock.calls[0][0][1]).not.toHaveProperty('comments')
  })

  it('supports a bounded older-post cursor without changing the default subscription API', async () => {
    const { client, mod } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)

    const unsubscribe = subscribeBoardPosts(vi.fn(), vi.fn(), { before: { createdAt: 1234, id: 'postB' } })

    expect(typeof unsubscribe).toBe('function')
    await Promise.resolve()
    expect(mod.query).toHaveBeenCalledWith(
      { path: `${BOARD_ROOT}/posts` },
      { type: 'orderByChild', key: 'createdAt' },
      { type: 'endBefore', value: 1234, key: 'postB' },
      { type: 'limitToLast', limit: 50 },
    )
  })

  it('subscribes to bounded newest comments under a single post and can cancel before async client resolves', () => {
    const { client, mod, listeners } = makeFakeClient()
    _setFirebaseBoardClientForTests(Promise.resolve(client))
    const onData = vi.fn()

    const unsubscribe = subscribeBoardComments('postA', onData, vi.fn())
    unsubscribe()

    return Promise.resolve().then(() => {
      expect(mod.onValue).not.toHaveBeenCalled()
      _setFirebaseBoardClientForTests(client)
      const liveUnsubscribe = subscribeBoardComments('postA', onData, vi.fn())
      expect(typeof liveUnsubscribe).toBe('function')
      return Promise.resolve().then(() => {
        expect(mod.query).toHaveBeenCalledWith(
          { path: `${BOARD_ROOT}/comments/postA` },
          { type: 'orderByChild', key: 'createdAt' },
          { type: 'limitToLast', limit: 100 },
        )
        listeners[0].onData(snapFromObject({ c1: { body: '첫 댓글', nickname: '익명', createdAt: 7 } }))
        expect(onData).toHaveBeenCalledWith([{ id: 'c1', body: '첫 댓글', nickname: '익명', createdAt: 7 }])
        liveUnsubscribe()
        expect(listeners[0].off).toHaveBeenCalled()
      })
    })
  })

  it('supports a bounded older-comment cursor per post', async () => {
    const { client, mod } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)

    subscribeBoardComments('postA', vi.fn(), vi.fn(), { before: { createdAt: 777, id: 'c7' } })

    await Promise.resolve()
    expect(mod.query).toHaveBeenCalledWith(
      { path: `${BOARD_ROOT}/comments/postA` },
      { type: 'orderByChild', key: 'createdAt' },
      { type: 'endBefore', value: 777, key: 'c7' },
      { type: 'limitToLast', limit: 100 },
    )
  })

  it('writes private post content only to privatePosts and never falls back on permission failure', async () => {
    const { client, mod, writes } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)
    await createBoardPost({ title: 'secret title', body: 'secret body', nickname: 'secret name', isPrivate: true })
    expect(writes).toEqual([{
      path: `${BOARD_ROOT}/privatePosts/generated-1`,
      value: { title: 'secret title', body: 'secret body', nickname: 'secret name', createdAt: { '.sv': 'timestamp' } },
    }])
    mod.set.mockRejectedValueOnce(new Error('PERMISSION_DENIED'))
    await expect(createBoardPost({ title: 'secret', body: 'secret', isPrivate: true })).rejects.toThrow('PERMISSION_DENIED')
    expect(mod.set).toHaveBeenCalledTimes(2)
    expect(mod.push.mock.calls.every(([r]) => r.path === `${BOARD_ROOT}/privatePosts`)).toBe(true)
  })

  it('keeps explicit public writes and subscriptions on public roots even with a private feed option', async () => {
    const { client, writes, listeners } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)
    await createBoardPost({ title: 'public', body: 'public', isPrivate: false })
    subscribeBoardPosts(vi.fn(), vi.fn(), { isPrivate: true })
    await Promise.resolve()
    expect(writes[0].path).toBe(`${BOARD_ROOT}/posts/generated-1`)
    expect(writes[0].value).not.toHaveProperty('isPrivate')
    expect(listeners[0].query.ref.path).toBe(`${BOARD_ROOT}/posts`)
  })

  it('subscribes to a separate private paginated feed, marks records, propagates denial and detaches', async () => {
    const { client, mod, listeners } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)
    const onData = vi.fn(), onError = vi.fn()
    const off = subscribePrivateBoardPosts(onData, onError, { before: { createdAt: 99, id: 'p99' } })
    await Promise.resolve()
    expect(mod.query).toHaveBeenCalledWith({ path: `${BOARD_ROOT}/privatePosts` },
      { type: 'orderByChild', key: 'createdAt' }, { type: 'endBefore', value: 99, key: 'p99' }, { type: 'limitToLast', limit: 50 })
    listeners[0].onData(snapFromObject({ p1: { title: 's', body: 's', nickname: 'n', createdAt: 1 } }))
    expect(onData).toHaveBeenCalledWith([{ id: 'p1', title: 's', body: 's', nickname: 'n', createdAt: 1, isPrivate: true }])
    const denied = new Error('PERMISSION_DENIED')
    listeners[0].onError(denied)
    expect(onError).toHaveBeenCalledWith(denied)
    expect(listeners).toHaveLength(1)
    off()
    expect(listeners[0].off).toHaveBeenCalledOnce()
  })

  it('routes private comments and atomic moderation only to private roots', async () => {
    const { client, mod, writes, removes, listeners } = makeFakeClient()
    _setFirebaseBoardClientForTests(client)
    await createBoardComment('secret', { body: 'reply', isPrivate: true })
    subscribeBoardComments('secret', vi.fn(), vi.fn(), { isPrivate: true, before: { createdAt: 9, id: 'c9' } })
    await Promise.resolve()
    expect(listeners[0].query.ref.path).toBe(`${BOARD_ROOT}/privateComments/secret`)
    expect(mod.endBefore).toHaveBeenCalledWith(9, 'c9')
    expect(writes[0].path).toBe(`${BOARD_ROOT}/privateComments/secret/generated-1`)
    await deleteBoardPost('secret', { isPrivate: true })
    expect(writes[1]).toEqual({ path: BOARD_ROOT, value: { 'privatePosts/secret': null, 'privateComments/secret': null }, update: true })
    await deleteBoardComment('secret', 'c1', { isPrivate: true })
    expect(removes).toEqual([`${BOARD_ROOT}/privateComments/secret/c1`])
    mod.set.mockRejectedValueOnce(new Error('PERMISSION_DENIED'))
    await expect(createBoardComment('secret', { body: 'denied', isPrivate: true })).rejects.toThrow('PERMISSION_DENIED')
    expect(mod.set).toHaveBeenCalledTimes(2)
  })

  it('preserves safe plain text while trimming and bounding text fields', () => {
    expect(sanitizeBoardText(' <b>좀비</b> & 친구 ', { fieldName: 'body', maxLength: 20 })).toBe('<b>좀비</b> & 친구')
    expect(() => sanitizeBoardText('x'.repeat(21), { fieldName: 'body', maxLength: 20 })).toThrow(/body/i)
  })
})

describe('firebaseBoard source and rules contract', () => {
  const source = readFileSync(new URL('./firebaseBoard.js', import.meta.url), 'utf8')
  const rules = readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')

  it('uses the isolated zombieBoard/v1 root and never stores uid/email/admin flags', () => {
    expect(source).toContain("zombieBoard/v1")
    expect(source).not.toMatch(/uid|email|isAdmin|admin\s*:/)
  })

  it('rules keep root deny defaults and add board-only public create plus master moderation boundary', () => {
    expect(rules).toContain('".read": false')
    expect(rules).toContain('".write": false')
    expect(rules).toContain('"zombieBoard"')
    expect(rules).toContain('zard5388@gmail.com')
    expect(rules).toContain('auth.token.email_verified === true')
    expect(rules).toContain("auth.token.firebase.sign_in_provider === 'google.com'")
    expect(rules).not.toContain('auth == null && !data.exists()')
    expect(rules).toContain('!data.exists() && newData.exists()')
    expect(rules).toContain("root.child('zombieBoard/v1/posts').child($postId).exists()")
    expect(rules).toContain('"comments": {')
    expect(rules).toContain('length <= 120')
    expect(rules).toContain('length <= 4000')
    expect(rules).toContain('length <= 24')
    expect(rules).toContain("\".read\": \"query.orderByChild === 'createdAt' && query.limitToLast != null && query.limitToLast > 0 && query.limitToLast <= 50\"")
    expect(rules).toContain("\".read\": \"query.orderByChild === 'createdAt' && query.limitToLast != null && query.limitToLast > 0 && query.limitToLast <= 100\"")
    expect(rules).toContain('"$other": { ".validate": false }')
  })
})
