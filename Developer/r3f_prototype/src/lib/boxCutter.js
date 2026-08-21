import { isPlayerWeaponSightBlocked } from './weaponTargeting.js'
import { captureEnemyGeneration } from './weaponCollision.js'
import { enemyBodies as globalEnemyBodies, enemyPool } from './refs.js'

export function normalizePlanarFacing(facing = { x: 0, z: 1 }) {
  const x = Number(facing.x) || 0
  const z = Number(facing.z) || 0
  const len = Math.hypot(x, z) || 1
  return { x: x / len, z: z / len }
}

// 일반 좀비(E01)의 실제 콜라이더 반폭. Enemy.jsx: BASE_COL[0](0.14) × ENEMY_SIZE_MULTIPLIER(4/3)
// ≈ 0.1867 → 0.19. 커터칼의 카탈로그 width(0.18 → 반폭 0.09)는 이 반폭보다 좁아서, 칼날에
// 시각적으로 겹친 좀비도 중심점이 0.09 밖이면 판정에서 빠졌다. pickBoxCutterTargets에서만
// 이 패딩을 더해 판정 볼륨을 넓힌다(이 함수 자체는 pad=0 기본값으로 순수하게 유지).
export const ENEMY_HIT_PAD = 0.19

export function isPointInBoxCutterStrike({
  origin,
  facing,
  point,
  range = 1.275,
  width = 0.22,
  pad = 0,
}) {
  if (!origin || !point) return false
  const dir = normalizePlanarFacing(facing)
  const dx = point.x - origin.x
  const dz = point.z - origin.z
  const forward = dx * dir.x + dz * dir.z
  if (forward < 0.12 - pad || forward > range + pad) return false

  const lateral = dx * dir.z - dz * dir.x
  return Math.abs(lateral) <= width / 2 + pad
}

// 영구 강화 Lv10 "일정 확률로 추가 절단 1회". 확률이 맞으면 같은 대상 목록에 피해를 한 번 더
// 적용한다(2회). 첫 절단으로 죽은 적은 generation이 올라가 두 번째 절단이 자동으로 거부되므로
// 이중 처치·이중 보상은 생기지 않는다.
export function resolveBoxCutterSlashCount(weapon, random = Math.random) {
  const chance = Number(weapon?.permanentExtraSlashChance)
  if (!Number.isFinite(chance) || chance <= 0) return 1
  return random() < chance ? 2 : 1
}

function isPoolProxy(rb) {
  return Number.isInteger(rb?.index) && rb.index >= 0 && rb.index < enemyPool.proxies.length
    && enemyPool.proxies[rb.index] === rb
}

// 일반 적은 EntityPool이 정본이다. enemies(Map)는 최대 3개의 보스/특수 적 호환용이며
// 기본값은 전역 enemyBodies이지만, 테스트에서는 고정 픽스처 Map을 넘겨 순수하게 검증한다.
export function pickBoxCutterTargets({
  enemies = globalEnemyBodies,
  origin,
  facing,
  range = 1.275,
  width = 0.22,
  sightBlocker = isPlayerWeaponSightBlocked,
}) {
  const targets = []

  for (let index = 0; index <= enemyPool.highestActive; index += 1) {
    if (!enemyPool.active[index]) continue
    const x = enemyPool.posX[index]
    const z = enemyPool.posZ[index]
    if (!isPointInBoxCutterStrike({ origin, facing, point: { x, z }, range, width, pad: ENEMY_HIT_PAD })) continue
    if (sightBlocker({ x, z })) continue
    const rb = enemyPool.proxies[index]
    targets.push({ enemyId: rb._enemyId, rb, generation: enemyPool.generation[index], x, z })
  }

  if (enemies?.forEach) {
    enemies.forEach((rb, enemyId) => {
      if (isPoolProxy(rb)) return // 풀 프록시가 Map에 중복 등록되어도 위 루프에서 이미 처리했다.
      if (!rb?._enemyHit || rb._enemyDead || !rb.translation) return
      const t = rb.translation()
      if (!isPointInBoxCutterStrike({ origin, facing, point: t, range, width, pad: ENEMY_HIT_PAD })) return
      if (sightBlocker(t)) return
      targets.push({ enemyId, rb, generation: captureEnemyGeneration(rb), x: t.x, z: t.z })
    })
  }

  return targets
}
