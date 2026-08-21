import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const gameSource = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('critical screen shake wiring', () => {
  it('pooled/special 적은 모든 좀비 피격에서 hit shake emitter를 한 번 호출한다', () => {
    expect(enemiesSource).toContain("import { emitCriticalHitScreenShake, emitEnemyHitScreenShake } from '../lib/criticalScreenShake.js'")
    expect(enemiesSource).toContain('const screenShake = critical.isCritical ? emitCriticalHitScreenShake : emitEnemyHitScreenShake')
    expect(enemiesSource).toContain('x - playerPos.x,')
    expect(enemiesSource).toContain('critical.isCritical ? { strong: strongCritical } : undefined')
    expect(enemiesSource).not.toContain('emitCriticalScreenShake(\n        x - playerPos.x,')
    expect(enemySource).toContain("import { emitCriticalHitScreenShake, emitEnemyHitScreenShake } from '../lib/criticalScreenShake.js'")
    expect(enemySource).toContain('const screenShake = criticalHit.isCritical ? emitCriticalHitScreenShake : emitEnemyHitScreenShake')
    expect(enemySource).toContain('hitPos.x - playerPos.x,')
    expect(enemySource).toContain('criticalHit.isCritical ? { strong: strongCritical } : undefined')
    expect(enemySource).not.toContain('emitCriticalScreenShake(\n          hitPos.x - playerPos.x,')
  })

  it('치명타는 일반 hitSpark 대신 전용 criticalHitBurst VFX를 사용한다', () => {
    expect(enemiesSource).toContain('createEnemyCriticalHitBurstEvent')
    expect(enemiesSource).toContain('hit.critical')
    expect(enemySource).toContain('createEnemyCriticalHitBurstEvent')
    expect(enemySource).toContain('criticalHit.isCritical')
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
