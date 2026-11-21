// Rules-faithful fake RTDB (fakeProgressDatabase.js) with switches for the network conditions the
// progress tests need: writes that reject (offline / denied), writes that wait for an explicit
// release (slow ACK while logout waits), and reads that wait (stale in-flight hydrate).
// Every write that does go through is still validated against database.rules.json and logged in
// db.writes / db.reads exactly like the plain fake.
import { createFakeProgressDatabase } from './fakeProgressDatabase.js'

export function createControllableProgressDatabase(initialRoot = {}, options = {}) {
  const db = createFakeProgressDatabase(initialRoot, options)
  const control = {
    offline: false, // update/transaction reject with a synthetic network error
    holdWrites: false, // update/transaction wait in control.heldWrites until released
    heldWrites: [],
    holdReads: false, // load/loadFields wait in control.heldReads until released
    heldReads: [],
    failedWrites: 0,
  }

  const waitForWrite = async () => {
    if (control.holdWrites) await new Promise(resolve => control.heldWrites.push(resolve))
    if (control.offline) {
      control.failedWrites += 1
      throw Object.assign(new Error('synthetic offline'), { code: 'synthetic-offline' })
    }
  }
  for (const kind of ['update', 'transaction']) {
    const original = db[kind]
    db[kind] = async (path, arg) => {
      await waitForWrite()
      return original(path, arg)
    }
  }
  for (const kind of ['load', 'loadFields']) {
    const original = db[kind]
    db[kind] = async (...args) => {
      if (control.holdReads) {
        const outcome = await new Promise(resolve => control.heldReads.push(resolve))
        if (outcome instanceof Error) throw outcome
      }
      return original(...args)
    }
  }

  db.control = control
  // Releases the oldest held write; returns false when nothing was waiting.
  db.releaseWrite = () => {
    const release = control.heldWrites.shift()
    if (!release) return false
    release()
    return true
  }
  // Releases the oldest held read; pass an Error to make that read reject.
  db.releaseRead = (outcome) => {
    const release = control.heldReads.shift()
    if (!release) return false
    release(outcome)
    return true
  }
  return db
}

export const TEST_FIREBASE_ENV = Object.freeze({
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'school-survivor.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://example-rtdb.firebaseio.com',
  VITE_FIREBASE_PROJECT_ID: 'school-survivor',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
})
