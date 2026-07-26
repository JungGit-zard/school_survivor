// 전기충격기(stunGun) 체인 대상 선정. 최근접 타깃 자체는 weaponTargeting.js의
// findClosestEnemy(범용, pool+Map 대응, 테스트 완비)를 그대로 재사용하고, 이 파일은
// stunGun에만 있는 "착탄 지점 기준 체인" 로직만 담당한다.
import { isEnemyHitLive } from './weaponCollision.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanRadiusEnemiesInto } from './weaponTargeting.js'

// stunGun 카탈로그에는 range 스탯이 없다. scanClosestEnemiesInto/findClosestEnemy는
// Number.isFinite(maxRange)를 요구하므로(Infinity를 넘기면 0 반환) 충분히 큰 유한값을 쓴다.
export const STUN_GUN_TARGET_RANGE = 60

const chainScratch = createWeaponTargetScratch()

// Pooled enemy proxies are intentionally reused. The hit history must keep
// the observed generation with the proxy, otherwise a newly spawned nearby
// zombie can be mistaken for the previous target and force a chain farther
// away. Set support remains for focused legacy callers, while the weapon
// itself always uses the generation-aware Map path.
export function createStunGunHitSet(rb, generation) {
  return new Map([[rb, generation]])
}

export function markStunGunHit(hitSet, rb, generation) {
  if (hitSet instanceof Map) hitSet.set(rb, generation)
  else hitSet?.add?.(rb)
}

function hasStunGunHit(hitSet, rb, generation) {
  if (hitSet instanceof Map) return hitSet.has(rb) && hitSet.get(rb) === generation
  return hitSet?.has?.(rb) ?? false
}

// 착탄 지점(hitX, hitZ) 기준 chainRange 안에서 가장 가까운 미타격 살아있는 적을 고른다.
// hitSet은 pooled rb와 generation을 함께 기록한다. 같은 rb가 재사용되어도
// generation이 달라지면 새 적이므로 체인 후보에서 제외하지 않는다.
export function pickStunGunChainTarget(hitX, hitZ, hitSet, chainRange) {
  const count = scanRadiusEnemiesInto(chainScratch, hitX, hitZ, chainRange)
  for (let index = 0; index < count; index += 1) {
    const special = chainScratch.special[index]
    const poolIndex = chainScratch.indices[index]
    const generation = special ? (chainScratch.generations[index] || null) : chainScratch.generations[index]
    const rb = special ?? resolveWeaponTarget(poolIndex, generation, null)
    if (!isEnemyHitLive(rb, generation)) continue
    if (hasStunGunHit(hitSet, rb, generation)) continue
    return { rb, generation }
  }
  return null
}
