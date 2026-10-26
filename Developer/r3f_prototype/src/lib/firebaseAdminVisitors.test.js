import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const guest = vi.hoisted(() => ({ identity: vi.fn(), client: vi.fn() }))
vi.mock('./guestRankingIdentity.js', () => ({ getRankingUser: guest.identity, getGuestRankingClient: guest.client }))
import { _setFirebaseAdminVisitorsClientForTests, fetchAdminVisitors, recordAdminVisitor, deleteAdminVisitor, resumeAdminVisitorRecording } from './firebaseAdminVisitors.js'

const master = { uid: 'qa-master', email: 'zard5388@gmail.com', emailVerified: true, providerIds: ['google.com'] }
let rows, mod
beforeEach(() => {
  rows = {}
  mod = {
    ref: (_, path) => path,
    serverTimestamp: () => ({ '.sv': 'timestamp' }),
    get: vi.fn(async () => ({ exists: () => Object.keys(rows).length > 0, val: () => structuredClone(rows) })),
    remove: vi.fn(async (path) => { delete rows[path.split('/').at(-1)] }),
    runTransaction: vi.fn(async (path, mutate) => {
      const uid = path.split('/').at(-1)
      rows[uid] = mutate(rows[uid] ?? null)
      return { committed: true }
    }),
  }
  _setFirebaseAdminVisitorsClientForTests({ db: {}, mod })
  guest.identity.mockReset().mockImplementation(async (user) => user ?? { uid: 'qa-guest', isAnonymous: true, displayName: '테스트 게스트' })
  guest.client.mockReset().mockResolvedValue({ db: {}, mod })
})
afterEach(() => _setFirebaseAdminVisitorsClientForTests(null))

describe('protected admin visitor directory', () => {
  it('deletes only the provided authenticated UID without looking up or creating an identity', async () => {
    rows = { 'qa-own': { uid: 'qa-own' }, 'qa-other': { uid: 'qa-other' } }
    await deleteAdminVisitor({ uid: 'qa-own' })
    expect(mod.remove).toHaveBeenCalledWith('adminVisitors/qa-own')
    expect(rows).toEqual({ 'qa-other': { uid: 'qa-other' } })
    expect(guest.identity).not.toHaveBeenCalled()
    expect(guest.client).not.toHaveBeenCalled()
  })

  it('rejects missing identity and never creates a guest to perform deletion', async () => {
    await expect(deleteAdminVisitor(null)).rejects.toThrow('본인 인증')
    _setFirebaseAdminVisitorsClientForTests(null)
    await expect(deleteAdminVisitor({ uid: 'qa-guest', isAnonymous: true })).rejects.toThrow('게스트 인증')
    expect(guest.identity).not.toHaveBeenCalled()
    expect(guest.client).not.toHaveBeenCalled()
    expect(mod.remove).not.toHaveBeenCalled()
  })
  it.each([null, {}, { ...master, emailVerified: false }, { ...master, email: 'other@example.com' }, { ...master, providerIds: ['password'] }])('rejects non-master reads before the database client: %s', async (user) => {
    await expect(fetchAdminVisitors(user)).rejects.toThrow('최고관리자')
    expect(mod.get).not.toHaveBeenCalled()
  })

  it('allows only the verified Google master to read private email rows, newest first', async () => {
    rows = { a: { email: 'a@example.com', lastVisitedAt: 10 }, b: { authType: 'anonymous', lastVisitedAt: 20 } }
    expect((await fetchAdminVisitors(master)).map((r) => r.uid)).toEqual(['b', 'a'])
    expect(mod.get).toHaveBeenCalledWith('adminVisitors')
  })

  it('records the existing Google identity in the protected path and uses server event time', async () => {
    await recordAdminVisitor({ uid: 'qa-google', email: 'actual@example.com', emailVerified: true, providerIds: ['google.com'], displayName: '실제 닉네임' })
    expect(rows['qa-google']).toEqual({ uid: 'qa-google', nickname: '실제 닉네임', authType: 'google.com', email: 'actual@example.com', firstVisitedAt: { '.sv': 'timestamp' }, lastVisitedAt: { '.sv': 'timestamp' } })
    expect(mod.runTransaction.mock.calls[0][0]).toBe('adminVisitors/qa-google')
    expect(guest.client).not.toHaveBeenCalled()
  })

  it('reuses the single guest identity/client without inventing a Google email', async () => {
    _setFirebaseAdminVisitorsClientForTests(null)
    await recordAdminVisitor(null)
    expect(guest.identity).toHaveBeenCalledTimes(1)
    expect(guest.client).toHaveBeenCalledTimes(1)
    expect(rows['qa-guest']).toMatchObject({ uid: 'qa-guest', authType: 'anonymous' })
    expect(rows['qa-guest']).not.toHaveProperty('email')
  })

  it('retains first actual visit while refreshing only the latest server timestamp', async () => {
    rows['qa-guest'] = { uid: 'qa-guest', firstVisitedAt: 123, lastVisitedAt: 456 }
    await recordAdminVisitor(null)
    expect(rows['qa-guest'].firstVisitedAt).toBe(123)
    expect(rows['qa-guest'].lastVisitedAt).toEqual({ '.sv': 'timestamp' })
  })

  it('preserves historical provenance without turning import time into a visit', async () => {
    rows['qa-guest'] = { uid: 'qa-guest', provenance: 'historical-ranking-auth', importedAt: 100, historicalLastPlayedAt: 50, linkedGoogleEmail: 'linked@example.com' }
    await recordAdminVisitor(null)
    expect(rows['qa-guest']).toMatchObject({ provenance: 'historical-ranking-auth', importedAt: 100, historicalLastPlayedAt: 50, linkedGoogleEmail: 'linked@example.com', firstVisitedAt: { '.sv': 'timestamp' }, lastVisitedAt: { '.sv': 'timestamp' } })
  })

  it('keeps unknown authentication explicitly unknown and never copies arbitrary email or tokens', async () => {
    await recordAdminVisitor({ uid: 'qa-unknown', email: 'unverified@example.com', token: 'do-not-copy', createdAt: 1 })
    expect(rows['qa-unknown'].authType).toBe('unknown')
    expect(rows['qa-unknown']).not.toHaveProperty('email')
    expect(rows['qa-unknown']).not.toHaveProperty('token')
    expect(rows['qa-unknown']).not.toHaveProperty('createdAt')
  })

  it('rejects unverified claimed Google identity and reports failed commits', async () => {
    await expect(recordAdminVisitor({ uid: 'qa-invalid', email: 'a@example.com', providerIds: ['google.com'] })).rejects.toThrow('인증된 Google')
    expect(mod.runTransaction).not.toHaveBeenCalled()
    mod.runTransaction.mockResolvedValueOnce({ committed: false })
    await expect(recordAdminVisitor(null)).rejects.toThrow('저장되지')
  })
})

it('drains an in-flight visit before removal and blocks new visits until deletion failure is explicitly resumed', async () => {
  const user = { uid: 'qa-race', isAnonymous: true }
  let release
  const original = mod.runTransaction.getMockImplementation()
  mod.runTransaction.mockImplementationOnce(async (...args) => {
    await new Promise(resolve => { release = resolve })
    return original(...args)
  })
  const visit = recordAdminVisitor(user)
  await vi.waitFor(() => expect(release).toBeTypeOf('function'))
  const deletion = deleteAdminVisitor(user)
  expect(mod.remove).not.toHaveBeenCalled()
  expect(await recordAdminVisitor(user)).toMatchObject({ recorded: false, deleting: true })
  release()
  await visit
  await deletion
  expect(rows[user.uid]).toBeUndefined()
  expect(await recordAdminVisitor(user)).toMatchObject({ recorded: false })
  resumeAdminVisitorRecording(user)
  await recordAdminVisitor(user)
  expect(rows[user.uid]).toBeDefined()
})
it('blocks an identity resolution that finishes after deletion', async () => {
  const user = { uid: 'qa-late', isAnonymous: true }
  let release
  guest.identity.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  const late = recordAdminVisitor(user)
  await deleteAdminVisitor(user)
  release(user)
  expect(await late).toMatchObject({ recorded: false, deleting: true })
  expect(mod.runTransaction).not.toHaveBeenCalled()
  expect(rows[user.uid]).toBeUndefined()
})
it('serializes concurrent visits for one uid so a queued transaction never re-stamps firstVisitedAt', async () => {
  // Live RTDB rejects overlapping transactions here: the 2nd sees the 1st's
  // unresolved serverTimestamp placeholder and the immutable firstVisitedAt rule denies it.
  let active = 0
  let maxActive = 0
  const original = mod.runTransaction.getMockImplementation()
  mod.runTransaction.mockImplementation(async (...args) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise(resolve => setTimeout(resolve, 5))
    try { return await original(...args) } finally { active -= 1 }
  })
  const results = await Promise.all([recordAdminVisitor(null), recordAdminVisitor(null), recordAdminVisitor(null)])
  expect(results.every(result => result.recorded === true)).toBe(true)
  expect(mod.runTransaction).toHaveBeenCalledTimes(3)
  expect(maxActive).toBe(1)
})
