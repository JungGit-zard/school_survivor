import { describe, expect, it } from 'vitest'
import { rolldown } from 'rolldown'
import { JSDOM } from 'jsdom'
import path from 'node:path'
import config from '../vite.config.js'

// Bundle the real browser SDK, not Node's storage-free Firebase distribution.
// No Firebase/Auth/storage mocks: the original DOM Storage methods still run.
const entry = `
import { createFirebaseAuthClient } from './src/lib/firebaseAuth.js';
import { installStudioLocalStorageGuard } from './src/lib/studioLocalStorageGuard.js';
import { getApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, goOffline, forceWebSockets } from 'firebase/database';
export async function exercise() {
 const env = { VITE_FIREBASE_API_KEY: 'storage-test-key', VITE_FIREBASE_AUTH_DOMAIN: 'storage-test.invalid',
  VITE_FIREBASE_PROJECT_ID: 'storage-test', VITE_FIREBASE_APP_ID: '1:123:web:storage-test',
  VITE_FIREBASE_DATABASE_URL: 'https://storage-test.firebaseio.com' };
 const guardInstalled = installStudioLocalStorageGuard(window);
 const client = await createFirebaseAuthClient(env, window);
 const auth = getAuth(getApp());
 await auth.authStateReady();
 const authType = auth.persistenceManager.persistence.type;
 const again = await createFirebaseAuthClient(env, window);
 const events = [];
 const unsubscribe = client.subscribe(user => events.push(user));
 forceWebSockets();
 const db = getDatabase(getApp());
 const stop = onValue(ref(db, '.info/connected'), snap => events.push(snap.val()));
 await new Promise(resolve => setTimeout(resolve, 50));
 goOffline(db);
 stop(); unsubscribe();
 await client.signOut();
 await deleteApp(getApp());
 return { configured: client.configured && again.configured, guardInstalled, authType, events };
}`

// One page visit of the game (or Graphics Studio) with the real Auth SDK: report which store
// Firebase chose and every auth state the app saw, optionally pressing sign-out.
const visitEntry = `
import { createFirebaseAuthClient } from './src/lib/firebaseAuth.js';
import { getApps, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
export async function visit(signOut) {
 const env = { VITE_FIREBASE_API_KEY: 'storage-test-key', VITE_FIREBASE_AUTH_DOMAIN: 'storage-test.invalid',
  VITE_FIREBASE_PROJECT_ID: 'storage-test', VITE_FIREBASE_APP_ID: '1:123:web:storage-test' };
 const client = await createFirebaseAuthClient(env, window);
 const app = getApps()[0];
 const auth = getAuth(app);
 await auth.authStateReady();
 const users = [];
 const unsubscribe = client.subscribe(user => users.push(user ? user.uid : null));
 await new Promise(resolve => setTimeout(resolve, 0));
 if (signOut) { await client.signOut(); await new Promise(resolve => setTimeout(resolve, 0)); }
 unsubscribe();
 const authType = auth.persistenceManager.persistence.type;
 const appName = app.name;
 await deleteApp(app);
 return { appName, authType, users };
}`

export async function bundleSDK(plugins, source = entry) {
 const bundle = await rolldown({
  input: 'phase5-sdk-entry', platform: 'browser', transform: { define: { 'import.meta.env': '{}' } }, resolve: { conditionNames: ['browser', 'import', 'default'] },
  plugins: [{ name: 'storage-test-entry',
   resolveId(id) { if (id === 'phase5-sdk-entry') return path.resolve('phase5-sdk-entry.js') },
   load(id) { if (id === path.resolve('phase5-sdk-entry.js')) return source },
  }, ...plugins],
 })
 try {
  const { output } = await bundle.generate({ format: 'iife', name: 'StorageTest', codeSplitting: false })
  return output.find(chunk => chunk.type === 'chunk').code
 } finally { await bundle.close() }
}

function recordLocalStorage(window, operations) {
 const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
 const storage = descriptor.get.call(window)
 for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) {
  const original = window.Storage.prototype[method]
  window.Storage.prototype[method] = function (...args) {
   if (this === storage) operations.push([method, args[0] ?? null])
   return original.apply(this, args)
  }
 }
 Object.defineProperty(window, 'localStorage', { ...descriptor, get() {
  operations.push(['getter']); return descriptor.get.call(window)
 } })
}

async function exerciseSDK(plugins) {
 const code = await bundleSDK(plugins)
 const dom = new JSDOM('', { url: 'https://localhost/game', runScripts: 'outside-only' })
 const operations = []
 const networkAttempts = []
 const { window } = dom
 recordLocalStorage(window, operations)
 // Transport only is isolated; neither Google nor a real Firebase project is contacted.
 window.fetch = async (...args) => { networkAttempts.push(String(args[0])); throw new Error('network isolated') }
 window.WebSocket = class {
  static OPEN = 1
  constructor(url) { networkAttempts.push(url); this.readyState = 0 }
  close() { this.readyState = 3 }
  send() { throw new Error('network isolated') }
 }
 try {
  window.eval(code)
  const result = await window.StorageTest.exercise()
  return { result, operations, networkAttempts }
 } finally { window.close() }
}

// Minimal browser IndexedDB that keeps its records in `backing` across visits. Only Firebase
// Auth's own database opens; any other database (e.g. the SDK heartbeat probe) is refused.
function authOnlyIndexedDB(backing, opened) {
 const copy = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))
 const request = run => {
  const listeners = {}
  const req = { result: undefined, error: null,
   addEventListener(type, fn) { (listeners[type] ??= []).push(fn) },
   removeEventListener(type, fn) { listeners[type] = (listeners[type] ?? []).filter(other => other !== fn) } }
  const fire = type => { const event = { type, target: req }; req[`on${type}`]?.(event); for (const fn of listeners[type] ?? []) fn(event) }
  setTimeout(() => run(req, fire), 0)
  return req
 }
 const settle = operation => request((req, fire) => {
  try { req.result = operation(); fire('success') } catch (error) { req.error = error; fire('error') }
 })
 const store = {
  put: record => settle(() => { backing.records.set(record.fbase_key, copy(record)); return record.fbase_key }),
  get: key => settle(() => copy(backing.records.get(key))),
  delete: key => settle(() => { backing.records.delete(key) }),
  getAll: () => settle(() => [...backing.records.values()].map(copy)),
 }
 const db = {
  objectStoreNames: { contains: name => backing.created && name === 'firebaseLocalStorage' },
  createObjectStore: () => { backing.created = true; return store },
  transaction: () => ({ objectStore: () => store }),
  close() {},
 }
 return {
  open: name => request((req, fire) => {
   if (name !== 'firebaseLocalStorageDb') { req.error = new Error(`${name} refused`); fire('error'); return }
   opened.push(name)
   req.result = db
   if (!backing.created) fire('upgradeneeded')
   fire('success')
  }),
  deleteDatabase: () => settle(() => { backing.records.clear(); backing.created = false }),
 }
}

async function visitWithIndexedDB(code, backing, { url = 'https://localhost/game', signOut = false } = {}) {
 const dom = new JSDOM('', { url, runScripts: 'outside-only' })
 const { window } = dom
 const localStorageOperations = []
 const opened = []
 recordLocalStorage(window, localStorageOperations)
 window.indexedDB = authOnlyIndexedDB(backing, opened)
 // Network isolated: the restored session's server check fails as "offline" and is kept.
 window.fetch = async () => { throw new Error('network isolated') }
 try {
  window.eval(code)
  const result = await window.StorageTest.visit(signOut)
  return { ...result, localStorageOperations, opened }
 } finally { window.close() }
}

const GAME_SESSION_KEY = 'firebase:authUser:storage-test-key:[DEFAULT]'
// The record Firebase Auth leaves in IndexedDB after a Google sign-in on an earlier visit.
const googleSessionRecord = () => ({ fbase_key: GAME_SESSION_KEY, value: {
 uid: 'returning-google-user', email: 'returning@example.com', emailVerified: true, isAnonymous: false,
 displayName: 'Returning', providerData: [{ providerId: 'google.com', uid: 'google-sub', email: 'returning@example.com' }],
 stsTokenManager: { refreshToken: 'synthetic-refresh', accessToken: 'synthetic-id-token', expirationTime: Date.now() + 3_600_000 },
 createdAt: '1', lastLoginAt: '1',
} })

const storagePlugins = (config.plugins ?? []).filter(plugin => plugin.name === 'firebase-database-memory-storage')

const optimizerStoragePlugins = config.optimizeDeps.rolldownOptions.plugins.filter(plugin => plugin.name === 'firebase-database-memory-storage')

describe('game Google sign-in kept across visits by the real Auth SDK', () => {
 it('restores the session from IndexedDB on the next visit, sign-out deletes it, never localStorage, Studio stays memory-only', async () => {
  const code = await bundleSDK(storagePlugins, visitEntry)
  const backing = { records: new Map(), created: false }

  const firstVisit = await visitWithIndexedDB(code, backing)
  expect(firstVisit).toMatchObject({ appName: '[DEFAULT]', authType: 'LOCAL', users: [null] })
  expect(backing.records.has(GAME_SESSION_KEY)).toBe(false)

  backing.records.set(GAME_SESSION_KEY, googleSessionRecord())
  const returningVisit = await visitWithIndexedDB(code, backing)
  expect(returningVisit).toMatchObject({ authType: 'LOCAL', users: ['returning-google-user'] })
  // Firebase itself re-saved the restored session.
  expect(backing.records.get(GAME_SESSION_KEY).value).toMatchObject({ uid: 'returning-google-user', appName: '[DEFAULT]' })

  const studioVisit = await visitWithIndexedDB(code, backing, { url: 'https://localhost/graphics-studio' })
  expect(studioVisit).toMatchObject({ appName: 'graphics-studio', authType: 'NONE', users: [null] })
  expect(studioVisit.opened).toEqual([])

  const signOutVisit = await visitWithIndexedDB(code, backing, { signOut: true })
  expect(signOutVisit.users).toEqual(['returning-google-user', null])
  expect(backing.records.has(GAME_SESSION_KEY)).toBe(false)

  const afterSignOutVisit = await visitWithIndexedDB(code, backing)
  expect(afterSignOutVisit.users).toEqual([null])

  for (const visit of [firstVisit, returningVisit, studioVisit, signOutVisit, afterSignOutVisit]) {
   expect(visit.localStorageOperations).toEqual([])
   expect(visit.opened.every(name => name === 'firebaseLocalStorageDb')).toBe(true)
  }
 }, 60000)
})

// Without IndexedDB (plain jsdom) the game falls back to memory: authType NONE, zero localStorage.
describe('actual browser Firebase SDK initialization', () => {
 it('detects untransformed RTDB localStorage calls as a positive instrumentation control', async () => {
  const { operations } = await exerciseSDK([])
  expect(operations).toContainEqual(['setItem', 'firebase:sentinel'])
  expect(operations).toContainEqual(['getItem', 'firebase:host:storage-test.firebaseio.com'])
  expect(operations).toContainEqual(['setItem', 'firebase:previous_websocket_failure'])
 }, 30000)
 it('applies the same zero-storage path in the Vite dependency optimizer', async () => {
  expect(optimizerStoragePlugins).toHaveLength(1)
  const { result, operations } = await exerciseSDK(optimizerStoragePlugins)
  expect(result.guardInstalled).toBe(true)
  expect(result.configured).toBe(true)
  expect(result.authType).toBe('NONE')
  expect(operations).toEqual([])
 }, 30000)
 it('keeps Auth and RTDB functional with zero localStorage access from first import', async () => {
  const { result, operations, networkAttempts } = await exerciseSDK(storagePlugins)
  expect(result.guardInstalled).toBe(true)
  expect(result.configured).toBe(true)
  expect(result.authType).toBe('NONE')
  expect(result.events).toContain(null)
  expect(result.events).toContain(false)
  expect(networkAttempts.some(url => url.startsWith('wss:'))).toBe(true)
  expect(operations).toEqual([])
 }, 30000)
})
