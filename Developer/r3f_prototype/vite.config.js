import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { appendFile, cp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { firebaseDatabaseMemoryStoragePlugin } from './scripts/firebase-database-memory-storage.mjs'

const FORBIDDEN_PROJECT_HOSTS = new Set(['127.0.0.1', '172.22.41.219'])


const PLAYTEST_LOG_SEND_TARGET = process.env.PLAYTEST_LOG_SEND_TARGET || 'telegram'
const PLAYTEST_LOG_SEND_CHUNK_SIZE = 3200

function chunkText(text, size = PLAYTEST_LOG_SEND_CHUNK_SIZE) {
  const chunks = []
  for (let offset = 0; offset < text.length; offset += size) {
    chunks.push(text.slice(offset, offset + size))
  }
  return chunks.length > 0 ? chunks : ['']
}

function runHermesSend(message, { target = PLAYTEST_LOG_SEND_TARGET, subject } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['send', '--to', target, '--file', '-']
    if (subject) args.push('--subject', subject)
    const child = spawn('hermes', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(stderr || stdout || `hermes send exited ${code}`))
    })
    child.stdin.end(message, 'utf8')
  })
}

function getRequestHostname(request) {
  try {
    return new URL(`http://${request.headers.host || ''}`).hostname
  } catch {
    return ''
  }
}

function rejectForbiddenProjectHost(request, response, next) {
  if (!FORBIDDEN_PROJECT_HOSTS.has(getRequestHostname(request))) {
    next()
    return
  }
  response.statusCode = 403
  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  response.end('Forbidden project host. Use http://localhost:5173/ only.')
}

function forbiddenProjectHostPlugin() {
  return {
    name: 'forbidden-project-host',
    configureServer(server) {
      server.middlewares.use(rejectForbiddenProjectHost)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rejectForbiddenProjectHost)
    },
  }
}

function runtimePlaytestLogPlugin() {
  const logPath = path.resolve(
    process.env.PLAYTEST_LOG_PATH || 'playtest-logs/current-session.ndjson',
  )

  return {
    name: 'runtime-playtest-log',
    configureServer(server) {
      server.config.logger.info(`[playtest-log] ${logPath}`)
      server.middlewares.use('/__playtest-log', (request, response, next) => {
        if (request.method !== 'POST' || (request.url !== '/' && !request.url?.startsWith('/?'))) {
          next()
          return
        }

        let body = ''
        request.setEncoding('utf8')
        request.on('data', (chunk) => {
          body += chunk
          if (body.length > 1_000_000) request.destroy()
        })
        request.on('end', async () => {
          try {
            const payload = JSON.parse(body)
            await mkdir(path.dirname(logPath), { recursive: true })
            await appendFile(logPath, `${JSON.stringify({
              ...payload,
              serverReceivedAt: new Date().toISOString(),
            })}\n`, 'utf8')
            response.statusCode = 204
            response.end()
          } catch {
            response.statusCode = 400
            response.end()
          }
        })
      })

      server.middlewares.use('/__playtest-log/send-to-hana', (request, response, next) => {
        if (request.method !== 'POST') {
          next()
          return
        }

        let body = ''
        request.setEncoding('utf8')
        request.on('data', (chunk) => {
          body += chunk
          if (body.length > 2_000_000) request.destroy()
        })
        request.on('end', async () => {
          try {
            const payload = JSON.parse(body)
            const receivedAt = new Date().toISOString()
            const summary = payload.summary ?? {}
            const runId = String(summary.runId || receivedAt.replace(/[:.]/g, '-'))
              .replace(/[^a-zA-Z0-9._-]/g, '_')
              .slice(0, 80)
            const message = String(payload.message || JSON.stringify(summary, null, 2))
            const submitDir = path.resolve(process.env.PLAYTEST_LOG_SUBMIT_DIR || 'playtest-logs/submitted')
            const submitPath = path.join(submitDir, `${runId}.json`)
            await mkdir(submitDir, { recursive: true })
            await writeFile(submitPath, JSON.stringify({
              ...payload,
              serverReceivedAt: receivedAt,
              target: PLAYTEST_LOG_SEND_TARGET,
            }, null, 2), 'utf8')

            const chunks = chunkText(message)
            for (let index = 0; index < chunks.length; index += 1) {
              const subject = chunks.length > 1
                ? `[EZSchool Log ${index + 1}/${chunks.length}]`
                : '[EZSchool Log]'
              await runHermesSend(chunks[index], { subject })
            }

            response.setHeader('content-type', 'application/json; charset=utf-8')
            response.end(JSON.stringify({ ok: true, chunks: chunks.length, path: submitPath }))
          } catch (error) {
            response.statusCode = 500
            response.setHeader('content-type', 'application/json; charset=utf-8')
            response.end(JSON.stringify({ ok: false, error: error?.message || String(error) }))
          }
        })
      })
    },
  }
}

// 게임 dist(escapezombie.com)에는 만화·마케팅·오디션/QA 파일을 한 장도 넣지 않는다.
// 만화는 별도 미디어 사이트(media-site/site)에서만 제공한다. public/ 원본은 보관용으로 그대로 둔다(dev 서버는 계속 서빙).
export const GAME_DIST_PUBLIC_EXCLUDES = Object.freeze([
  'comics',
  'share',
  'blog',
  'web-comics',
  'sfx/audition-20261016',
  'sfx-audition-20261016.html',
  '__inucon_preview.html',
])

export function isExcludedFromGameDist(relativePath) {
  const normalized = relativePath.split(path.sep).join('/')
  return GAME_DIST_PUBLIC_EXCLUDES.some((entry) => normalized === entry || normalized.startsWith(`${entry}/`))
}

function copyPublicWithoutMediaPlugin() {
  let publicDir = ''
  let outDir = ''
  return {
    name: 'copy-public-without-media',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      if (!publicDir) return
      await cp(publicDir, outDir, {
        recursive: true,
        filter: (source) => !isExcludedFromGameDist(path.relative(publicDir, source)),
      })
    },
  }
}

function vendorChunkName(id) {
  if (!id.includes('node_modules')) return null
  // GA4 (lib/analytics.js) is lazy: keep it out of the preloaded vendor-firebase chunk.
  if (/[\\/](@firebase[\\/](analytics|installations)|firebase[\\/]analytics)[\\/]/.test(id)) return 'vendor-firebase-analytics'
  if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase'
  if (/[\\/]@dimforge[\\/]|[\\/]@react-three[\\/]rapier[\\/]/.test(id)) return null
  if (id.includes('@react-three') || id.includes('three') || id.includes('@react-spring')) return 'vendor-three'
  if (id.includes('react') || id.includes('scheduler') || id.includes('use-sync-external-store')) return 'vendor-react'
  return 'vendor'
}

export default defineConfig({
  plugins: [firebaseDatabaseMemoryStoragePlugin(), forbiddenProjectHostPlugin(), react(), runtimePlaytestLogPlugin(), copyPublicWithoutMediaPlugin()],
  optimizeDeps: {
    rolldownOptions: {
      plugins: [firebaseDatabaseMemoryStoragePlugin()],
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    // public/ 복사는 copyPublicWithoutMediaPlugin이 제외 목록을 적용해 대신 수행한다.
    copyPublicDir: false,
    modulePreload: {
      // Title/Game 3D는 lazy chunk 뒤에서만 필요하다. HTML preload에서 제외해 첫 화면 네트워크를 줄인다.
      resolveDependencies(_, deps) {
        return deps.filter((dep) => !dep.includes('vendor-three-'))
      },
    },
    rollupOptions: {
      output: {
        // Rapier WASM(gzip ~736kB)은 게임플레이 전용: 별도 청크로 떼어 타이틀이 받지 않게 한다.
        // rolldown은 manualChunks를 의존성까지 끌어오는 단일 그룹으로 처리해 three까지 rapier 청크로 끌려가므로,
        // 기존 vendor 분류 그룹을 더 높은 priority로 먼저 잡고 rapier 그룹은 남은 rapier 모듈만 가져간다.
        codeSplitting: {
          groups: [
            { name: vendorChunkName, priority: 1 },
            { name: 'vendor-rapier', test: /[\\/]@dimforge[\\/]|[\\/]@react-three[\\/]rapier[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./test/firebaseProgress.setup.js'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'functions/**'],
  },
})
