// ============================================================================================
// SIGNED-IN PERFORMANCE STATIC GUARD — DO NOT DELETE OR LOOSEN WITHOUT THE OWNER'S (Terry's) WORD.
//
// Incident 2026-11-17 ~ 2026-11-19: signed-in players stuttered because the cloud save re-wrote the
// whole users/{uid} node (hundreds of KB of checkpointLedger/runLedger history) every 5 s and on every
// in-run event. Fixed by d18ca46d and 3984b1b4. This file scans src/ (tests excluded) for code shapes
// that would bring it back. Every allow-list entry below exists today and is explained; a new entry
// needs a reviewed reason, never a silent addition. Behavioural guards live in
// src/store/signedInPerformanceGuard.test.js and src/components/ReadyGameApp.signedInIdleGuard.test.jsx.
// ============================================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function listSourceFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listSourceFiles(full))
    else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\.|testUtil/.test(entry.name)) out.push(full)
  }
  return out
}

// Comments are not code: block comments are blanked (line numbers kept), line comments dropped.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

const FILES = listSourceFiles(SRC).map(file => ({
  rel: path.relative(SRC, file).replace(/\\/g, '/'),
  code: stripComments(fs.readFileSync(file, 'utf8')),
}))

function lineOf(code, index) {
  return code.slice(code.lastIndexOf('\n', index) + 1, code.indexOf('\n', index) === -1 ? undefined : code.indexOf('\n', index)).trim()
}

function collect(pattern, describeMatch) {
  const found = []
  for (const { rel, code } of FILES) {
    for (const match of code.matchAll(pattern)) found.push(`${rel} :: ${describeMatch(match, code)}`)
  }
  return found.sort()
}

describe('static guard: no whole users/{uid} writes, no history reads', () => {
  it('scans a real source tree', () => {
    expect(FILES.length).toBeGreaterThan(100)
    expect(FILES.some(file => file.rel === 'lib/firebaseProgress.js')).toBe(true)
    expect(FILES.some(file => file.rel === 'lib/stageSlot.js')).toBe(true)
  })

  it('every database transaction targets an allowed sub-path, never the users/{uid} root', () => {
    const found = collect(/\b(runTransaction|transaction)\(\s*([^,]*)/g, match => `${match[1]}(${match[2].trim()}`)
    expect(found).toEqual([
      // Admin visitor counter (adminVisitors/{uid}), not player progress.
      'lib/firebaseAdminVisitors.js :: runTransaction(mod.ref(db',
      // The progress client's generic transport; callers below must pass a sub-path.
      'lib/firebaseProgress.js :: runTransaction(databaseModule.ref(database',
      // Mission reward claim: users/{uid}/progress only.
      'lib/firebaseProgress.js :: transaction(`users/${uid}/progress`',
      // Progress save: users/{uid}/progress only.
      'lib/firebaseProgress.js :: transaction(`users/${uidAtRequest}/progress`',
      // Graphics Studio canonical config (not player data).
      'lib/firebaseStudio.js :: runTransaction(databaseModule.ref(database',
      'lib/firebaseStudio.js :: transaction(CANONICAL_STUDIO_PATH',
      'lib/firebaseStudio.js :: transaction(CANONICAL_STUDIO_PATH',
      'lib/firebaseStudio.js :: transaction(CANONICAL_STUDIO_PATH',
    ].sort())
  })

  it('the bare users/{uid} root path appears only as the target of multi-path updates (and its path helper)', () => {
    const found = collect(/`users\/\$\{[^}`]+\}`/g, (match, code) => lineOf(code, match.index))
    expect(found).toEqual([
      // Stage result: one runLedger row + additive increments, a multi-path update.
      'lib/firebaseProgress.js :: await client.update(`users/${uid}`, values)',
      // Top-level leaves (profile/activity/consent/updatedAt), a multi-path update.
      'lib/firebaseProgress.js :: await client.update(`users/${uidAtRequest}`, { ...topLevel, updatedAt: new Date().toISOString() })',
      // getUserProgressPath: used for named-child hydration reads, the one-time ledgerSummary migration
      // (a multi-path update of the small ledgerSummary node via that same path) and account deletion.
      "lib/firebaseProgress.js :: return uid ? `users/${uid}` : ''",
    ].sort())
    // Nobody may set() a users/ path (a set replaces the whole node).
    expect(collect(/\bset\(\s*[^;\n]*users\//g, match => match[0])).toEqual([])
    // The root path helper is only used to read named children and to delete the account.
    const helperUses = collect(/getUserProgressPath\(([^)]*)\)/g, (match, code) => lineOf(code, match.index))
    expect(helperUses).toEqual([
      'lib/firebaseProgress.js :: const path = getUserProgressPath(user)', // hydrateCloudProgress (named children, migration)
      'lib/firebaseProgress.js :: const path = getUserProgressPath(user)', // deleteFirebaseProgressDocument
      'lib/firebaseProgress.js :: export function getUserProgressPath(user = cloudUser) {',
    ].sort())
  })

  it('no code reads or writes checkpointLedger (comments may mention it)', () => {
    expect(FILES.filter(file => /checkpointLedger/.test(file.code)).map(file => file.rel)).toEqual([])
  })

  it('the progress module never loads the whole user node and hydration never names runLedger', () => {
    // 2026-11-21: the whole-node client.load(users/{uid}) fallback is gone; every read names its child.
    // The only load() left is inside the production client, which loadFields uses per named child.
    const found = collect(/\.load\(([^)]*)\)/g, (match, code) => lineOf(code, match.index)).filter(entry => entry.startsWith('lib/firebaseProgress.js'))
    expect(found).toEqual([])
    const code = FILES.find(file => file.rel === 'lib/firebaseProgress.js').code
    const hydration = code.match(/HYDRATION_FIELDS = Object\.freeze\(\[([^\]]*)\]\)/)
    expect(hydration?.[1]).toBeTruthy()
    expect(hydration[1]).not.toMatch(/checkpointLedger|runLedger/)
    // runLedger is read in exactly two places: the one-time migration of an account whose ledgerSummary
    // is incomplete, and the single-row check before a stage row is retried or recovered.
    const runLedgerReads = collect(/loadFields\(([^)]*)\)/g, (match, code) => lineOf(code, match.index))
      .filter(entry => entry.startsWith('lib/firebaseProgress.js') && /runLedger/.test(entry))
    expect(runLedgerReads).toEqual([
      "lib/firebaseProgress.js :: const found = await client.loadFields(`users/${uid}/runLedger`, [runKey])",
      "lib/firebaseProgress.js :: const rows = await client.loadFields(path, ['runLedger'])", // loadRunLedgerForMigration
    ].sort())
  })

  it('in-run store subscriptions never call a cloud save', () => {
    const store = FILES.find(file => file.rel === 'store/useGameStore.js').code
    const blocks = [...store.matchAll(/useGameStore\.subscribe\(/g)].map(match => store.slice(match.index, match.index + 900))
    expect(blocks.length).toBeGreaterThan(0)
    for (const block of blocks) {
      expect(block).not.toMatch(/requestCloudProgressSave|commitFirebaseStageResult|saveRuntimeProgress|flushCloudProgress|reconcileCloudProgress|updateFirebasePlayerProgress|readFirebasePlayerProgress\(/)
    }
  })

  it('the app timer that runs on the title never saves progress', () => {
    const app = FILES.find(file => file.rel === 'components/ReadyGameApp.jsx').code
    for (const match of app.matchAll(/setInterval\(\s*([\w$]+)/g)) {
      const name = match[1]
      const definition = app.match(new RegExp(`const ${name.replace(/\$/g, '\\$')}\\s*=\\s*\\(\\)\\s*=>\\s*([^\\n]*)`))
      expect(definition?.[1] ?? '').not.toMatch(/retry\(true\)|reconcileCloudProgress|requestCloudProgressSave|saveLocalProgressToCloud/)
    }
  })
})

describe('static guard: browser storage only in the one-stage slot and the Firebase Auth session', () => {
  const STORAGE_USE = /(?:\b(?:localStorage|sessionStorage|indexedDB)\b\s*(?:\.|\?\.|\[))|(?:\.(?:localStorage|sessionStorage|indexedDB)\b)|\b(?:indexedDBLocalPersistence|browserLocalPersistence|browserSessionPersistence)\b|\bdocument\.cookie\b|\bcaches\.open\b|\btypeof\s+(?:[\w$]+\??\.)?(?:localStorage|sessionStorage|indexedDB)\b/g

  it('matches the explicit allow-list exactly', () => {
    const found = {}
    for (const { rel, code } of FILES) {
      const uses = code.match(STORAGE_USE)
      if (uses) found[rel] = uses.length
    }
    expect(found).toEqual({
      // THE device stage slot (2026-11-19 owner design; 2026-11-21 named AGENTS.md exception): plain
      // localStorage get/set/remove/key/length inside four small try/catch helpers, each with its typeof guard.
      'lib/stageSlot.js': 9,
      // Firebase Auth session (Google sign-in): IndexedDB persistence, sessionStorage capability probe.
      'lib/firebaseAuth.js': 2,
      // Firebase Auth session for the anonymous guest-ranking identity (approved exception, AGENTS.md).
      'lib/guestRankingIdentity.js': 2,
      // Pre-existing (not progress data): one sessionStorage flag that resumes "start game" right
      // after the Google sign-in redirect; disclosed in the privacy policy.
      'lib/loginContinuation.js': 1,
      // Guards that BLOCK storage use (they wrap or probe it, they never store player data).
      'lib/firebaseProgress.js': 4,
      'lib/studioLocalStorageGuard.js': 2,
      'lib/gameplayStateVerifier.js': 1,
      // Privacy-policy prose ("...such as localStorage."), not code.
      'lib/locales/en.js': 1,
    })
  })

  // 2026-11-21 (Terry, cloud-save fix): besides the one live slot per account, a finished stage result
  // waits on the device as a "pending send" entry (its own key) until the server confirms it, so an
  // offline stage is never lost when the next stage starts. Both go through one writer with a size cap.
  it('the slot module owns one live key per account plus capped pending-send keys, and nothing else', () => {
    const slot = FILES.find(file => file.rel === 'lib/stageSlot.js').code
    expect(slot.match(/const KEY_PREFIX = '([^']+)'/)?.[1]).toBe('school_survivor:stageSlot:')
    expect(slot.match(/const PENDING_PREFIX = '([^']+)'/)?.[1]).toBe('school_survivor:stagePending:')
    expect(slot.match(/\.setItem\(/g)).toHaveLength(1) // the single writer, writeItem()
    expect(slot).toMatch(/writeItem\(slotKey\(live\.uid\), text\)/)
    expect(slot).toMatch(/if \(text\.length > STAGE_SLOT_MAX_BYTES\) return/)
    expect(slot).toMatch(/if \(text\.length > STAGE_SLOT_MAX_BYTES\) return false/)
    expect(slot).toMatch(/listKeys\(`\$\{PENDING_PREFIX\}\$\{uid\}:`\)\.length >= MAX_PENDING_RESULTS/)
  })
})
