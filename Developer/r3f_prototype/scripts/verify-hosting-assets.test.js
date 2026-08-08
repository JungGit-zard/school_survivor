import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const scriptPath = resolve(import.meta.dirname, 'verify-hosting-assets.mjs')
const servers = []
const fixtures = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolveClose) => server.close(resolveClose))))
  await Promise.all(fixtures.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function serve(routes) {
  const server = http.createServer((request, response) => {
    const route = routes[request.url]
    if (!route) {
      response.writeHead(404).end('not found')
      return
    }
    response.writeHead(route.status ?? 200, { 'content-type': route.contentType })
    response.end(route.body)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  servers.push(server)
  return `http://127.0.0.1:${server.address().port}`
}

function run(...arguments_) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [scriptPath, ...arguments_], { encoding: 'utf8' })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (status) => resolveRun({ status, stdout, stderr }))
  })
}

describe('Firebase Hosting lazy-chunk verifier', () => {
  it('rejects a JavaScript chunk path that returns index HTML with HTTP 200', async () => {
    const baseUrl = await serve({
      '/': { contentType: 'text/html; charset=utf-8', body: '<script type="module" src="/assets/main.js"></script>' },
      '/assets/main.js': { contentType: 'text/javascript; charset=utf-8', body: 'import("/assets/GraphicsStudio-BThiuguv.js")' },
      '/assets/GraphicsStudio-BThiuguv.js': { contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body>app shell</body></html>' },
    })

    const result = await run('--url', baseUrl)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('GraphicsStudio-BThiuguv.js')
    expect(result.stderr).toContain('JavaScript MIME type')
  })

  it('accepts a recursively reachable lazy chunk served as JavaScript', async () => {
    const baseUrl = await serve({
      '/': { contentType: 'text/html; charset=utf-8', body: '<script type="module" src="/assets/main.js"></script>' },
      '/assets/main.js': { contentType: 'text/javascript; charset=utf-8', body: 'import("/assets/GraphicsStudio-BThiuguv.js")' },
      '/assets/GraphicsStudio-BThiuguv.js': { contentType: 'text/javascript; charset=utf-8', body: 'export const studio = true' },
    })

    const result = await run('--url', baseUrl)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Hosting JavaScript asset verification passed')
  })

  it('rejects a minified static import whose remote chunk is missing', async () => {
    const baseUrl = await serve({
      '/': { contentType: 'text/html; charset=utf-8', body: '<script type="module" src="/assets/main.js"></script>' },
      '/assets/main.js': { contentType: 'text/javascript; charset=utf-8', body: 'import{a}from"./missing-vendor.js";console.log(a)' },
    })

    const result = await run('--url', baseUrl)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('missing-vendor.js')
  })

  it('rejects a local dist graph whose lazy chunk is missing', async () => {
    const dist = await mkdtemp(join(tmpdir(), 'hosting-dist-'))
    fixtures.push(dist)
    mkdirSync(join(dist, 'assets'))
    writeFileSync(join(dist, 'index.html'), '<script type="module" src="/assets/main.js"></script>')
    writeFileSync(join(dist, 'assets', 'main.js'), 'import("./GraphicsStudio-BThiuguv.js")')

    const result = await run('--dir', dist)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('GraphicsStudio-BThiuguv.js')
  })

  it('rejects a local minified static import whose chunk is missing', async () => {
    const dist = await mkdtemp(join(tmpdir(), 'hosting-dist-'))
    fixtures.push(dist)
    mkdirSync(join(dist, 'assets'))
    writeFileSync(join(dist, 'index.html'), '<script type="module" src="/assets/main.js"></script>')
    writeFileSync(join(dist, 'assets', 'main.js'), 'import{a}from"./missing-vendor.js";console.log(a)')

    const result = await run('--dir', dist)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('missing-vendor.js')
  })

  it('accepts relative static and dynamic chunks from a Windows temp dist path', async () => {
    const dist = await mkdtemp(join(tmpdir(), 'hosting-dist-'))
    fixtures.push(dist)
    mkdirSync(join(dist, 'assets'))
    writeFileSync(join(dist, 'index.html'), '<script type="module" src="/assets/main.js"></script>')
    writeFileSync(join(dist, 'assets', 'main.js'), 'import{a}from"./vendor.js";import(`./lazy.js`);console.log(a)')
    writeFileSync(join(dist, 'assets', 'vendor.js'), 'export const a = 1')
    writeFileSync(join(dist, 'assets', 'lazy.js'), 'export const lazy = true')

    const result = await run('--dir', dist)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('3 assets checked')
  })
})
