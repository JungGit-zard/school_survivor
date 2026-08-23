import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Stage 4 pressure cauldron Game wiring', () => {
  it('uses the fixed runtime clock and applies one max-health hit that ignores only contact invulnerability', () => {
    const source = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')

    expect(source).toContain('const previousElapsedMs = getRuntimeElapsedMs()')
    expect(source).toContain('getPressureCauldronExplosionTimes(')
    expect(source).toContain('isInsidePressureCauldronBlastRadius(playerPos.x, playerPos.z)')
    expect(source).toContain('live.player.maxHp * PRESSURE_CAULDRON_DAMAGE_RATIO')
    expect(source).toContain("ignoreInvulnerability: true,")
    expect(source).toContain("source: 'stage4PressureCauldron',")
  })
})
