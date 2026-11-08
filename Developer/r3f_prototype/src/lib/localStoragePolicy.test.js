import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = join(process.cwd(), 'src')
const THIS_FILE = 'lib/localStoragePolicy.test.js'
const NEGATIVE_POLICY_TEST_ALLOWLIST = new Set([
  'lib/firebaseProgress.test.js',
  'lib/studioLocalStorageGuard.test.js',
])

function listSourceFiles(directory = SOURCE_ROOT) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(path)
    return /\.(?:js|jsx)$/.test(entry.name) ? [path] : []
  })
}

// The repo sits on a slow disk: read every source file once for all policy checks.
const sourceCache = new Map()
function readSource(path) {
  if (!sourceCache.has(path)) sourceCache.set(path, readFileSync(path, 'utf8'))
  return sourceCache.get(path)
}

function stripCommentsAndStrings(source) {
  let result = ''
  let index = 0
  let mode = 'code'

  while (index < source.length) {
    const char = source[index]
    const next = source[index + 1]

    if (mode === 'code' && char === '/' && next === '/') {
      mode = 'line-comment'
      result += '  '
      index += 2
    } else if (mode === 'code' && char === '/' && next === '*') {
      mode = 'block-comment'
      result += '  '
      index += 2
    } else if (mode === 'code' && (char === '\'' || char === '"' || char === '`')) {
      mode = char
      result += ' '
      index += 1
    } else if (mode === 'line-comment' && char === '\n') {
      mode = 'code'
      result += '\n'
      index += 1
    } else if (mode === 'block-comment' && char === '*' && next === '/') {
      mode = 'code'
      result += '  '
      index += 2
    } else if ((mode === '\'' || mode === '"' || mode === '`') && char === '\\') {
      result += '  '
      index += 2
    } else if ((mode === '\'' || mode === '"' || mode === '`') && char === mode) {
      mode = 'code'
      result += ' '
      index += 1
    } else {
      result += mode === 'code' ? char : (char === '\n' ? '\n' : ' ')
      index += 1
    }
  }

  return result
}

function findLocalStorageCalls(source) {
  const code = stripCommentsAndStrings(source)
  const call = /(?:\b[A-Za-z_$][\w$]*\s*\.\s*)*localStorage\s*(?:\.\s*(?:getItem|setItem|removeItem|clear|key)|\[\s*['"](?:getItem|setItem|removeItem|clear|key)['"]\s*\])\s*\(/g
  return [...code.matchAll(call)].map((match) => match[0])
}

function findPersistentAuthStores(source) {
  const code = stripCommentsAndStrings(source)
  return [...new Set(code.match(/\b(?:indexedDBLocalPersistence|browserLocalPersistence|browserSessionPersistence)\b/g) ?? [])].sort()
}

// Persistent Firebase Auth stores are allowed only where Terry approved them.
const PERSISTENT_AUTH_STORE_ALLOWLIST = {
  // 2026-11-08 "한번 로그인한 브라우저에 캐시하게해": game Google sign-in, Firebase IndexedDB only.
  'lib/firebaseAuth.js': ['indexedDBLocalPersistence'],
  // 2026-10-29: guest-ranking anonymous identity (IndexedDB, then localStorage, then memory).
  'lib/guestRankingIdentity.js': ['browserLocalPersistence', 'indexedDBLocalPersistence'],
}

describe('localStorage source policy', { timeout: 30_000 }, () => {
  it('allows persistent Firebase Auth stores only in the two approved auth modules', () => {
    const found = Object.fromEntries(listSourceFiles()
      .map((path) => [relative(SOURCE_ROOT, path).replaceAll('\\', '/'), path])
      .filter(([file]) => !file.includes('.test.'))
      .map(([file, path]) => [file, findPersistentAuthStores(readSource(path))])
      .filter(([, stores]) => stores.length > 0))

    expect(found).toEqual(PERSISTENT_AUTH_STORE_ALLOWLIST)
  })

  it('allows executable localStorage calls only in dedicated negative guard tests', () => {
    const violations = listSourceFiles()
      .map((path) => ({
        file: relative(SOURCE_ROOT, path).replaceAll('\\', '/'),
        calls: findLocalStorageCalls(readSource(path)),
      }))
      .filter(({ file, calls }) => file !== THIS_FILE && calls.length > 0 && !NEGATIVE_POLICY_TEST_ALLOWLIST.has(file))

    expect(violations).toEqual([])
  })

  it('has no executable production localStorage call', () => {
    const violations = listSourceFiles()
      .map((path) => ({
        file: relative(SOURCE_ROOT, path).replaceAll('\\', '/'),
        calls: findLocalStorageCalls(readSource(path)),
      }))
      .filter(({ file, calls }) => !file.includes('.test.') && calls.length > 0)

    expect(violations).toEqual([])
  })
})
