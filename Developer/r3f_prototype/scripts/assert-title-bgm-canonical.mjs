import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TITLE_PATH = 'Developer/r3f_prototype/src/assets/audio/title_bgm.m4a'
const TITLE_BYTES = 998122
const TITLE_SHA256 = '991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe'
const CANONICAL_MARKER = 'owner-mandated-permanent'
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const rootArgumentIndex = process.argv.indexOf('--root')
const repositoryRoot = rootArgumentIndex >= 0 && process.argv[rootArgumentIndex + 1]
  ? resolve(process.cwd(), process.argv[rootArgumentIndex + 1])
  : resolve(scriptDirectory, '../../..')
const artifactScope = process.argv.find((argument) => argument.startsWith('--artifacts='))?.split('=', 2)[1] ?? null
const failures = []

function fail(message) {
  failures.push(message)
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function verifyExactFile(relativePath, expectedBytes, expectedHash) {
  const path = resolve(repositoryRoot, relativePath)
  if (!existsSync(path)) return fail(`missing: ${relativePath}`)
  if (statSync(path).size !== expectedBytes) fail(`byte mismatch: ${relativePath}`)
  if (sha256(path) !== expectedHash) fail(`SHA-256 mismatch: ${relativePath}`)
}

function verifyExactImport(relativePath) {
  const path = resolve(repositoryRoot, relativePath)
  if (!existsSync(path)) return fail(`missing source: ${relativePath}`)
  const source = readFileSync(path, 'utf8')
  if (!/^import titleBgmUrl from ['"]\.\.\/assets\/audio\/title_bgm\.m4a['"]$/m.test(source)) {
    fail(`canonical m4a import missing: ${relativePath}`)
  }
  if (source.includes('title_bgm.wav')) fail(`WAV title reference forbidden: ${relativePath}`)
}

function verifyManifest() {
  const relativePath = 'Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json'
  const path = resolve(repositoryRoot, relativePath)
  if (!existsSync(path)) return fail(`missing manifest: ${relativePath}`)
  let manifest
  try {
    manifest = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return fail(`manifest JSON parse failed: ${error.message}`)
  }
  const asset = manifest.assets?.find((item) => item.logicalId === 'titleBgm')
  const entry = asset?.paths?.[0]
  if (!asset || asset.paths?.length !== 1
    || entry?.path !== TITLE_PATH || entry?.bytes !== TITLE_BYTES || entry?.sha256 !== TITLE_SHA256) {
    fail('canonical title BGM manifest metadata mismatch')
  }
  if (asset?.canonicalInclusion !== CANONICAL_MARKER) fail('canonical title BGM manifest marker missing')
  if (typeof asset?.inclusionPolicy !== 'string' || !asset.inclusionPolicy.includes('owner-mandated')) {
    fail('canonical title BGM manifest inclusion policy missing')
  }
}

function verifyGenerator() {
  const relativePath = 'Developer/r3f_prototype/scripts/generate-project-bgm.mjs'
  const path = resolve(repositoryRoot, relativePath)
  if (!existsSync(path)) return fail(`missing generator: ${relativePath}`)
  const source = readFileSync(path, 'utf8')
  for (const forbidden of ['title_bgm.wav', 'title_bgm.m4a', 'titleBgm']) {
    if (source.includes(forbidden)) fail(`title generation reference forbidden: ${forbidden}`)
  }
}

function listFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function verifyDist() {
  const distPath = resolve(repositoryRoot, 'Developer/r3f_prototype/dist')
  const files = listFiles(distPath)
  const m4a = files.filter((path) => /^title_bgm-[A-Za-z0-9_-]+\.m4a$/i.test(path.split(/[\\/]/).at(-1)))
  const wav = files.filter((path) => /^title_bgm.*\.wav$/i.test(path.split(/[\\/]/).at(-1)))
  if (m4a.length !== 1) fail(`dist must contain exactly one hashed title m4a (received ${m4a.length})`)
  else if (statSync(m4a[0]).size !== TITLE_BYTES || sha256(m4a[0]) !== TITLE_SHA256) fail('dist title m4a metadata mismatch')
  if (wav.length !== 0) fail(`dist title WAV forbidden (received ${wav.length})`)
}

if (artifactScope && artifactScope !== 'dist') {
  fail(`unknown artifact scope: ${artifactScope}`)
} else {
  verifyExactFile(TITLE_PATH, TITLE_BYTES, TITLE_SHA256)
  verifyExactImport('Developer/r3f_prototype/src/components/TitleScreen.jsx')
  verifyExactImport('Developer/r3f_prototype/src/lib/audioDiagnostics.js')
  verifyGenerator()
  verifyManifest()
  if (artifactScope === 'dist') verifyDist()
}

if (failures.length) {
  console.error('Canonical title BGM gate failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(artifactScope ? 'Canonical title BGM artifact gate passed.' : 'Canonical title BGM source gate passed.')
}
