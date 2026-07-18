// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _setFirebaseStudioClientFactoryForTests,
  FIREBASE_STUDIO_DIRTY_UID_STORAGE_KEY,
  FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY,
  applyLocalStudioDatasets,
  applyFirebaseStudioSnapshot,
  buildFirebaseStudioSnapshot,
  flushFirebaseStudioSave,
  getUserStudioPath,
  hydrateFirebaseStudio,
  markFirebaseStudioLocalChange,
  normalizeFirebaseStudioSnapshot,
  requestFirebaseStudioSave,
  saveFirebaseStudio,
  setFirebaseStudioUser,
  subscribeStudioStorageSync,
} from './firebaseStudio.js'
import {
  GRAPHICS_STUDIO_STORAGE_KEY,
  GRAPHICS_STUDIO_TUNING_EVENT,
  STAGE_BOSS_PREVIEW_STORAGE_KEY,
  TEXTURE_DECALS_STORAGE_KEY,
  loadStageBossPreview,
  loadStudioTunings,
  loadTextureDecals,
  saveStageBossPreview,
  saveStudioTunings,
  saveTextureDecals,
} from './graphicsStudioConfig.js'
import {
  SFX_TUNING_STORAGE_KEY,
  loadSfxTunings,
  saveSfxTunings,
} from './sfxRegistry.js'
import {
  STAGE_PROP_PLACEMENTS_STORAGE_KEY,
  loadStagePropPlacements,
  resetStagePropPlacementsCache,
  saveStagePropPlacements,
} from './stagePropPlacements.js'

const USER = { uid: 'studio-user' }
const COMPLETE_ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://school-survivor-default-rtdb.asia-southeast1.firebasedatabase.app',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
}

function localDatasets() {
  return {
    tunings: loadStudioTunings(),
    sfxTunings: loadSfxTunings(),
    stageBossPreview: loadStageBossPreview(),
    decals: loadTextureDecals(),
    propPlacements: loadStagePropPlacements(),
  }
}

function seedLocal() {
  saveStudioTunings({ player: { scale: 1.37 }, obsolete: { positionX: 2 } })
  saveSfxTunings({ pencilFire: { volume: 0.4, rate: 1.2 } })
  saveStageBossPreview({ zoom: 132, panX: 0.4, panY: -0.2 })
  saveTextureDecals({})
  saveStagePropPlacements({
    stage1: [{
      id: 'desk-1',
      type: 'classroomDesk',
      position: [1, 0, 2],
      rotation: [0, 0.5, 0],
      scale: 1,
    }],
  })
}

function remoteSnapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    revision: 7,
    updatedAt: '2026-07-17T01:02:03.000Z',
    datasets: {
      tunings: { player: { scale: 1.82 } },
      sfxTunings: { buttonClick: { volume: 0.2, rate: 0.8 } },
      stageBossPreview: { zoom: 145, panX: -0.3, panY: 0.1 },
      decals: {},
      propPlacements: { stage1: null, stage2: [], stage3: null },
    },
    ...overrides,
  }
}

describe('Firebase Graphics Studio persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStagePropPlacementsCache()
    setFirebaseStudioUser(null)
  })

  it('builds the exact five authored datasets and private user path', () => {
    seedLocal()

    expect(getUserStudioPath(USER)).toBe('studioWorkspaces/v1/users/studio-user/current')
    const snapshot = buildFirebaseStudioSnapshot(localDatasets(), {
      revision: 3,
      now: Date.UTC(2026, 6, 17, 1, 2, 3),
    })

    expect(snapshot).toEqual({
      schemaVersion: 1,
      revision: 3,
      updatedAt: '2026-07-17T01:02:03.000Z',
      datasets: localDatasets(),
    })
    expect(Object.keys(snapshot.datasets)).toEqual([
      'tunings',
      'sfxTunings',
      'stageBossPreview',
      'decals',
      'propPlacements',
    ])
  })

  it('hydrates a supported remote snapshot through local save APIs', async () => {
    seedLocal()
    const remote = remoteSnapshot()
    const client = { load: vi.fn().mockResolvedValue(remote) }

    await expect(hydrateFirebaseStudio({ user: USER, client })).resolves.toEqual({
      status: 'remote-applied',
      revision: 7,
    })
    expect(loadStudioTunings().player.scale).toBe(1.82)
    expect(loadStudioTunings()).not.toHaveProperty('obsolete')
    expect(loadSfxTunings()).toEqual({ buttonClick: { volume: 0.2, rate: 0.8 } })
    expect(loadStageBossPreview()).toEqual({ zoom: 145, panX: -0.3, panY: 0.1 })
    expect(loadTextureDecals()).toEqual({})
    expect(loadStagePropPlacements()).toEqual({ stage1: null, stage2: [], stage3: null })
  })

  it('seeds an empty remote path with the current local datasets', async () => {
    seedLocal()
    const before = localDatasets()
    let stored = null
    const client = {
      load: vi.fn().mockResolvedValue(null),
      transaction: vi.fn(async (_path, update) => {
        stored = update(null)
        return { committed: true, value: stored }
      }),
    }

    await expect(hydrateFirebaseStudio({
      user: USER,
      client,
      now: Date.UTC(2026, 6, 17, 1, 2, 3),
    })).resolves.toEqual({ status: 'local-seeded', revision: 1 })
    expect(stored.datasets).toEqual(before)
  })

  it('returns explicit no-user and unconfigured statuses without touching local data', async () => {
    seedLocal()
    const before = JSON.stringify(localDatasets())

    await expect(hydrateFirebaseStudio({ user: null, client: {} }))
      .resolves.toEqual({ status: 'unauthenticated' })
    await expect(hydrateFirebaseStudio({ user: USER, env: {} }))
      .resolves.toEqual({ status: 'unconfigured' })
    expect(JSON.stringify(localDatasets())).toBe(before)
  })

  it('preserves every local dataset byte-for-byte when the remote read fails', async () => {
    seedLocal()
    const keys = [
      GRAPHICS_STUDIO_STORAGE_KEY,
      SFX_TUNING_STORAGE_KEY,
      STAGE_BOSS_PREVIEW_STORAGE_KEY,
      TEXTURE_DECALS_STORAGE_KEY,
      STAGE_PROP_PLACEMENTS_STORAGE_KEY,
    ]
    const before = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))
    const client = { load: vi.fn().mockRejectedValue(new Error('offline')) }

    const result = await hydrateFirebaseStudio({ user: USER, client })

    expect(result.status).toBe('read-failed')
    expect(result.error).toBeInstanceOf(Error)
    expect(Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))).toEqual(before)
  })

  it('blocks unsupported future schemas without applying or rewriting them', async () => {
    seedLocal()
    const before = JSON.stringify(localDatasets())
    const client = {
      load: vi.fn().mockResolvedValue(remoteSnapshot({ schemaVersion: 2 })),
      transaction: vi.fn(),
    }

    await expect(hydrateFirebaseStudio({ user: USER, client }))
      .resolves.toEqual({ status: 'future-version', schemaVersion: 2 })
    expect(JSON.stringify(localDatasets())).toBe(before)
    expect(client.transaction).not.toHaveBeenCalled()
  })

  it('seeds an empty workspace instead of leaking a clean previous account into a new user', async () => {
    seedLocal()
    localStorage.setItem(FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY, 'account-a')
    setFirebaseStudioUser({ uid: 'account-b' })
    let stored
    const client = {
      load: vi.fn().mockResolvedValue(null),
      transaction: vi.fn(async (_path, update) => {
        stored = update(null)
        return { committed: true }
      }),
    }

    await expect(hydrateFirebaseStudio({ user: { uid: 'account-b' }, client }))
      .resolves.toEqual({ status: 'local-seeded', revision: 1 })
    expect(stored.datasets).toEqual({
      tunings: {},
      sfxTunings: {},
      stageBossPreview: {},
      decals: {},
      propPlacements: {},
    })
    expect(loadStudioTunings().player.scale).not.toBe(1.37)
    expect(localStorage.getItem(FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY)).toBe('account-b')
  })

  it('does not apply a deferred account A hydrate after the active user switches to B', async () => {
    seedLocal()
    localStorage.setItem(FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY, 'account-a')
    setFirebaseStudioUser({ uid: 'account-a' })
    let resolveLoad
    const client = {
      load: vi.fn(() => new Promise((resolve) => {
        resolveLoad = resolve
      })),
    }
    const pending = hydrateFirebaseStudio({ user: { uid: 'account-a' }, client })
    await Promise.resolve()

    setFirebaseStudioUser({ uid: 'account-b' })
    resolveLoad(remoteSnapshot())

    await expect(pending).resolves.toEqual({ status: 'stale-user' })
    expect(loadStudioTunings().player.scale).toBe(1.37)
  })

  it('does not overwrite a local edit made while the remote hydrate read is pending', async () => {
    seedLocal()
    localStorage.setItem(FIREBASE_STUDIO_OWNER_UID_STORAGE_KEY, USER.uid)
    setFirebaseStudioUser(USER)
    let resolveLoad
    const client = {
      load: vi.fn(() => new Promise((resolve) => {
        resolveLoad = resolve
      })),
    }
    const pending = hydrateFirebaseStudio({ user: USER, client })
    await Promise.resolve()

    saveStudioTunings({ player: { scale: 1.66 } })
    markFirebaseStudioLocalChange(USER)
    resolveLoad(remoteSnapshot())

    await expect(pending).resolves.toEqual({ status: 'local-changed' })
    expect(loadStudioTunings().player.scale).toBe(1.66)
  })

  it('pre-saves a durable same-user dirty workspace before reading remote state', async () => {
    seedLocal()
    setFirebaseStudioUser(USER)
    markFirebaseStudioLocalChange(USER)
    const order = []
    let stored
    const client = {
      transaction: vi.fn(async (_path, update) => {
        order.push('save')
        stored = update(null)
        return { committed: true }
      }),
      load: vi.fn(async () => {
        order.push('load')
        return stored
      }),
    }

    await expect(hydrateFirebaseStudio({ user: USER, client }))
      .resolves.toMatchObject({ status: 'remote-applied' })
    expect(order).toEqual(['save', 'load'])
    expect(stored.datasets.tunings.player.scale).toBe(1.37)
    expect(localStorage.getItem(FIREBASE_STUDIO_DIRTY_UID_STORAGE_KEY)).toBeNull()
  })

  it('normalizes an RTDB-pruned empty envelope to all five empty datasets', () => {
    const emptyEnvelope = {
      schemaVersion: 1,
      revision: 1,
      updatedAt: '2026-07-17T01:02:03.000Z',
    }
    expect(normalizeFirebaseStudioSnapshot(emptyEnvelope)?.datasets).toEqual({
      tunings: {},
      sfxTunings: {},
      stageBossPreview: {},
      decals: {},
      propPlacements: {},
    })
  })

  it('accepts missing dataset maps but rejects non-object present values', () => {
    const withoutEmptyMaps = remoteSnapshot()
    delete withoutEmptyMaps.datasets.sfxTunings
    delete withoutEmptyMaps.datasets.decals
    expect(normalizeFirebaseStudioSnapshot(withoutEmptyMaps)?.datasets).toMatchObject({
      sfxTunings: {},
      decals: {},
    })

    const invalid = remoteSnapshot()
    invalid.datasets.tunings = 7
    expect(normalizeFirebaseStudioSnapshot(invalid)).toBeNull()
  })

  it('cancels a pending debounced save when the signed-in UID changes', async () => {
    vi.useFakeTimers()
    const client = {
      transaction: vi.fn(),
    }
    try {
      setFirebaseStudioUser({ uid: 'account-a' })
      requestFirebaseStudioSave({ client, datasets: remoteSnapshot().datasets })

      setFirebaseStudioUser({ uid: 'account-b' })
      await vi.advanceTimersByTimeAsync(500)

      expect(client.transaction).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not create a cloud write when flush has no pending authored save', async () => {
    const client = { transaction: vi.fn() }
    setFirebaseStudioUser(USER)

    await expect(flushFirebaseStudioSave({ client }))
      .resolves.toEqual({ status: 'no-pending' })
    expect(client.transaction).not.toHaveBeenCalled()
  })

  it('coalesces rapid authored edits into one transaction containing the latest snapshot', async () => {
    vi.useFakeTimers()
    seedLocal()
    let written
    const onResult = vi.fn()
    const client = {
      transaction: vi.fn(async (_path, update) => {
        written = update(null)
        return { committed: true, value: written }
      }),
    }
    try {
      setFirebaseStudioUser(USER)
      requestFirebaseStudioSave({ client, onResult })
      saveStudioTunings({ player: { scale: 1.4 } })
      requestFirebaseStudioSave({ client })
      saveStudioTunings({ player: { scale: 1.9 } })
      requestFirebaseStudioSave({ client })

      await vi.advanceTimersByTimeAsync(500)

      expect(client.transaction).toHaveBeenCalledTimes(1)
      expect(written.datasets.tunings.player.scale).toBe(1.9)
      expect(onResult).toHaveBeenCalledWith({ status: 'saved', revision: 1 })
    } finally {
      vi.useRealTimers()
    }
  })

  it('serializes an in-flight transaction before draining the newest pending save', async () => {
    vi.useFakeTimers()
    let resolveFirst
    const writtenScales = []
    const client = {
      transaction: vi.fn(async (_path, update) => {
        writtenScales.push(update(null).datasets.tunings.player.scale)
        if (writtenScales.length === 1) {
          await new Promise((resolve) => {
            resolveFirst = resolve
          })
        }
        return { committed: true }
      }),
    }
    try {
      setFirebaseStudioUser(USER)
      requestFirebaseStudioSave({
        client,
        datasets: { ...remoteSnapshot().datasets, tunings: { player: { scale: 1.2 } } },
      })
      await vi.advanceTimersByTimeAsync(500)
      expect(client.transaction).toHaveBeenCalledTimes(1)

      requestFirebaseStudioSave({
        client,
        datasets: { ...remoteSnapshot().datasets, tunings: { player: { scale: 1.8 } } },
      })
      const drained = flushFirebaseStudioSave()
      expect(client.transaction).toHaveBeenCalledTimes(1)

      resolveFirst()
      await drained

      expect(client.transaction).toHaveBeenCalledTimes(2)
      expect(writtenScales).toEqual([1.2, 1.8])
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not restore or notify an in-flight failed save after the UID changes', async () => {
    vi.useFakeTimers()
    let rejectWrite
    const onResult = vi.fn()
    const client = {
      transaction: vi.fn(() => new Promise((_resolve, reject) => {
        rejectWrite = reject
      })),
    }
    try {
      setFirebaseStudioUser({ uid: 'account-a' })
      requestFirebaseStudioSave({ client, onResult, datasets: remoteSnapshot().datasets })
      await vi.advanceTimersByTimeAsync(500)
      expect(client.transaction).toHaveBeenCalledTimes(1)

      setFirebaseStudioUser({ uid: 'account-b' })
      rejectWrite(new Error('offline'))
      await Promise.resolve()
      await Promise.resolve()

      expect(onResult).not.toHaveBeenCalled()
      await expect(flushFirebaseStudioSave()).resolves.toEqual({ status: 'no-pending' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('retries client creation after a rejected singleton promise', async () => {
    const client = {
      transaction: vi.fn(async (_path, update) => {
        update(null)
        return { committed: true }
      }),
    }
    const factory = vi.fn()
      .mockRejectedValueOnce(new Error('sdk unavailable'))
      .mockResolvedValueOnce(client)
    _setFirebaseStudioClientFactoryForTests(factory)
    try {
      await expect(saveFirebaseStudio({
        user: USER,
        env: COMPLETE_ENV,
        datasets: remoteSnapshot().datasets,
      })).resolves.toMatchObject({ status: 'client-unavailable' })
      await expect(saveFirebaseStudio({
        user: USER,
        env: COMPLETE_ENV,
        datasets: remoteSnapshot().datasets,
      })).resolves.toEqual({ status: 'saved', revision: 1 })
      expect(factory).toHaveBeenCalledTimes(2)
    } finally {
      _setFirebaseStudioClientFactoryForTests()
    }
  })

  it('rolls back all five raw local datasets when one apply write throws', () => {
    seedLocal()
    const tuningEvents = []
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, (event) => tuningEvents.push(event.detail))
    const keys = [
      GRAPHICS_STUDIO_STORAGE_KEY,
      SFX_TUNING_STORAGE_KEY,
      STAGE_BOSS_PREVIEW_STORAGE_KEY,
      TEXTURE_DECALS_STORAGE_KEY,
      STAGE_PROP_PLACEMENTS_STORAGE_KEY,
    ]
    const before = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))
    const originalSetItem = Storage.prototype.setItem
    let didThrow = false
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItemWithQuota(key, value) {
      if (key === SFX_TUNING_STORAGE_KEY && !didThrow) {
        didThrow = true
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    })
    try {
      expect(applyLocalStudioDatasets(remoteSnapshot().datasets)).toBe(false)
    } finally {
      setItem.mockRestore()
    }

    resetStagePropPlacementsCache()
    expect(Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))).toEqual(before)
    expect(loadStagePropPlacements().stage1[0].id).toBe('desk-1')
    expect(tuningEvents.at(-1).player.scale).toBe(1.37)
  })

  it('rejects malformed present datasets before changing any of the five local values', () => {
    seedLocal()
    const keys = [
      GRAPHICS_STUDIO_STORAGE_KEY,
      SFX_TUNING_STORAGE_KEY,
      STAGE_BOSS_PREVIEW_STORAGE_KEY,
      TEXTURE_DECALS_STORAGE_KEY,
      STAGE_PROP_PLACEMENTS_STORAGE_KEY,
    ]
    const before = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))

    expect(applyLocalStudioDatasets({
      ...remoteSnapshot().datasets,
      tunings: 7,
    })).toBe(false)

    expect(Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))).toEqual(before)
  })

  it('retains a transiently failed pending snapshot for a later recovered flush', async () => {
    vi.useFakeTimers()
    const onResult = vi.fn()
    const failingClient = {
      transaction: vi.fn().mockRejectedValue(new Error('offline')),
    }
    let written
    const recoveredClient = {
      transaction: vi.fn(async (_path, update) => {
        written = update(null)
        return { committed: true, value: written }
      }),
    }
    try {
      setFirebaseStudioUser(USER)
      requestFirebaseStudioSave({
        client: failingClient,
        onResult,
        datasets: {
          ...remoteSnapshot().datasets,
          tunings: { player: { scale: 1.77 } },
        },
      })

      await vi.advanceTimersByTimeAsync(500)
      expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'write-failed' }))

      await expect(flushFirebaseStudioSave({ client: recoveredClient }))
        .resolves.toEqual({ status: 'saved', revision: 1 })
      expect(recoveredClient.transaction).toHaveBeenCalledTimes(1)
      expect(written.datasets.tunings.player.scale).toBe(1.77)
    } finally {
      vi.useRealTimers()
    }
  })

  it('transactionally replaces owned datasets, preserves unknown envelope fields, and increments revision', async () => {
    seedLocal()
    const current = {
      ...remoteSnapshot(),
      revision: 4,
      serverNote: { keep: true },
      datasets: {
        ...remoteSnapshot().datasets,
        tunings: { stale: { scale: 2 } },
        decals: { stale: [] },
      },
    }
    let next
    const client = {
      transaction: vi.fn(async (_path, update) => {
        next = update(current)
        return { committed: true, value: next }
      }),
    }
    const datasets = localDatasets()

    await expect(saveFirebaseStudio({
      user: USER,
      client,
      datasets,
      now: Date.UTC(2026, 6, 17, 1, 2, 3),
    })).resolves.toEqual({ status: 'saved', revision: 5 })

    expect(next.serverNote).toEqual({ keep: true })
    expect(next.datasets).toEqual(datasets)
    expect(next.datasets).not.toHaveProperty('unknown')
    expect(next).toMatchObject({
      schemaVersion: 1,
      revision: 5,
      updatedAt: '2026-07-17T01:02:03.000Z',
    })
  })

  it('aborts a save transaction when the current remote schema is newer', async () => {
    const client = {
      transaction: vi.fn(async (_path, update) => ({
        committed: update(remoteSnapshot({ schemaVersion: 2 })) !== undefined,
      })),
    }

    await expect(saveFirebaseStudio({ user: USER, client, datasets: remoteSnapshot().datasets }))
      .resolves.toEqual({ status: 'future-version', schemaVersion: 2 })
  })

  it('applies a normalized snapshot directly', () => {
    seedLocal()
    expect(applyFirebaseStudioSnapshot(remoteSnapshot())).toBe(true)
    expect(loadStudioTunings().player.scale).toBe(1.82)
  })
})

describe('subscribeStudioStorageSync', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStagePropPlacementsCache()
    setFirebaseStudioUser(null)
  })

  it('re-emits dataset events when another tab writes a studio key', () => {
    seedLocal()
    const tuningEvents = []
    const listener = (event) => tuningEvents.push(event.detail)
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, listener)
    const unsubscribe = subscribeStudioStorageSync()
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: GRAPHICS_STUDIO_STORAGE_KEY }))
    } finally {
      unsubscribe()
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, listener)
    }

    expect(tuningEvents).toHaveLength(1)
    expect(tuningEvents[0].player.scale).toBe(1.37)
  })

  it('re-emits on a full storage clear (key === null) but ignores unrelated keys', () => {
    seedLocal()
    const tuningEvents = []
    const listener = (event) => tuningEvents.push(event.detail)
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, listener)
    const unsubscribe = subscribeStudioStorageSync()
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: 'some-unrelated-key' }))
      expect(tuningEvents).toHaveLength(0)

      window.dispatchEvent(new StorageEvent('storage', { key: null }))
      expect(tuningEvents).toHaveLength(1)
    } finally {
      unsubscribe()
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, listener)
    }

    expect(tuningEvents).toHaveLength(1)
  })

  it('stops re-emitting after the returned cleanup runs', () => {
    seedLocal()
    const tuningEvents = []
    const listener = (event) => tuningEvents.push(event.detail)
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, listener)
    const unsubscribe = subscribeStudioStorageSync()
    unsubscribe()
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: GRAPHICS_STUDIO_STORAGE_KEY }))
    } finally {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, listener)
    }

    expect(tuningEvents).toHaveLength(0)
  })
})
