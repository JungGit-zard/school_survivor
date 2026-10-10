import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const campaignRoot = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_REPO_ROOT = path.resolve(campaignRoot, '..', '..')
const CARD_ORIGIN = 'https://escapezombie.com'

const TITLES = {
  ja: '脱出！ゾンビ学校',
  en: 'Escape! Zombie School',
  vi: 'Thoát Khỏi Trường Zombie',
  ko: '탈출! 좀비학교',
}

function parseArguments(argv) {
  let output
  let repoRoot = DEFAULT_REPO_ROOT
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--output') output = argv[++index]
    else if (argument === '--repo-root') repoRoot = argv[++index]
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!output) throw new Error('Usage: node Build-XWebsiteCards.mjs --output <dir> [--repo-root <dir>]')
  return { output: path.resolve(output), repoRoot: path.resolve(repoRoot) }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function cleanDescription(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:https?:\/\/|.*->\s*$|#\S+\s*$)/i.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveImagePath(poolRoot, configuredPath) {
  const normalized = String(configuredPath ?? '').replaceAll('\\', '/')
  const relative = normalized.replace(/^.*(?:^|\/)image_pool\//i, '')
  if (!relative || path.posix.isAbsolute(relative) || relative.split('/').includes('..')) {
    throw new Error(`Invalid image path: ${configuredPath}`)
  }
  const absolute = path.resolve(poolRoot, ...relative.split('/'))
  const relativeToRoot = path.relative(poolRoot, absolute)
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Image path escapes image_pool: ${configuredPath}`)
  }
  return { relative, absolute }
}

function localeImageCandidates(config, locale) {
  const paths = []
  paths.push(...(config.image_pool?.[locale]?.images ?? []))
  for (const variant of config.variants?.[locale] ?? []) {
    if (variant.enabled === true && variant.imagePath) paths.push(variant.imagePath)
  }
  paths.push(...(config.localized_social_image_pool?.[locale]?.images ?? []))
  return paths
}

export async function buildCards({ repoRoot, output }) {
  const campaign = path.join(repoRoot, 'marketing', 'x_daily_zombie_school_posting')
  const poolRoot = path.join(campaign, 'image_pool')
  const config = JSON.parse(await readFile(path.join(campaign, 'posting_config.json'), 'utf8'))
  const catalog = JSON.parse(await readFile(path.join(poolRoot, 'image_catalog.json'), 'utf8'))
  const catalogByKey = new Map()
  for (const row of catalog.images ?? []) {
    if (row.platform !== 'X') continue
    const key = `${row.locale}/${row.path.replaceAll('\\', '/')}`
    const rows = catalogByKey.get(key) ?? []
    rows.push(row)
    catalogByKey.set(key, rows)
  }

  const records = []
  for (const locale of config.language_order ?? []) {
    if (!TITLES[locale]) throw new Error(`No localized card title configured for locale: ${locale}`)
    const description = cleanDescription(config.copy?.[locale]?.text)
    if (!description) throw new Error(`No promotional copy configured for locale: ${locale}`)
    const seen = new Set()
    for (const configuredPath of localeImageCandidates(config, locale)) {
      const { relative, absolute } = resolveImagePath(poolRoot, configuredPath)
      const pathFromPool = relative.replaceAll('\\', '/')
      if (!pathFromPool.startsWith(`x/${locale}/`)) continue
      if (seen.has(pathFromPool)) continue
      seen.add(pathFromPool)
      const catalogRows = catalogByKey.get(`${locale}/${pathFromPool}`) ?? []
      if (catalogRows.length !== 1) throw new Error(`Expected one X catalog row for ${locale}/${pathFromPool}; found ${catalogRows.length}`)

      const image = await readFile(absolute)
      const sha256 = createHash('sha256').update(image).digest('hex')
      const slug = `/share/x/${locale}/${sha256.slice(0, 16)}`
      const imageUrl = `${CARD_ORIGIN}${slug}.png`
      const page = `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(TITLES[locale])}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${CARD_ORIGIN}${slug}">
  <meta property="og:title" content="${escapeHtml(TITLES[locale])}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@jungsilx">
  <meta name="twitter:title" content="${escapeHtml(TITLES[locale])}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  <script>window.location.replace(${JSON.stringify(`${CARD_ORIGIN}/`)})</script>
</head>
<body>
  <noscript><a href="${CARD_ORIGIN}/">${escapeHtml(TITLES[locale])}</a></noscript>
</body>
</html>
`
      const htmlRelativePath = `share/x/${locale}/${sha256.slice(0, 16)}.html`
      const imageRelativePath = `${slug.slice(1)}.png`
      const htmlDestination = path.join(output, ...htmlRelativePath.split('/'))
      const imageDestination = path.join(output, ...imageRelativePath.split('/'))
      await mkdir(path.dirname(htmlDestination), { recursive: true })
      await mkdir(path.dirname(imageDestination), { recursive: true })
      await writeFile(htmlDestination, page, 'utf8')
      await copyFile(absolute, imageDestination)
      records.push({
        locale,
        cardPath: slug,
        imagePath: `${slug}.png`,
        sha256,
        source: catalogRows[0].source,
        configuredPath: `image_pool/${pathFromPool}`,
        htmlOutput: htmlRelativePath,
        imageOutput: imageRelativePath,
      })
    }
  }

  const manifestPath = path.join(output, 'x-website-cards-manifest.json')
  const httpChecks = records.map((record) => ({
    card: {
      url: `${CARD_ORIGIN}${record.cardPath}`,
      expectedStatus: 200,
      expectedContentType: 'text/html',
      requiredMeta: ['twitter:card=summary_large_image', 'twitter:site=@jungsilx', `og:image=${CARD_ORIGIN}${record.imagePath}`],
    },
    image: {
      url: `${CARD_ORIGIN}${record.imagePath}`,
      expectedStatus: 200,
      expectedContentType: 'image/png',
      sha256: record.sha256,
    },
  }))
  await writeFile(manifestPath, `${JSON.stringify({ origin: CARD_ORIGIN, cards: records, httpChecks }, null, 2)}\n`, 'utf8')
  return { manifestPath, cards: records }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildCards(parseArguments(process.argv.slice(2)))
    console.log(`Generated ${result.cards.length} X website cards and images.`)
    console.log(result.manifestPath)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
