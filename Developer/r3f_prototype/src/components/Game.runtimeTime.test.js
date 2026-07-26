import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('runtime elapsed clock wiring', () => {
  it('keeps simulation time exact and HUD publication outside the frame callback', () => {
    const gameSource = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')
    const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const frameStart = gameSource.indexOf('useFrame((_, delta) =>')
    const frameEnd = gameSource.indexOf('\n  return (', frameStart)
    const frameSource = gameSource.slice(frameStart, frameEnd)

    expect(frameSource).toContain('advanceRuntimeTime(dt * 1000)')
    expect(frameSource).not.toContain('tickTime(dt * 1000)')
    expect(frameSource).not.toContain('publishRuntimeElapsedMs')
    expect(frameSource).toContain("useGameStore.getState().phase === 'playing'")
    expect(gameSource).toContain('window.setInterval(publishRuntimeElapsedMs, PUBLISH_INTERVAL_MS)')
    expect(frameSource).toContain('checkSurvivalMilestone(elapsedMs)')
    expect(enemiesSource).toContain('getRuntimeElapsedMs(useGameStore.getState().elapsedMs) / 1000')
    expect(enemySource).toContain('getRuntimeElapsedMs(useGameStore.getState().elapsedMs)')
  })
})
