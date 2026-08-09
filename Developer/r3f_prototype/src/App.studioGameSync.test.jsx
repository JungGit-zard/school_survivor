// @vitest-environment jsdom
// Graphics Studio Apply must land in the game window immediately, straight from the
// postMessage payload. These tests keep firebaseStudio.js / studioRuntimeState.js /
// graphicsStudioConfig.js / stagePropPlacements.js REAL so the whole chain is covered:
//   payload -> runtime commit -> dataset-changed events -> R3F re-render triggers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  canonicalHydrate: vi.fn(() => Promise.resolve({ status: 'missing-remote' })),
}))

vi.mock('./store/useAuthStore.js', () => {
  const state = { status: 'signedOut', user: null, progressStatus: 'idle', initializeAuth: vi.fn() }
  const useAuthStore = (selector) => selector(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})

vi.mock('./lib/firebaseProgress.js', () => ({
  installPlayerStorageFatalGuard: vi.fn(),
  isFirebaseProgressHydrated: vi.fn(() => false),
  isFirebaseProgressConfigured: vi.fn(() => false),
}))

vi.mock('./lib/firebaseInspectionMode.js', () => ({
  subscribeInspectionMode: vi.fn(() => vi.fn()),
  getInspectionPhase: () => 'inactive',
}))

vi.mock('./components/GoogleAccountPanel.jsx', () => ({
  default: () => null,
}))

// Only the Firebase round trip is mocked. Everything the Apply payload touches is real.
vi.mock('./lib/firebaseStudio.js', async (original) => ({
  ...(await original()),
  hydrateCanonicalTitlePlayer: mocks.canonicalHydrate,
}))

const { handleStudioGameSyncMessage } = await import('./App.jsx')
const { STUDIO_GAME_SYNC_MESSAGE } = await import('./lib/studioGameBridge.js')
const { applyFrozenStudioSnapshot, FROZEN_STUDIO_SNAPSHOT } = await import('./title/frozenStudio.js')
const { isFirebaseStudioRuntimeReady, getFirebaseStudioRuntimeState } = await import('./lib/studioRuntimeState.js')
const { loadStudioTunings } = await import('./lib/graphicsStudioConfig.js')
const { getStagePropOverride } = await import('./lib/stagePropPlacements.js')
const { getStageObjectPlacements } = await import('./components/StageObjects/stageObjectPlacements.js')

const APPLIED_DESK = Object.freeze({
  id: 'studio-apply-desk',
  type: 'classroomDesk',
  position: [3, 0, -4],
  rotation: [0, 0, 0],
  scale: 1,
})

function buildApplyPayload() {
  return {
    ...FROZEN_STUDIO_SNAPSHOT.datasets,
    tunings: {
      ...FROZEN_STUDIO_SNAPSHOT.datasets.tunings,
      player: { ...FROZEN_STUDIO_SNAPSHOT.datasets.tunings?.player, scale: 1.45 },
    },
    propPlacements: { stage1: [APPLIED_DESK] },
  }
}

// The Studio posts only after Firebase save succeeds, so the force payload must
// carry the exact canonical revision that Firebase just returned.
function applyMessage(overrides = {}) {
  return {
    data: {
      type: STUDIO_GAME_SYNC_MESSAGE,
      force: true,
      datasets: buildApplyPayload(),
      revision: 4242,
      ...overrides,
    },
    origin: window.location.origin,
    source: null,
  }
}

describe('Graphics Studio Apply reaches the game window immediately', () => {
  beforeEach(() => {
    mocks.canonicalHydrate.mockClear()
    // The game route seeds its runtime from the frozen snapshot (TitleSceneCanvas.jsx).
    applyFrozenStudioSnapshot({ force: true })
  })

  afterEach(() => {
    applyFrozenStudioSnapshot({ force: true })
  })

  it('applies the payload datasets without any Firebase round trip', async () => {
    expect(isFirebaseStudioRuntimeReady()).toBe(true)

    await expect(handleStudioGameSyncMessage(applyMessage())).resolves.toBe(true)

    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
    expect(loadStudioTunings().player.scale).toBe(1.45)
    expect(getStagePropOverride('stage1')).toHaveLength(1)
  })

  it('rejects force payloads that do not carry a saved Firebase revision', async () => {
    const seededRevision = getFirebaseStudioRuntimeState().revision
    expect(Number.isInteger(seededRevision)).toBe(true)

    await expect(handleStudioGameSyncMessage(applyMessage({ revision: null }))).resolves.toBe(false)

    expect(isFirebaseStudioRuntimeReady()).toBe(true)
    expect(getFirebaseStudioRuntimeState().revision).toBe(seededRevision)
    expect(loadStudioTunings().player?.scale).not.toBe(1.45)
    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
  })

  it('rejects revision 0 because Apply must use the saved Firebase revision', async () => {
    const seededRevision = getFirebaseStudioRuntimeState().revision

    await expect(handleStudioGameSyncMessage(applyMessage({ revision: 0 }))).resolves.toBe(false)

    expect(getFirebaseStudioRuntimeState().revision).toBe(seededRevision)
    expect(loadStudioTunings().player?.scale).not.toBe(1.45)
    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
  })

  it('honours an explicit revision when the payload supplies one', async () => {
    await handleStudioGameSyncMessage(applyMessage({ revision: 4242 }))

    expect(getFirebaseStudioRuntimeState().revision).toBe(4242)
    expect(isFirebaseStudioRuntimeReady()).toBe(true)
  })

  it('dispatches the dataset events the R3F scene re-renders on', async () => {
    const seen = []
    const listeners = [
      'escape-zombie-school.graphicsStudioTunings.changed',
      'escape-zombie-school.textureDecals.changed',
      'escape-zombie-school.stagePropPlacements.changed',
      'escape-zombie-school.bossFaceRecipes.changed',
      'escape-zombie-school.stageBossPreview.changed',
    ].map((type) => {
      const handler = () => seen.push(type)
      window.addEventListener(type, handler)
      return () => window.removeEventListener(type, handler)
    })

    try {
      await handleStudioGameSyncMessage(applyMessage())
    } finally {
      listeners.forEach((off) => off())
    }

    expect(seen).toContain('escape-zombie-school.graphicsStudioTunings.changed')
    expect(seen).toContain('escape-zombie-school.textureDecals.changed')
    expect(seen).toContain('escape-zombie-school.stagePropPlacements.changed')
    expect(seen).toContain('escape-zombie-school.bossFaceRecipes.changed')
    expect(seen).toContain('escape-zombie-school.stageBossPreview.changed')
  })

  it('makes the applied prop placement the placement the stage layer renders', async () => {
    await handleStudioGameSyncMessage(applyMessage())

    const placements = getStageObjectPlacements('stage1')
    expect(placements).toHaveLength(1)
    expect(placements[0]).toMatchObject({ type: 'classroomDesk', position: [3, 0, -4] })
  })

  it('rejects a payload from a disallowed origin without touching the runtime', async () => {
    const seededPlacements = getStagePropOverride('stage1')
    const message = applyMessage()
    message.origin = 'https://evil.example.com'

    await expect(handleStudioGameSyncMessage(message)).resolves.toBe(false)

    expect(loadStudioTunings().player?.scale).not.toBe(1.45)
    expect(getStagePropOverride('stage1')).toEqual(seededPlacements)
    expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
  })

  it('rejects a payload from a window that is not the opener', async () => {
    const seededPlacements = getStagePropOverride('stage1')
    const openerDescriptor = Object.getOwnPropertyDescriptor(window, 'opener')
    Object.defineProperty(window, 'opener', { value: { name: 'studio' }, configurable: true, writable: true })
    try {
      const message = applyMessage()
      message.source = { name: 'someone-else' }

      await expect(handleStudioGameSyncMessage(message)).resolves.toBe(false)

      expect(loadStudioTunings().player?.scale).not.toBe(1.45)
      expect(getStagePropOverride('stage1')).toEqual(seededPlacements)
      expect(mocks.canonicalHydrate).not.toHaveBeenCalled()
    } finally {
      if (openerDescriptor) Object.defineProperty(window, 'opener', openerDescriptor)
      else delete window.opener
    }
  })
})
