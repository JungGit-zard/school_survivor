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
    expect(enemySource).toContain("const mathSwingArgsRef = useRef({ bodies: enemyBodies, bossId: '', origin: { x: 0, z: 0 }, yaw: 0 })")
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

  it('swings toward the locked charge direction and judges the player with the shared arc test', () => {
    const windup = enemySource.slice(
      enemySource.indexOf("chargeState.current === 'mathSwingWindup'"),
      enemySource.indexOf("chargeState.current === 'mathSwingRecover'"),
    )
    expect(windup.length).toBeGreaterThan(0)
    // 윈드업 중 플레이어 재조준 금지: 회전 입력은 chargeDir뿐이고 _dir은 등장하지 않는다.
    expect(windup).toContain('_applyRotation(groupRef, chargeDir.current.x, chargeDir.current.z, 1)')
    expect(windup).not.toContain('_applyRotation(groupRef, _dir')
    // 히트박스 yaw는 실제 렌더 yaw, groupRef가 없을 때만 chargeDir 폴백.
    expect(windup).toContain('groupRef.current.rotation.y')
    expect(windup).toContain('Math.atan2(chargeDir.current.x, chargeDir.current.z)')
    // 플레이어 판정도 좀비 밀치기와 같은 부채꼴 함수를 쓴다(반경 단독 비교 금지).
    expect(windup).toContain('isInMathTeacherSwingArc(arcArgs)')
    expect(windup).not.toContain('dist <= MATH_TEACHER_SWING_RADIUS')
    expect(windup).toContain('swingArgs.yaw = swingYaw')
  })
})
