'use strict'
// Preview only. Never creates a live release, changes app files, or relaxes the card publisher.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const zlib = require('node:zlib')
const hosting = require('./Deploy-XWebsiteCards.cjs')
const SITE = 'escape-zombie-school'
const repo = path.resolve(__dirname, '..', '..')
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const gzipHash = bytes => sha(zlib.gzipSync(bytes, { level: 9, mtime: 0 }))
function versionIdentity(name) {
  const match = /^(?:projects\/escape-zombie-school\/)?sites\/escape-zombie-school\/versions\/([a-z0-9_-]{1,128})$/.exec(name ?? '')
  if (!match) throw Error('Hosting version belongs to an unexpected project/site')
  return match[1]
}

function loadInputs(manifestPath) {
  const input = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const files = new Map()
  for (const row of input.homepage ?? []) {
    const episode = /^\/comics\/backlog-20261015\/(ko|en|ja|vi)\/(0[1-9]|10)\.png$/.exec(row.path)
    if (!episode) throw Error('Homepage replacement is outside the exact 40-image allowlist')
    if (files.has(row.path)) throw Error('Duplicate homepage image')
    const local = path.resolve(repo, row.source)
    const rel = path.relative(repo, local).replaceAll('\\', '/')
    const source = /^marketing\/x_daily_zombie_school_posting\/image_pool\/(x|facebook)\/(ko|en|ja|vi)\/vertical_comic_20261018\/[^/]+\.png$/.exec(rel)
    if (!source || source[2] !== episode[1]) throw Error('Homepage input is outside the matching locale edited comic pool')
    const stat = fs.lstatSync(local)
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Edited input must be a regular file')
    const bytes = fs.readFileSync(local)
    if (sha(bytes) !== row.sha256) throw Error('Homepage edited image changed')
    files.set(row.path, local)
  }
  if (files.size !== 40) throw Error('Exactly 40 homepage replacements required')
  if (input.cardManifest) {
    for (const [key, local] of hosting.parseManifest(path.resolve(repo, input.cardManifest)).files) {
      if (files.has(key)) throw Error('Duplicate asset path')
      files.set(key, local)
    }
  }
  return files
}

function assertVersion(baseline, candidate, replacements, additions) {
  for (const key of replacements.keys()) if (!/^\/comics\/backlog-20261015\/(ko|en|ja|vi)\/(0[1-9]|10)\.png$/.test(key)) throw Error('Replacement outside approved homepage episodes')
  const before = new Map(baseline.files.map(f => [f.path, f.hash]))
  const after = new Map(candidate.files.map(f => [f.path, f.hash]))
  for (const [key, hash] of before) {
    const expected = replacements.get(key) ?? hash
    if (after.get(key) !== expected) throw Error(`Existing file changed outside approved replacement: ${key}`)
  }
  for (const key of replacements.keys()) if (!before.has(key)) throw Error(`Replacement was not in baseline: ${key}`)
  hosting.assertAdditiveVersion(
    { config: baseline.config, files: baseline.files.map(f => ({ ...f, hash: replacements.get(f.path) ?? f.hash })) },
    candidate, additions,
  )
}

async function verifyHttpInputs(inputs, previewUrl) {
  for (const [key, local] of inputs) {
    // Hosting cleanUrls redirects .html; request its canonical extensionless URL.
    const requestPath = key.endsWith('.html') ? key.slice(0, -5) : key
    const response = await fetch(new URL(requestPath, previewUrl), { redirect: 'error' })
    const bytes = Buffer.from(await response.arrayBuffer())
    if (!response.ok || sha(bytes) !== sha(fs.readFileSync(local))) throw Error(`Preview HTTP bytes differ: ${key}`)
    if (key.endsWith('.png') && !/^image\/png(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw Error(`Preview PNG content type differs: ${key}`)
    if (key.endsWith('.html') && !/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw Error(`Preview HTML content type differs: ${key}`)
  }
}

async function preview({ manifestPath, channelId, createPreview = false, evidencePath }) {
  if (!/^vertical-comics-20261018-[a-z0-9-]+$/.test(channelId ?? '')) throw Error('A task-specific non-live preview channel is required')
  const inputs = loadInputs(manifestPath)
  const api = await hosting.createFirebaseApi(SITE)
  const baseline = await hosting.readLiveBaseline(api.hosting, api.client, SITE, SITE)
  const before = new Map(baseline.files.map(f => [f.path, f.hash]))
  const replacements = new Map(), additions = new Set(), upload = new Map()
  for (const [key, file] of inputs) {
    const hash = gzipHash(fs.readFileSync(file))
    if (key.startsWith('/comics/')) {
      if (!before.has(key)) throw Error(`Missing live homepage episode: ${key}`)
      replacements.set(key, hash)
    } else if (before.has(key) && before.get(key) !== hash) throw Error(`Immutable existing card differs: ${key}`)
    else if (!before.has(key)) additions.add(key)
    if (before.get(key) !== hash) upload.set(key, file)
  }
  const result = { mode: createPreview ? 'preview-only' : 'plan-only', channelId, baseline, replacementHashes: Object.fromEntries(replacements), additions: [...additions], uploadCount: upload.size, manifestSha256: sha(fs.readFileSync(manifestPath)) }
  if (createPreview) {
    let channel = await api.hosting.getChannel(SITE, SITE, channelId)
    if (!channel) channel = await api.hosting.createChannel(SITE, SITE, channelId)
    const cloned = await api.hosting.cloneVersion(SITE, baseline.versionName, false)
    if (!cloned?.name) throw Error('Preview clone missing')
    const id = cloned.name.split('/').at(-1)
    await hosting.populateAndUpload(api.client, api.Client, SITE, cloned.name, upload)
    const finalized = await api.client.patch(`/projects/-/sites/${SITE}/versions/${id}`, { status: 'FINALIZED' }, { queryParams: { updateMask: 'status' } })
    if (finalized.body.status !== 'FINALIZED') throw Error('Preview finalization failed')
    await api.hosting.createRelease(SITE, channelId, cloned.name)
    const readback = await api.hosting.getChannel(SITE, SITE, channelId)
    if (readback?.release?.version?.name?.split('/').at(-1) !== id || !readback.url) throw Error('Preview release binding failed')
    const candidate = { config: (await hosting.getVersion(api.client, SITE, cloned.name)).config ?? {}, files: await hosting.listVersionFiles(api.client, SITE, cloned.name) }
    assertVersion(baseline, candidate, replacements, additions)
    await verifyHttpInputs(inputs, readback.url)
    hosting.assertSameLiveBaseline(baseline, await hosting.readLiveBaseline(api.hosting, api.client, SITE, SITE))
    Object.assign(result, { previewUrl: readback.url, previewVersion: cloned.name, verifiedFileCount: candidate.files.length, verifiedInputs: inputs.size, liveUnchanged: true })
  }
  if (evidencePath) fs.writeFileSync(evidencePath, JSON.stringify(result, null, 2) + '\n')
  return result
}

async function promoteReviewedPreview({ manifestPath, evidencePath, channelId }) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  if (evidence.mode !== 'preview-only' || evidence.liveUnchanged !== true || !evidence.previewVersion ||
      !/^vertical-comics-20261018-[a-z0-9-]+$/.test(channelId ?? '') || evidence.channelId !== channelId ||
      evidence.manifestSha256 !== sha(fs.readFileSync(manifestPath))) throw Error('Reviewed preview evidence does not bind this manifest/channel')
  const inputs = loadInputs(manifestPath)
  const replacements = new Map(Object.entries(evidence.replacementHashes))
  if (replacements.size !== 40) throw Error('Reviewed evidence must contain exactly40 replacements')
  const additions = new Set(evidence.additions)
  // Recompute every permitted change from current local bytes, not evidence alone.
  const before = new Map(evidence.baseline.files.map(f => [f.path, f.hash]))
  const expectedAdditions = new Set()
  for (const [key, file] of inputs) {
    const hash = gzipHash(fs.readFileSync(file))
    if (key.startsWith('/comics/')) {
      if (replacements.get(key) !== hash) throw Error('Local replacement differs from reviewed preview')
    } else if (before.has(key)) {
      if (before.get(key) !== hash) throw Error('Existing card bytes changed')
    } else expectedAdditions.add(key)
  }
  if (JSON.stringify([...additions].sort()) !== JSON.stringify([...expectedAdditions].sort())) throw Error('Reviewed card additions changed')
  const api = await hosting.createFirebaseApi(SITE)
  const channel = await api.hosting.getChannel(SITE, SITE, channelId)
  if (versionIdentity(channel?.release?.version?.name) !== versionIdentity(evidence.previewVersion) || channel.url !== evidence.previewUrl) throw Error('Preview channel changed since review')
  const version = await hosting.getVersion(api.client, SITE, evidence.previewVersion)
  if (version.status !== 'FINALIZED') throw Error('Reviewed preview is not finalized')
  assertVersion(evidence.baseline, { config: version.config ?? {}, files: await hosting.listVersionFiles(api.client, SITE, evidence.previewVersion) }, replacements, additions)
  await verifyHttpInputs(inputs, evidence.previewUrl)
  hosting.assertSameLiveBaseline(evidence.baseline, await hosting.readLiveBaseline(api.hosting, api.client, SITE, SITE))
  const release = await api.hosting.createRelease(SITE, 'live', evidence.previewVersion)
  const live = await api.hosting.getChannel(SITE, SITE, 'live')
  if (versionIdentity(live?.release?.version?.name) !== versionIdentity(evidence.previewVersion)) throw Error('Promoted live release readback differs')
  const result = { ...evidence, mode: 'reviewed-preview-promoted', promotedAtUtc: new Date().toISOString(), liveRelease: release.name }
  fs.writeFileSync(evidencePath.replace(/\.json$/, '') + '.promoted.json', JSON.stringify(result, null, 2) + '\n')
  return result
}

if (require.main === module) {
  const args = process.argv.slice(2), options = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--create-preview') options.createPreview = true
    else if (args[i] === '--promote-reviewed-preview') options.promote = true
    else if (['--manifest', '--channel', '--evidence'].includes(args[i])) options[{ '--manifest': 'manifestPath', '--channel': 'channelId', '--evidence': 'evidencePath' }[args[i]]] = args[++i]
    else throw Error(`Unknown argument ${args[i]}`)
  }
  if (options.promote && options.createPreview) throw Error('Preview and reviewed promotion are separate operations')
  const operation = options.promote ? promoteReviewedPreview : preview
  operation(options).then(r => console.log(JSON.stringify({ mode: r.mode, uploadCount: r.uploadCount, previewUrl: r.previewUrl, liveUnchanged: r.liveUnchanged }))).catch(e => { console.error(e.message); process.exitCode = 1 })
}
module.exports = { loadInputs, assertVersion, versionIdentity, verifyHttpInputs, preview, promoteReviewedPreview }
