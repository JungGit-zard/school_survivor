import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const scriptPath = resolve(import.meta.dirname, 'assert-title-bgm-canonical.mjs')
const fixtures = []

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'title-bgm-canonical-'))
  fixtures.push(root)
  const copy = (relativePath) => {
    const target = join(root, relativePath)
    mkdirSync(resolve(target, '..'), { recursive: true })
    cpSync(resolve(repositoryRoot, relativePath), target)
  }
  for (const relativePath of [
    'Developer/r3f_prototype/src/assets/audio/title_bgm.m4a',
    'Developer/r3f_prototype/src/components/TitleScreen.jsx',
    'Developer/r3f_prototype/src/lib/audioDiagnostics.js',
    'Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json',
  ]) copy(relativePath)
  return root
}

function run(root, ...arguments_) {
  return spawnSync(process.execPath, [scriptPath, '--root', root, ...arguments_], { encoding: 'utf8' })
}

describe('canonical title BGM gate', () => {
  it('accepts the canonical source fixture', async () => {
    const root = await createFixture()
    expect(run(root).status).toBe(0)
  })

  it.each([
    ['wrong hash', (root) => {
      const path = resolve(root, 'Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json')
      const manifest = JSON.parse(readFileSync(path, 'utf8'))
      manifest.assets.find((asset) => asset.logicalId === 'titleBgm').paths[0].sha256 = '0'.repeat(64)
      writeFileSync(path, JSON.stringify(manifest))
    }, /manifest metadata mismatch/],
    ['missing source', (root) => rmSync(resolve(root, 'Developer/r3f_prototype/src/assets/audio/title_bgm.m4a')), /missing:/],
    ['changed import', (root) => writeFileSync(resolve(root, 'Developer/r3f_prototype/src/lib/audioDiagnostics.js'), "import titleBgmUrl from '../assets/audio/title_bgm.wav'\n"), /canonical m4a import missing/],
  ])('rejects %s', async (_name, mutate, expected) => {
    const root = await createFixture()
    mutate(root)
    expect(run(root).stderr).toMatch(expected)
  })

  it('rejects missing dist m4a and a WAV substitute', async () => {
    const root = await createFixture()
    expect(run(root, '--artifacts=dist').stderr).toMatch(/exactly one hashed title m4a/)
    const dist = resolve(root, 'Developer/r3f_prototype/dist/assets')
    mkdirSync(dist, { recursive: true })
    cpSync(resolve(root, 'Developer/r3f_prototype/src/assets/audio/title_bgm.m4a'), join(dist, 'title_bgm-canonical.m4a'))
    writeFileSync(join(dist, 'title_bgm-replacement.wav'), 'forbidden')
    expect(run(root, '--artifacts=dist').stderr).toMatch(/title WAV forbidden/)
  })
})
