#!/usr/bin/env node
'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { spawnSync } = require('node:child_process')

const PROJECT = 'escape-zombie-school'
const SITE = 'escape-zombie-school'
const CANONICAL_ORIGIN = 'https://escapezombie.com'
const ALLOWED_PREFIX = 'share/x/'

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  return value
}

function stableJson(value) { return JSON.stringify(stable(value)) }

function parseManifest(manifestPath) {
  const absoluteManifest = path.resolve(manifestPath)
  const root = path.dirname(absoluteManifest)
  const manifest = JSON.parse(fs.readFileSync(absoluteManifest, 'utf8'))
  if (manifest.origin !== CANONICAL_ORIGIN || !Array.isArray(manifest.cards) || manifest.cards.length === 0) throw new Error('Invalid X website-card manifest.')
  const files = new Map()
  const cards = []
  for (const card of manifest.cards) {
    const match = /^\/share\/x\/(ja|en|vi|ko)\/([a-f0-9]{16})$/.exec(card.cardPath ?? '')
    if (!match || card.locale !== match[1] || card.sha256 !== card.sha256?.toLowerCase() || !/^[a-f0-9]{64}$/.test(card.sha256) || match[2] !== card.sha256.slice(0, 16)) throw new Error(`Invalid card identity: ${card.cardPath}`)
    const stem = `share/x/${match[1]}/${match[2]}`
    if (card.htmlOutput !== `${stem}.html` || card.imageOutput !== `${stem}.png` || card.imagePath !== `${card.cardPath}.png`) throw new Error(`Card output escapes the exact share/x locale path: ${card.cardPath}`)
    const htmlPath = addLocalFile(root, card.htmlOutput, files)
    const imagePath = addLocalFile(root, card.imageOutput, files)
    const html = fs.readFileSync(htmlPath, 'utf8')
    assertCardMetadata(html, card)
    const bytes = fs.readFileSync(imagePath)
    const imageHash = crypto.createHash('sha256').update(bytes).digest('hex')
    if (imageHash !== card.sha256) throw new Error(`Source image SHA-256 mismatch: ${card.imageOutput}`)
    cards.push({ ...card, imageBytes: bytes, htmlBytes: fs.readFileSync(htmlPath) })
  }
  if (files.size !== cards.length * 2) throw new Error('Duplicate output path in X card manifest.')
  return { root, cards, files }
}

function addLocalFile(root, relative, files) {
  if (typeof relative !== 'string' || !relative.startsWith(ALLOWED_PREFIX) || relative.includes('\\') || relative.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`Disallowed Hosting path: ${relative}`)
  const absolute = path.resolve(root, ...relative.split('/'))
  const rel = path.relative(root, absolute)
  if (!rel || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error(`Local source path escapes manifest directory: ${relative}`)
  const stat = fs.lstatSync(absolute)
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Card output must be a regular file: ${relative}`)
  const realRoot = fs.realpathSync(root)
  const realFile = fs.realpathSync(absolute)
  const realRelative = path.relative(realRoot, realFile)
  if (!realRelative || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) throw new Error(`Card source resolves outside manifest directory: ${relative}`)
  if (files.has(`/${relative}`)) throw new Error(`Duplicate Hosting path: /${relative}`)
  files.set(`/${relative}`, absolute)
  return absolute
}

function assertCardMetadata(html, card) {
  const escapedImage = `${CANONICAL_ORIGIN}${card.imagePath}`
  for (const required of [
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${CANONICAL_ORIGIN}${card.cardPath}">`,
    `<meta property="og:image" content="${escapedImage}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:site" content="@jungsilx">',
    `<meta name="twitter:image" content="${escapedImage}">`,
  ]) if (!html.includes(required)) throw new Error(`X card metadata missing or incorrect for ${card.cardPath}: ${required}`)
}

function fileMap(files) {
  return new Map((files ?? []).map((file) => [file.path.startsWith('/') ? file.path : `/${file.path}`, file.hash]))
}

function assertAdditiveVersion(baseline, candidate, allowedNewPaths) {
  const before = fileMap(baseline.files)
  const after = fileMap(candidate.files)
  for (const [filePath, hash] of before) if (after.get(filePath) !== hash) throw new Error(`Existing Hosting file changed or disappeared: ${filePath}`)
  const additions = [...after.keys()].filter((filePath) => !before.has(filePath)).sort()
  const allowed = [...allowedNewPaths].sort()
  if (stableJson(additions) !== stableJson(allowed)) throw new Error(`Unexpected Hosting path changes; expected only ${allowed.join(', ')}, got ${additions.join(', ')}`)
  if (stableJson(baseline.config ?? {}) !== stableJson(candidate.config ?? {})) throw new Error('Hosting config changed from the live baseline.')
}

function assertSameLiveBaseline(before, after) {
  if (before.versionName !== after.versionName || stableJson(before.config ?? {}) !== stableJson(after.config ?? {})) throw new Error('Live Hosting release/config changed during preview; refusing promotion.')
  const left = [...fileMap(before.files)].sort(([a], [b]) => a.localeCompare(b))
  const right = [...fileMap(after.files)].sort(([a], [b]) => a.localeCompare(b))
  if (stableJson(left) !== stableJson(right)) throw new Error('Live Hosting file map changed during preview; refusing promotion.')
}

async function verifyPreviewCards(previewUrl, cards, fetchImpl = fetch) {
  const base = new URL(previewUrl)
  if (base.protocol !== 'https:') throw new Error('Preview channel must use HTTPS.')
  for (const card of cards) {
    const pageUrl = new URL(card.cardPath, base).href
    const pageResponse = await fetchImpl(pageUrl, { redirect: 'error' })
    const page = await pageResponse.text()
    if (!pageResponse.ok || !/^text\/html(?:;|$)/i.test(pageResponse.headers.get('content-type') ?? '')) throw new Error(`Preview card page failed: ${pageUrl} (HTTP ${pageResponse.status})`)
    assertCardMetadata(page, card)
    const imageUrl = new URL(card.imagePath, base).href
    const imageResponse = await fetchImpl(imageUrl, { redirect: 'error' })
    const image = Buffer.from(await imageResponse.arrayBuffer())
    if (!imageResponse.ok || !/^image\/png(?:;|$)/i.test(imageResponse.headers.get('content-type') ?? '')) throw new Error(`Preview card image failed: ${imageUrl} (HTTP ${imageResponse.status})`)
    const actualHash = crypto.createHash('sha256').update(image).digest('hex')
    if (actualHash !== card.sha256) throw new Error(`Preview card image hash mismatch: ${imageUrl}`)
  }
}

async function createFirebaseApi(project) {
  const toolsRoot = process.env.FIREBASE_TOOLS_ROOT || path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'firebase-tools', 'lib')
  const require = (relative) => requireFrom(toolsRoot, relative)
  const auth = require('./requireAuth.js')
  const hosting = require('./hosting/api.js')
  const { Client } = require('./apiv2.js')
  const firebaseApi = require('./api.js')
  const authState = require('./auth.js')
  const options = { nonInteractive: true, project, projectRoot: path.resolve(__dirname, '..', '..') }
  const activeAccount = authState.selectAccount(undefined, options.projectRoot)
  if (activeAccount) authState.setActiveAccount(options, activeAccount)
  await auth.requireAuth(options)
  const client = new Client({ urlPrefix: firebaseApi.hostingApiOrigin(), apiVersion: 'v1beta1', auth: true })
  return { hosting, client, Client }
}

function requireFrom(root, relative) { return require(path.join(root, relative)) }

async function getVersion(client, site, versionName) {
  const id = versionName.split('/').at(-1)
  const result = await client.get(`/projects/-/sites/${site}/versions/${id}`)
  return result.body
}

async function listVersionFiles(client, site, versionName) {
  const id = versionName.split('/').at(-1)
  const files = []
  let pageToken
  do {
    const result = await client.get(`/projects/-/sites/${site}/versions/${id}/files`, { queryParams: { status: 'ACTIVE', pageSize: 1000, ...(pageToken ? { pageToken } : {}) } })
    files.push(...(result.body.files ?? []))
    pageToken = result.body.nextPageToken
  } while (pageToken)
  return files
}

async function readLiveBaseline(hosting, client, project, site) {
  const channel = await hosting.getChannel(project, site, 'live')
  const versionName = channel?.release?.version?.name
  if (!versionName) throw new Error('Live Hosting channel has no active release/version.')
  const version = await getVersion(client, site, versionName)
  if (version.status !== 'FINALIZED') throw new Error('Current live Hosting version is not FINALIZED.')
  const files = await listVersionFiles(client, site, versionName)
  if (files.length === 0 || files.length !== Number(version.fileCount)) throw new Error('Could not read the complete live Hosting file map; refusing to clone.')
  return { versionName, config: version.config ?? {}, files }
}

async function populateAndUpload(client, Client, site, versionName, files) {
  const hashes = {}
  const compressedByHash = new Map()
  for (const [hostingPath, absolute] of files) {
    const compressed = zlib.gzipSync(fs.readFileSync(absolute), { level: 9, mtime: 0 })
    const hash = crypto.createHash('sha256').update(compressed).digest('hex')
    hashes[hostingPath] = hash
    compressedByHash.set(hash, compressed)
  }
  const id = versionName.split('/').at(-1)
  const result = await client.post(`/projects/-/sites/${site}/versions/${id}:populateFiles`, { files: hashes })
  const required = result.body.uploadRequiredHashes ?? []
  if (required.length && !result.body.uploadUrl) throw new Error('Hosting requested file uploads but returned no uploadUrl.')
  const upload = new Client({ urlPrefix: result.body.uploadUrl, auth: true })
  for (const hash of required) {
    const body = compressedByHash.get(hash)
    if (!body) throw new Error(`Hosting requested an unknown content hash: ${hash}`)
    const response = await upload.request({ method: 'POST', path: `/${hash}`, body, headers: { 'Content-Type': 'application/octet-stream' }, responseType: 'stream', resolveOnHTTPError: true })
    await response.response.text()
    if (response.status !== 200) throw new Error(`Firebase Hosting upload failed with HTTP ${response.status}.`)
  }
}

async function verifyJavascript(previewUrl, repoRoot) {
  const verifier = path.join(repoRoot, 'Developer', 'r3f_prototype', 'scripts', 'verify-hosting-assets.mjs')
  const result = spawnSync(process.execPath, [verifier, '--url', previewUrl], { cwd: path.dirname(verifier), encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error(`Existing Hosting asset verifier failed: ${(result.stderr || result.stdout || '').trim()}`)
  return result.stdout.trim()
}

async function deployCards({ manifestPath, channelId, project = PROJECT, site = SITE, publish = false, repoRoot = path.resolve(__dirname, '..', '..'), api = null, fetchImpl = fetch, uploadImpl = populateAndUpload, javascriptVerifier = verifyJavascript }) {
  if (!channelId || !/^[a-z0-9-]{1,63}$/.test(channelId) || channelId === 'live') throw new Error('A non-live lowercase preview channel ID is required.')
  if (project !== PROJECT || site !== SITE) throw new Error(`This tool is pinned to Firebase project/site ${PROJECT}; overrides are not allowed.`)
  const source = parseManifest(manifestPath)
  const firebase = api ?? await createFirebaseApi(project)
  const baseline = await readLiveBaseline(firebase.hosting, firebase.client, project, site)
  const additions = new Set(source.files.keys())
  const baselineMap = fileMap(baseline.files)
  const uploadFiles = new Map()
  const alreadyPresent = []
  for (const [key, localPath] of source.files) {
    const expectedHash = crypto.createHash('sha256').update(zlib.gzipSync(fs.readFileSync(localPath), { level: 9, mtime: 0 })).digest('hex')
    if (baselineMap.has(key)) {
      if (baselineMap.get(key) !== expectedHash) throw new Error(`Refusing to overwrite existing Hosting path with different content: ${key}`)
      alreadyPresent.push(key)
    } else uploadFiles.set(key, localPath)
  }
  const newPaths = new Set(uploadFiles.keys())
  const plan = { mode: publish ? 'publish-preview-verify-promote' : 'plan-only', project, site, channelId, baselineVersion: baseline.versionName, baselineFileCount: baseline.files.length, newFileCount: uploadFiles.size, alreadyPresentCount: alreadyPresent.length, newPaths: [...newPaths].sort() }
  if (uploadFiles.size === 0) return { ...plan, mode: 'no-change' }
  if (!publish) return plan

  let channel = await firebase.hosting.getChannel(project, site, channelId)
  if (!channel) channel = await firebase.hosting.createChannel(project, site, channelId)
  const cloned = await firebase.hosting.cloneVersion(site, baseline.versionName, false)
  if (!cloned?.name) throw new Error('Firebase did not return the cloned preview version name.')
  const versionName = cloned.name
  await uploadImpl(firebase.client, firebase.Client, site, versionName, uploadFiles)
  const versionId = versionName.split('/').at(-1)
  const finalized = await firebase.client.patch(`/projects/-/sites/${site}/versions/${versionId}`, { status: 'FINALIZED' }, { queryParams: { updateMask: 'status' } })
  if (finalized.body.status !== 'FINALIZED') throw new Error('Preview version did not finalize.')
  const previewRelease = await firebase.hosting.createRelease(site, channelId, versionName)
  const previewChannel = await firebase.hosting.getChannel(project, site, channelId)
  const previewUrl = previewChannel?.url || channel?.url
  if (!previewUrl || previewChannel?.release?.version?.name?.split('/').at(-1) !== versionId) throw new Error('Preview channel release readback did not match the new version.')

  const previewVersion = await getVersion(firebase.client, site, versionName)
  const previewFiles = await listVersionFiles(firebase.client, site, versionName)
  assertAdditiveVersion({ config: baseline.config, files: baseline.files }, { config: previewVersion.config ?? {}, files: previewFiles }, newPaths)
  const javascriptResult = await javascriptVerifier(previewUrl, repoRoot)
  await verifyPreviewCards(previewUrl, source.cards, fetchImpl)

  const currentLive = await readLiveBaseline(firebase.hosting, firebase.client, project, site)
  assertSameLiveBaseline(baseline, currentLive)
  const liveRelease = await firebase.hosting.createRelease(site, 'live', versionName)
  const promoted = await firebase.hosting.getChannel(project, site, 'live')
  if (promoted?.release?.version?.name?.split('/').at(-1) !== versionId) throw new Error('Live release readback did not match the verified preview version.')
  return { ...plan, previewUrl, previewRelease: previewRelease.name, promotedVersion: versionName, liveRelease: liveRelease.name, javascriptVerification: javascriptResult, verifiedCards: source.cards.length }
}

function parseArgs(argv) {
  const values = { publish: false, project: PROJECT, site: SITE }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--publish') values.publish = true
    else if (['--manifest', '--channel', '--repo-root'].includes(arg)) values[{ '--manifest': 'manifestPath', '--channel': 'channelId', '--repo-root': 'repoRoot' }[arg]] = argv[++i]
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!values.manifestPath || !values.channelId) throw new Error('Usage: node Deploy-XWebsiteCards.cjs --manifest <generator-output/x-website-cards-manifest.json> --channel <preview-id> [--publish]')
  return values
}

if (require.main === module) {
  deployCards(parseArgs(process.argv.slice(2)))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(`X website-card Hosting deploy stopped: ${error.message}`); process.exitCode = 1 })
}

module.exports = { ALLOWED_PREFIX, assertAdditiveVersion, assertCardMetadata, assertSameLiveBaseline, deployCards, parseManifest, verifyPreviewCards }
