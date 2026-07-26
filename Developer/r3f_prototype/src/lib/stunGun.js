// 전기충격기(stunGun) 체인 대상 선정. 최근접 타깃 자체는 weaponTargeting.js의
// findClosestEnemy(범용, pool+Map 대응, 테스트 완비)를 그대로 재사용하고, 이 파일은
// stunGun에만 있는 "착탄 지점 기준 체인" 로직만 담당한다.
import { isEnemyHitLive } from './weaponCollision.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanRadiusEnemiesInto } from './weaponTargeting.js'

// stunGun 카탈로그에는 range 스탯이 없다. scanClosestEnemiesInto/findClosestEnemy는
// Number.isFinite(maxRange)를 요구하므로(Infinity를 넘기면 0 반환) 충분히 큰 유한값을 쓴다.
export const STUN_GUN_TARGET_RANGE = 60

const chainScratch = createWeaponTargetScratch()

// 착탄 지점(hitX, hitZ) 기준 chainRange 안에서 가장 가까운 미타격 살아있는 적을 고른다.
// hitSet은 enemyId가 아니라 rb 객체 참조 Set이다(풀 프록시는 재사용되는 안정 객체이므로
// 참조 비교로 충분하고, enemyId 재조회는 필요 없다).
export function pickStunGunChainTarget(hitX, hitZ, hitSet, chainRange) {
  const count = scanRadiusEnemiesInto(chainScratch, hitX, hitZ, chainRange)
  for (let index = 0; index < count; index += 1) {
    const special = chainScratch.special[index]
    const poolIndex = chainScratch.indices[index]
    const generation = special ? (chainScratch.generations[index] || null) : chainScratch.generations[index]
    const rb = special ?? resolveWeaponTarget(poolIndex, generation, null)
    if (!isEnemyHitLive(rb, generation)) continue
    if (hitSet?.has(rb)) continue
    return { rb, generation }
  }
  return null
}
