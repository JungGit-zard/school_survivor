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

// Every browser the game supports has the Web Locks API (navigator.locks); jsdom and Node do not.
// One in-memory lock manager stands in for "this browser": a tab that closes (_resetStageSlotForTests)
// releases its locks, exactly like a real closed tab. Tests of the no-Web-Locks fallback delete it.
function installTestWebLocks() {
  const nav = globalThis.navigator
  if (!nav || nav.locks) return
  const held = new Map()
  const locks = {
    async request(name, optionsOrCallback, maybeCallback) {
      const options = typeof optionsOrCallback === 'function' ? {} : (optionsOrCallback ?? {})
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
      let queue = held.get(name)
      if (queue) {
        if (options.ifAvailable) return callback(null)
        await new Promise(resolve => queue.push(resolve))
      } else {
        queue = []
        held.set(name, queue)
      }
      try {
        return await callback({ name, mode: 'exclusive' })
      } finally {
        const next = queue.shift()
        if (next) next()
        else held.delete(name)
      }
    },
  }
  Object.defineProperty(nav, 'locks', { value: locks, configurable: true })
}

installTestWebLocks()
seedFirebaseTestRuntime()

beforeEach(() => {
  seedFirebaseTestRuntime()
})
