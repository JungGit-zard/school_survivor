const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { assertVersion, versionIdentity, verifyHttpInputs, promoteReviewedPreview } = require('./Preview-VerticalComicAssets.cjs')
const episode = '/comics/backlog-20261015/ja/01.png'
const baseline = { config: { rewrites: [{ source: '**', destination: '/index.html' }] }, files: [{ path: '/index.html', hash: 'app' }, { path: episode, hash: 'old' }] }
const replacement = new Map([[episode, 'new']])
const candidate = () => structuredClone({ config: baseline.config, files: [{ path: '/index.html', hash: 'app' }, { path: episode, hash: 'new' }, { path: '/share/x/ja/new.png', hash: 'card' }] })
test('allowlisted image replacement and additive cards preserve every other file', () => assert.doesNotThrow(() => assertVersion(baseline, candidate(), replacement, new Set(['/share/x/ja/new.png']))))
test('app bundle/root alteration is rejected', () => { const after = candidate(); after.files[0].hash = 'changed'; assert.throws(() => assertVersion(baseline, after, replacement, new Set(['/share/x/ja/new.png'])), /outside approved/) })
test('deletion and unlisted additions are rejected', () => { const after = candidate(); after.files.pop(); assert.throws(() => assertVersion(baseline, after, replacement, new Set(['/share/x/ja/new.png']))); after.files.push({ path: '/unexpected.png', hash: 'x' }); assert.throws(() => assertVersion(baseline, after, replacement, new Set())) })
test('hosting config and non-episode replacement paths are rejected', () => { const after = candidate(); after.config = {}; assert.throws(() => assertVersion(baseline, after, replacement, new Set(['/share/x/ja/new.png']))); assert.throws(() => assertVersion(baseline, candidate(), new Map([['/index.html', 'x']]), new Set()), /outside approved/) })
test('Firebase short/full version names match only the pinned project/site and exact version', () => {
  assert.equal(versionIdentity('sites/escape-zombie-school/versions/f57cc4e5eeac71c3'), versionIdentity('projects/escape-zombie-school/sites/escape-zombie-school/versions/f57cc4e5eeac71c3'))
  assert.notEqual(versionIdentity('sites/escape-zombie-school/versions/other'), versionIdentity('sites/escape-zombie-school/versions/f57cc4e5eeac71c3'))
  assert.throws(() => versionIdentity('projects/other/sites/escape-zombie-school/versions/f57cc4e5eeac71c3'), /unexpected project/)
  assert.throws(() => versionIdentity('sites/other/versions/f57cc4e5eeac71c3'), /unexpected project/)
})
test('cleanUrls card verification requests canonical extensionless URL without following redirects', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vertical-preview-'))
  const savedFetch = global.fetch
  try {
    const html = path.join(root, 'card.html'), png = path.join(root, 'comic.png')
    fs.writeFileSync(html, '<html>verified</html>'); fs.writeFileSync(png, 'image-fixture')
    const requests = []
    global.fetch = async (url, options) => {
      requests.push([url.pathname, options.redirect])
      const isHtml = url.pathname === '/share/x/ja/1234567890123456'
      return new Response(fs.readFileSync(isHtml ? html : png), { headers: { 'Content-Type': isHtml ? 'text/html' : 'image/png' } })
    }
    await verifyHttpInputs(new Map([['/share/x/ja/1234567890123456.html', html], [episode, png]]), 'https://preview.web.app')
    assert.deepEqual(requests, [['/share/x/ja/1234567890123456', 'error'], [episode, 'error']])
    const evidence = path.join(root, 'plan.json'); fs.writeFileSync(evidence, JSON.stringify({ mode: 'plan-only' }))
    await assert.rejects(promoteReviewedPreview({ evidencePath: evidence, channelId: 'vertical-comics-20261018-test' }), /Reviewed preview evidence/)
  } finally { global.fetch = savedFetch; fs.rmSync(root, { recursive: true, force: true }) }
})
