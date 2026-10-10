'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { assertAdditiveVersion, deployCards, parseManifest } = require('./Deploy-XWebsiteCards.cjs')

const canonical = 'https://escapezombie.com'

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'x-cards-deploy-'))
  const image = Buffer.from('offline PNG fixture bytes')
  const sha256 = crypto.createHash('sha256').update(image).digest('hex')
  const stem = `share/x/en/${sha256.slice(0, 16)}`
  const cardPath = `/${stem}`
  const imagePath = `${cardPath}.png`
  const html = `<!doctype html><html><head><meta property="og:type" content="website"><meta property="og:url" content="${canonical}${cardPath}"><meta property="og:image" content="${canonical}${imagePath}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@jungsilx"><meta name="twitter:image" content="${canonical}${imagePath}"></head></html>`
  fs.mkdirSync(path.join(root, stem, '..'), { recursive: true })
  fs.writeFileSync(path.join(root, `${stem}.html`), html)
  fs.writeFileSync(path.join(root, `${stem}.png`), image)
  const manifestPath = path.join(root, 'x-website-cards-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify({ origin: canonical, cards: [{ locale: 'en', cardPath, imagePath, sha256, htmlOutput: `${stem}.html`, imageOutput: `${stem}.png` }] }))
  return { root, manifestPath, cardPath, imagePath, sha256, html, image }
}

function fakeApi({ mutateLive = false } = {}) {
  const state = { releases: [], previewVersion: null, previewCreated: false, liveReads: 0, liveVersion: 'sites/escape-zombie-school/versions/live-v1', newFiles: [] }
  const baselineFiles = [{ path: '/index.html', hash: 'existing-index-hash' }, { path: '/assets/app.js', hash: 'existing-js-hash' }]
  const config = { cleanUrls: true, headers: [{ glob: '**', headers: { 'Cache-Control': 'public' } }] }
  const api = {
    state,
    Client: class {},
    client: {
      async get(route) {
        if (route.endsWith('/files')) {
          state.liveReads += 1
          const existing = state.liveReads > 1 && mutateLive ? [{ path: '/index.html', hash: 'changed' }, baselineFiles[1]] : baselineFiles
          if (route.includes('live-v1')) return { body: { files: existing } }
          return { body: { files: [...baselineFiles, ...state.newFiles] } }
        }
        if (route.endsWith('/live-v1')) return { body: { status: 'FINALIZED', config, fileCount: String(baselineFiles.length) } }
        return { body: { status: 'FINALIZED', config, fileCount: String(baselineFiles.length + 2) } }
      },
      async patch() { return { body: { status: 'FINALIZED' } } },
    },
    hosting: {
      async getChannel(_project, _site, channel) {
        const versionName = channel === 'live' ? state.liveVersion : state.previewVersion
        const readbackName = versionName ? `projects/escape-zombie-school/sites/escape-zombie-school/versions/${versionName.split('/').at(-1)}` : null
        if (channel === 'live') return { url: 'https://escapezombie.com', release: { version: { name: readbackName } } }
        return state.previewCreated ? { url: 'https://x-preview.web.app', release: { version: { name: readbackName } } } : null
      },
      async createChannel() { state.previewCreated = true; return { url: 'https://x-preview.web.app' } },
      async cloneVersion() { state.previewVersion = 'sites/escape-zombie-school/versions/preview-v2'; return { name: state.previewVersion } },
      async createRelease(_site, channel, versionName) {
        state.releases.push({ channel, versionName })
        if (channel !== 'live') { state.previewCreated = true; state.previewVersion = versionName }
        else state.liveVersion = versionName
        return { name: `release-${channel}` }
      },
    },
  }
  return { api, baselineFiles, config }
}

test('validates generated card paths, source hashes, and metadata without deploying', (t) => {
  const f = fixture(); t.after(() => fs.rmSync(f.root, { recursive: true, force: true }))
  const parsed = parseManifest(f.manifestPath)
  assert.equal(parsed.files.size, 2)
  assert.throws(() => assertAdditiveVersion({ config: {}, files: [{ path: '/index.html', hash: 'a' }] }, { config: {}, files: [{ path: '/index.html', hash: 'b' }] }, new Set()), /changed or disappeared/)
})

test('default plan is read-only and a verified publish promotes only additive card files', async (t) => {
  const f = fixture(); t.after(() => fs.rmSync(f.root, { recursive: true, force: true }))
  const { api, baselineFiles } = fakeApi()
  const opts = { manifestPath: f.manifestPath, channelId: 'x-card-preview', api, fetchImpl: async (url) => url.endsWith('.png')
    ? { ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => f.image }
    : { ok: true, status: 200, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => f.html } }
  const plan = await deployCards(opts)
  assert.equal(plan.mode, 'plan-only')
  assert.equal(api.state.releases.length, 0)
  assert.equal(api.state.previewVersion, null)
  const verified = []
  const result = await deployCards({ ...opts, publish: true, uploadImpl: async (_client,_Client,_site,_version,files) => {
    api.state.newFiles = [...files].map(([hostingPath, localPath]) => ({ path: hostingPath, hash: crypto.createHash('sha256').update(require('node:zlib').gzipSync(fs.readFileSync(localPath), { level: 9, mtime: 0 })).digest('hex') }))
    verified.push('files-populated')
  }, javascriptVerifier: async () => { verified.push('js-verified'); return 'fixture-ok' } })
  assert.equal(result.verifiedCards, 1)
  assert.deepEqual(verified, ['files-populated', 'js-verified'])
  assert.deepEqual(api.state.releases.map(({ channel }) => channel), ['x-card-preview', 'live'])
  assert.equal(api.state.releases[0].versionName, api.state.releases[1].versionName)
  assert.equal(baselineFiles.length, 2)
})

test('refuses live promotion if the live baseline changes during preview verification', async (t) => {
  const f = fixture(); t.after(() => fs.rmSync(f.root, { recursive: true, force: true }))
  const { api } = fakeApi({ mutateLive: true })
  await assert.rejects(deployCards({
    manifestPath: f.manifestPath, channelId: 'x-card-preview', publish: true, api,
    uploadImpl: async (_client,_Client,_site,_version,files) => { api.state.newFiles = [...files].map(([hostingPath, localPath]) => ({ path: hostingPath, hash: crypto.createHash('sha256').update(require('node:zlib').gzipSync(fs.readFileSync(localPath), { level: 9, mtime: 0 })).digest('hex') })) }, javascriptVerifier: async () => 'fixture-ok',
    fetchImpl: async (url) => url.endsWith('.png')
      ? { ok: true, status: 200, headers: { get: () => 'image/png' }, arrayBuffer: async () => f.image }
      : { ok: true, status: 200, headers: { get: () => 'text/html' }, text: async () => f.html },
  }), /Live Hosting file map changed during preview/)
  assert.deepEqual(api.state.releases.map(({ channel }) => channel), ['x-card-preview'])
})

test('rejects manifest paths outside the strict share/x layout', (t) => {
  const f = fixture(); t.after(() => fs.rmSync(f.root, { recursive: true, force: true }))
  const data = JSON.parse(fs.readFileSync(f.manifestPath, 'utf8'))
  data.cards[0].htmlOutput = 'index.html'
  fs.writeFileSync(f.manifestPath, JSON.stringify(data))
  assert.throws(() => parseManifest(f.manifestPath), /escapes the exact share\/x locale path/)
})

test('keeps Firebase apiv2 upload response handling compatible with streaming bodies', () => {
  const source = fs.readFileSync(path.join(__dirname, 'Deploy-XWebsiteCards.cjs'), 'utf8')
  assert.match(source, /upload\.request\(\{\s*method: 'POST',\s*path: `\/\$\{hash\}`,\s*body,\s*headers: \{ 'Content-Type': 'application\/octet-stream' \},\s*responseType: 'stream',\s*resolveOnHTTPError: true\s*\}\)/)
  assert.match(source, /await response\.response\.text\(\)\s*\n\s*if \(response\.status !== 200\)/)
})
