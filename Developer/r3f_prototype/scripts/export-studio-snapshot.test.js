import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  CANONICAL_STUDIO_PATH,
  FIREBASE_STUDIO_DATASET_KEYS,
  decodeFirebaseStudioSnapshotFromStorage,
  encodeFirebaseStudioSnapshotForStorage,
  normalizeFirebaseStudioSnapshot,
} from '../src/lib/firebaseStudio.js'
import {
  DEFAULT_PINNED_STUDIO_FILE,
  buildCanonicalStudioUrl,
  buildPinnedStudioSnapshot,
  hashStudioDatasets,
  listStudioDatasetChanges,
  parseStudioPinArgs,
  runStudioPin,
} from './export-studio-snapshot.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const helpers = {
  CANONICAL_STUDIO_PATH,
  FIREBASE_STUDIO_DATASET_KEYS,
  decodeFirebaseStudioSnapshotFromStorage,
  normalizeFirebaseStudioSnapshot,
}
const DB_URL = 'https://example-default-rtdb.asia-southeast1.firebasedatabase.app'
const NOW = Date.parse('2026-11-08T00:00:00.000Z')

function datasets(overrides = {}) {
  return {
    tunings: { player: { scale: 1.2 }, 'zombie-b01': { color: '#ffffff' } },
    sfxTunings: { tumblerFire: { volume: 2, rate: 1 } },
    stageBossPreview: { zoom: 67, panX: -0.33, panY: 0.44 },
    decals: {},
    propPlacements: { stage1: [{ id: 'a', position: [1, 0, 2] }], stage2: null },
    bossFaceRecipes: { B01: { brow: 'brow-flat-deadpan', eye: 'eye-happy-arc', nose: 'nose-triangle', mouth: 'mouth-big-smile' } },
    ...overrides,
  }
}

// What Firebase actually stores: each dataset is a JSON string.
function storedNode({ revision = 1952, data = datasets() } = {}) {
  return encodeFirebaseStudioSnapshotForStorage({
    schemaVersion: 1,
    revision,
    updatedAt: '2026-08-10T16:17:15.598Z',
    datasets: data,
  })
}

function fakeFetch(body, { ok = true, status = 200 } = {}) {
  return vi.fn(async () => ({ ok, status, json: async () => body }))
}

function fakeFs(initial = null) {
  const files = new Map()
  if (initial) files.set(resolve(root, DEFAULT_PINNED_STUDIO_FILE), initial)
  return {
    files,
    readFileImpl: vi.fn(async (path) => {
      if (!files.has(path)) throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      return files.get(path)
    }),
    writeFileImpl: vi.fn(async (path, text) => { files.set(path, text) }),
  }
}

function run(argv, { fetchImpl, fs }) {
  const logs = []
  return runStudioPin({
    argv,
    root,
    databaseUrl: DB_URL,
    helpers,
    fetchImpl,
    readFileImpl: fs.readFileImpl,
    writeFileImpl: fs.writeFileImpl,
    log: (line) => logs.push(line),
    warn: (line) => logs.push(line),
    now: NOW,
  }).then((code) => ({ code, logs: logs.join('\n') }))
}

describe('export-studio-snapshot', () => {
  it('decodes the stored string datasets and records revision, timestamps, source and hash', () => {
    const pinned = buildPinnedStudioSnapshot(storedNode(), { helpers, source: CANONICAL_STUDIO_PATH, now: NOW })
    expect(pinned).toMatchObject({
      schemaVersion: 1,
      revision: 1952,
      updatedAt: '2026-08-10T16:17:15.598Z',
      exportedAt: '2026-11-08T00:00:00.000Z',
      source: 'studioWorkspaces/v1/canonical/current',
    })
    expect(Object.keys(pinned.datasets)).toEqual([...FIREBASE_STUDIO_DATASET_KEYS])
    expect(pinned.datasets).toEqual(datasets())
    expect(pinned.sha256).toBe(hashStudioDatasets(datasets()))
  })

  it('keeps bossFaceRecipes as the plain { bossType: { brow, eye, nose, mouth } } map', () => {
    const pinned = buildPinnedStudioSnapshot(storedNode(), { helpers, source: CANONICAL_STUDIO_PATH, now: NOW })
    expect(pinned.datasets.bossFaceRecipes.B01).toEqual({
      brow: 'brow-flat-deadpan', eye: 'eye-happy-arc', nose: 'nose-triangle', mouth: 'mouth-big-smile',
    })
  })

  it('hash ignores key order', () => {
    expect(hashStudioDatasets({ a: 1, b: { c: 2, d: [1, 2] } })).toBe(hashStudioDatasets({ b: { d: [1, 2], c: 2 }, a: 1 }))
    expect(hashStudioDatasets({ a: [1, 2] })).not.toBe(hashStudioDatasets({ a: [2, 1] }))
  })

  it.each([
    ['null node', null],
    ['wrong schema', { ...storedNode(), schemaVersion: 2 }],
    ['revision 0', { ...storedNode(), revision: 0 }],
    ['corrupt dataset string', { ...storedNode(), datasets: { ...storedNode().datasets, tunings: '{broken' } }],
  ])('rejects an invalid node (%s)', (_label, raw) => {
    expect(() => buildPinnedStudioSnapshot(raw, { helpers, source: CANONICAL_STUDIO_PATH, now: NOW })).toThrow(/missing or invalid/)
  })

  it('builds the public RTDB REST URL and refuses non-https origins', () => {
    expect(buildCanonicalStudioUrl(`${DB_URL}/`, CANONICAL_STUDIO_PATH)).toBe(`${DB_URL}/studioWorkspaces/v1/canonical/current.json`)
    expect(() => buildCanonicalStudioUrl('http://x.firebaseio.com', CANONICAL_STUDIO_PATH)).toThrow()
    expect(() => buildCanonicalStudioUrl(`${DB_URL}/?auth=token`, CANONICAL_STUDIO_PATH)).toThrow()
    expect(() => buildCanonicalStudioUrl('', CANONICAL_STUDIO_PATH)).toThrow()
  })

  it('parses arguments', () => {
    expect(parseStudioPinArgs([])).toEqual({ check: false, warnOnly: false, out: DEFAULT_PINNED_STUDIO_FILE })
    expect(parseStudioPinArgs(['--check', '--warn-only', '--out=src/x.json'])).toEqual({ check: true, warnOnly: true, out: 'src/x.json' })
    expect(() => parseStudioPinArgs(['--warn-only'])).toThrow()
    expect(() => parseStudioPinArgs(['--write'])).toThrow()
  })

  it('lists changed leaf paths', () => {
    const before = datasets()
    const after = datasets({ propPlacements: { stage1: [{ id: 'a', position: [1, 0, 3] }], stage2: null } })
    expect(listStudioDatasetChanges(before, after)).toEqual(['datasets.propPlacements.stage1.0.position.2: 2 -> 3'])
  })

  it('writes the pinned file with a single GET and never any other request', async () => {
    const fetchImpl = fakeFetch(storedNode())
    const fs = fakeFs()
    const { code } = await run([], { fetchImpl, fs })
    expect(code).toBe(0)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(`${DB_URL}/studioWorkspaces/v1/canonical/current.json`)
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(fs.writeFileImpl).toHaveBeenCalledTimes(1)
    const written = JSON.parse(fs.files.get(resolve(root, DEFAULT_PINNED_STUDIO_FILE)))
    expect(written.revision).toBe(1952)
    expect(written.datasets).toEqual(datasets())
    expect(written.sha256).toBe(hashStudioDatasets(written.datasets))
  })

  it('leaves an already pinned file untouched (no exportedAt churn)', async () => {
    const pinned = buildPinnedStudioSnapshot(storedNode(), { helpers, source: CANONICAL_STUDIO_PATH, now: NOW - 1000 })
    const fs = fakeFs(`${JSON.stringify(pinned, null, 2)}\n`)
    const { code, logs } = await run([], { fetchImpl: fakeFetch(storedNode()), fs })
    expect(code).toBe(0)
    expect(fs.writeFileImpl).not.toHaveBeenCalled()
    expect(logs).toMatch(/already pinned at revision 1952/)
  })

  it('--check reports drift without writing and exits 1; --warn-only exits 0', async () => {
    const old = buildPinnedStudioSnapshot(storedNode({ revision: 1947, data: datasets({ propPlacements: { stage1: [{ id: 'a', position: [9, 0, 2] }], stage2: null } }) }), { helpers, source: CANONICAL_STUDIO_PATH, now: NOW })
    const text = `${JSON.stringify(old, null, 2)}\n`

    const strict = fakeFs(text)
    const result = await run(['--check'], { fetchImpl: fakeFetch(storedNode()), fs: strict })
    expect(result.code).toBe(1)
    expect(result.logs).toMatch(/pinned revision 1947 -> Firebase revision 1952/)
    expect(result.logs).toMatch(/datasets\.propPlacements\.stage1\.0\.position\.0: 9 -> 1/)
    expect(strict.writeFileImpl).not.toHaveBeenCalled()

    const lenient = fakeFs(text)
    const warned = await run(['--check', '--warn-only'], { fetchImpl: fakeFetch(storedNode()), fs: lenient })
    expect(warned.code).toBe(0)
    expect(warned.logs).toMatch(/WARNING: drift detected/)
    expect(lenient.writeFileImpl).not.toHaveBeenCalled()
  })

  it('a failed or invalid read never writes; --warn-only turns it into a warning', async () => {
    for (const fetchImpl of [
      fakeFetch(null, { ok: false, status: 401 }),
      vi.fn(async () => { throw new Error('offline') }),
      fakeFetch(null),
    ]) {
      const fs = fakeFs()
      expect((await run([], { fetchImpl, fs })).code).toBe(1)
      expect(fs.writeFileImpl).not.toHaveBeenCalled()
      expect((await run(['--check', '--warn-only'], { fetchImpl, fs })).code).toBe(0)
    }
  })

  it('the committed title snapshot is a valid, self-consistent pin', () => {
    const pinned = JSON.parse(readFileSync(resolve(root, DEFAULT_PINNED_STUDIO_FILE), 'utf8'))
    expect(normalizeFirebaseStudioSnapshot(pinned)).not.toBeNull()
    expect(pinned.source).toBe(CANONICAL_STUDIO_PATH)
    expect(Object.keys(pinned.datasets)).toEqual([...FIREBASE_STUDIO_DATASET_KEYS])
    expect(pinned.sha256).toBe(hashStudioDatasets(pinned.datasets))
    expect(Number.isNaN(Date.parse(pinned.exportedAt))).toBe(false)
    expect(Object.keys(pinned.datasets.bossFaceRecipes.B01).sort()).toEqual(['brow', 'eye', 'mouth', 'nose'])
  })
})
