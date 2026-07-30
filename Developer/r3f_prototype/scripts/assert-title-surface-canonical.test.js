import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const prototypeRoot = resolve(import.meta.dirname, '..')
const scriptPath = resolve(import.meta.dirname, 'assert-title-surface-canonical.mjs')
const manifestPath = resolve(import.meta.dirname, 'title-surface-canonical.json')
const fixtures = []

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'title-surface-canonical-'))
  fixtures.push(root)
  const sourceManifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  for (const { path } of sourceManifest.files) {
    const target = join(root, path)
    mkdirSync(resolve(target, '..'), { recursive: true })
    cpSync(resolve(prototypeRoot, path), target)
  }
  const manifest = join(root, 'title-surface-canonical.json')
  cpSync(manifestPath, manifest)
  return { root, manifest }
}

function run(root, manifest) {
  return spawnSync(process.execPath, [scriptPath, '--root', root, '--manifest', manifest], { encoding: 'utf8' })
}

describe('title surface canonical gate', () => {
  it('accepts the current locked title surface', async () => {
    const { root, manifest } = await fixture()
    expect(run(root, manifest).status).toBe(0)
  })

  it.each([
    ['missing locked file', ({ root }) => rmSync(join(root, 'src/components/TitleScene3D.jsx')), /missing locked title surface file/],
    ['wrong hash', ({ manifest }) => {
      const value = JSON.parse(readFileSync(manifest, 'utf8'))
      value.files[0].sha256 = '0'.repeat(64)
      writeFileSync(manifest, JSON.stringify(value))
    }, /SHA-256 mismatch/],
    ['path-list mutation', ({ manifest }) => {
      const value = JSON.parse(readFileSync(manifest, 'utf8'))
      value.files.pop()
      writeFileSync(manifest, JSON.stringify(value))
    }, /path list differs/],
  ])('rejects %s', async (_name, mutate, expected) => {
    const current = await fixture()
    mutate(current)
    expect(run(current.root, current.manifest).stderr).toMatch(expected)
  })
})
