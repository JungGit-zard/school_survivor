import { afterEach, describe, expect, it } from 'vitest'
import { createServer } from 'vite'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const originalEnv = {
  PATH: process.env.PATH,
  PLAYTEST_LOG_PATH: process.env.PLAYTEST_LOG_PATH,
  PLAYTEST_LOG_SUBMIT_DIR: process.env.PLAYTEST_LOG_SUBMIT_DIR,
  PLAYTEST_HERMES_MARKER: process.env.PLAYTEST_HERMES_MARKER,
}

const cleanups = []

afterEach(async () => {
  process.env.PATH = originalEnv.PATH
  for (const name of ['PLAYTEST_LOG_PATH', 'PLAYTEST_LOG_SUBMIT_DIR', 'PLAYTEST_HERMES_MARKER']) {
    if (originalEnv[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnv[name]
  }
  await Promise.all(cleanups.splice(0).map((entry) => entry.close()))
})

describe('runtime playtest log relay routing', () => {
  it('runs the send-to-hana middleware before the broad base log middleware', async () => {
    const temp = await mkdtemp(path.join(tmpdir(), 'escape-zombie-school-vite-relay-'))
    const markerPath = path.join(temp, 'hermes-ran.txt')
    const submitDir = path.join(temp, 'submitted')
    const fakeHermes = path.join(temp, 'hermes.cmd')
    await writeFile(fakeHermes, '@echo off\r\n> "%PLAYTEST_HERMES_MARKER%" echo sent\r\nexit /b 0\r\n', 'utf8')

    process.env.PATH = `${temp}${path.delimiter}${originalEnv.PATH}`
    process.env.PLAYTEST_LOG_PATH = path.join(temp, 'events.ndjson')
    process.env.PLAYTEST_LOG_SUBMIT_DIR = submitDir
    process.env.PLAYTEST_HERMES_MARKER = markerPath

    const server = await createServer({
      root,
      configFile: path.join(root, 'vite.config.js'),
      logLevel: 'silent',
      server: { host: 'localhost', port: 0, strictPort: false, hmr: false },
    })
    cleanups.push({ close: async () => { await server.close(); await rm(temp, { recursive: true, force: true }) } })
    await server.listen()
    const address = server.httpServer.address()
    const port = typeof address === 'object' && address ? address.port : 0
    const response = await fetch(`http://localhost:${port}/__playtest-log/send-to-hana`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: { runId: 'relay-order', stageId: 'stage1' },
        message: 'relay route order test',
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, chunks: 1 })
    expect(await readFile(markerPath, 'utf8')).toContain('sent')
    expect(await readFile(path.join(submitDir, 'relay-order.json'), 'utf8')).toContain('relay route order test')
  })
})
