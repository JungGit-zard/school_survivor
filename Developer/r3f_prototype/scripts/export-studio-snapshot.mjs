// Pins the Graphics Studio canonical node (Firebase RTDB) into a repo JSON file.
//
//   npm run studio:pin                  read Firebase, write the pinned file if it changed
//   npm run studio:pin -- --check       compare only, never write; exit 1 on drift or read failure
//   npm run studio:pin -- --check --warn-only   same, but always exit 0 (for build-time warnings)
//   npm run studio:pin -- --out=src/x.json      write/compare another file (default: title snapshot)
//
// Read-only toward Firebase: one unauthenticated HTTP GET of the public node
// studioWorkspaces/v1/canonical/current. No login, no SDK, no write of any kind.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const DEFAULT_PINNED_STUDIO_FILE = 'src/title/studioSnapshot.json'
const DATABASE_URL_KEY = 'VITE_FIREBASE_DATABASE_URL'
const MAX_REPORTED_CHANGES = 40

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function hashStudioDatasets(datasets) {
  return createHash('sha256').update(stableStringify(datasets ?? {})).digest('hex')
}

export function buildCanonicalStudioUrl(databaseUrl, canonicalPath) {
  const base = String(databaseUrl ?? '').trim().replace(/\/+$/, '')
  if (!/^https:\/\/[^/?#]+$/.test(base)) throw new Error(`${DATABASE_URL_KEY} must be an https origin, got "${base}"`)
  const path = String(canonicalPath ?? '').replace(/^\/+|\/+$/g, '')
  if (!path) throw new Error('canonical studio path is empty')
  return `${base}/${path}.json`
}

// raw = the Firebase node exactly as stored (datasets are JSON strings).
export function buildPinnedStudioSnapshot(raw, { helpers, source, now = Date.now() }) {
  const normalized = helpers.normalizeFirebaseStudioSnapshot(helpers.decodeFirebaseStudioSnapshotFromStorage(raw))
  if (!normalized) throw new Error('Firebase studio node is missing or invalid (schema/revision/datasets check failed)')
  const datasets = Object.fromEntries(helpers.FIREBASE_STUDIO_DATASET_KEYS.map((key) => [key, normalized.datasets[key] ?? {}]))
  return {
    schemaVersion: normalized.schemaVersion,
    revision: normalized.revision,
    updatedAt: normalized.updatedAt,
    exportedAt: new Date(now).toISOString(),
    source,
    sha256: hashStudioDatasets(datasets),
    datasets,
  }
}

export function listStudioDatasetChanges(before, after, path = 'datasets', out = []) {
  if (stableStringify(before) === stableStringify(after)) return out
  const isObj = (v) => v !== null && typeof v === 'object'
  if (!isObj(before) || !isObj(after) || Array.isArray(before) !== Array.isArray(after)) {
    out.push(`${path}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`)
    return out
  }
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    listStudioDatasetChanges(before[key], after[key], `${path}.${key}`, out)
  }
  return out
}

export function parseStudioPinArgs(argv) {
  const options = { check: false, warnOnly: false, out: DEFAULT_PINNED_STUDIO_FILE }
  for (const arg of argv) {
    if (arg === '--check') options.check = true
    else if (arg === '--warn-only') options.warnOnly = true
    else if (arg.startsWith('--out=')) options.out = arg.slice('--out='.length)
    else throw new Error(`unknown argument: ${arg}`)
  }
  if (options.warnOnly && !options.check) throw new Error('--warn-only is only valid with --check')
  return options
}

async function readPinnedFile(path, readFileImpl) {
  try {
    return JSON.parse(await readFileImpl(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

export async function runStudioPin({
  argv = [],
  root,
  databaseUrl,
  helpers,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
  log = console.log,
  warn = console.warn,
  now = Date.now(),
}) {
  const options = parseStudioPinArgs(argv)
  const outPath = resolve(root, options.out)
  const fail = (message) => {
    if (options.warnOnly) {
      warn(`[studio:pin] WARNING: ${message}`)
      return 0
    }
    warn(`[studio:pin] ${message}`)
    return 1
  }

  let fresh
  try {
    const url = buildCanonicalStudioUrl(databaseUrl, helpers.CANONICAL_STUDIO_PATH)
    const response = await fetchImpl(url, { method: 'GET', headers: { accept: 'application/json' } })
    if (!response.ok) throw new Error(`HTTP ${response.status} reading ${url}`)
    fresh = buildPinnedStudioSnapshot(await response.json(), { helpers, source: helpers.CANONICAL_STUDIO_PATH, now })
  } catch (error) {
    return fail(`could not read the Firebase studio node: ${error?.message ?? error}`)
  }

  const pinned = await readPinnedFile(outPath, readFileImpl)
  const pinnedHash = pinned ? hashStudioDatasets(pinned.datasets) : null
  const same = !!pinned && pinned.revision === fresh.revision && pinnedHash === fresh.sha256

  if (same) {
    log(`[studio:pin] ${options.out} already pinned at revision ${fresh.revision} (sha256 ${fresh.sha256.slice(0, 12)})`)
    return 0
  }

  const changes = listStudioDatasetChanges(pinned?.datasets ?? null, fresh.datasets)
  const summary = [
    `${options.out}: pinned revision ${pinned?.revision ?? 'none'} -> Firebase revision ${fresh.revision} (${changes.length} change(s))`,
    ...changes.slice(0, MAX_REPORTED_CHANGES).map((line) => `  ${line}`),
    ...(changes.length > MAX_REPORTED_CHANGES ? [`  ... ${changes.length - MAX_REPORTED_CHANGES} more`] : []),
  ].join('\n')

  if (options.check) return fail(`drift detected\n${summary}\nRun "npm run studio:pin" to pin it.`)

  await writeFileImpl(outPath, `${JSON.stringify(fresh, null, 2)}\n`, 'utf8')
  log(`[studio:pin] wrote ${summary}`)
  return 0
}

async function loadStudioHelpers(root) {
  // firebaseStudio.js pulls in asset imports (webp etc.) that plain Node cannot load,
  // so load it through Vite's SSR loader without the project config/plugins.
  const { createServer } = await import('vite')
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const mod = await server.ssrLoadModule('/src/lib/firebaseStudio.js')
    return {
      CANONICAL_STUDIO_PATH: mod.CANONICAL_STUDIO_PATH,
      FIREBASE_STUDIO_DATASET_KEYS: mod.FIREBASE_STUDIO_DATASET_KEYS,
      decodeFirebaseStudioSnapshotFromStorage: mod.decodeFirebaseStudioSnapshotFromStorage,
      normalizeFirebaseStudioSnapshot: mod.normalizeFirebaseStudioSnapshot,
    }
  } finally {
    await server.close()
  }
}

async function main() {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
  const { loadEnv } = await import('vite')
  const databaseUrl = process.env[DATABASE_URL_KEY] || loadEnv('production', root, 'VITE_')[DATABASE_URL_KEY]
  const helpers = await loadStudioHelpers(root)
  process.exitCode = await runStudioPin({ argv: process.argv.slice(2), root, databaseUrl, helpers })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[studio:pin] ${error?.stack ?? error}`)
    process.exitCode = 1
  })
}
