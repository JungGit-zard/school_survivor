import { afterEach, describe, expect, it } from 'vitest'
import {
  FIREBASE_STUDIO_RUNTIME_DATASET_KEYS,
  FirebaseStudioNotHydratedError,
  blockFirebaseStudioRuntime,
  commitFirebaseStudioRuntime,
  getFirebaseStudioRuntimeDataset,
  getFirebaseStudioRuntimeState,
  isFirebaseStudioRuntimeReady,
  setFirebaseStudioRuntimeDataset,
} from './studioRuntimeState.js'

// Open reads, write-only readiness gate: AGENTS.md 17–25 and the original
// firebaseStudio.test.js contract. Empty reads do not commit or persist data.
afterEach(() => blockFirebaseStudioRuntime())

describe('Firebase canonical dataset read contract', () => {
  it.each(FIREBASE_STUDIO_RUNTIME_DATASET_KEYS)('keeps a blocked %s read open but rejects writes without changing state', (key) => {
    blockFirebaseStudioRuntime()
    const before = getFirebaseStudioRuntimeState()
    expect(getFirebaseStudioRuntimeDataset(key)).toEqual({})
    expect(() => setFirebaseStudioRuntimeDataset(key, {})).toThrow(FirebaseStudioNotHydratedError)
    expect(getFirebaseStudioRuntimeState()).toBe(before)
    expect(before.datasets).toBeNull()
  })

  it.each([null, -1, 1.5])('keeps reads empty and writes blocked without a confirmed integer revision (%s)', (revision) => {
    commitFirebaseStudioRuntime({ tunings: { player: { scale: 1.75 } } }, { revision })
    const before = getFirebaseStudioRuntimeState()
    expect(isFirebaseStudioRuntimeReady()).toBe(false)
    expect(getFirebaseStudioRuntimeDataset('tunings')).toEqual({})
    expect(() => setFirebaseStudioRuntimeDataset('tunings', {})).toThrow(FirebaseStudioNotHydratedError)
    expect(getFirebaseStudioRuntimeState()).toBe(before)
  })

  it('reads confirmed datasets unchanged, including low-level revision zero and an authored empty dataset', () => {
    // This low-level readiness contract does not relax Firebase canonical
    // snapshot validation, whose independent original test rejects revision 0.
    const tunings = { player: { scale: 1.75 } }
    const decals = {}
    commitFirebaseStudioRuntime({ tunings, decals }, { revision: 0 })
    const before = getFirebaseStudioRuntimeState()
    expect(isFirebaseStudioRuntimeReady()).toBe(true)
    expect(getFirebaseStudioRuntimeDataset('tunings')).toBe(tunings)
    expect(getFirebaseStudioRuntimeDataset('decals')).toBe(decals)
    expect(getFirebaseStudioRuntimeState()).toBe(before)
  })

  it('does not expose a previous dataset after block and reads only the next confirmed commit', () => {
    commitFirebaseStudioRuntime({ tunings: { player: { scale: 1.75 } } }, { revision: 1 })
    blockFirebaseStudioRuntime()
    expect(getFirebaseStudioRuntimeDataset('tunings')).toEqual({})
    expect(getFirebaseStudioRuntimeState().datasets).toBeNull()
    const next = { player: { scale: 1.25 } }
    commitFirebaseStudioRuntime({ tunings: next }, { revision: 2 })
    expect(getFirebaseStudioRuntimeDataset('tunings')).toBe(next)
    expect(getFirebaseStudioRuntimeState().revision).toBe(2)
  })
})
