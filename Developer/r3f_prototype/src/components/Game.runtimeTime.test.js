import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getStageConfig } from '../lib/stageConfig.js'

describe('runtime elapsed clock wiring', () => {
  it('keeps simulation time exact and HUD publication outside the frame callback', () => {
    const gameSource = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')
    const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
    const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const frameStart = gameSource.indexOf('useFrame((_, delta) =>')
    const frameEnd = gameSource.indexOf('\n  return (', frameStart)
    const frameSource = gameSource.slice(frameStart, frameEnd)

    expect(frameSource).toContain('advanceRuntimeTime(fixedDelta * 1000)')
    expect(frameSource).toContain('runGameplayFixedSteps(gameplayClockRef.current, delta')
    expect(gameSource).toContain("import { clampGameplayFrameDelta, createGameplayFixedStepClock, runGameplayFixedSteps } from '../lib/gameplayFrameTime.js'")
    expect(frameSource).toContain('camera.position.lerp(_camTarget, followAlpha)')
    expect(frameSource).not.toContain('tickTime(fixedDelta * 1000)')
    expect(frameSource).not.toContain('publishRuntimeElapsedMs')
    expect(frameSource).toContain("useGameStore.getState().phase === 'playing'")
    expect(gameSource).toContain('window.setInterval(publishRuntimeElapsedMs, PUBLISH_INTERVAL_MS)')
    expect(frameSource).toContain('checkSurvivalMilestone(elapsedMs)')
    expect(frameSource).toContain('elapsedMs >= stageConfig.matildaWarningSec * 1000')
    expect(frameSource).not.toContain('elapsedMs >= stageConfig.matildaSec * 1000')
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const stage = getStageConfig(stageId)
      expect(stage.matildaWarningSec).toBe(205)
      expect(stage.matildaSec - stage.matildaWarningSec).toBe(5)
      expect(stage.matildaSec).toBe(210)
    }
    expect(enemiesSource).toContain('getRuntimeElapsedMs(useGameStore.getState().elapsedMs) / 1000')
    expect(enemySource).toContain('getRuntimeElapsedMs(useGameStore.getState().elapsedMs)')
  })
})
