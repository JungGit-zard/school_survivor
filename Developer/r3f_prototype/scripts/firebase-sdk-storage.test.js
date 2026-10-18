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

export async function bundleSDK(plugins) {
 const bundle = await rolldown({
  input: 'phase5-sdk-entry', platform: 'browser', transform: { define: { 'import.meta.env': '{}' } }, resolve: { conditionNames: ['browser', 'import', 'default'] },
  plugins: [{ name: 'storage-test-entry',
   resolveId(id) { if (id === 'phase5-sdk-entry') return path.resolve('phase5-sdk-entry.js') },
   load(id) { if (id === path.resolve('phase5-sdk-entry.js')) return entry },
  }, ...plugins],
 })
 try {
  const { output } = await bundle.generate({ format: 'iife', name: 'StorageTest', codeSplitting: false })
  return output.find(chunk => chunk.type === 'chunk').code
 } finally { await bundle.close() }
}

async function exerciseSDK(plugins) {
 const code = await bundleSDK(plugins)
 const dom = new JSDOM('', { url: 'https://localhost/game', runScripts: 'outside-only' })
 const operations = []
 const networkAttempts = []
 const { window } = dom
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

const storagePlugins = (config.plugins ?? []).filter(plugin => plugin.name === 'firebase-database-memory-storage')

const optimizerStoragePlugins = config.optimizeDeps.rolldownOptions.plugins.filter(plugin => plugin.name === 'firebase-database-memory-storage')

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
