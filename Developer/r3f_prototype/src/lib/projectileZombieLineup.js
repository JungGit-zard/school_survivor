// 검수·프리뷰 전용: 신규 투사체 좀비 15종을 풀에 한 줄로 세운다. 게임 스폰 표와 무관하다
// (시간 증가 스포너는 밸런스 문서 이후 levelmini가 만든다). 시뮬레이션을 돌리지 않는 렌더
// 하니스(라인업 프리뷰, 레이어 테스트)가 같은 풀 슬롯 경로로 15종을 그려 보게 한다.
import { PROJECTILE_ZOMBIE_STATE, PROJECTILE_ZOMBIE_TYPES, PROJECTILE_ZOMBIE_VISUALS } from './projectileZombieVisuals.js'

export function spawnProjectileZombieLineup(pool, {
  x = 0, z = 0, spacing = 0.42, yaw = 0, visualScale = 4 / 3, telegraph = false, telegraphProgress = 0.8, spawnTimer = 1200, types = PROJECTILE_ZOMBIE_TYPES,
} = {}) {
  const handles = []
  const start = x - ((types.length - 1) * spacing) / 2
  types.forEach((type, index) => {
    const telegraphMs = PROJECTILE_ZOMBIE_VISUALS[type].telegraphMs
    const handle = { index: -1, generation: 0 }
    const ok = pool.spawnInto(handle, {
      type,
      x: start + index * spacing,
      // 발바닥(로컬 -0.63) x 표시 스케일 0.333 = 지면
      y: 0.63 * 0.333 * visualScale,
      z,
      hp: 10,
      maxHp: 10,
      yaw,
      visualScale,
      spawnTimer: spawnTimer + index * 137,
      state: telegraph ? PROJECTILE_ZOMBIE_STATE.TELEGRAPH : PROJECTILE_ZOMBIE_STATE.APPROACH,
      stateTimer: telegraph ? telegraphMs * (1 - telegraphProgress) : 0,
    })
    handles.push(ok ? handle : null)
  })
  return handles
}
