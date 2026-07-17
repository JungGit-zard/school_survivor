import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENEMY_STATS } from './Enemy.jsx'

const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

describe('B01 math teacher special runtime wiring', () => {
  it('routes only the stage 1 boss from charge into the set-square swing', () => {
    expect(ENEMY_STATS.B01.mathTeacherSpecial).toBe(true)
    expect(ENEMY_STATS.B02.mathTeacherSpecial).toBeUndefined()
    expect(ENEMY_STATS.E05.mathTeacherSpecial).toBeUndefined()
    expect(enemySource).toContain("stats.mathTeacherSpecial ? 'mathSwingWindup' : 'stun'")
    expect(enemySource).toContain("chargeState.current === 'mathSwingWindup'")
    expect(enemySource).toContain("chargeState.current === 'mathSwingRecover'")
  })

  it('connects the impact frame to nearby-zombie push and guaranteed remaining-HP damage', () => {
    expect(enemySource).toContain('applyMathTeacherSwing({')
    expect(enemySource).toContain('bodies: enemyBodies')
    expect(enemySource).toContain('getMathTeacherPlayerDamage(store.player.hp)')
    expect(enemySource).toContain('{ ignoreInvulnerability: true }')
    expect(enemySource).toContain('!impact.ignoreSightBlock && isPlayerWeaponSightBlocked')
    expect(enemySource).toContain('MATH_TEACHER_SWING_RADIUS')
  })
})
