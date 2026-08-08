import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const script = resolve(import.meta.dirname, 'promote-hosting-preview.mjs')
const fixtures = []
const reauthenticationMessage = 'Firebase 인증이 만료되었습니다. 다시 인증해 주세요.'

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function createFakeFirebase() {
  const directory = await mkdtemp(join(tmpdir(), 'firebase-preview-gate-'))
  fixtures.push(directory)
  const log = join(directory, 'calls.txt')
  writeFileSync(join(directory, 'firebase.cmd'), `@echo off\r\necho %*>> "%CALL_LOG%"\r\nif "%FAKE_AUTH%"=="1" (\r\n  echo Authentication required 1>&2\r\n  exit /b 1\r\n)\r\nif "%1"=="hosting:channel:deploy" (\r\n  echo https://127.0.0.1:1\r\n  exit /b 0\r\n)\r\nexit /b 0\r\n`)
  return { directory, log }
}

function run(fake, extraEnvironment = {}) {
  return spawnSync(process.execPath, [script, 'asset-gate-test'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnvironment,
      CALL_LOG: fake.log,
      PATH: `${fake.directory};${process.env.PATH}`,
    },
  })
}

describe('Firebase Hosting preview promotion', () => {
  it('does not clone to live when preview asset verification fails', async () => {
    const fake = await createFakeFirebase()
    const result = run(fake)

    expect(result.status).not.toBe(0)
    expect(readFileSync(fake.log, 'utf8')).toContain('hosting:channel:deploy')
    expect(readFileSync(fake.log, 'utf8')).not.toContain('hosting:clone')
  })

  it('prints the exact reauthentication instruction without mojibake', async () => {
    const fake = await createFakeFirebase()
    const result = run(fake, { FAKE_AUTH: '1' })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(reauthenticationMessage)
  })
})
