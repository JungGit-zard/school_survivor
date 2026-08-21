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
    // B01은 special body만 Map에 남기는 현재 구조에서도, 재사용 인자 객체로
    // 특수 적 밀치기 함수를 호출한다. 일반 적 풀을 다시 Map/Rapier로 되돌리지 않는다.
    expect(enemySource).toContain("const mathSwingArgsRef = useRef({ bodies: enemyBodies, bossId: '', origin: { x: 0, z: 0 } })")
    expect(enemySource).toContain('const swingArgs = mathSwingArgsRef.current')
    expect(enemySource).toContain('applyMathTeacherSwing(swingArgs)')
    expect(enemySource).toContain('getMathTeacherPlayerDamage(store.player.hp)')
    expect(enemySource).toContain('store.damagePlayer(playerDamage, IGNORE_INVULNERABILITY)')
    expect(enemySource).toContain('!impact.ignoreSightBlock && isPlayerWeaponSightBlocked')
    expect(enemySource).toContain("logPlaytestEvent('b01-math-special-start'")
    expect(enemySource).toContain("logPlaytestEvent('b01-math-special-impact'")
    expect(enemySource).toContain("logPlaytestEvent('b01-math-special-end'")
    expect(enemySource).toContain('MATH_TEACHER_SWING_RADIUS')
  })
})
