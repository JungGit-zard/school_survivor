import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildCards } from './Build-XWebsiteCards.mjs'

test('buildCards emits static localized X cards for canonical, enabled variant, and active pool images', async (t) => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'x-card-generator-'))
  const output = path.join(repoRoot, 'generated')
  t.after(() => rm(repoRoot, { recursive: true, force: true }))

  const campaign = path.join(repoRoot, 'marketing', 'x_daily_zombie_school_posting')
  const pool = path.join(campaign, 'image_pool')
  await mkdir(pool, { recursive: true })
  const sources = [
    ['x/ja/original.png', 'original bytes'],
    ['x/ja/variant.png', 'variant bytes'],
    ['x/ja/pool.png', 'pool bytes'],
    ['facebook/ja/not-x.png', 'facebook bytes'],
  ]
  const catalogImages = []
  for (const [relative, content] of sources) {
    const absolute = path.join(pool, ...relative.split('/'))
    await mkdir(path.dirname(absolute), { recursive: true })
    await writeFile(absolute, content)
    if (relative.startsWith('x/')) {
      catalogImages.push({ platform: 'X', locale: 'ja', path: relative, source: `originals/${path.basename(relative)}` })
    }
  }
  await writeFile(path.join(campaign, 'posting_config.json'), JSON.stringify({
    language_order: ['ja'],
    copy: { ja: { text: '学校から脱出しよう！\n開始 ->\nhttps://example.test\n#ゾンビ学校' } },
    image_pool: { ja: { images: ['image_pool/x/ja/original.png'] } },
    variants: { ja: [
      { id: 'enabled', enabled: true, imagePath: 'image_pool/x/ja/variant.png' },
      { id: 'disabled', enabled: false, imagePath: 'image_pool/x/ja/disabled.png' },
    ] },
    localized_social_image_pool: { ja: { images: [
      'image_pool/x/ja/pool.png', 'image_pool/x/ja/original.png', 'image_pool/facebook/ja/not-x.png',
    ] } },
  }))
  await writeFile(path.join(pool, 'image_catalog.json'), JSON.stringify({ images: catalogImages }))

  const result = await buildCards({ repoRoot, output })
  assert.equal(result.cards.length, 3)
  assert.deepEqual(result.cards.map((card) => card.configuredPath), [
    'image_pool/x/ja/original.png',
    'image_pool/x/ja/variant.png',
    'image_pool/x/ja/pool.png',
  ])

  const card = result.cards[0]
  const expectedHash = createHash('sha256').update('original bytes').digest('hex')
  assert.equal(card.sha256, expectedHash)
  assert.equal(card.cardPath, `/share/x/ja/${expectedHash.slice(0, 16)}`)
  assert.equal(card.imagePath, `${card.cardPath}.png`)
  assert.equal(await readFile(path.join(output, ...card.imageOutput.split('/')), 'utf8'), 'original bytes')

  const html = await readFile(path.join(output, ...card.htmlOutput.split('/')), 'utf8')
  assert.match(html, /<html lang="ja">/)
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)
  assert.match(html, /<meta name="twitter:site" content="@jungsilx">/)
  assert.match(html, new RegExp(`<meta property="og:image" content="https://escapezombie\\.com${card.cardPath}\\.png">`))
  assert.match(html, /学校から脱出しよう！/)
  assert.match(html, /window\.location\.replace\("https:\/\/escapezombie\.com\/"\)/)
  assert.match(html, /<noscript><a href="https:\/\/escapezombie\.com\/">/)
  assert.doesNotMatch(html, /http-equiv=["']refresh/i)

  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'))
  assert.equal(manifest.cards.length, 3)
  assert.equal(manifest.cards[0].source, 'originals/original.png')
  assert.deepEqual(manifest.httpChecks[0], {
    card: {
      url: `https://escapezombie.com${card.cardPath}`,
      expectedStatus: 200,
      expectedContentType: 'text/html',
      requiredMeta: [
        'twitter:card=summary_large_image',
        'twitter:site=@jungsilx',
        `og:image=https://escapezombie.com${card.imagePath}`,
      ],
    },
    image: {
      url: `https://escapezombie.com${card.imagePath}`,
      expectedStatus: 200,
      expectedContentType: 'image/png',
      sha256: expectedHash,
    },
  })
})

test('buildCards rejects active X images without one matching X catalog entry', async (t) => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'x-card-generator-missing-catalog-'))
  t.after(() => rm(repoRoot, { recursive: true, force: true }))
  const campaign = path.join(repoRoot, 'marketing', 'x_daily_zombie_school_posting')
  const pool = path.join(campaign, 'image_pool')
  const imagePath = path.join(pool, 'x', 'ko', 'active.png')
  await mkdir(path.dirname(imagePath), { recursive: true })
  await writeFile(imagePath, 'image')
  await writeFile(path.join(campaign, 'posting_config.json'), JSON.stringify({
    language_order: ['ko'],
    copy: { ko: { text: '학교에서 탈출하세요.' } },
    image_pool: { ko: { images: ['image_pool/x/ko/active.png'] } },
  }))
  await writeFile(path.join(pool, 'image_catalog.json'), JSON.stringify({ images: [] }))

  await assert.rejects(buildCards({ repoRoot, output: path.join(repoRoot, 'out') }), /Expected one X catalog row/)
})
