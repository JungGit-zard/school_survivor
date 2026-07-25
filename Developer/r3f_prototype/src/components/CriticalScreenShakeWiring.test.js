import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')
const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
const gameSource = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')

describe('critical screen shake wiring', () => {
  it('pooled/special 적은 critical일 때만 단일 shake emitter를 호출한다', () => {
    expect(enemiesSource).toContain("import { emitCriticalScreenShake } from '../lib/criticalScreenShake.js'")
    expect(enemiesSource).toContain('if (critical.isCritical) {')
    expect(enemiesSource).toContain('emitCriticalScreenShake(\n        x - playerPos.x,')
    expect(enemiesSource).not.toContain('emitCriticalScreenShake({')
    expect(enemySource).toContain("import { emitCriticalScreenShake } from '../lib/criticalScreenShake.js'")
    expect(enemySource).toContain('if (criticalHit.isCritical) {')
    expect(enemySource).toContain('emitCriticalScreenShake(\n          hitPos.x - playerPos.x,')
    expect(enemySource).not.toContain('emitCriticalScreenShake({')
  })

  it('카메라는 lookAt으로 기준 pose를 만든 뒤 위치 offset만 더한다', () => {
    const lookAt = gameSource.indexOf('camera.lookAt(fx, 0, fz)')
    const sample = gameSource.indexOf('sampleCriticalScreenShake(_criticalScreenShakeFrame)')
    const positionOffset = gameSource.indexOf('camera.position.add(_cameraShakeOffset)')
    expect(lookAt).toBeGreaterThan(-1)
    expect(sample).toBeGreaterThan(lookAt)
    expect(positionOffset).toBeGreaterThan(sample)
    expect(gameSource).toContain('camera.position.sub(previousCameraShakeOffset)')
    expect(gameSource).toContain('previousCameraShakeOffset.copy(_cameraShakeOffset)')
    expect(gameSource).not.toContain('camera.fov +=')
    expect(gameSource).not.toContain('camera.rotation.')
  })
})
