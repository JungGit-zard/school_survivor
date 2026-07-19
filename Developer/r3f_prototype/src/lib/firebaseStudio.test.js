// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applySubscribedFirebaseStudioSnapshot,
  applyFirebaseStudioSnapshot,
  buildFirebaseStudioSnapshot,
  decodeFirebaseStudioSnapshotFromStorage,
  encodeFirebaseStudioSnapshotForStorage,
  getUserStudioPath,
  hydrateFirebaseStudio,
  loadStudioRuntimeDatasets,
  markFirebaseStudioLocalChange,
  normalizeFirebaseStudioSnapshot,
  saveFirebaseStudio,
  setFirebaseStudioUser,
  subscribeFirebaseStudio,
} from './firebaseStudio.js'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_CATALOG,
  loadStageBossPreview,
  loadStudioTunings,
  loadTextureDecals,
  saveStudioTunings,
} from './graphicsStudioConfig.js'
import { loadSfxTunings } from './sfxRegistry.js'
import { loadStagePropPlacements } from './stagePropPlacements.js'
import {
  blockFirebaseStudioRuntime,
  getFirebaseStudioRuntimeState,
  isFirebaseStudioRuntimeReady,
} from './studioRuntimeState.js'

const USER = { uid: 'studio-user' }

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

describe('Firebase-only Graphics Studio persistence', () => {
  beforeEach(() => {
    setFirebaseStudioUser(null)
    blockFirebaseStudioRuntime()
  })

  it('fails closed before Firebase hydrate instead of returning seed or defaults', () => {
    expect(isFirebaseStudioRuntimeReady()).toBe(false)
    expect(() => loadStudioTunings()).toThrowError(/hydrate is required/i)
    expect(() => loadSfxTunings()).toThrowError(/hydrate is required/i)
    expect(() => loadStageBossPreview()).toThrowError(/hydrate is required/i)
    expect(() => loadTextureDecals()).toThrowError(/hydrate is required/i)
    expect(() => loadStagePropPlacements()).toThrowError(/hydrate is required/i)
  })

  it('hydrates all five datasets only from a supported Firebase snapshot', async () => {
    setFirebaseStudioUser(USER)
    const client = { load: vi.fn().mockResolvedValue(remoteSnapshot()) }

    await expect(hydrateFirebaseStudio({ user: USER, client })).resolves.toEqual({
      status: 'remote-applied',
      revision: 7,
    })

    expect(isFirebaseStudioRuntimeReady()).toBe(true)
    expect(loadStudioTunings().player.scale).toBe(1.82)
    expect(loadSfxTunings()).toEqual({ buttonClick: { volume: 0.2, rate: 0.8 } })
    expect(loadStageBossPreview()).toEqual({ zoom: 145, panX: -0.3, panY: 0.1 })
    expect(loadTextureDecals()).toEqual({})
    expect(loadStagePropPlacements()).toEqual({ stage1: null, stage2: [], stage3: null })
  })

  it('subscribes every runtime to newer Firebase revisions and applies them immediately', async () => {
    let pushRemote
    const unsubscribe = vi.fn()
    const client = {
      load: vi.fn().mockResolvedValue(remoteSnapshot()),
      subscribe: vi.fn((_path, onValue) => {
        pushRemote = onValue
        return unsubscribe
      }),
    }
    setFirebaseStudioUser(USER)
    await hydrateFirebaseStudio({ user: USER, client })
    const onResult = vi.fn()

    const subscription = await subscribeFirebaseStudio({ user: USER, client, onResult })
    expect(subscription.status).toBe('subscribed')
    expect(client.subscribe).toHaveBeenCalledWith(
      'studioWorkspaces/v1/users/studio-user/current',
      expect.any(Function),
      expect.any(Function),
    )

    pushRemote(remoteSnapshot({
      revision: 8,
      datasets: {
        ...remoteSnapshot().datasets,
        tunings: { player: { scale: 1.61 } },
      },
    }))

    expect(onResult).toHaveBeenLastCalledWith({ status: 'remote-applied', revision: 8 })
    expect(getFirebaseStudioRuntimeState().revision).toBe(8)
    expect(loadStudioTunings().player.scale).toBe(1.61)

    subscription.unsubscribe()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('ignores stale subscription revisions and fails closed on malformed remote data', async () => {
    setFirebaseStudioUser(USER)
    await hydrateFirebaseStudio({
      user: USER,
      client: { load: vi.fn().mockResolvedValue(remoteSnapshot()) },
    })

    expect(applySubscribedFirebaseStudioSnapshot(
      remoteSnapshot({ revision: 6 }),
      { uid: USER.uid },
    )).toEqual({ status: 'current-revision', revision: 7 })
    expect(getFirebaseStudioRuntimeState().revision).toBe(7)

    expect(applySubscribedFirebaseStudioSnapshot(
      { schemaVersion: 1, revision: 8 },
      { uid: USER.uid },
    )).toEqual({ status: 'invalid-remote' })
    expect(isFirebaseStudioRuntimeReady()).toBe(false)
  })

  it('rejects a missing Firebase snapshot without creating or applying local data', async () => {
    setFirebaseStudioUser(USER)
    const client = {
      load: vi.fn().mockResolvedValue(null),
      transaction: vi.fn(),
    }

    await expect(hydrateFirebaseStudio({ user: USER, client }))
      .resolves.toEqual({ status: 'missing-remote' })
    expect(client.transaction).not.toHaveBeenCalled()
    expect(isFirebaseStudioRuntimeReady()).toBe(false)
    expect(() => loadStudioRuntimeDatasets()).toThrowError(/hydrate is required/i)
  })

  it('rejects future and malformed remote snapshots without opening the runtime gate', async () => {
    setFirebaseStudioUser(USER)
    await expect(hydrateFirebaseStudio({
      user: USER,
      client: { load: vi.fn().mockResolvedValue(remoteSnapshot({ schemaVersion: 2 })) },
    })).resolves.toEqual({ status: 'future-version', schemaVersion: 2 })
    expect(isFirebaseStudioRuntimeReady()).toBe(false)

    await expect(hydrateFirebaseStudio({
      user: USER,
      client: { load: vi.fn().mockResolvedValue({ schemaVersion: 1 }) },
    })).resolves.toEqual({ status: 'invalid-remote' })
    expect(isFirebaseStudioRuntimeReady()).toBe(false)
  })

  it('saves the current in-memory datasets to Firebase after hydrate', async () => {
    setFirebaseStudioUser(USER)
    const client = {
      load: vi.fn().mockResolvedValue(remoteSnapshot()),
      transaction: vi.fn(async (_path, update) => {
        const value = update(remoteSnapshot())
        return { committed: true, value }
      }),
    }
    await hydrateFirebaseStudio({ user: USER, client })

    saveStudioTunings({ player: { scale: 1.4 } })
    expect(markFirebaseStudioLocalChange(USER)).toBe(true)
    await expect(saveFirebaseStudio({
      user: USER,
      client,
      now: Date.UTC(2026, 6, 18, 1, 2, 3),
    })).resolves.toEqual({ status: 'saved', revision: 8 })

    expect(client.transaction).toHaveBeenCalledTimes(1)
    const [, update] = client.transaction.mock.calls[0]
    const saved = update(remoteSnapshot())
    expect(saved.datasets.tunings.player.scale).toBe(1.4)
    expect(saved.revision).toBe(8)
    expect(getFirebaseStudioRuntimeState().revision).toBe(8)
  })

  it('does not acknowledge a saved revision over a newer unsaved Studio mutation', async () => {
    let releaseTransaction
    let notifyTransactionStarted
    const transactionStarted = new Promise((resolve) => {
      notifyTransactionStarted = resolve
    })
    const transactionGate = new Promise((resolve) => {
      releaseTransaction = resolve
    })
    setFirebaseStudioUser(USER)
    const client = {
      load: vi.fn().mockResolvedValue(remoteSnapshot()),
      transaction: vi.fn(async (_path, update) => {
        update(remoteSnapshot())
        notifyTransactionStarted()
        await transactionGate
        return { committed: true }
      }),
    }
    await hydrateFirebaseStudio({ user: USER, client })

    saveStudioTunings({ player: { scale: 1.4 } })
    markFirebaseStudioLocalChange(USER)
    const savePromise = saveFirebaseStudio({ user: USER, client })
    await transactionStarted
    saveStudioTunings({ player: { scale: 1.5 } })
    markFirebaseStudioLocalChange(USER)
    releaseTransaction()

    await expect(savePromise).resolves.toEqual({ status: 'saved', revision: 8 })
    expect(getFirebaseStudioRuntimeState().revision).toBe(7)
    expect(loadStudioTunings().player.scale).toBe(1.5)
  })

  it('builds and validates the exact five-dataset Firebase envelope', () => {
    const datasets = remoteSnapshot().datasets
    const snapshot = buildFirebaseStudioSnapshot(datasets, {
      revision: 3,
      now: Date.UTC(2026, 6, 17, 1, 2, 3),
    })
    expect(getUserStudioPath(USER)).toBe('studioWorkspaces/v1/users/studio-user/current')
    expect(Object.keys(snapshot.datasets)).toEqual([
      'tunings',
      'sfxTunings',
      'stageBossPreview',
      'decals',
      'propPlacements',
    ])
    expect(normalizeFirebaseStudioSnapshot(snapshot)).toEqual(snapshot)
    expect(applyFirebaseStudioSnapshot(snapshot)).toBe(true)
  })

  it('round-trips dataset keys that Firebase cannot store as object keys', () => {
    const snapshot = buildFirebaseStudioSnapshot({
      ...remoteSnapshot().datasets,
      tunings: {
        'player::part::0.0.19.2.0.8': {
          positionY: -0.74,
          positionZ: 0.9,
        },
      },
    }, {
      revision: 1,
      now: Date.UTC(2026, 6, 18, 1, 2, 3),
    })

    const encoded = encodeFirebaseStudioSnapshotForStorage(snapshot)
    expect(typeof encoded.datasets.tunings).toBe('string')
    expect(JSON.parse(encoded.datasets.tunings)).toEqual(snapshot.datasets.tunings)
    expect(decodeFirebaseStudioSnapshotFromStorage(encoded)).toEqual(snapshot)
  })

  it('round-trips the latest tuning for every registered Graphics Studio catalog item through Firebase', async () => {
    const tunings = Object.fromEntries(GRAPHICS_STUDIO_CATALOG.map((item, index) => [
      item.id,
      {
        ...DEFAULT_STUDIO_TUNING,
        scale: Number((1 + (index % 10) / 100).toFixed(2)),
        positionX: Number(((index % 7) / 10).toFixed(2)),
        rotationY: index % 180,
      },
    ]))
    const snapshot = buildFirebaseStudioSnapshot({
      ...remoteSnapshot().datasets,
      tunings,
    }, {
      revision: 19,
      now: Date.UTC(2026, 6, 19, 4, 5, 6),
    })
    const stored = encodeFirebaseStudioSnapshotForStorage(snapshot)

    setFirebaseStudioUser(USER)
    await expect(hydrateFirebaseStudio({
      user: USER,
      client: {
        load: vi.fn().mockResolvedValue(decodeFirebaseStudioSnapshotFromStorage(stored)),
      },
    })).resolves.toEqual({ status: 'remote-applied', revision: 19 })

    const restored = loadStudioTunings()
    expect(Object.keys(restored).sort()).toEqual(GRAPHICS_STUDIO_CATALOG.map((item) => item.id).sort())
    GRAPHICS_STUDIO_CATALOG.forEach((item) => {
      expect(restored[item.id]).toEqual(tunings[item.id])
    })
  })
})
