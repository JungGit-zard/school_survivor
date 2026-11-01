// 밸런스 프로브(stageRuntimeProbe)의 플레이어 조작 봇. 순수 로직이며 3D/스토어를 import하지 않는다.
//
// 설계 정본: Developer/agent_room/zombie15_time_escalation_balance_20261031.md §10.1 T-P3.
// - IDLE: 중앙 정지. 포탈 개방 후에는 포탈로 걷는다.
// - KITE: 무리 중심 기준 원 선회(PLAYER 속도 3.0u/s), 예고 회피 없음. 반경·방향 변형을 둔다.
// - KITE_DODGE: KITE + 예고(텔레그래프)를 처음 본 뒤 반응 지연(기본 250ms)이 지나면 직각 회피, 위협이 없어지면 원 복귀.
// - 포탈 모드: 'rush'(개방 후 포탈로 향함, 회피 규칙 유지) / 'refuse'(포탈에 들어가지 않고 스타일 유지, E1용).
//
// 봇은 프로브가 매 프레임 만든 world 스냅샷만 본다. 봇이 직접 적 풀을 고치지 않는다.

export const BOT_IDLE = 'IDLE'
export const BOT_KITE = 'KITE'
export const BOT_KITE_DODGE = 'KITE_DODGE'

export const PORTAL_MODE_RUSH = 'rush'
export const PORTAL_MODE_REFUSE = 'refuse'

export const KITE_RADII = Object.freeze([3, 4, 6])
export const KITE_DIRECTIONS = Object.freeze([1, -1]) // 1 = 반시계(CCW), -1 = 시계(CW). 위에서 본 XZ 평면 기준
export const DODGE_REACTION_MS = 250

// 무리 중심을 잡는 반경. 화면(세로 반폭 약 7~8u) 안쪽 적만 "무리"로 본다.
const HORDE_RADIUS = 9
// 원 궤도 반경 오차를 접선 이동에 섞는 강도. 1이면 반경 1u 차이에서 반경 방향 성분이 접선과 같다.
const RADIAL_GAIN = 1.5
// 포탈 거부 봇이 포탈에 실수로 빨려들지 않게 하는 회피 반경(트리거 반경 0.6u + 여유).
const PORTAL_REFUSE_KEEP_OUT = 1.2
// 예고 위협 판정 여유(플레이어 반폭 0.136u + 판정 오차).
const THREAT_MARGIN = 0.35
// 개인 공간: 원 선회 중에도 이 거리 안의 적에게서는 밀려난다. 사람 카이터는 좀비 몸에 일부러 닿지 않는다.
// 이게 없으면 플레이어 주변 4~6.5u 링으로 30마리가 한꺼번에 나오는 오버타임 보강에서 봇이 링 안쪽 중심을
// 무리 중심으로 잡고(무게중심 ≈ 자기 위치) 아무 방향으로나 걸어 나가 링에 박힌다.
export const PERSONAL_SPACE = 1.6
export const PERSONAL_SPACE_GAIN = 1.2
// 벽 회피: 이동 경계에서 이 거리 안이면 안쪽으로 민다(클램프에 몸을 붙인 채 떼에 몰리지 않게).
export const WALL_MARGIN = 1.5
const HAZARD_ESCAPE_WEIGHT = 4

/**
 * 봇 사양 목록. 판정은 KITE 변형 전체를 묶어서 본다(§10.1 T-P3, 감지기 과적합 방지).
 * 반경 3·4·6u × 방향 2개 = 6개 변형이다.
 */
export function kiteVariantSpecs(kind = BOT_KITE) {
  const specs = []
  for (const radius of KITE_RADII) {
    for (const direction of KITE_DIRECTIONS) specs.push({ kind, radius, direction })
  }
  return specs
}

export function botSpecLabel(spec) {
  if (!spec || spec.kind === BOT_IDLE) return BOT_IDLE
  const dir = spec.direction === -1 ? 'cw' : 'ccw'
  return `${spec.kind}_r${spec.radius}_${dir}`
}

export function createBot(spec = { kind: BOT_KITE, radius: 4, direction: 1 }) {
  return {
    kind: spec.kind ?? BOT_KITE,
    radius: spec.radius ?? 4,
    direction: spec.direction === -1 ? -1 : 1,
    portalMode: spec.portalMode ?? PORTAL_MODE_RUSH,
    reactionMs: spec.reactionMs ?? DODGE_REACTION_MS,
    wantsTelegraphs: (spec.kind ?? BOT_KITE) === BOT_KITE_DODGE,
    // 테스트 전용: 환경 위험 회피를 끈다(압력솥 피해 규칙 자체를 검증할 때만). 기준선·판정 실행에서는 쓰지 않는다.
    ignoreHazards: spec.ignoreHazards === true,
    // 텔레그래프 id → 처음 본 시각(ms). 반응 지연은 id별로 잰다.
    firstSeenMs: new Map(),
    lastCenterX: 0,
    lastCenterZ: 0,
    dodging: false,
    dodgeStartedMs: null,
  }
}

function normalizeInto(out, x, z) {
  const length = Math.hypot(x, z)
  if (length < 1e-6) {
    out.x = 0
    out.z = 0
    return false
  }
  out.x = x / length
  out.z = z / length
  return true
}

// 무리 중심: 반경 안 풀 적 + 살아 있는 특수 적(보스·마틸다 제외 — 마틸다는 회피 대상이지 무리가 아니다)의 무게중심.
export function hordeCenter(world, bot) {
  const { player, pool } = world
  let sumX = 0
  let sumZ = 0
  let count = 0
  const radiusSq = HORDE_RADIUS * HORDE_RADIUS
  if (pool) {
    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (!pool.active[index]) continue
      const dx = pool.posX[index] - player.x
      const dz = pool.posZ[index] - player.z
      if (dx * dx + dz * dz > radiusSq) continue
      sumX += pool.posX[index]
      sumZ += pool.posZ[index]
      count += 1
    }
  }
  for (const special of world.specials ?? []) {
    if (!special.alive || special.isMatilda) continue
    const dx = special.x - player.x
    const dz = special.z - player.z
    if (dx * dx + dz * dz > radiusSq) continue
    sumX += special.x
    sumZ += special.z
    count += 1
  }
  if (count === 0) return { x: bot.lastCenterX, z: bot.lastCenterZ, count: 0 }
  bot.lastCenterX = sumX / count
  bot.lastCenterZ = sumZ / count
  return { x: bot.lastCenterX, z: bot.lastCenterZ, count }
}

// 원 선회 속도 방향(단위벡터). 중심에서 플레이어를 향한 벡터를 ±90° 돌린 접선 + 반경 보정.
export function orbitDirection(out, player, center, radius, direction) {
  let rx = player.x - center.x
  let rz = player.z - center.z
  let distance = Math.hypot(rx, rz)
  if (distance < 1e-4) {
    rx = 1
    rz = 0
    distance = 1
  }
  const ux = rx / distance
  const uz = rz / distance
  // 반시계(direction 1): 접선 = (-uz, ux). 시계: (uz, -ux).
  const tx = -uz * direction
  const tz = ux * direction
  const radial = Math.max(-1, Math.min(1, (radius - distance) / radius)) * RADIAL_GAIN
  return normalizeInto(out, tx + ux * radial, tz + uz * radial)
}

// 플레이어가 예고 영역(여유 포함) 안에 있으면 탈출 방향(단위 아님, 가중 포함)을 out에 더한다.
export function threatEscape(telegraph, player, out) {
  if (telegraph.kind === 'circle') {
    const dx = player.x - telegraph.x
    const dz = player.z - telegraph.z
    const distance = Math.hypot(dx, dz)
    if (distance > telegraph.radius + THREAT_MARGIN) return false
    if (distance < 1e-4) {
      out.x += 1
      return true
    }
    out.x += dx / distance
    out.z += dz / distance
    return true
  }
  // line: 시작점(x,z) + 방향(dirX,dirZ) × length, 반폭 halfWidth
  const px = player.x - telegraph.x
  const pz = player.z - telegraph.z
  const forward = px * telegraph.dirX + pz * telegraph.dirZ
  if (forward < -THREAT_MARGIN || forward > telegraph.length + THREAT_MARGIN) return false
  const lateral = px * -telegraph.dirZ + pz * telegraph.dirX // 왼쪽(+) / 오른쪽(-)
  if (Math.abs(lateral) > telegraph.halfWidth + THREAT_MARGIN) return false
  // 선 축에서 직각으로 벗어난다. 정확히 축 위면 왼쪽으로 고정(결정론).
  const side = lateral >= 0 ? 1 : -1
  out.x += -telegraph.dirZ * side
  out.z += telegraph.dirX * side
  return true
}

// 개인 공간 반발: Σ (p − e) / d² × gain (가까울수록 강하다). 풀 적 + 보스·마틸다.
export function personalSpacePush(world, out) {
  const { player, pool } = world
  const radiusSq = PERSONAL_SPACE * PERSONAL_SPACE
  if (pool) {
    for (let index = 0; index <= pool.highestActive; index += 1) {
      if (!pool.active[index]) continue
      const dx = player.x - pool.posX[index]
      const dz = player.z - pool.posZ[index]
      const dSq = dx * dx + dz * dz
      if (dSq > radiusSq || dSq < 1e-8) continue
      out.x += (dx / dSq) * PERSONAL_SPACE_GAIN
      out.z += (dz / dSq) * PERSONAL_SPACE_GAIN
    }
  }
  for (const special of world.specials ?? []) {
    if (!special.alive) continue
    const dx = player.x - special.x
    const dz = player.z - special.z
    const reach = PERSONAL_SPACE + (special.radius ?? 0)
    const dSq = dx * dx + dz * dz
    if (dSq > reach * reach || dSq < 1e-8) continue
    out.x += (dx / dSq) * PERSONAL_SPACE_GAIN
    out.z += (dz / dSq) * PERSONAL_SPACE_GAIN
  }
}

export function wallPush(world, out) {
  const bounds = world.moveBounds
  if (!bounds) return
  const { x, z } = world.player
  if (x - bounds.minX < WALL_MARGIN) out.x += (WALL_MARGIN - (x - bounds.minX)) / WALL_MARGIN
  if (bounds.maxX - x < WALL_MARGIN) out.x -= (WALL_MARGIN - (bounds.maxX - x)) / WALL_MARGIN
  if (z - bounds.minZ < WALL_MARGIN) out.z += (WALL_MARGIN - (z - bounds.minZ)) / WALL_MARGIN
  if (bounds.maxZ - z < WALL_MARGIN) out.z -= (WALL_MARGIN - (bounds.maxZ - z)) / WALL_MARGIN
}

/**
 * 한 프레임 이동 방향(단위벡터 또는 0)을 out에 쓴다.
 * world: { nowMs, player:{x,z}, pool, specials, telegraphs, portal:{active,x,z}, suction }
 * 반환: 'idle' | 'orbit' | 'dodge' | 'portal' | 'hold'
 */
export function decideBotMove(bot, world, out) {
  out.x = 0
  out.z = 0
  if (world.suction) return 'hold'

  // 0) 고정 환경 위험(S4 압력솥): 모든 봇이 바로 피한다(적 예고가 아니라 배울 수 있는 맵 규칙).
  if (!bot.ignoreHazards && world.hazards?.length) {
    const escape = { x: 0, z: 0 }
    let inside = false
    for (const hazard of world.hazards) if (threatEscape(hazard, world.player, escape)) inside = true
    if (inside) {
      // 압력솥은 최대 HP 20%를 무적 관통으로 준다. 좀비 한 번 접촉보다 비싸므로 탈출 방향을 개인 공간보다 세게 둔다.
      const len = Math.hypot(escape.x, escape.z)
      if (len > 1e-6) { escape.x = (escape.x / len) * HAZARD_ESCAPE_WEIGHT; escape.z = (escape.z / len) * HAZARD_ESCAPE_WEIGHT }
      personalSpacePush(world, escape)
      wallPush(world, escape)
      if (normalizeInto(out, escape.x, escape.z)) return 'hazard'
    }
  }

  // 1) 예고 회피(KITE_DODGE만). 처음 본 뒤 reactionMs가 지난 위협만 반응한다.
  if (bot.wantsTelegraphs && world.telegraphs) {
    const escape = { x: 0, z: 0 }
    let threatened = false
    const seenNow = new Set()
    for (const telegraph of world.telegraphs) {
      seenNow.add(telegraph.id)
      if (!bot.firstSeenMs.has(telegraph.id)) bot.firstSeenMs.set(telegraph.id, world.nowMs)
      if (world.nowMs - bot.firstSeenMs.get(telegraph.id) < bot.reactionMs) continue
      if (threatEscape(telegraph, world.player, escape)) threatened = true
    }
    // 사라진 예고는 잊는다(같은 id가 다시 오면 새 예고로 본다).
    for (const id of bot.firstSeenMs.keys()) if (!seenNow.has(id)) bot.firstSeenMs.delete(id)
    // 회피 중에도 개인 공간은 지킨다(예고를 피하려다 다른 좀비 몸에 박히지 않게).
    if (threatened) {
      const len = Math.hypot(escape.x, escape.z)
      if (len > 1e-6) { escape.x /= len; escape.z /= len }
      personalSpacePush(world, escape)
      wallPush(world, escape)
    }
    if (threatened && normalizeInto(out, escape.x, escape.z)) {
      if (!bot.dodging) bot.dodgeStartedMs = world.nowMs
      bot.dodging = true
      return 'dodge'
    }
    bot.dodging = false
  }

  const portal = world.portal
  // 2) 포탈 개방 후 rush 모드: 포탈로 향하되 아주 가까운 적에게서만 밀려난다.
  if (portal?.active && bot.portalMode === PORTAL_MODE_RUSH) {
    let vx = portal.x - world.player.x
    let vz = portal.z - world.player.z
    const distance = Math.hypot(vx, vz)
    if (distance > 1e-4) {
      vx /= distance
      vz /= distance
    }
    // C4: 포탈로 갈 때도 원 선회 때와 같은 거리 유지(개인 공간·벽 여유)를 쓴다(T-P7 "자기 회피 규칙 유지").
    // 포탈 바로 앞(개인 공간 반경 안)에서는 밀림을 끄고 들어간다.
    if (distance > PERSONAL_SPACE) {
      const avoid = { x: 0, z: 0 }
      personalSpacePush(world, avoid)
      wallPush(world, avoid)
      vx += avoid.x
      vz += avoid.z
    }
    normalizeInto(out, vx, vz)
    return 'portal'
  }

  if (bot.kind === BOT_IDLE) return 'idle'

  // 3) 원 선회 + 개인 공간 + 벽 회피
  const center = hordeCenter(world, bot)
  orbitDirection(out, world.player, center, bot.radius, bot.direction)
  const avoid = { x: 0, z: 0 }
  personalSpacePush(world, avoid)
  wallPush(world, avoid)
  if (avoid.x !== 0 || avoid.z !== 0) normalizeInto(out, out.x + avoid.x, out.z + avoid.z)
  // 포탈 거부: 포탈 근처에서는 포탈 반대 방향을 섞어 실수로 들어가지 않게 한다.
  if (portal?.active && bot.portalMode === PORTAL_MODE_REFUSE) {
    const dx = world.player.x - portal.x
    const dz = world.player.z - portal.z
    const distance = Math.hypot(dx, dz)
    if (distance < PORTAL_REFUSE_KEEP_OUT && distance > 1e-4) {
      normalizeInto(out, out.x + (dx / distance) * 2, out.z + (dz / distance) * 2)
    }
  }
  return 'orbit'
}
