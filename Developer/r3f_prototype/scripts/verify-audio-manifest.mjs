import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(scriptDirectory, '../../..')
const registryPath = resolve(workspaceRoot, 'Developer/r3f_prototype/src/lib/sfxRegistry.js')
const manifestArgumentIndex = process.argv.indexOf('--manifest')
const manifestPath = manifestArgumentIndex >= 0 && process.argv[manifestArgumentIndex + 1]
  ? resolve(process.cwd(), process.argv[manifestArgumentIndex + 1])
  : resolve(workspaceRoot, 'Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json')
const bgmPathsByLogicalId = new Map([
  ['titleBgm', ['Developer/r3f_prototype/src/assets/audio/title_bgm.m4a']],
])
const canonicalTitleBgm = {
  path: 'Developer/r3f_prototype/src/assets/audio/title_bgm.m4a',
  bytes: 998122,
  sha256: '991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe',
  canonicalInclusion: 'owner-mandated-permanent',
}
const failures = []
// 성공 로그의 수치는 반드시 실제 검증 대상에서 파생한다. 예전에는 '76 SFX IDs, 152
// fallback files'가 리터럴로 박혀 있어서, SFX가 늘어도 계속 76이라고 보고했다.
let verifiedSummary = null
const nonApprovedLicenseEvidence = new Set([
  'unverified',
  'unknown',
  'pending',
  'tbd',
  'todo',
  'missing',
])

function fail(message) {
  failures.push(message)
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

if (!existsSync(manifestPath)) {
  fail(`manifest missing: ${manifestPath}`)
} else {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    fail(`manifest JSON parse failed: ${error.message}`)
  }

  if (manifest) {
    const registry = readFileSync(registryPath, 'utf8')
    const soundEntries = [...registry.matchAll(/^\s*(\w+):\s*'([^']+\.ogg)'/gm)]
    const expectedPathsByLogicalId = new Map(bgmPathsByLogicalId)
    for (const [, logicalId, oggPath] of soundEntries) {
      expectedPathsByLogicalId.set(logicalId, [
        `Developer/r3f_prototype/public${oggPath}`,
        `Developer/r3f_prototype/public${oggPath.replace(/\.ogg$/, '.mp3')}`,
      ])
    }
    const expectedLogicalIds = new Set(expectedPathsByLogicalId.keys())
    const expectedPaths = new Set([...expectedPathsByLogicalId.values()].flat())
    const sfxLogicalIdCount = expectedLogicalIds.size - bgmPathsByLogicalId.size
    const sfxFallbackFileCount = expectedPaths.size
      - [...bgmPathsByLogicalId.values()].flat().length
    verifiedSummary = `${sfxLogicalIdCount} SFX IDs, ${sfxFallbackFileCount} fallback files, canonical title BGM`

    if (!Array.isArray(manifest.assets)) {
      fail('manifest assets must be an array')
    } else {
      const manifestPaths = new Set()
      const manifestLogicalIds = new Set()
      for (const asset of manifest.assets) {
        if (!asset?.logicalId || !asset.category || !asset.provenanceType || !asset.licenseEvidence || !asset.source || !asset.notes) {
          fail(`incomplete asset metadata: ${asset?.logicalId ?? '<unknown>'}`)
          continue
        }
        const normalizedLicenseEvidence = asset.licenseEvidence.trim().toLowerCase()
        if (nonApprovedLicenseEvidence.has(normalizedLicenseEvidence)) {
          fail(`license pending/unapproved: ${asset.logicalId} (${asset.licenseEvidence})`)
        }
        if (manifestLogicalIds.has(asset.logicalId)) fail(`duplicate logical ID: ${asset.logicalId}`)
        manifestLogicalIds.add(asset.logicalId)
        if (!Array.isArray(asset.paths) || asset.paths.length === 0) {
          fail(`missing paths: ${asset.logicalId}`)
          continue
        }
        const actualPaths = asset.paths.map((entry) => entry?.path)
        const expectedAssetPaths = expectedPathsByLogicalId.get(asset.logicalId)
        if (expectedAssetPaths && JSON.stringify(actualPaths) !== JSON.stringify(expectedAssetPaths)) {
          fail(`logical ID path mismatch: ${asset.logicalId}; expected ${JSON.stringify(expectedAssetPaths)}, received ${JSON.stringify(actualPaths)}`)
        }
        if (asset.logicalId === 'titleBgm') {
          const [entry] = asset.paths
          if (asset.canonicalInclusion !== canonicalTitleBgm.canonicalInclusion) {
            fail('missing canonical title BGM inclusion marker')
          }
          if (typeof asset.inclusionPolicy !== 'string' || !asset.inclusionPolicy.includes('owner-mandated')) {
            fail('missing canonical title BGM inclusion policy')
          }
          if (entry?.path !== canonicalTitleBgm.path
            || entry?.bytes !== canonicalTitleBgm.bytes
            || entry?.sha256 !== canonicalTitleBgm.sha256) {
            fail('canonical title BGM metadata mismatch')
          }
        }
        for (const entry of asset.paths) {
          if (!entry?.path || !Number.isInteger(entry.bytes) || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) {
            fail(`invalid file metadata: ${asset.logicalId}`)
            continue
          }
          if (manifestPaths.has(entry.path)) fail(`duplicate manifest path: ${entry.path}`)
          manifestPaths.add(entry.path)
          const filePath = resolve(workspaceRoot, entry.path)
          if (!existsSync(filePath)) {
            fail(`asset missing: ${entry.path}`)
            continue
          }
          if (statSync(filePath).size !== entry.bytes) fail(`byte mismatch: ${entry.path}`)
          if (sha256(filePath) !== entry.sha256) fail(`SHA-256 mismatch: ${entry.path}`)
        }
      }

      for (const path of expectedPaths) if (!manifestPaths.has(path)) fail(`missing manifest path: ${path}`)
      for (const path of manifestPaths) if (!expectedPaths.has(path)) fail(`extra manifest path: ${path}`)
      for (const logicalId of expectedLogicalIds) if (!manifestLogicalIds.has(logicalId)) fail(`missing logical ID: ${logicalId}`)
      for (const logicalId of manifestLogicalIds) if (!expectedLogicalIds.has(logicalId)) fail(`extra logical ID: ${logicalId}`)
    }
  }
}

if (failures.length) {
  for (const message of failures) console.error(`audio manifest: ${message}`)
  process.exitCode = 1
} else {
  console.log(`audio manifest verified: ${verifiedSummary ?? 'no manifest inspected'}`)
}
