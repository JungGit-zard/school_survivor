'use strict'
// One-time asset registration, run under the existing social serial mutex.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const repo = path.resolve(__dirname, '..', '..')
const work = path.join(repo, 'Graphic_designer/comic_vertical_20261018')
const campaign = path.join(repo, 'marketing/x_daily_zombie_school_posting')
const configPath = path.join(campaign, 'posting_config.json')
const catalogPath = path.join(campaign, 'image_pool/image_catalog.json')
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const relative = p => {
  const normalized = String(p).replaceAll('\\', '/')
  const poolPath = normalized.replace(/^image_pool\//, '')
  const absolute = /^(x|facebook)\//.test(poolPath) ? path.join(campaign, 'image_pool', poolPath) : path.resolve(repo, p)
  return path.relative(repo, absolute).replaceAll('\\', '/')
}
const suffix = p => p.replace(/^.*\/image_pool\//, '').replace(/^image_pool\//, '')
const cta = { ko: '게임시작', en: 'START GAME', ja: 'ゲームスタート', vi: 'BẮT ĐẦU CHƠI' }
const config = read(configPath), catalog = read(catalogPath)
const beforeConfig = structuredClone(config)
function receiptSnapshot() {
  const entries = []
  for (const folder of ['marketing/x_daily_zombie_school_posting/receipts', 'Developer/agent_room/x_posting_receipts', 'Developer/agent_room/facebook_posting_receipts']) {
    const root = path.join(repo, folder)
    if (!fs.existsSync(root)) continue
    for (const name of fs.readdirSync(root)) if (name.endsWith('.json') && fs.statSync(path.join(root, name)).isFile()) entries.push([`${folder}/${name}`, sha(path.join(root, name))])
  }
  return entries.sort(([a], [b]) => a.localeCompare(b))
}
const receiptsBefore = receiptSnapshot()
const sourceHashes = new Map()
function sourceIdentity(source, seen = new Set()) {
  const key = suffix(source)
  if (seen.has(key)) throw Error(`Cyclic source ancestry: ${key}`)
  seen.add(key)
  const row = catalog.images.find(r => r.path === key)
  if (row?.derivedFromSha256) return row.derivedFromSha256.toLowerCase()
  if (row?.source && /(?:^|\/)image_pool\//.test(row.source.replaceAll('\\', '/'))) return sourceIdentity(row.source.replaceAll('\\', '/'), seen)
  return sha(path.join(campaign, 'image_pool', key))
}
const mappings = []
for (const locale of ['ko', 'en', 'ja', 'vi']) {
  const manifest = read(path.join(work, `${locale}_edits.json`))
  if (manifest.complete !== true) throw Error(`Manifest not complete: ${locale}`)
  for (const item of manifest.items ?? manifest.entries ?? []) {
    if (item.visuallyChecked !== true) throw Error(`Unreviewed ${locale} asset`)
    const dialogue = Array.isArray(item.fullDialogue) ? item.fullDialogue : item.dialogue ?? item.dialogue_by_panel ?? item.dialogue_in_balloons?.split(';').map(t => t.trim())
    if (!Array.isArray(dialogue) || dialogue.length !== 4 || dialogue.some(t => !String(t).trim())) throw Error(`Four dialogue rows missing: ${locale}`)
    for (const map of item.mappings ?? [item]) {
      const source = relative(map.source ?? map.source_path), target = relative(map.target ?? map.target_path)
      const platform = /\/facebook\//.test(source) ? 'Facebook' : 'X'
      if (!source.startsWith('marketing/x_daily_zombie_school_posting/image_pool/') || !target.startsWith(`marketing/x_daily_zombie_school_posting/image_pool/${platform === 'X' ? 'x' : 'facebook'}/${locale}/vertical_comic_20261018/`)) throw Error(`Mapping outside expected ${platform}/${locale} pool: ${source} -> ${target}`)
      const sourceSha256 = sha(path.join(repo, source)), targetSha256 = sha(path.join(repo, target))
      const png = fs.readFileSync(path.join(repo, target))
      const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
      const sourceHash = item.sourceSha256 ?? item.source_sha256, targetHash = item.targetSha256 ?? item.target_sha256
      if (sourceHash && sourceHash.toLowerCase() !== sourceSha256) throw Error(`Source changed: ${source}`)
      if (targetHash && targetHash.toLowerCase() !== targetSha256) throw Error(`Target changed: ${target}`)
      sourceHashes.set(source, sourceSha256)
      mappings.push({ locale, platform, source, target, sourceSha256, targetSha256, derivedFromSha256: sourceIdentity(source), dialogue, width, height })
    }
  }
}
if (mappings.length !== 120 || new Set(mappings.map(m => m.source)).size !== 120) throw Error('Exactly120 unique configured source mappings required')
if (new Set(mappings.map(m => m.target.toLowerCase())).size !== 120) throw Error('Edited destination paths collide; exactly120 distinct destinations required before registration')
for (const row of catalog.images) {
  if (row.collection !== 'dialogue_filled_20261018') continue
  const source = `marketing/x_daily_zombie_school_posting/image_pool/${row.path}`
  row.sha256 = sha(path.join(repo, source))
  row.derivedFromSha256 = sourceIdentity(row.source)
}
for (const platform of ['X', 'Facebook']) for (const locale of ['ko', 'en', 'ja', 'vi']) {
  const key = platform === 'X' ? 'localized_social_image_pool' : 'facebook_rotation_image_pool'
  const images = config[key][locale].images
  if (images.length !== 15) throw Error(`Unexpected configured pool length ${platform}/${locale}`)
  config[key][locale].images = images.map(input => {
    const match = mappings.filter(m => m.platform === platform && m.locale === locale && suffix(m.source) === suffix(input))
    if (match.length !== 1) throw Error(`Expected one edit for ${input}`)
    return `image_pool/${suffix(match[0].target)}`
  })
}
if (config.x_link_card.enabled !== true) throw Error('X link cards must remain enabled')
for (const map of mappings) {
  const old = catalog.images.filter(r => r.platform === map.platform && r.locale === map.locale && r.path === suffix(map.source))
  if (old.length !== 1) throw Error(`Expected one source catalog row: ${map.source}`)
  if (catalog.images.some(r => r.platform === map.platform && r.locale === map.locale && r.path === suffix(map.target))) throw Error('Edited row already registered; do not blindly rerun integration')
  catalog.images.push({ ...old[0], collection: 'vertical_comic_20261018', sourceCollection: old[0].collection, path: suffix(map.target), source: map.source,
    sha256: map.targetSha256, sourceSha256: map.sourceSha256, derivedFromSha256: map.derivedFromSha256, gameStartText: cta[map.locale],
    format: 'four_panel_comic_with_localized_dialogue', panelLayout: '1x4', panelCount: 4, width: map.width, height: map.height, dialogueWords: map.dialogue, visuallyChecked: true, emptyBalloons: 0 })
}
const homepage = []
for (const locale of ['ko', 'en', 'ja', 'vi']) for (let number = 1; number <= 10; number++) {
  const episode = String(number).padStart(2, '0')
  const matches = mappings.filter(m => m.locale === locale && m.platform === 'Facebook' && new RegExp(`(?:backlog_comic_20261015/${episode}|backlog_comic_20261015_${episode})\\.png$`).test(m.source))
  if (matches.length !== 1) throw Error(`Homepage episode must map once: ${locale}/${episode}`)
  const hostingPath = `/comics/backlog-20261015/${locale}/${episode}.png`
  const buildSource = `Developer/r3f_prototype/public${hostingPath}`
  homepage.push({ path: hostingPath, source: matches[0].target, sha256: matches[0].targetSha256, buildSource,
    previousBuildSourceSha256: fs.existsSync(path.join(repo, buildSource)) ? sha(path.join(repo, buildSource)) : null })
}
const evidence = { complete: true, atUtc: new Date().toISOString(), cardMode: true, mappings, homepage, scheduleUnchanged: JSON.stringify(config.schedule_times) === JSON.stringify(beforeConfig.schedule_times), cardManifest: 'Graphic_designer/comic_vertical_20261018/generated_cards/vertical-website-cards-manifest.json' }
evidence.receiptCount = receiptsBefore.length
evidence.receiptsSha256Before = crypto.createHash('sha256').update(JSON.stringify(receiptsBefore)).digest('hex')
const reduced = structuredClone(config), oldReduced = structuredClone(beforeConfig)
delete reduced.localized_social_image_pool; delete reduced.facebook_rotation_image_pool
delete oldReduced.localized_social_image_pool; delete oldReduced.facebook_rotation_image_pool
if (JSON.stringify(reduced) !== JSON.stringify(oldReduced)) throw Error('Unrelated config drift')
if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ mode: 'plan-only', mappings: mappings.length, homepage: homepage.length, scheduleUnchanged: evidence.scheduleUnchanged })); process.exit(0) }
if (process.env.ESCAPE_VERTICAL_SERIAL_HELD !== '1') throw Error('Apply must run under the existing serial mutex wrapper')
const backups = path.join(work, 'registration_backup')
fs.mkdirSync(backups, { recursive: true })
for (const [input, name] of [[configPath, 'posting_config.json'], [catalogPath, 'image_catalog.json']]) fs.copyFileSync(input, path.join(backups, name), fs.constants.COPYFILE_EXCL)
for (const row of homepage) {
  const output = path.join(repo, row.buildSource)
  if (row.previousBuildSourceSha256) {
    const backup = path.join(backups, 'homepage', row.path.slice(1))
    fs.mkdirSync(path.dirname(backup), { recursive: true })
    fs.copyFileSync(output, backup, fs.constants.COPYFILE_EXCL)
  }
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.copyFileSync(path.join(repo, row.source), output)
  if (sha(output) !== row.sha256) throw Error('Homepage build source differs from approved edit')
}
// Catalog first: a concurrent read never sees active paths absent from its catalog.
for (const [output, value] of [[catalogPath, catalog], [configPath, config], [path.join(work, 'pool_update.json'), evidence]]) {
  const temp = `${output}.vertical-tmp`
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
  fs.renameSync(temp, output)
}
for (const [source, hash] of sourceHashes) if (sha(path.join(repo, source)) !== hash) throw Error('Original asset changed during registration')
if (JSON.stringify(receiptSnapshot()) !== JSON.stringify(receiptsBefore)) throw Error('Receipt files changed during registration; review before continuing')
console.log(JSON.stringify({ mode: 'applied', mappings: mappings.length, homepage: homepage.length, scheduleUnchanged: evidence.scheduleUnchanged }))
