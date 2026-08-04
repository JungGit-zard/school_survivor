import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const scriptPath = resolve(import.meta.dirname, 'verify-audio-manifest.mjs')
const sourceManifestPath = resolve(import.meta.dirname, '../../agent_room/audio_asset_provenance_manifest_2026-07-30.json')
let fixtureDirectory
let sourceManifest

beforeAll(async () => {
  fixtureDirectory = await mkdtemp(join(tmpdir(), 'audio-manifest-'))
  sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'))
})

afterAll(async () => {
  await rm(fixtureDirectory, { recursive: true, force: true })
})

function runFixture(name, mutate) {
  const manifest = structuredClone(sourceManifest)
  mutate(manifest)
  const fixturePath = join(fixtureDirectory, `${name}.json`)
  writeFileSync(fixturePath, JSON.stringify(manifest))
  return spawnSync(process.execPath, [scriptPath, '--manifest', fixturePath], {
    cwd: resolve(import.meta.dirname, '../../..'),
    encoding: 'utf8',
  })
}

describe('audio manifest verifier', () => {
  it('accepts a complete exact-path fixture with canonical title BGM provenance', () => {
    const result = runFixture('valid', () => {})

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('audio manifest verified')
  })

  it('rejects paths assigned to the wrong logical ID', () => {
    const result = runFixture('swapped-paths', (manifest) => {
      const pencil = manifest.assets.find((asset) => asset.logicalId === 'pencilFire')
      const ruler = manifest.assets.find((asset) => asset.logicalId === 'rulerFire')
      ;[pencil.paths, ruler.paths] = [ruler.paths, pencil.paths]
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('logical ID path mismatch')
  })

  it.each(['unverified', 'unknown', 'pending'])('rejects non-approved license evidence: %s', (licenseEvidence) => {
    const result = runFixture(`license-${licenseEvidence}`, (manifest) => {
      manifest.assets.find((asset) => asset.logicalId === 'pencilFire').licenseEvidence = licenseEvidence
    })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('license pending/unapproved: pencilFire')
  })

  // PCM 계약은 절차 생성 gameplay BGM에만 적용한다. 타이틀 곡은 owner-mandated 정본이라 대상이 아니다.
  it('keeps the owner-mandated title track out of the generated PCM contract', () => {
    const result = runFixture('owner-title-track', () => {})
    expect(result.status).toBe(0)
    const titleAsset = sourceManifest.assets.find((asset) => asset.logicalId === 'titleBgm')
    expect(titleAsset.paths[0].path).toBe('Developer/r3f_prototype/src/assets/audio/title_bgm.m4a')
    expect(titleAsset.canonicalInclusion).toBe('owner-mandated-permanent')
  })

  it('rejects a canonical title BGM without its mandatory inclusion marker', () => {
    const result = runFixture('missing-title-marker', (manifest) => {
      delete manifest.assets.find((asset) => asset.logicalId === 'titleBgm').canonicalInclusion
    })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('missing canonical title BGM inclusion marker')
  })
})
