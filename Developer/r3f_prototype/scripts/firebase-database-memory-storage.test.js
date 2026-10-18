import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { firebaseDatabaseMemoryStoragePlugin } from './firebase-database-memory-storage.mjs'

const require = createRequire(import.meta.url)
const sdkPath = require.resolve('@firebase/database').replace(/index\.node\.cjs\.js$/, 'index.esm.js')
const sdkCode = readFileSync(sdkPath, 'utf8')
const declaration = "const PersistentStorage = createStoragefor('localStorage');"

describe('version-scoped Firebase transport memory transform', () => {
 it('changes only the one persistent transport storage declaration', () => {
  const result = firebaseDatabaseMemoryStoragePlugin().transform(sdkCode, sdkPath)
  expect(result.code).toBe(sdkCode.replace(declaration, 'const PersistentStorage = new MemoryStorage();'))
 })
 it('does not touch application code or other dependencies', () => {
  expect(firebaseDatabaseMemoryStoragePlugin().transform(sdkCode, '/app/src/storage.js')).toBeNull()
  expect(firebaseDatabaseMemoryStoragePlugin().transform(sdkCode, '/node_modules/@firebase/auth/dist/index.esm.js')).toBeNull()
 })
 it('blocks rather than silently accepting changed SDK storage structure', () => {
  const plugin = firebaseDatabaseMemoryStoragePlugin()
  expect(() => plugin.transform(sdkCode.replace(declaration, ''), sdkPath)).toThrow('review required')
  expect(() => plugin.transform(`${sdkCode}\n${declaration}`, sdkPath)).toThrow('review required')
  expect(() => plugin.transform(sdkCode.replace('class MemoryStorage {', 'class ChangedStorage {'), sdkPath)).toThrow('review required')
 })
})
