import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./GameCanvas.jsx', import.meta.url), 'utf8')

describe('GameCanvas reset ownership', () => {
  it('keeps the WebGL Canvas unkeyed while Physics remains keyed by gameKey', () => {
    const canvasOpenStart = source.indexOf('<Canvas')
    const canvasOpenEnd = source.indexOf('>', canvasOpenStart)
    expect(canvasOpenStart).toBeGreaterThan(-1)
    expect(source.slice(canvasOpenStart, canvasOpenEnd)).not.toContain('key={gameKey}')
    expect(source).toContain('<Physics key={gameKey}')
  })

  it('keeps non-Rapier visual pools as Canvas siblings and clears them in place by resetKey', () => {
    const physicsIndex = source.indexOf('<Physics key={gameKey}')
    for (const layer of ['DamageNumbersLayer', 'ZombieInstanceLayer', 'PooledEnemyProjectileLayer']) {
      const layerIndex = source.indexOf(`<${layer} resetKey={gameKey}`)
      expect(layerIndex).toBeGreaterThan(-1)
      expect(layerIndex).toBeGreaterThan(physicsIndex)
    }
    expect(source).toContain('<StageEntryRuntimeDiagnostics gameKey={gameKey} />')
  })

  it('uses a fixed 60 Hz Rapier step while preserving the phase pause contract', () => {
    expect(source).toContain('timeStep={1 / 60}')
    expect(source).not.toContain('timeStep="vary"')
    expect(source).toContain("paused={phase !== 'playing'}")
  })

  it('starts Canvas-local shader warmup in every build and gates only diagnostics to DEV', () => {
    const diagnostics = readFileSync(new URL('./StageEntryRuntimeDiagnostics.jsx', import.meta.url), 'utf8')
    expect(diagnostics).toContain('useLayoutEffect')
    expect(diagnostics).toContain('gl.compileAsync(scene, camera)')
    expect(diagnostics).toContain('gl.compile(scene, camera)')
    expect(diagnostics).toContain('const devMetricsEnabled = import.meta.env.DEV')
    expect(diagnostics).toContain('lastWarmupGameKeyRef.current === gameKey')
  })
})
