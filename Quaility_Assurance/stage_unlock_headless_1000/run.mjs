import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createServer as createPortProbe } from 'node:net'

const directory = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(process.argv[2] || path.join(directory, '../..'))
const app = path.join(repo, 'Developer/r3f_prototype')
const require = createRequire(path.join(app, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { chromium } = require('@playwright/test')
const cache = await mkdtemp(path.join(os.tmpdir(), 'stage-unlock-headless-'))
const startedAt = new Date().toISOString()
let server, browser, page, result
const blockedRequests = []
const browserErrors = []
const sourceBeforeHashes = {}
for (const name of ['src/lib/firebaseProgress.js', 'src/store/useAuthStore.js', 'src/store/useGameStore.js']) {
  sourceBeforeHashes[name] = createHash('sha256').update(await readFile(path.join(app, name))).digest('hex')
}
try {
  const probe = createPortProbe()
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, 'localhost', resolve) })
  const qaPort = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  // Use Vite's canonical root URLs so direct and transitive imports share one runtime.
  const entry = (await readFile(path.join(directory, 'browser.js'), 'utf8')).replaceAll('__APP__', '')
  server = await createServer({ configFile: false, root: app, cacheDir: cache, envDir: false,
    define: { 'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify('https://qa-memory.invalid') },
    plugins: [{ name: 'isolated-progress-qa', enforce: 'pre',
      resolveId(id) {
        if (id.endsWith('/firebaseAuth.js')) return '\0qa-auth'
        if (id.endsWith('/firebaseRanking.js')) return '\0qa-ranking'
      },
      load(id) {
        if (id === '\0qa-auth') return `export const isFirebaseAuthConfigured=()=>true; export const getFirebaseConfig=()=>({}); export const createFirebaseAuthClient=async()=>({signOut:()=>window.__qaAuth.signOut()});`
        if (id === '\0qa-ranking') return `export const submitRun=async()=>({status:'skipped'}); export const describeSubmission=()=>({status:'skipped'});`
      },
      configureServer(vite) { vite.middlewares.use((req, res, next) => {
        if (req.url === '/qa-browser.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(entry) }
        else if (req.url === '/qa-entry') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Isolated Stage Unlock QA</title><pre id="status">Loading browser harness</pre><script type="module" src="/qa-browser.js"></script>') }
        else next()
      }) },
    }], server: { host: 'localhost', port: qaPort, strictPort: true, fs: { allow: [app, directory] } },
  })
  await server.listen()
  const port = server.httpServer.address().port
  console.log(JSON.stringify({ event: 'qa-server-started', pid: process.pid, port, host: 'localhost' }))
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  page = await browser.newPage()
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {
      Storage.prototype[method] = () => { throw new Error('Browser durable storage is forbidden in isolated progress QA') }
    }
    indexedDB.open = () => { throw new Error('IndexedDB is forbidden in isolated progress QA') }
  })
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === 'localhost' && Number(url.port) === port) return route.continue()
    blockedRequests.push(url.origin); return route.abort()
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.goto(`http://localhost:${port}/qa-entry`)
  await page.waitForFunction(() => typeof window.runProgressQA === 'function', { timeout: 60000 })
  result = await page.evaluate(() => window.runProgressQA({ count: 1000, seed: 20261016 }))
  result.browser = await browser.version()
  result.headless = true
  result.sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim()
  result.sourceHashes = {}
  for (const name of ['src/lib/firebaseProgress.js', 'src/store/useAuthStore.js', 'src/store/useGameStore.js']) {
    result.sourceHashes[name] = createHash('sha256').update(await readFile(path.join(app, name))).digest('hex')
  }
  result.sourceBeforeHashes = sourceBeforeHashes
  result.sourceFilesUnchanged = JSON.stringify(sourceBeforeHashes) === JSON.stringify(result.sourceHashes)
  if (result.failed || result.passed !== 1000) await page.screenshot({ path: path.join(directory, 'first-failure.png'), fullPage: true })
  else await rm(path.join(directory, 'first-failure.png'), { force: true })
} catch (error) {
  result ||= { passed: 0, failed: 1, firstFailure: { message: error.message, stack: error.stack } }
  if (page) await page.screenshot({ path: path.join(directory, 'first-failure.png'), fullPage: true }).catch(() => {})
} finally {
  await browser?.close()
  await server?.close()
  if (path.resolve(cache).startsWith(path.resolve(os.tmpdir()) + path.sep)) await rm(cache, { recursive: true, force: true })
}
result.startedAt = startedAt
result.finishedAt = new Date().toISOString()
result.blockedExternalRequests = blockedRequests
result.browserErrors = browserErrors
result.qaServerClosed = !server?.httpServer?.listening
result.runtimeScope = 'Actual game/progress/auth source in headless Chrome; injected memory-only Firebase/auth/ranking adapters; no real OAuth or production Firebase writes.'
await writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify({ passed: result.passed, failed: result.failed, restorationChecks: result.restorationChecks, scenarios: result.scenarios, firstFailure: result.firstFailure, qaServerClosed: result.qaServerClosed }))
if (result.passed !== 1000 || result.failed || !result.qaServerClosed || browserErrors.length || !result.sourceFilesUnchanged) process.exitCode = 1
