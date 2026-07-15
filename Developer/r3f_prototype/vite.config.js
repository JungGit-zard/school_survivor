import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
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
