import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const FORBIDDEN_PROJECT_HOSTS = new Set(['127.0.0.1', '172.22.41.219'])

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
        if (request.method !== 'POST') {
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
    },
  }
}

export default defineConfig({
  plugins: [forbiddenProjectHostPlugin(), react(), runtimePlaytestLogPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    modulePreload: {
      // Title/Game 3D는 lazy chunk 뒤에서만 필요하다. HTML preload에서 제외해 첫 화면 네트워크를 줄인다.
      resolveDependencies(_, deps) {
        return deps.filter((dep) => !dep.includes('vendor-three-'))
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase'
          if (id.includes('@react-three') || id.includes('three') || id.includes('@dimforge') || id.includes('@react-spring')) return 'vendor-three'
          if (id.includes('react') || id.includes('scheduler') || id.includes('use-sync-external-store')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'node',
    globals: false,
    exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'functions/**'],
  },
})
