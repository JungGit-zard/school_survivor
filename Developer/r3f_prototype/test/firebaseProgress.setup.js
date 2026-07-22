// Vitest only: player data has no browser-storage fallback. Seed the same
// hydrated remote snapshot every test so unit tests exercise the Firebase-only
// runtime contract without contacting Firebase.
import { beforeEach } from 'vitest'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
} from '../src/lib/firebaseProgress.js'
import { commitFirebaseStudioRuntime } from '../src/lib/studioRuntimeState.js'

function seedFirebaseTestRuntime() {
  _resetFirebaseProgressForTests()
  _seedHydratedFirebaseProgressForTests()
  commitFirebaseStudioRuntime({
    tunings: {},
    sfxTunings: {},
    stageBossPreview: {},
    decals: {},
    propPlacements: {},
  }, { revision: 0 })
}

seedFirebaseTestRuntime()

beforeEach(() => {
  seedFirebaseTestRuntime()
})
