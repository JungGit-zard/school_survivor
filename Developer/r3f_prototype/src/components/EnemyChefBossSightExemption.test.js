import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENEMY_STATS } from './Enemy.jsx'

const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

describe('B04 chef boss sight-block exemption', () => {
  it('marks only the stage 4 chef boss with the chefBoss stat', () => {
    expect(ENEMY_STATS.B04.chefBoss).toBe(true)
    expect(ENEMY_STATS.B01.chefBoss).toBeUndefined()
    expect(ENEMY_STATS.B02.chefBoss).toBeUndefined()
    expect(ENEMY_STATS.B03.chefBoss).toBeUndefined()
    expect(ENEMY_STATS.E04.chefBoss).toBeUndefined()
  })

  it('exempts the chef boss from the sight-block early return', () => {
    // 시야 차단 early return은 chefBoss 페이즈 판정과 원거리 발사보다 앞에 있다.
    // B04가 여기 걸리면 stage4 중앙 조리대 뒤에서 보스가 완전히 멈추고,
    // 플레이어 무기도 같은 장애물에 막혀 상호 무피해 교착 → 240초 생존 자동 클리어가 된다.
    expect(enemySource).toContain(
      '!isMatilda && !stats.chefBoss && elapsedMs >= nextSightCheckRef.current'
    )
  })

  it('keeps the sight-block detour active for every other enemy', () => {
    // 면제는 마틸다/주방장 한정이다. 일반 적의 시야 차단 우회까지 지우면 안 된다.
    expect(enemySource).toContain('sightBlockedRef.current = isStageObjectSightBlocked(t, playerPos, sightObstacles)')
    expect(enemySource).toContain('writeSightBlockedEnemyVelocity(')
  })

  it('runs the chef boss phase logic after the sight-block gate it is now exempt from', () => {
    const gateIndex = enemySource.indexOf('!isMatilda && !stats.chefBoss')
    const phaseIndex = enemySource.indexOf('if (stats.chefBoss) {')
    expect(gateIndex).toBeGreaterThan(-1)
    expect(phaseIndex).toBeGreaterThan(gateIndex)
  })
})
