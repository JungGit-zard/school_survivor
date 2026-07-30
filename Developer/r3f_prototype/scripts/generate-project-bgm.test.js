import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BGM_CHANNELS, BGM_DURATION_SECONDS, BGM_SAMPLE_RATE, generateProjectBgmAssets, writeProjectBgmManifest } from './generate-project-bgm.mjs'

describe('project BGM generator', () => {
  it('recreates only the deterministic gameplay mono 16-bit WAV loop with reported PCM measurements', () => {
    const first = generateProjectBgmAssets()
    const second = generateProjectBgmAssets()
    expect(second.map((asset) => asset.sha256)).toEqual(first.map((asset) => asset.sha256))
    expect(first).toHaveLength(1)
    expect(first[0].logicalId).toBe('gameplayBgm')
    for (const asset of first) {
      const wav = readFileSync(asset.outputPath)
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
      expect(wav.toString('ascii', 8, 12)).toBe('WAVE')
      expect(wav.readUInt16LE(22)).toBe(BGM_CHANNELS)
      expect(wav.readUInt16LE(34)).toBe(16)
      expect(wav.readUInt32LE(24)).toBe(BGM_SAMPLE_RATE)
      expect(asset.durationSeconds).toBe(BGM_DURATION_SECONDS)
      expect(asset.bytes).toBeLessThan(700000)
      expect(asset.pcmPeak).toBeLessThan(0.5)
      expect(asset.pcmRms).toBeGreaterThan(0.03)
      expect(createHash('sha256').update(wav).digest('hex')).toBe(asset.sha256)
    }
  })

  it('updates only the generated gameplay BGM entry and preserves the canonical title entry', async () => {
    const fixtureDirectory = await mkdtemp(join(tmpdir(), 'project-bgm-manifest-'))
    const fixturePath = join(fixtureDirectory, 'manifest.json')
    const sourceManifestPath = resolve(import.meta.dirname, '../../agent_room/audio_asset_provenance_manifest_2026-07-30.json')
    try {
      writeFileSync(fixturePath, readFileSync(sourceManifestPath))
      const generated = writeProjectBgmManifest({ manifestPath: fixturePath })
      const manifest = JSON.parse(readFileSync(fixturePath, 'utf8'))
      expect(generated.map((asset) => asset.logicalId)).toEqual(['gameplayBgm'])
      expect(manifest.assets.find((asset) => asset.logicalId === 'titleBgm')).toMatchObject({
        canonicalInclusion: 'owner-mandated-permanent',
      })
    } finally {
      await rm(fixtureDirectory, { recursive: true, force: true })
    }
  })
})
