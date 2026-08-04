// Vitest only: player data has no browser-storage fallback. Seed the same
// hydrated remote snapshot every test so unit tests exercise the Firebase-only
// runtime contract without contacting Firebase.
import { beforeEach } from 'vitest'
import {
  _resetFirebaseProgressForTests,
  _seedHydratedFirebaseProgressForTests,
} from '../src/lib/firebaseProgress.js'
import { commitFirebaseStudioRuntime } from '../src/lib/studioRuntimeState.js'
import { useLocaleStore } from '../src/lib/i18n.js'

// jsdom navigator.language is en-US, so language auto-detect would flip every
// UI assertion to English. Unit tests assert the Korean canonical copy, so pin
// the browser language too — components re-derive the locale from it whenever
// the account has no saved language.
function seedKoreanLocale() {
  if (typeof navigator !== 'undefined') {
    Object.defineProperty(navigator, 'language', { value: 'ko-KR', configurable: true })
    Object.defineProperty(navigator, 'languages', { value: ['ko-KR'], configurable: true })
  }
  useLocaleStore.setState({ locale: 'ko' })
}

function seedFirebaseTestRuntime() {
  seedKoreanLocale()
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
